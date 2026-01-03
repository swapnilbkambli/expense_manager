'use client';

import { CategoryMapping, Expense, FilterState } from '@/lib/types/expense';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X, Edit, ChevronRight as ChevronRightIcon, ChevronDown as ChevronDownIcon, Layers, List, Save, Check, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateExpenseAction } from '@/lib/actions';
import { cn } from '@/lib/utils';
import { EditTransactionModal } from './EditTransactionModal';

interface TransactionTableProps {
    expenses: Expense[];
    onToggleCategory?: (category: string) => void;
    onToggleSubcategory?: (subcategory: string) => void;
    filters?: FilterState;
    categories?: string[];
    subcategories?: string[];
    categoryMapping: CategoryMapping;
    onRefresh?: () => void;
}

type SortConfig = {
    key: keyof Expense | 'absAmount';
    direction: 'asc' | 'desc';
} | null;

export function TransactionTable({
    expenses,
    onToggleCategory,
    onToggleSubcategory,
    filters,
    categories,
    subcategories,
    categoryMapping,
    onRefresh
}: TransactionTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'parsedDate', direction: 'desc' });
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isGrouped, setIsGrouped] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
    const [inlineEditing, setInlineEditing] = useState<{ rowId: string, field: string, value: any, originalValue: any } | null>(null);
    const [isSavingInline, setIsSavingInline] = useState(false);
    const itemsPerPage = 10;

    // Use global filters if available, otherwise fallback to empty (though they should be provided)
    const activeCategories = filters?.categories || [];
    const activeSubcategories = filters?.subcategories || [];

    const viewMode = filters?.viewMode || 'expense';
    const modeFilteredExpenses = useMemo(() => {
        return expenses.filter(e => viewMode === 'expense' ? e.amount < 0 : e.amount > 0);
    }, [expenses, viewMode]);

    const sortedExpenses = useMemo(() => {
        if (!sortConfig) return modeFilteredExpenses;

        return [...modeFilteredExpenses].sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof Expense];
            let bValue: any = b[sortConfig.key as keyof Expense];

            if (sortConfig.key === 'absAmount') {
                aValue = Math.abs(a.amount);
                bValue = Math.abs(b.amount);
            } else if (sortConfig.key === 'parsedDate') {
                aValue = a.parsedDate.getTime();
                bValue = b.parsedDate.getTime();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [expenses, sortConfig]);

    const hierarchicalData = useMemo(() => {
        if (!isGrouped) return [];

        const groups: {
            category: string;
            total: number;
            count: number;
            subcategories: {
                name: string;
                total: number;
                count: number;
                transactions: Expense[];
            }[];
        }[] = [];

        const catMap = new Map<string, any>();

        sortedExpenses.forEach(exp => {
            if (!catMap.has(exp.category)) {
                catMap.set(exp.category, {
                    category: exp.category,
                    total: 0,
                    count: 0,
                    subMap: new Map<string, any>()
                });
            }
            const cat = catMap.get(exp.category);
            cat.total += exp.amount;
            cat.count++;

            const subName = exp.subcategory || 'Uncategorized';
            if (!cat.subMap.has(subName)) {
                cat.subMap.set(subName, {
                    name: subName,
                    total: 0,
                    count: 0,
                    transactions: []
                });
            }
            const sub = cat.subMap.get(subName);
            sub.total += exp.amount;
            sub.count++;
            sub.transactions.push(exp);
        });

        // Convert maps to sorted arrays
        return Array.from(catMap.values()).map(cat => ({
            ...cat,
            subcategories: Array.from(cat.subMap.values())
                .sort((a: any, b: any) => Math.abs(b.total) - Math.abs(a.total))
        })).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    }, [sortedExpenses, isGrouped]);

    const toggleCategoryExpand = (cat: string) => {
        const next = new Set(expandedCategories);
        if (next.has(cat)) next.delete(cat);
        else next.add(cat);
        setExpandedCategories(next);
    };

    const toggleSubExpand = (subKey: string) => {
        const next = new Set(expandedSubcategories);
        if (next.has(subKey)) next.delete(subKey);
        else next.add(subKey);
        setExpandedSubcategories(next);
    };

    const totalPages = Math.ceil(sortedExpenses.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedExpenses = sortedExpenses.slice(startIndex, startIndex + itemsPerPage);

    const requestSort = (key: keyof Expense | 'absAmount') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Expense | 'absAmount') => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    const handleInlineSave = async () => {
        if (!inlineEditing) return;
        const { rowId, field, value, originalValue } = inlineEditing;

        if (value === originalValue) {
            setInlineEditing(null);
            return;
        }

        const expense = expenses.find(e => e.rowId === rowId);
        if (!expense || !expense.id) return;

        setIsSavingInline(true);
        try {
            const result = await updateExpenseAction(expense.id, { [field]: value });
            if (result.success) {
                onRefresh?.();
                setInlineEditing(null);
            } else {
                alert('Failed to update: ' + result.error);
            }
        } catch (error) {
            console.error('Inline update error:', error);
        } finally {
            setIsSavingInline(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 px-1">
                {categories && categories.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 px-5 rounded-xl border-white/40 bg-white/50 backdrop-blur-sm hover:bg-white hover:border-indigo-200 transition-all font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-indigo-600 shadow-sm">
                                <List className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                                Categories {activeCategories.length > 0 && `(${activeCategories.length})`}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 rounded-2xl border-white/40 shadow-2xl backdrop-blur-xl bg-white/90" align="start">
                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-50">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Category</span>
                                    {activeCategories.length > 0 && (
                                        <button
                                            className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                                            onClick={() => activeCategories.forEach((cat: string) => onToggleCategory?.(cat))}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                {categories.map(cat => (
                                    <div key={cat} className="flex items-center space-x-3 px-2 py-2 hover:bg-indigo-50/50 rounded-xl transition-colors cursor-pointer group">
                                        <Checkbox
                                            id={`table-cat-${cat}`}
                                            checked={activeCategories.includes(cat)}
                                            onCheckedChange={() => {
                                                onToggleCategory?.(cat);
                                                setCurrentPage(1);
                                            }}
                                            className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                        />
                                        <label htmlFor={`table-cat-${cat}`} className="text-xs font-black text-slate-600 cursor-pointer flex-1 group-hover:text-indigo-700 transition-colors">
                                            {cat}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {subcategories && subcategories.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 px-5 rounded-xl border-white/40 bg-white/50 backdrop-blur-sm hover:bg-white hover:border-indigo-200 transition-all font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-indigo-600 shadow-sm">
                                <Layers className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                                Segments {activeSubcategories.length > 0 && `(${activeSubcategories.length})`}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 rounded-2xl border-white/40 shadow-2xl backdrop-blur-xl bg-white/90" align="start">
                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-50">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Segment</span>
                                    {activeSubcategories.length > 0 && (
                                        <button
                                            className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                                            onClick={() => activeSubcategories.forEach((sub: string) => onToggleSubcategory?.(sub))}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                {(() => {
                                    const availableSubs = filters?.categories && filters.categories.length > 0
                                        ? Array.from(new Set(filters.categories.flatMap(cat => categoryMapping[cat] || [])))
                                            .filter(s => subcategories?.includes(s))
                                            .sort()
                                        : subcategories || [];

                                    return availableSubs.map(sub => (
                                        <div key={sub} className="flex items-center space-x-3 px-2 py-2 hover:bg-indigo-50/50 rounded-xl transition-colors cursor-pointer group">
                                            <Checkbox
                                                id={`table-sub-${sub}`}
                                                checked={activeSubcategories.includes(sub)}
                                                onCheckedChange={() => {
                                                    onToggleSubcategory?.(sub);
                                                    setCurrentPage(1);
                                                }}
                                                className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                            />
                                            <label htmlFor={`table-sub-${sub}`} className="text-xs font-black text-slate-600 cursor-pointer flex-1 group-hover:text-indigo-700 transition-colors">
                                                {sub}
                                            </label>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {(activeCategories.length > 0 || activeSubcategories.length > 0) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 px-4 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                        onClick={() => {
                            activeCategories.forEach((cat: string) => onToggleCategory?.(cat));
                            activeSubcategories.forEach((sub: string) => onToggleSubcategory?.(sub));
                        }}
                    >
                        Reset All
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}

                <div className="ml-auto flex items-center bg-white/40 p-1.5 rounded-2xl border border-white/60 shadow-sm backdrop-blur-sm">
                    <button
                        onClick={() => setIsGrouped(false)}
                        className={cn(
                            "px-5 h-8 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                            !isGrouped ? "bg-white text-indigo-600 shadow-lg shadow-indigo-500/10" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <List className="w-3.5 h-3.5" /> List
                    </button>
                    <button
                        onClick={() => setIsGrouped(true)}
                        className={cn(
                            "px-5 h-8 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                            isGrouped ? "bg-white text-indigo-600 shadow-lg shadow-indigo-500/10" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Layers className="w-3.5 h-3.5" /> Grouped
                    </button>
                </div>
            </div>
            <div className="rounded-2xl border border-white/40 overflow-hidden shadow-sm bg-white/30 backdrop-blur-sm">
                <Table>
                    <TableHeader className="bg-indigo-50/50 border-b border-indigo-100/50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead
                                className="cursor-pointer hover:bg-white/60 transition-colors font-black text-[10px] uppercase tracking-widest text-slate-500 py-4 h-auto"
                                onClick={() => requestSort('parsedDate')}
                            >
                                <div className="flex items-center gap-2">
                                    Date {getSortIcon('parsedDate')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-white/60 transition-colors font-black text-[10px] uppercase tracking-widest text-slate-500 py-4 h-auto"
                                onClick={() => requestSort('category')}
                            >
                                <div className="flex items-center gap-2">
                                    Category {getSortIcon('category')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-white/60 transition-colors font-black text-[10px] uppercase tracking-widest text-slate-500 py-4 h-auto"
                                onClick={() => requestSort('subcategory')}
                            >
                                <div className="flex items-center gap-2">
                                    Segment {getSortIcon('subcategory')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-white/60 transition-colors font-black text-[10px] uppercase tracking-widest text-slate-500 py-4 h-auto"
                                onClick={() => requestSort('description')}
                            >
                                <div className="flex items-center gap-2">
                                    Payee / Activity {getSortIcon('description')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-right cursor-pointer hover:bg-white/60 transition-colors font-black text-[10px] uppercase tracking-widest text-slate-500 py-4 h-auto"
                                onClick={() => requestSort('absAmount')}
                            >
                                <div className="flex items-center justify-end gap-2">
                                    Amount {getSortIcon('absAmount')}
                                </div>
                            </TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500 py-4 h-auto pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!isGrouped ? (
                            paginatedExpenses.map((expense, index) => (
                                <TableRow key={`${expense.rowId}-${index}`} className="group hover:bg-white/60 transition-colors border-indigo-50/20">
                                    <TableCell className="font-black text-xs text-slate-400 tracking-tighter py-4">{expense.date}</TableCell>
                                    <TableCell>
                                        {inlineEditing?.rowId === expense.rowId && inlineEditing?.field === 'category' ? (
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={inlineEditing.value}
                                                    onValueChange={(val) => setInlineEditing({ ...inlineEditing, value: val })}
                                                >
                                                    <SelectTrigger className="h-9 w-40 rounded-xl border-indigo-100 bg-white shadow-sm font-bold text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-white/40 backdrop-blur-xl bg-white/90">
                                                        {categories?.filter(Boolean).map(cat => (
                                                            <SelectItem key={cat} value={cat} className="text-xs font-bold">{cat}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-emerald-600 hover:bg-emerald-50 rounded-xl" onClick={handleInlineSave} disabled={isSavingInline}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-600 hover:bg-rose-50 rounded-xl" onClick={() => setInlineEditing(null)} disabled={isSavingInline}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="bg-indigo-50/50 text-indigo-600 border-indigo-100/50 font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                                onClick={() => setInlineEditing({ rowId: expense.rowId, field: 'category', value: expense.category, originalValue: expense.category })}
                                            >
                                                {expense.category}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {inlineEditing?.rowId === expense.rowId && inlineEditing?.field === 'subcategory' ? (
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={inlineEditing.value}
                                                    onValueChange={(val) => setInlineEditing({ ...inlineEditing, value: val })}
                                                >
                                                    <SelectTrigger className="h-9 w-40 rounded-xl border-indigo-100 bg-white shadow-sm font-bold text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-white/40 backdrop-blur-xl bg-white/90">
                                                        {(() => {
                                                            const availableSubs = expense.category
                                                                ? (categoryMapping[expense.category] || []).filter(s => subcategories?.includes(s))
                                                                : subcategories;
                                                            return availableSubs?.filter(Boolean).map(sub => (
                                                                <SelectItem key={sub} value={sub} className="text-xs font-bold">{sub}</SelectItem>
                                                            ));
                                                        })()}
                                                    </SelectContent>
                                                </Select>
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-emerald-600 hover:bg-emerald-50 rounded-xl" onClick={handleInlineSave} disabled={isSavingInline}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-600 hover:bg-rose-50 rounded-xl" onClick={() => setInlineEditing(null)} disabled={isSavingInline}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <span
                                                className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                                                onClick={() => setInlineEditing({ rowId: expense.rowId, field: 'subcategory', value: expense.subcategory, originalValue: expense.subcategory })}
                                            >
                                                {expense.subcategory || '---'}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-black text-slate-800 tracking-tight block max-w-xs truncate group-hover:text-indigo-900 transition-colors">
                                            {expense.description}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                            "text-sm font-black tracking-tight",
                                            expense.amount > 0 ? "text-emerald-600" : "text-indigo-600"
                                        )}>
                                            {expense.amount > 0 ? '+' : ''}
                                            {expense.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm active:scale-95"
                                            onClick={() => setEditingExpense(expense)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            hierarchicalData.map((catGroup) => (
                                <React.Fragment key={catGroup.category}>
                                    <TableRow className="bg-indigo-50/30 hover:bg-indigo-50/50 group transition-colors select-none border-indigo-100/30">
                                        <TableCell colSpan={6} className="py-3 px-4">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => toggleCategoryExpand(catGroup.category)}
                                                        className="p-1.5 hover:bg-white rounded-lg transition-all shadow-sm active:scale-95 bg-white/50"
                                                    >
                                                        {expandedCategories.has(catGroup.category) ? (
                                                            <ChevronDownIcon className="w-4 h-4 text-indigo-500" />
                                                        ) : (
                                                            <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                                                        )}
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="font-black text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                onClick={() => toggleCategoryExpand(catGroup.category)}
                                                            >
                                                                {catGroup.category}
                                                            </span>
                                                            <div className="w-1 h-1 rounded-full bg-indigo-500/40" />
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                {catGroup.count} Records
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest opacity-60">Total</span>
                                                    <span className={cn(
                                                        "font-black text-sm tracking-tight px-3 py-1 rounded-lg bg-white/50 border border-white/60 shadow-sm",
                                                        catGroup.total > 0 ? "text-emerald-600" : "text-indigo-600"
                                                    )}>
                                                        {catGroup.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {expandedCategories.has(catGroup.category) && catGroup.subcategories.map((sub: any) => {
                                        const subKey = `${catGroup.category}-${sub.name}`;
                                        const isExpanded = expandedSubcategories.has(subKey);
                                        return (
                                            <React.Fragment key={subKey}>
                                                <TableRow className="bg-white/40 hover:bg-white/60 group transition-colors select-none border-indigo-50/10">
                                                    <TableCell colSpan={6} className="py-2.5 pl-12">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() => toggleSubExpand(subKey)}
                                                                    className="p-1 hover:bg-white rounded-md transition-all active:scale-95"
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronDownIcon className="w-3.5 h-3.5 text-indigo-400" />
                                                                    ) : (
                                                                        <ChevronRightIcon className="w-3.5 h-3.5 text-slate-300" />
                                                                    )}
                                                                </button>
                                                                <span
                                                                    className="text-xs font-black text-slate-600 uppercase tracking-wider cursor-pointer hover:text-indigo-600"
                                                                    onClick={() => toggleSubExpand(subKey)}
                                                                >
                                                                    {sub.name}
                                                                </span>
                                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                                                                    ({sub.count} Transactions)
                                                                </span>
                                                            </div>
                                                            <div className="pr-4">
                                                                <span className={cn(
                                                                    "text-xs font-black tracking-tight",
                                                                    sub.total > 0 ? "text-emerald-500" : "text-indigo-500"
                                                                )}>
                                                                    {sub.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && sub.transactions.map((expense: Expense, txIdx: number) => (
                                                    <TableRow key={`${expense.rowId}-${txIdx}`} className="bg-white/10 hover:bg-white/30 transition-colors border-indigo-50/5">
                                                        <TableCell className="pl-20 py-3 text-[10px] font-black text-slate-400 tracking-tighter opacity-60">
                                                            {expense.date}
                                                        </TableCell>
                                                        <TableCell colSpan={2} className="pl-4">
                                                            <span className="text-xs font-black text-slate-700 tracking-tight">
                                                                {expense.description}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className={cn(
                                                                "text-[11px] font-black tracking-tight",
                                                                expense.amount > 0 ? "text-emerald-500" : "text-indigo-500"
                                                            )}>
                                                                {expense.amount > 0 ? '+' : ''}
                                                                {expense.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                                                                onClick={() => setEditingExpense(expense)}
                                                            >
                                                                <Edit className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </React.Fragment>
                            ))
                        )}
                        {(!isGrouped ? paginatedExpenses.length : hierarchicalData.length) === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center bg-white/10">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-2">
                                            <Search className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">No transactions found</span>
                                        <span className="text-[10px] text-slate-300 italic">Try adjusting your filters or search terms</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {!isGrouped && (
                <div className="flex items-center justify-between px-2 pt-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic opacity-60">
                        Showing <span className="text-indigo-500 opacity-100">{startIndex + 1}</span> to <span className="text-indigo-500 opacity-100">{Math.min(startIndex + itemsPerPage, sortedExpenses.length)}</span> of <span className="text-indigo-500 opacity-100">{sortedExpenses.length}</span> Records
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 rounded-xl border-white/40 bg-white/50 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white hover:text-indigo-600 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                        </Button>
                        <div className="bg-white/40 px-3 py-1.5 rounded-xl border border-white/60 shadow-sm backdrop-blur-sm">
                            <span className="text-xs font-black text-indigo-600">{currentPage}</span>
                            <span className="text-[10px] font-black text-slate-300 mx-1.5 uppercase tracking-widest">of</span>
                            <span className="text-xs font-black text-slate-600">{totalPages || 1}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 rounded-xl border-white/40 bg-white/50 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white hover:text-indigo-600 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            <EditTransactionModal
                expense={editingExpense}
                isOpen={!!editingExpense}
                onClose={() => setEditingExpense(null)}
                onSuccess={() => onRefresh?.()}
                categories={categories || []}
                subcategories={subcategories || []}
                categoryMapping={categoryMapping}
            />
        </div >
    );
}
