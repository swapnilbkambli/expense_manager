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
    isSameYear,
    parse
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, CalendarRange, X, ListFilter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface RollupTableProps {
    expenses: Expense[];
    filters: FilterState;
    onToggleCategory?: (category: string) => void;
    onToggleSubcategory?: (subcategory: string) => void;
    categories?: string[];
    subcategories?: string[];
}

export function RollupTable({
    expenses,
    filters,
    onToggleCategory,
    onToggleSubcategory,
    categories,
    subcategories
}: RollupTableProps) {
    const expenseOnly = useMemo(() => expenses.filter(e => e.amount < 0), [expenses]);

    // Use global filters if available
    const activeCategories = filters?.categories || [];
    const activeSubcategories = filters?.subcategories || [];
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
    const [groupBy, setGroupBy] = useState<'category' | 'subcategory'>('category');
    const [drillDownData, setDrillDownData] = useState<{
        rowValue: string;
        periodLabel: string;
        expenses: Expense[];
    } | null>(null);

    const [modalSortConfig, setModalSortConfig] = useState<{
        key: 'parsedDate' | 'payeePayer' | 'absAmount';
        direction: 'asc' | 'desc';
    }>({ key: 'parsedDate', direction: 'desc' });

    const sortedDrillDownExpenses = useMemo(() => {
        if (!drillDownData) return [];
        return [...drillDownData.expenses].sort((a, b) => {
            let aVal: any;
            let bVal: any;

            if (modalSortConfig.key === 'absAmount') {
                aVal = Math.abs(a.amount);
                bVal = Math.abs(b.amount);
            } else if (modalSortConfig.key === 'parsedDate') {
                aVal = a.parsedDate.getTime();
                bVal = b.parsedDate.getTime();
            } else {
                aVal = (a[modalSortConfig.key] || '').toLowerCase();
                bVal = (b[modalSortConfig.key] || '').toLowerCase();
            }

            if (aVal < bVal) return modalSortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return modalSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [drillDownData, modalSortConfig]);

    const handleModalSort = (key: 'parsedDate' | 'payeePayer' | 'absAmount') => {
        setModalSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getModalSortIcon = (key: string) => {
        if (modalSortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        return modalSortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    const periods = useMemo(() => {
        // Use global filter range if available, otherwise fallback to data range
        const start = filters.dateRange.from || dateRange?.min;
        const end = filters.dateRange.to || dateRange?.max;

        if (!start || !end) return [];

        if (mode === 'yearly') {
            return eachYearOfInterval({ start, end });
        } else {
            return eachMonthOfInterval({ start, end });
        }
    }, [filters.dateRange, dateRange, mode]);

    const data = useMemo(() => {
        const rows = Array.from(new Set(expenseOnly.map(e => (groupBy === 'category' ? e.category : e.subcategory) || 'Other'))).sort();
        const rollup: Record<string, Record<string, number>> = {};

        rows.forEach(row => {
            rollup[row] = {};
            periods.forEach(p => {
                const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                rollup[row][key] = 0;
            });
        });

        expenseOnly.forEach(e => {
            const periodKey = mode === 'yearly' ? format(e.parsedDate, 'yyyy') : format(e.parsedDate, 'MMM yyyy');
            const rowValue = (groupBy === 'category' ? e.category : e.subcategory) || 'Other';
            if (rollup[rowValue] && rollup[rowValue].hasOwnProperty(periodKey)) {
                rollup[rowValue][periodKey] += Math.abs(e.amount);
            }
        });

        return { rows, rollup };
    }, [expenseOnly, periods, mode, groupBy]);

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
                                            id={`rollup-cat-${cat}`}
                                            checked={activeCategories.includes(cat)}
                                            onCheckedChange={() => onToggleCategory?.(cat)}
                                        />
                                        <label htmlFor={`rollup-cat-${cat}`} className="text-sm font-normal cursor-pointer flex-1">
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
                                {subcategories.map(sub => (
                                    <div key={sub} className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-50 rounded">
                                        <Checkbox
                                            id={`rollup-sub-${sub}`}
                                            checked={activeSubcategories.includes(sub)}
                                            onCheckedChange={() => onToggleSubcategory?.(sub)}
                                        />
                                        <label htmlFor={`rollup-sub-${sub}`} className="text-sm font-normal cursor-pointer flex-1">
                                            {sub}
                                        </label>
                                    </div>
                                ))}
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
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-md border text-[10px] font-bold uppercase mr-2">
                        <button
                            className={`px-3 py-1 rounded-sm transition-all ${groupBy === 'category' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                            onClick={() => setGroupBy('category')}
                        >
                            Category
                        </button>
                        <button
                            className={`px-3 py-1 rounded-sm transition-all ${groupBy === 'subcategory' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                            onClick={() => setGroupBy('subcategory')}
                        >
                            Subcategory
                        </button>
                    </div>
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
                    {mode === 'yearly' ? 'Yearly' : 'Monthly'} by {groupBy}
                </div>
            </div>

            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-bold min-w-[200px] sticky left-0 bg-slate-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                {groupBy === 'category' ? 'Category' : 'Subcategory'}
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
                        {data.rows.map(rowVal => {
                            let rowTotal = 0;
                            return (
                                <TableRow key={rowVal}>
                                    <TableCell className="font-medium sticky left-0 bg-white z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {rowVal}
                                    </TableCell>
                                    {periods.map(p => {
                                        const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                                        const val = data.rollup[rowVal][key] || 0;
                                        rowTotal += val;

                                        const periodExpenses = expenseOnly.filter(e => {
                                            const pKey = mode === 'yearly' ? format(e.parsedDate, 'yyyy') : format(e.parsedDate, 'MMM yyyy');
                                            const eRowVal = (groupBy === 'category' ? e.category : e.subcategory) || 'Other';
                                            return eRowVal === rowVal && pKey === key;
                                        });

                                        return (
                                            <TableCell key={p.getTime()} className="text-right p-0">
                                                {val > 0 ? (
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-end h-10 font-normal hover:bg-blue-50 hover:text-blue-600 rounded-none transition-colors"
                                                        onClick={() => setDrillDownData({
                                                            rowValue: rowVal,
                                                            periodLabel: key,
                                                            expenses: periodExpenses
                                                        })}
                                                    >
                                                        {formatCurrency(val)}
                                                    </Button>
                                                ) : (
                                                    <span className="text-muted-foreground mr-4">-</span>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-right font-bold bg-blue-50/30 text-blue-700 pr-4">
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
                                data.rows.forEach(row => {
                                    colTotal += data.rollup[row][key] || 0;
                                });
                                return (
                                    <TableCell key={p.getTime()} className="text-right pr-4">
                                        {formatCurrency(colTotal)}
                                    </TableCell>
                                );
                            })}
                            <TableCell className="text-right bg-blue-100 text-blue-800 pr-4">
                                {formatCurrency(
                                    periods.reduce((acc, p) => {
                                        const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                                        let colTotal = 0;
                                        data.rows.forEach(row => {
                                            colTotal += data.rollup[row][key] || 0;
                                        });
                                        return acc + colTotal;
                                    }, 0)
                                )}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!drillDownData} onOpenChange={(open) => !open && setDrillDownData(null)}>
                <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <ListFilter className="w-5 h-5 text-blue-600" />
                            Transactions Details
                        </DialogTitle>
                        <DialogDescription>
                            Showing <strong>{drillDownData?.expenses.length}</strong> transactions for
                            <Badge variant="outline" className="mx-1 bg-slate-50">{drillDownData?.rowValue}</Badge>
                            in <strong>{drillDownData?.periodLabel}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto mt-4 rounded-md border">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-20">
                                <TableRow>
                                    <TableHead
                                        className="w-[120px] cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleModalSort('parsedDate')}
                                    >
                                        <div className="flex items-center">
                                            Date {getModalSortIcon('parsedDate')}
                                        </div>
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleModalSort('payeePayer')}
                                    >
                                        <div className="flex items-center">
                                            Payee/Payer {getModalSortIcon('payeePayer')}
                                        </div>
                                    </TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead
                                        className="text-right w-[150px] cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleModalSort('absAmount')}
                                    >
                                        <div className="flex items-center justify-end">
                                            Amount {getModalSortIcon('absAmount')}
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedDrillDownExpenses.map((expense, idx) => (
                                    <TableRow key={`${expense.rowId}-${idx}`}>
                                        <TableCell className="whitespace-nowrap font-medium">
                                            {expense.date}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {expense.payeePayer || '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground italic">
                                            {expense.description}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-foreground">
                                            {Math.abs(expense.amount).toLocaleString('en-IN', {
                                                style: 'currency',
                                                currency: 'INR'
                                            })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
