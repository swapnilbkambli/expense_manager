'use client';

import React, { useMemo, useState } from 'react';
import { CategoryMapping, Expense, FilterState } from '@/lib/types/expense';
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
import { ArrowLeftRight, CalendarRange, X, ListFilter, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Edit } from 'lucide-react';
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
import { EditTransactionModal } from './EditTransactionModal';
import { cn } from '@/lib/utils';

interface RollupTableProps {
    expenses: Expense[];
    filters: FilterState;
    onToggleCategory?: (category: string) => void;
    onToggleSubcategory?: (subcategory: string) => void;
    categories?: string[];
    subcategories?: string[];
    categoryMapping: CategoryMapping;
    onRefresh?: () => void;
}

export function RollupTable({
    expenses,
    filters,
    onToggleCategory,
    onToggleSubcategory,
    categories,
    subcategories,
    categoryMapping,
    onRefresh
}: RollupTableProps) {
    const viewMode = filters.viewMode;
    const dataRecords = useMemo(() => expenses.filter(e => viewMode === 'expense' ? e.amount < 0 : e.amount > 0), [expenses, viewMode]);

    // Use global filters if available
    const activeCategories = filters?.categories || [];
    const activeSubcategories = filters?.subcategories || [];
    // Auto-detect view mode based on date range if not manually set
    const dateRange = useMemo(() => {
        if (dataRecords.length === 0) return null;
        const dates = dataRecords.map(e => e.parsedDate.getTime());
        return {
            min: new Date(Math.min(...dates)),
            max: new Date(Math.max(...dates))
        };
    }, [dataRecords]);

    const defaultMode = useMemo(() => {
        if (!dateRange) return 'monthly';
        return dateRange.max.getFullYear() - dateRange.min.getFullYear() > 0 ? 'yearly' : 'monthly';
    }, [dateRange]);

    const [mode, setMode] = useState<'monthly' | 'yearly'>(defaultMode);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [drillDownData, setDrillDownData] = useState<{
        category: string;
        periodLabel: string;
        expenses: Expense[];
    } | null>(null);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const [modalSortConfig, setModalSortConfig] = useState<{
        key: 'parsedDate' | 'category' | 'subcategory' | 'payeePayer' | 'absAmount';
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

    const handleModalSort = (key: 'parsedDate' | 'category' | 'subcategory' | 'payeePayer' | 'absAmount') => {
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

    const toggleCategoryExpand = (cat: string) => {
        const next = new Set(expandedCategories);
        if (next.has(cat)) next.delete(cat);
        else next.add(cat);
        setExpandedCategories(next);
    };

    const data = useMemo(() => {
        const catMap: Record<string, {
            periodTotals: Record<string, number>;
            subcategories: Record<string, Record<string, number>>;
        }> = {};

        const allPeriodKeys = periods.map(p =>
            mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy')
        );

        dataRecords.forEach(e => {
            const cat = e.category || 'Uncategorized';
            const sub = e.subcategory || 'Other';
            const periodKey = mode === 'yearly' ? format(e.parsedDate, 'yyyy') : format(e.parsedDate, 'MMM yyyy');

            if (!catMap[cat]) {
                catMap[cat] = {
                    periodTotals: {},
                    subcategories: {}
                };
                allPeriodKeys.forEach(pk => catMap[cat].periodTotals[pk] = 0);
            }

            if (!catMap[cat].subcategories[sub]) {
                catMap[cat].subcategories[sub] = {};
                allPeriodKeys.forEach(pk => catMap[cat].subcategories[sub][pk] = 0);
            }

            if (catMap[cat].periodTotals.hasOwnProperty(periodKey)) {
                catMap[cat].periodTotals[periodKey] += Math.abs(e.amount);
            }
            if (catMap[cat].subcategories[sub].hasOwnProperty(periodKey)) {
                catMap[cat].subcategories[sub][periodKey] += Math.abs(e.amount);
            }
        });

        const sortedCategories = Object.keys(catMap).sort((a, b) => {
            const totalA = Object.values(catMap[a].periodTotals).reduce((sum, val) => sum + val, 0);
            const totalB = Object.values(catMap[b].periodTotals).reduce((sum, val) => sum + val, 0);
            return totalB - totalA;
        });

        return { categories: sortedCategories, catMap };
    }, [dataRecords, periods, mode]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    if (dataRecords.length === 0) {
        return (
            <div className="h-40 flex items-center justify-center text-muted-foreground italic">
                No data available for the selected period ({viewMode}).
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-6 bg-white/30 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {categories && categories.length > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-white/40 bg-white/50 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white hover:text-indigo-600 transition-all shadow-sm active:scale-95">
                                    Browse Categories {activeCategories.length > 0 && <span className="ml-2 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md text-[9px]">{activeCategories.length}</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3 rounded-2xl border-white/40 backdrop-blur-xl bg-white/90 shadow-2xl" align="start">
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Domain</span>
                                        {activeCategories.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                onClick={() => activeCategories.forEach((cat: string) => onToggleCategory?.(cat))}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {categories.map(cat => (
                                            <div key={cat} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-indigo-50/50 rounded-xl transition-colors group">
                                                <Checkbox
                                                    id={`rollup-cat-${cat}`}
                                                    checked={activeCategories.includes(cat)}
                                                    onCheckedChange={() => onToggleCategory?.(cat)}
                                                    className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                />
                                                <label htmlFor={`rollup-cat-${cat}`} className="text-xs font-bold text-slate-600 group-hover:text-indigo-900 cursor-pointer flex-1">
                                                    {cat}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}

                    {subcategories && subcategories.length > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-white/40 bg-white/50 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white hover:text-indigo-600 transition-all shadow-sm active:scale-95">
                                    Refine Segments {activeSubcategories.length > 0 && <span className="ml-2 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md text-[9px]">{activeSubcategories.length}</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3 rounded-2xl border-white/40 backdrop-blur-xl bg-white/90 shadow-2xl" align="start">
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Segment</span>
                                        {activeSubcategories.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                onClick={() => activeSubcategories.forEach((sub: string) => onToggleSubcategory?.(sub))}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {(() => {
                                            const availableSubs = filters?.categories && filters.categories.length > 0
                                                ? Array.from(new Set(filters.categories.flatMap(cat => categoryMapping[cat] || [])))
                                                    .filter(s => subcategories?.includes(s))
                                                    .sort()
                                                : subcategories || [];

                                            return availableSubs.map(sub => (
                                                <div key={sub} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-indigo-50/50 rounded-xl transition-colors group">
                                                    <Checkbox
                                                        id={`rollup-sub-${sub}`}
                                                        checked={activeSubcategories.includes(sub)}
                                                        onCheckedChange={() => onToggleSubcategory?.(sub)}
                                                        className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                    />
                                                    <label htmlFor={`rollup-sub-${sub}`} className="text-xs font-bold text-slate-600 group-hover:text-indigo-900 cursor-pointer flex-1">
                                                        {sub}
                                                    </label>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}

                    {(activeCategories.length > 0 || activeSubcategories.length > 0) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            onClick={() => {
                                activeCategories.forEach((cat: string) => onToggleCategory?.(cat));
                                activeSubcategories.forEach((sub: string) => onToggleSubcategory?.(sub));
                            }}
                        >
                            Reset Focus
                            <X className="ml-2 h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>

                <div className="flex items-center bg-white/50 p-1 rounded-xl border border-white/60 shadow-inner">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMode('monthly')}
                        className={cn(
                            "h-8 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            mode === 'monthly' ? "bg-indigo-500 text-white shadow-md shadow-indigo-200" : "text-slate-400 hover:text-indigo-600"
                        )}
                    >
                        Monthly
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMode('yearly')}
                        className={cn(
                            "h-8 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            mode === 'yearly' ? "bg-indigo-500 text-white shadow-md shadow-indigo-200" : "text-slate-400 hover:text-indigo-600"
                        )}
                    >
                        Yearly
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl border border-white/40 overflow-hidden shadow-sm bg-white/30 backdrop-blur-sm">
                <div className="overflow-x-auto custom-scrollbar">
                    <Table>
                        <TableHeader className="bg-indigo-50/50 border-b border-indigo-100/50">
                            <TableRow>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 h-14 min-w-[240px] sticky left-0 bg-white z-10 border-r border-indigo-50 shadow-[4px_0_12px_-4px_rgba(79,70,229,0.08)]">
                                    Financial Domain / Segment
                                </TableHead>
                                {periods.map(p => (
                                    <TableHead key={p.getTime()} className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500 h-14 whitespace-nowrap px-6 border-r border-indigo-50/20">
                                        {mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yy')}
                                    </TableHead>
                                ))}
                                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-indigo-600 bg-indigo-50/80 h-14 min-w-[120px] pr-8">
                                    Total
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.categories.map(cat => {
                                const isExpanded = expandedCategories.has(cat);
                                const catData = data.catMap[cat];
                                let catTotal = 0;

                                return (
                                    <React.Fragment key={cat}>
                                        <TableRow className="group transition-colors border-indigo-50/20">
                                            <TableCell className="sticky left-0 bg-white/95 group-hover:bg-indigo-50/30 z-10 border-r border-indigo-50 shadow-[4px_0_12px_-4px_rgba(79,70,229,0.08)] py-3">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => toggleCategoryExpand(cat)}
                                                        className="p-1.5 hover:bg-white rounded-lg transition-all shadow-sm active:scale-95 bg-white/50 border border-indigo-50"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-4 h-4 text-indigo-500" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-slate-300" />
                                                        )}
                                                    </button>
                                                    <span
                                                        className="font-black text-[13px] tracking-tight text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
                                                        onClick={() => toggleCategoryExpand(cat)}
                                                    >
                                                        {cat}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            {periods.map(p => {
                                                const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                                                const val = catData.periodTotals[key] || 0;
                                                catTotal += val;

                                                const periodExpenses = dataRecords.filter(e => {
                                                    const pKey = mode === 'yearly' ? format(e.parsedDate, 'yyyy') : format(e.parsedDate, 'MMM yyyy');
                                                    return e.category === cat && pKey === key;
                                                });

                                                return (
                                                    <TableCell key={p.getTime()} className="text-right p-0 border-r border-indigo-50/10">
                                                        {val > 0 ? (
                                                            <Button
                                                                variant="ghost"
                                                                className="w-full justify-end h-14 px-6 font-black text-sm tracking-tight text-slate-800 hover:bg-indigo-50/50 hover:text-indigo-700 rounded-none transition-all group-hover:bg-white/40"
                                                                onClick={() => setDrillDownData({
                                                                    category: cat,
                                                                    periodLabel: key,
                                                                    expenses: periodExpenses
                                                                })}
                                                            >
                                                                {formatCurrency(val)}
                                                            </Button>
                                                        ) : (
                                                            <div className="h-14 flex items-center justify-end px-6 group-hover:bg-white/20 transition-colors">
                                                                <span className="text-[10px] font-black text-slate-200 italic tracking-widest opacity-40">--</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="text-right font-black text-sm tracking-tight text-indigo-600 bg-indigo-50/40 pr-8 group-hover:bg-indigo-100/50 transition-colors">
                                                {formatCurrency(catTotal)}
                                            </TableCell>
                                        </TableRow>

                                        {isExpanded && Object.keys(catData.subcategories).sort().map(sub => {
                                            let subTotal = 0;
                                            const subData = catData.subcategories[sub];
                                            return (
                                                <TableRow key={`${cat}-${sub}`} className="bg-white/40 hover:bg-indigo-50/20 transition-colors group/sub">
                                                    <TableCell className="pl-12 sticky left-0 bg-white/95 group-hover/sub:bg-indigo-50/30 z-10 border-r border-indigo-50 shadow-[4px_0_12px_-4px_rgba(79,70,229,0.08)] py-2 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-indigo-200/60 font-black text-[10px]">└─</span>
                                                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 group-hover/sub:text-indigo-600 transition-colors">{sub}</span>
                                                        </div>
                                                    </TableCell>
                                                    {periods.map(p => {
                                                        const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                                                        const val = subData[key] || 0;
                                                        subTotal += val;

                                                        const periodExpenses = dataRecords.filter(e => {
                                                            const pKey = mode === 'yearly' ? format(e.parsedDate, 'yyyy') : format(e.parsedDate, 'MMM yyyy');
                                                            return e.category === cat && (e.subcategory || 'Other') === sub && pKey === key;
                                                        });

                                                        return (
                                                            <TableCell key={p.getTime()} className="text-right p-0 border-r border-indigo-50/5">
                                                                {val > 0 ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="w-full justify-end h-11 px-6 text-[12px] font-bold tracking-tight text-slate-400 hover:bg-white/80 hover:text-indigo-500 rounded-none transition-all"
                                                                        onClick={() => setDrillDownData({
                                                                            category: `${cat} / ${sub}`,
                                                                            periodLabel: key,
                                                                            expenses: periodExpenses
                                                                        })}
                                                                    >
                                                                        {formatCurrency(val)}
                                                                    </Button>
                                                                ) : (
                                                                    <div className="h-11 flex items-center justify-end px-6 group-hover/sub:bg-white/20 transition-colors">
                                                                        <span className="text-[9px] font-black text-slate-200 opacity-20 transform scale-x-75">-</span>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell className="text-right font-black text-[12px] tracking-tight text-indigo-400 bg-indigo-50/20 pr-8 group-hover/sub:bg-indigo-50/40 transition-colors">
                                                        {formatCurrency(subTotal)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                            <TableRow className="bg-indigo-600 hover:bg-indigo-700 transition-colors select-none">
                                <TableCell className="h-14 sticky left-0 bg-indigo-600 z-10 border-r border-indigo-500/30">
                                    <span className="font-black text-[10px] uppercase tracking-[0.3em] text-white/90 pl-3">Total Rollup</span>
                                </TableCell>
                                {periods.map(p => {
                                    const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                                    let colTotal = 0;
                                    data.categories.forEach(cat => {
                                        colTotal += data.catMap[cat].periodTotals[key] || 0;
                                    });
                                    return (
                                        <TableCell key={p.getTime()} className="text-right pr-6 h-14 border-r border-indigo-500/30">
                                            <span className="font-black text-sm tracking-tight text-white leading-none">
                                                {formatCurrency(colTotal)}
                                            </span>
                                        </TableCell>
                                    );
                                })}
                                <TableCell className="text-right bg-indigo-900 pr-8 h-14">
                                    <span className="font-black text-base tracking-tight text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] leading-none">
                                        {formatCurrency(
                                            periods.reduce((acc, p) => {
                                                const key = mode === 'yearly' ? format(p, 'yyyy') : format(p, 'MMM yyyy');
                                                let colTotal = 0;
                                                data.categories.forEach(cat => {
                                                    colTotal += data.catMap[cat].periodTotals[key] || 0;
                                                });
                                                return acc + colTotal;
                                            }, 0)
                                        )}
                                    </span>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={!!drillDownData} onOpenChange={(open) => !open && setDrillDownData(null)}>
                <DialogContent className="max-w-[95vw] w-full sm:max-w-[1000px] h-[85vh] overflow-hidden flex flex-col p-8 rounded-[2rem] border-white/40 backdrop-blur-3xl bg-white/80 shadow-2xl">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="flex items-center gap-4 text-2xl font-black tracking-tight text-slate-800">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <ListFilter className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span>Transaction Inventory</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">
                                    Deep Dive Analysis
                                </span>
                            </div>
                        </DialogTitle>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100/50">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block mb-0.5">Focus Area</span>
                                <span className="text-xs font-black text-indigo-600">{drillDownData?.category}</span>
                            </div>
                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Time Period</span>
                                <span className="text-xs font-black text-slate-600">{drillDownData?.periodLabel}</span>
                            </div>
                            <div className="bg-white/50 px-4 py-2 rounded-xl border border-white mx-auto ml-auto mr-0 shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Record Count</span>
                                <span className="text-xs font-black text-indigo-600">{drillDownData?.expenses.length} Entries</span>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto custom-scrollbar rounded-2xl border border-indigo-50 shadow-inner bg-white/40 backdrop-blur-sm">
                        <Table>
                            <TableHeader className="bg-indigo-50/30 sticky top-0 z-20 backdrop-blur-md">
                                <TableRow>
                                    <TableHead
                                        className="w-[120px] h-14 cursor-pointer hover:bg-white/50 transition-colors font-black text-[10px] uppercase tracking-widest text-slate-500"
                                        onClick={() => handleModalSort('parsedDate')}
                                    >
                                        <div className="flex items-center gap-2 pl-4">
                                            Date {getModalSortIcon('parsedDate')}
                                        </div>
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer h-14 hover:bg-white/50 transition-colors font-black text-[10px] uppercase tracking-widest text-slate-500"
                                        onClick={() => handleModalSort('payeePayer')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Payee / Activity {getModalSortIcon('payeePayer')}
                                        </div>
                                    </TableHead>
                                    <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-slate-500">Activity Detail</TableHead>
                                    <TableHead
                                        className="text-right w-[150px] h-14 cursor-pointer hover:bg-white/50 transition-colors font-black text-[10px] uppercase tracking-widest text-slate-500"
                                        onClick={() => handleModalSort('absAmount')}
                                    >
                                        <div className="flex items-center justify-end gap-2 pr-4">
                                            Value {getModalSortIcon('absAmount')}
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[80px] h-14"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedDrillDownExpenses.map((expense, idx) => (
                                    <TableRow key={`${expense.rowId}-${idx}`} className="hover:bg-indigo-50/20 transition-colors group">
                                        <TableCell className="pl-6 py-4">
                                            <span className="text-xs font-black text-slate-400 tracking-tighter">
                                                {format(expense.parsedDate, 'dd-MM-yyyy')}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-black text-slate-800 tracking-tight block max-w-xs truncate group-hover:text-indigo-900 transition-colors">
                                                {expense.payeePayer || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[11px] font-bold text-slate-400 italic">
                                                {expense.description}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <span className="text-sm font-black tracking-tight text-slate-900">
                                                {Math.abs(expense.amount).toLocaleString('en-IN', {
                                                    style: 'currency',
                                                    currency: 'INR',
                                                    maximumFractionDigits: 0
                                                })}
                                            </span>
                                        </TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-95"
                                                onClick={() => setEditingExpense(expense)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            {editingExpense && (
                <EditTransactionModal
                    expense={editingExpense}
                    isOpen={!!editingExpense}
                    onClose={() => setEditingExpense(null)}
                    onSuccess={() => {
                        setEditingExpense(null);
                        onRefresh?.();
                    }}
                    categories={categories || []}
                    subcategories={subcategories || []}
                    categoryMapping={categoryMapping}
                />
            )}
        </div>
    );
}
