'use client';

import React, { useMemo, useState } from 'react';
import { Expense } from '@/lib/types/expense';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { differenceInMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { FilterState } from '@/lib/types/expense';
import { cn } from '@/lib/utils';

interface AveragesTableProps {
    expenses: Expense[];
    onToggleCategory?: (category: string) => void;
    onToggleSubcategory?: (subcategory: string) => void;
    onSelectCategories?: (categories: string[], select: boolean) => void;
    filters: FilterState;
}

export function AveragesTable({ expenses, onToggleCategory, onToggleSubcategory, onSelectCategories, filters }: AveragesTableProps) {
    const [localSearch, setLocalSearch] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const viewMode = filters.viewMode;

    const toggleExpand = (category: string) => {
        const newSet = new Set(expandedCategories);
        if (newSet.has(category)) {
            newSet.delete(category);
        } else {
            newSet.add(category);
        }
        setExpandedCategories(newSet);
    };

    const hierarchicalData = useMemo(() => {
        const isExpense = viewMode === 'expense';
        const dataRecords = expenses.filter((e) => isExpense ? e.amount < 0 : e.amount > 0);
        if (dataRecords.length === 0) return [];

        // Sort to get date range
        const sorted = [...dataRecords].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
        const startDate = sorted[0].parsedDate;
        const endDate = sorted[sorted.length - 1].parsedDate;
        const monthsRange = Math.max(1, differenceInMonths(endOfMonth(endDate), startOfMonth(startDate)) + 1);

        const categoryMap: {
            [key: string]: {
                total: number;
                count: number;
                subcategories: { [key: string]: { total: number; count: number } }
            }
        } = {};

        dataRecords.forEach((e) => {
            if (!categoryMap[e.category]) {
                categoryMap[e.category] = { total: 0, count: 0, subcategories: {} };
            }
            categoryMap[e.category].total += Math.abs(e.amount);
            categoryMap[e.category].count += 1;

            const sub = e.subcategory || 'Other';
            if (!categoryMap[e.category].subcategories[sub]) {
                categoryMap[e.category].subcategories[sub] = { total: 0, count: 0 };
            }
            categoryMap[e.category].subcategories[sub].total += Math.abs(e.amount);
            categoryMap[e.category].subcategories[sub].count += 1;
        });

        return Object.entries(categoryMap)
            .map(([category, data]) => ({
                category,
                total: data.total,
                avg: data.total / monthsRange,
                count: data.count,
                subcategories: Object.entries(data.subcategories)
                    .map(([subcategory, subData]) => ({
                        subcategory,
                        total: subData.total,
                        avg: subData.total / monthsRange,
                        count: subData.count,
                    }))
                    .sort((a, b) => b.avg - a.avg),
            }))
            .sort((a, b) => b.avg - a.avg);
    }, [expenses]);

    const filteredData = useMemo(() => {
        if (!localSearch) return hierarchicalData;
        const search = localSearch.toLowerCase();
        return hierarchicalData.filter((cat) => {
            const catMatch = cat.category.toLowerCase().includes(search);
            const subMatch = cat.subcategories.some(s => s.subcategory.toLowerCase().includes(search));
            return catMatch || subMatch;
        });
    }, [hierarchicalData, localSearch]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (hierarchicalData.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-6 px-1">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input
                        placeholder="Filter benchmarks..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="pl-10 h-10 bg-white/50 border-white/40 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl transition-all font-bold text-sm"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <button
                        className="text-[10px] uppercase font-black text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap tracking-[0.1em]"
                        onClick={() => {
                            const cats = filteredData.map(d => d.category);
                            onSelectCategories?.(cats, true);
                        }}
                    >
                        Focus All
                    </button>
                    <div className="w-[1px] h-4 bg-slate-200/50" />
                    <button
                        className="text-[10px] uppercase font-black text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap tracking-[0.1em]"
                        onClick={() => {
                            const cats = filteredData.map(d => d.category);
                            onSelectCategories?.(cats, false);
                        }}
                    >
                        Reset Selection
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-white/40 overflow-hidden shadow-sm bg-white/30 backdrop-blur-sm">
                <Table>
                    <TableHeader className="bg-indigo-50/50 border-b border-indigo-100/50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Category</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Breakdown</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">Monthly Target</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">Period Total</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500 px-6">Count</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.map((categoryRow, catIndex) => {
                            const categoryActive = filters.categories.includes(categoryRow.category);
                            const isExpanded = expandedCategories.has(categoryRow.category);

                            return (
                                <React.Fragment key={categoryRow.category}>
                                    <TableRow
                                        className={cn(
                                            "hover:bg-white/60 transition-colors border-indigo-50/50",
                                            categoryActive && "bg-indigo-500/10"
                                        )}
                                    >
                                        <TableCell className="pl-6">
                                            <Checkbox
                                                checked={categoryActive}
                                                onCheckedChange={() => onToggleCategory?.(categoryRow.category)}
                                                className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                            />
                                        </TableCell>
                                        <TableCell colSpan={2} className="py-4">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => toggleExpand(categoryRow.category)}
                                                    className="p-1.5 hover:bg-white rounded-lg transition-all shadow-sm active:scale-95"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-indigo-500" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </button>
                                                <div className="flex flex-col">
                                                    <span
                                                        className="font-black text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors tracking-tight text-sm"
                                                        onClick={() => onToggleCategory?.(categoryRow.category)}
                                                    >
                                                        {categoryRow.category}
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                                        <span className="w-1 h-1 rounded-full bg-indigo-400 opacity-40" />
                                                        {categoryRow.subcategories.length} Segments
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={cn(
                                                "font-black text-sm tracking-tight",
                                                viewMode === 'income' ? "text-emerald-600" : "text-indigo-600"
                                            )}>
                                                {formatCurrency(categoryRow.avg)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-sm font-bold text-slate-600 tracking-tight">
                                                {formatCurrency(categoryRow.total)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{categoryRow.count}</span>
                                        </TableCell>
                                    </TableRow>

                                    {isExpanded && categoryRow.subcategories.map((sub, subIndex) => {
                                        const subActive = filters.subcategories.includes(sub.subcategory);
                                        return (
                                            <TableRow
                                                key={`${categoryRow.category}-${sub.subcategory}`}
                                                className={cn(
                                                    "bg-white/20 hover:bg-white/40 transition-colors border-indigo-50/20",
                                                    subActive && "bg-indigo-500/5"
                                                )}
                                            >
                                                <TableCell className="pl-12">
                                                    <Checkbox
                                                        checked={subActive}
                                                        onCheckedChange={() => onToggleSubcategory?.(sub.subcategory)}
                                                        className="border-slate-300 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                                    />
                                                </TableCell>
                                                <TableCell className="w-[50px] p-0 text-center">
                                                    <span className="text-indigo-200 font-bold opacity-30 tracking-tighter">└─</span>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <span
                                                        className="cursor-pointer hover:text-indigo-600 text-slate-600 font-black text-xs uppercase tracking-wider transition-colors"
                                                        onClick={() => onToggleSubcategory?.(sub.subcategory)}
                                                    >
                                                        {sub.subcategory}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={cn(
                                                        "font-black text-xs tracking-tight",
                                                        viewMode === 'income' ? "text-emerald-500" : "text-indigo-500"
                                                    )}>
                                                        {formatCurrency(sub.avg)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="text-xs font-black text-slate-400 tracking-tight">
                                                        {formatCurrency(sub.total)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right px-6">
                                                    <span className="text-[9px] font-black text-slate-200 tracking-[0.2em]">{sub.count}</span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic px-2 opacity-60">
                * Benchmarks calculated over the selected active time window
            </p>
        </div>
    );
}
