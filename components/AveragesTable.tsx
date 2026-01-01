'use client';

import { Expense } from '@/lib/types/expense';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useMemo, useState } from 'react';
import { differenceInMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { FilterState } from '@/lib/types/expense';
import { cn } from '@/lib/utils';

interface AveragesTableProps {
    expenses: Expense[];
    onToggleCategory?: (category: string) => void;
    onToggleSubcategory?: (subcategory: string) => void;
    filters: FilterState;
}

export function AveragesTable({ expenses, onToggleCategory, onToggleSubcategory, filters }: AveragesTableProps) {
    const [localSearch, setLocalSearch] = useState('');

    const rawData = useMemo(() => {
        const expenseRecords = expenses.filter((e) => e.amount < 0);
        if (expenseRecords.length === 0) return [];

        // Grouping
        const groupings: { [key: string]: { total: number; count: number } } = {};

        // Sort to get date range for average calculation
        const sorted = [...expenseRecords].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
        const startDate = sorted[0].parsedDate;
        const endDate = sorted[sorted.length - 1].parsedDate;
        const monthsRange = Math.max(1, differenceInMonths(endOfMonth(endDate), startOfMonth(startDate)) + 1);

        expenseRecords.forEach((e) => {
            const key = `${e.category} > ${e.subcategory || 'Other'}`;
            if (!groupings[key]) {
                groupings[key] = { total: 0, count: 0 };
            }
            groupings[key].total += Math.abs(e.amount);
            groupings[key].count += 1;
        });

        return Object.entries(groupings)
            .map(([key, value]) => {
                const [category, subcategory] = key.split(' > ');
                return {
                    category,
                    subcategory,
                    total: value.total,
                    avg: value.total / monthsRange,
                    count: value.count,
                };
            })
            .sort((a, b) => b.avg - a.avg);
    }, [expenses]);

    const filteredData = useMemo(() => {
        if (!localSearch) return rawData;
        const search = localSearch.toLowerCase();
        return rawData.filter(
            (row) =>
                row.category.toLowerCase().includes(search) ||
                row.subcategory.toLowerCase().includes(search)
        );
    }, [rawData, localSearch]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (rawData.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Filter averages..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="pl-9 h-9"
                />
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
                        {filteredData.map((row, index) => {
                            const categoryActive = filters.categories.includes(row.category);
                            const subcategoryActive = filters.subcategories.includes(row.subcategory);
                            const rowActive = categoryActive || subcategoryActive;

                            return (
                                <TableRow
                                    key={index}
                                    className={cn(
                                        "hover:bg-slate-50/50 transition-colors",
                                        rowActive && "bg-blue-50/30"
                                    )}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={rowActive}
                                            onCheckedChange={() => {
                                                // If subcategory exists, toggle it
                                                if (row.subcategory && row.subcategory !== 'Other') {
                                                    onToggleSubcategory?.(row.subcategory);
                                                } else {
                                                    onToggleCategory?.(row.category);
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-900">
                                        <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => onToggleCategory?.(row.category)}
                                        >
                                            {row.category}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-slate-500">
                                        <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => row.subcategory !== 'Other' && onToggleSubcategory?.(row.subcategory)}
                                        >
                                            {row.subcategory}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-blue-600">{formatCurrency(row.avg)}</TableCell>
                                    <TableCell className="text-right text-slate-600">{formatCurrency(row.total)}</TableCell>
                                    <TableCell className="text-right text-slate-400 text-xs">{row.count}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <p className="text-xs text-muted-foreground italic px-1">
                * Monthly average calculated based on the selected time range.
            </p>
        </div>
    );
}
