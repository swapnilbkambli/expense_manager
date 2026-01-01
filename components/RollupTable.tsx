'use client';

import React, { useMemo, useState } from 'react';
import { Expense, FilterState } from '@/lib/types/expense';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    format,
    startOfMonth,
    eachMonthOfInterval,
    eachYearOfInterval,
    isSameMonth,
    isSameYear
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, CalendarRange } from 'lucide-react';

interface RollupTableProps {
    expenses: Expense[];
    filters: FilterState;
}

export function RollupTable({ expenses, filters }: RollupTableProps) {
    const expenseOnly = useMemo(() => expenses.filter(e => e.amount < 0), [expenses]);

    // Auto-detect view mode based on date range if not manually set
    const dateRange = useMemo(() => {
        if (expenseOnly.length === 0) return null;
        const dates = expenseOnly.map(e => e.parsedDate.getTime());
        return {
            min: new Date(Math.min(...dates)),
            max: new Date(Math.max(...dates))
        };
    }, [expenseOnly]);

    const defaultMode = useMemo(() => {
        if (!dateRange) return 'monthly';
        return dateRange.max.getFullYear() - dateRange.min.getFullYear() > 0 ? 'yearly' : 'monthly';
    }, [dateRange]);

    const [mode, setMode] = useState<'monthly' | 'yearly'>(defaultMode);

    const periods = useMemo(() => {
        if (!dateRange) return [];
        if (mode === 'yearly') {
            return eachYearOfInterval({ start: dateRange.min, end: dateRange.max });
        } else {
            return eachMonthOfInterval({ start: dateRange.min, end: dateRange.max });
        }
    }, [dateRange, mode]);

    const data = useMemo(() => {
        const categories = Array.from(new Set(expenseOnly.map(e => e.category))).sort();
        const rollup: Record<string, Record<string, number>> = {};

        categories.forEach(cat => {
            rollup[cat] = {};
            periods.forEach(p => {
                const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                rollup[cat][key] = 0;
            });
        });

        expenseOnly.forEach(e => {
            const periodKey = mode === 'yearly' ? format(e.parsedDate, 'yyyy') : format(e.parsedDate, 'MMM yyyy');
            if (rollup[e.category] && rollup[e.category].hasOwnProperty(periodKey)) {
                rollup[e.category][periodKey] += Math.abs(e.amount);
            }
        });

        return { categories, rollup };
    }, [expenseOnly, periods, mode]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    if (expenseOnly.length === 0) {
        return (
            <div className="h-40 flex items-center justify-center text-muted-foreground italic">
                No expense data available for the selected period.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant={mode === 'monthly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMode('monthly')}
                        className="h-8"
                    >
                        Monthly
                    </Button>
                    <Button
                        variant={mode === 'yearly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMode('yearly')}
                        className="h-8"
                    >
                        Yearly
                    </Button>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarRange className="w-3 h-3" />
                    {mode === 'yearly' ? 'Yearly' : 'Monthly'} aggregation
                </div>
            </div>

            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-bold min-w-[150px] sticky left-0 bg-slate-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Category
                            </TableHead>
                            {periods.map(p => (
                                <TableHead key={p.getTime()} className="text-right font-bold whitespace-nowrap px-4">
                                    {mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yy')}
                                </TableHead>
                            ))}
                            <TableHead className="text-right font-bold bg-blue-50 text-blue-700 min-w-[100px]">
                                Total
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.categories.map(cat => {
                            let rowTotal = 0;
                            return (
                                <TableRow key={cat}>
                                    <TableCell className="font-medium sticky left-0 bg-white z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {cat}
                                    </TableCell>
                                    {periods.map(p => {
                                        const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                                        const val = data.rollup[cat][key] || 0;
                                        rowTotal += val;
                                        return (
                                            <TableCell key={p.getTime()} className="text-right">
                                                {val > 0 ? formatCurrency(val) : '-'}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-right font-bold bg-blue-50/30 text-blue-700">
                                        {formatCurrency(rowTotal)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        <TableRow className="bg-slate-100/50 font-bold">
                            <TableCell className="sticky left-0 bg-slate-100/50 z-10 border-r">
                                TOTAL
                            </TableCell>
                            {periods.map(p => {
                                const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                                let colTotal = 0;
                                data.categories.forEach(cat => {
                                    colTotal += data.rollup[cat][key] || 0;
                                });
                                return (
                                    <TableCell key={p.getTime()} className="text-right">
                                        {formatCurrency(colTotal)}
                                    </TableCell>
                                );
                            })}
                            <TableCell className="text-right bg-blue-100 text-blue-800">
                                {formatCurrency(
                                    periods.reduce((acc, p) => {
                                        const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                                        let colTotal = 0;
                                        data.categories.forEach(cat => {
                                            colTotal += data.rollup[cat][key] || 0;
                                        });
                                        return acc + colTotal;
                                    }, 0)
                                )}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
