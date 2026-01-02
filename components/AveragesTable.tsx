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
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter averages..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
                <div className="flex items-center gap-3 pr-1">
                    <button
                        className="text-[11px] uppercase font-bold text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
                        onClick={() => {
                            const cats = filteredData.map(d => d.category);
                            onSelectCategories?.(cats, true);
                        }}
                    >
                        Select All
                    </button>
                    <div className="w-[1px] h-3 bg-slate-200" />
                    <button
                        className="text-[11px] uppercase font-bold text-slate-500 hover:text-slate-700 transition-colors whitespace-nowrap"
                        onClick={() => {
                            const cats = filteredData.map(d => d.category);
                            onSelectCategories?.(cats, false);
                        }}
                    >
                        Clear All
                    </button>
                </div>
            </div>

            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="font-semibold">Subcategory</TableHead>
                            <TableHead className="text-right font-semibold">Monthly Avg</TableHead>
                            <TableHead className="text-right font-semibold">Total Period</TableHead>
                            <TableHead className="text-right font-semibold whitespace-nowrap">TXs</TableHead>
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
                                            "hover:bg-slate-50 transition-colors",
                                            categoryActive && "bg-blue-50/40"
                                        )}
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={categoryActive}
                                                onCheckedChange={() => onToggleCategory?.(categoryRow.category)}
                                            />
                                        </TableCell>
                                        <TableCell colSpan={2} className="font-bold text-slate-900 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleExpand(categoryRow.category)}
                                                    className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-slate-500" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-slate-500" />
                                                    )}
                                                </button>
                                                <span
                                                    className="cursor-pointer hover:underline"
                                                    onClick={() => onToggleCategory?.(categoryRow.category)}
                                                >
                                                    {categoryRow.category}
                                                </span>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-normal">
                                                    {categoryRow.subcategories.length} subs
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-blue-700">
                                            <span className={cn(viewMode === 'income' && "text-emerald-600")}>
                                                {formatCurrency(categoryRow.avg)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right text-slate-600 font-medium">
                                            {formatCurrency(categoryRow.total)}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-400 text-xs">{categoryRow.count}</TableCell>
                                    </TableRow>

                                    {isExpanded && categoryRow.subcategories.map((sub, subIndex) => {
                                        const subActive = filters.subcategories.includes(sub.subcategory);
                                        return (
                                            <TableRow
                                                key={`${categoryRow.category}-${sub.subcategory}`}
                                                className={cn(
                                                    "bg-slate-50/30 hover:bg-slate-50 transition-colors",
                                                    subActive && "bg-blue-50/20"
                                                )}
                                            >
                                                <TableCell className="pl-8">
                                                    <Checkbox
                                                        checked={subActive}
                                                        onCheckedChange={() => onToggleSubcategory?.(sub.subcategory)}
                                                    />
                                                </TableCell>
                                                <TableCell className="pl-4 text-slate-400 text-xs w-[40px]">
                                                    └─
                                                </TableCell>
                                                <TableCell className="text-slate-600 font-medium translate-x-[-15px]">
                                                    <span
                                                        className="cursor-pointer hover:underline"
                                                        onClick={() => onToggleSubcategory?.(sub.subcategory)}
                                                    >
                                                        {sub.subcategory}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right text-blue-500 font-semibold">
                                                    <span className={cn(viewMode === 'income' && "text-emerald-500")}>
                                                        {formatCurrency(sub.avg)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right text-slate-500 text-sm">{formatCurrency(sub.total)}</TableCell>
                                                <TableCell className="text-right text-slate-300 text-[10px]">{sub.count}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <p className="text-xs text-muted-foreground italic px-1">
                * Monthly average calculated based on aggregated spend across the selected time range.
            </p>
        </div>
    );
}
