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
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X, Edit, ChevronRight as ChevronRightIcon, ChevronDown as ChevronDownIcon, Layers, List, Save, Check } from 'lucide-react';
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
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-2">
                {categories && categories.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                Filter Categories {activeCategories.length > 0 && `(${activeCategories.length})`}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b">
                                    <span className="text-xs font-semibold">Filter Category</span>
                                    {activeCategories.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] uppercase font-bold text-slate-500"
                                            onClick={() => activeCategories.forEach((cat: string) => onToggleCategory?.(cat))}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                {categories.map(cat => (
                                    <div key={cat} className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-50 rounded">
                                        <Checkbox
                                            id={`table-cat-${cat}`}
                                            checked={activeCategories.includes(cat)}
                                            onCheckedChange={() => {
                                                onToggleCategory?.(cat);
                                                setCurrentPage(1);
                                            }}
                                        />
                                        <label htmlFor={`table-cat-${cat}`} className="text-sm font-normal cursor-pointer flex-1">
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
                            <Button variant="outline" size="sm" className="h-8">
                                Filter Subcategories {activeSubcategories.length > 0 && `(${activeSubcategories.length})`}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b">
                                    <span className="text-xs font-semibold">Filter Subcategory</span>
                                    {activeSubcategories.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] uppercase font-bold text-slate-500"
                                            onClick={() => activeSubcategories.forEach((sub: string) => onToggleSubcategory?.(sub))}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                {(() => {
                                    const availableSubs = filters?.categories && filters.categories.length > 0
                                        ? Array.from(new Set(filters.categories.flatMap(cat => categoryMapping[cat] || [])))
                                            .filter(s => subcategories.includes(s))
                                            .sort()
                                        : subcategories;

                                    return availableSubs.map(sub => (
                                        <div key={sub} className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-50 rounded">
                                            <Checkbox
                                                id={`table-sub-${sub}`}
                                                checked={activeSubcategories.includes(sub)}
                                                onCheckedChange={() => {
                                                    onToggleSubcategory?.(sub);
                                                    setCurrentPage(1);
                                                }}
                                            />
                                            <label htmlFor={`table-sub-${sub}`} className="text-sm font-normal cursor-pointer flex-1">
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
                        className="h-8 text-red-500 hover:text-red-700"
                        onClick={() => {
                            activeCategories.forEach((cat: string) => onToggleCategory?.(cat));
                            activeSubcategories.forEach((sub: string) => onToggleSubcategory?.(sub));
                        }}
                    >
                        Reset All Filters
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}

                <div className="ml-auto flex items-center bg-slate-100 p-1 rounded-md border border-slate-200">
                    <button
                        onClick={() => setIsGrouped(false)}
                        className={cn(
                            "px-3 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1.5",
                            !isGrouped ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <List className="w-3 h-3" /> List
                    </button>
                    <button
                        onClick={() => setIsGrouped(true)}
                        className={cn(
                            "px-3 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1.5",
                            isGrouped ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Layers className="w-3 h-3" /> Grouped
                    </button>
                </div>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => requestSort('parsedDate')}
                            >
                                <div className="flex items-center">
                                    Date {getSortIcon('parsedDate')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => requestSort('category')}
                            >
                                <div className="flex items-center">
                                    Category {getSortIcon('category')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => requestSort('subcategory')}
                            >
                                <div className="flex items-center">
                                    Subcategory {getSortIcon('subcategory')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => requestSort('description')}
                            >
                                <div className="flex items-center">
                                    Description {getSortIcon('description')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-right cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => requestSort('absAmount')}
                            >
                                <div className="flex items-center justify-end">
                                    Amount {getSortIcon('absAmount')}
                                </div>
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!isGrouped ? (
                            paginatedExpenses.map((expense, index) => (
                                <TableRow key={`${expense.rowId}-${index}`}>
                                    <TableCell className="font-medium">{expense.date}</TableCell>
                                    <TableCell>
                                        {inlineEditing?.rowId === expense.rowId && inlineEditing?.field === 'category' ? (
                                            <div className="flex items-center gap-1">
                                                <Select
                                                    value={inlineEditing.value}
                                                    onValueChange={(val) => setInlineEditing({ ...inlineEditing, value: val })}
                                                >
                                                    <SelectTrigger className="h-8 w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories?.filter(Boolean).map(cat => (
                                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={handleInlineSave} disabled={isSavingInline}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setInlineEditing(null)} disabled={isSavingInline}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="bg-slate-50 font-normal cursor-pointer hover:bg-slate-100"
                                                onClick={() => setInlineEditing({ rowId: expense.rowId, field: 'category', value: expense.category, originalValue: expense.category })}
                                            >
                                                {expense.category}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {inlineEditing?.rowId === expense.rowId && inlineEditing?.field === 'subcategory' ? (
                                            <div className="flex items-center gap-1">
                                                <Select
                                                    value={inlineEditing.value}
                                                    onValueChange={(val) => setInlineEditing({ ...inlineEditing, value: val })}
                                                >
                                                    <SelectTrigger className="h-8 w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(() => {
                                                            const availableSubs = expense.category
                                                                ? (categoryMapping[expense.category] || []).filter(s => subcategories?.includes(s))
                                                                : subcategories;
                                                            return availableSubs?.filter(Boolean).map(sub => (
                                                                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                                            ));
                                                        })()}
                                                    </SelectContent>
                                                </Select>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={handleInlineSave} disabled={isSavingInline}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setInlineEditing(null)} disabled={isSavingInline}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <span
                                                className="text-muted-foreground cursor-pointer hover:underline hover:text-slate-900 transition-colors"
                                                onClick={() => setInlineEditing({ rowId: expense.rowId, field: 'subcategory', value: expense.subcategory, originalValue: expense.subcategory })}
                                            >
                                                {expense.subcategory}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[250px]">
                                        {inlineEditing?.rowId === expense.rowId && inlineEditing?.field === 'description' ? (
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    className="h-8"
                                                    value={inlineEditing.value}
                                                    onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleInlineSave();
                                                        if (e.key === 'Escape') setInlineEditing(null);
                                                    }}
                                                    autoFocus
                                                />
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={handleInlineSave} disabled={isSavingInline}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div
                                                className="truncate cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"
                                                onClick={() => setInlineEditing({ rowId: expense.rowId, field: 'description', value: expense.description, originalValue: expense.description })}
                                            >
                                                {expense.description}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className={`text-right font-semibold ${expense.amount > 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                                        {expense.amount > 0 ? '+' : ''}
                                        {expense.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
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
                                    <TableRow className="bg-slate-50/80 hover:bg-slate-100 group transition-colors select-none">
                                        <TableCell colSpan={6} className="py-2.5">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => toggleCategoryExpand(catGroup.category)}
                                                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                                                    >
                                                        {expandedCategories.has(catGroup.category) ? (
                                                            <ChevronDownIcon className="w-4 h-4 text-slate-500" />
                                                        ) : (
                                                            <ChevronRightIcon className="w-4 h-4 text-slate-500" />
                                                        )}
                                                    </button>
                                                    <span
                                                        className="font-bold text-slate-800 cursor-pointer"
                                                        onClick={() => toggleCategoryExpand(catGroup.category)}
                                                    >
                                                        {catGroup.category}
                                                    </span>
                                                    <Badge variant="secondary" className="text-[10px] font-normal h-4 px-1">
                                                        {catGroup.count} txs
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-slate-500 font-medium">Group Total:</span>
                                                    <span className={cn(
                                                        "font-bold",
                                                        catGroup.total > 0 ? "text-emerald-600" : "text-slate-900"
                                                    )}>
                                                        {catGroup.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
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
                                                <TableRow className="bg-white hover:bg-slate-50/50 group transition-colors select-none">
                                                    <TableCell colSpan={6} className="py-2 pl-8 border-l-2 border-slate-100">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => toggleSubExpand(subKey)}
                                                                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                    ) : (
                                                                        <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                    )}
                                                                </button>
                                                                <span
                                                                    className="font-semibold text-slate-600 text-sm cursor-pointer"
                                                                    onClick={() => toggleSubExpand(subKey)}
                                                                >
                                                                    {sub.name}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    ({sub.count})
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 pr-2">
                                                                <span className={cn(
                                                                    "text-sm font-semibold",
                                                                    sub.total > 0 ? "text-emerald-500" : "text-slate-500"
                                                                )}>
                                                                    {sub.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && sub.transactions.map((expense: Expense, txIdx: number) => (
                                                    <TableRow key={`${expense.rowId}-${txIdx}`} className="bg-slate-50/10 hover:bg-slate-50 transition-colors">
                                                        <TableCell className="pl-14 text-xs text-slate-500">{expense.date}</TableCell>
                                                        <TableCell className="pl-14">
                                                            {inlineEditing?.rowId === expense.rowId && inlineEditing?.field === 'category' ? (
                                                                <div className="flex items-center gap-1">
                                                                    <Select
                                                                        value={inlineEditing.value}
                                                                        onValueChange={(val) => setInlineEditing({ ...inlineEditing, value: val })}
                                                                    >
                                                                        <SelectTrigger className="h-6 w-28 text-[10px]">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {categories?.filter(Boolean).map(cat => (
                                                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={handleInlineSave} disabled={isSavingInline}>
                                                                        <Check className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[10px] font-normal opacity-60 cursor-pointer hover:bg-slate-50"
                                                                    onClick={() => setInlineEditing({ rowId: expense.rowId, field: 'category', value: expense.category, originalValue: expense.category })}
                                                                >
                                                                    {expense.category}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-[10px] text-slate-400 italic">
                                                            {inlineEditing?.rowId === expense.rowId && inlineEditing?.field === 'subcategory' ? (
                                                                <div className="flex items-center gap-1">
                                                                    <Select
                                                                        value={inlineEditing.value}
                                                                        onValueChange={(val) => setInlineEditing({ ...inlineEditing, value: val })}
                                                                    >
                                                                        <SelectTrigger className="h-6 w-28 text-[10px]">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {(() => {
                                                                                const availableSubs = expense.category
                                                                                    ? (categoryMapping[expense.category] || []).filter(s => subcategories?.includes(s))
                                                                                    : subcategories;
                                                                                return availableSubs?.filter(Boolean).map(sub => (
                                                                                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                                                                ));
                                                                            })()}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={handleInlineSave} disabled={isSavingInline}>
                                                                        <Check className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <span
                                                                    className="cursor-pointer hover:underline"
                                                                    onClick={() => setInlineEditing({ rowId: expense.rowId, field: 'subcategory', value: expense.subcategory, originalValue: expense.subcategory })}
                                                                >
                                                                    {expense.subcategory}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px] truncate text-xs">
                                                            {inlineEditing?.rowId === expense.rowId && inlineEditing?.field === 'description' ? (
                                                                <div className="flex items-center gap-1">
                                                                    <Input
                                                                        className="h-6 text-xs"
                                                                        value={inlineEditing.value}
                                                                        onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleInlineSave();
                                                                            if (e.key === 'Escape') setInlineEditing(null);
                                                                        }}
                                                                        autoFocus
                                                                    />
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={handleInlineSave} disabled={isSavingInline}>
                                                                        <Check className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className="cursor-pointer hover:bg-slate-50 p-0.5 rounded"
                                                                    onClick={() => setInlineEditing({ rowId: expense.rowId, field: 'description', value: expense.description, originalValue: expense.description })}
                                                                >
                                                                    {expense.description}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className={cn(
                                                            "text-right text-xs font-medium",
                                                            expense.amount > 0 ? 'text-emerald-600' : 'text-slate-600'
                                                        )}>
                                                            {expense.amount > 0 ? '+' : ''}
                                                            {expense.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-slate-300 hover:text-blue-500"
                                                                onClick={() => setEditingExpense(expense)}
                                                            >
                                                                <Edit className="h-3 h-3" />
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
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No transactions found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {!isGrouped && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedExpenses.length)} of {sortedExpenses.length} transactions
                    </p>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm font-medium">
                            Page {currentPage} of {totalPages || 1}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <ChevronRight className="h-4 w-4" />
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
        </div>
    );
}
