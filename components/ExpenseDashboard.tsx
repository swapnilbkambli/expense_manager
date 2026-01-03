'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { calculateMetrics, getDateRangeFromType, getPreviousPeriod } from '@/lib/data-utils';
import { DashboardMetrics, Expense, FilterState, TimeRange, CategoryMapping } from '@/lib/types/expense';
import { MetricCards } from './MetricCards';
import { SpendingInsights } from './SpendingInsights';
import { FilterBar } from './FilterBar';
import { TransactionTable } from './TransactionTable';
import { TrendChart } from './Charts/TrendChart';
import { CategoryDonut } from './Charts/CategoryDonut';
import { SubcategoryBar } from './Charts/SubcategoryBar';
import { AveragesTable } from './AveragesTable';
import { RollupTable } from './RollupTable';
import { SpendingHeatmap } from './SpendingHeatmap';
import { SankeyFlow } from './SankeyFlow';
import { QuickSummary } from './QuickSummary';
import SmartInsights from './SmartInsights';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDefaultCSVData, importExpensesAction, fetchExpensesAction, getFilterDataAction, exportToCSVAction, backupDefaultCSVAction, getCategoryMappingAction, getBudgetsAction, getExpenseCountAction, syncWithSourceAction } from '@/lib/actions';
import { Upload, Plus, Loader2, Download, Target, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BudgetTracker from './BudgetTracker';
import { CategoryBudget } from '@/lib/types/expense';

export default function ExpenseDashboard() {
    const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
    const [baseFilteredExpenses, setBaseFilteredExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [categoryMapping, setCategoryMapping] = useState<CategoryMapping>({});
    const [isLoading, setIsLoading] = useState(true);
    const [transactionView, setTransactionView] = useState<'list' | 'rollup'>('list');
    const [isImporting, setIsImporting] = useState(false);
    const [prevMetrics, setPrevMetrics] = useState<DashboardMetrics | null>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [budgets, setBudgets] = useState<CategoryBudget[]>([]);

    const [filters, setFilters] = useState<FilterState>({
        dateRange: getDateRangeFromType('YTD'),
        timeRange: 'YTD',
        categories: [],
        subcategories: [],
        searchQuery: '',
        viewMode: 'expense',
    });
    const [isSankeyExpanded, setIsSankeyExpanded] = useState(false);
    const [isHeatmapExpanded, setIsHeatmapExpanded] = useState(false);

    const loadData = async (shouldCheckPersistence = false) => {
        setIsLoading(true);
        try {
            if (shouldCheckPersistence) {
                const count = await getExpenseCountAction();
                if (count === 0) {
                    console.log('Database is empty, importing default CSV...');
                    const csvText = await getDefaultCSVData();
                    await importExpensesAction(csvText);
                }
            }

            const [data, filterMetaData, mapping, fullData, budgetData] = await Promise.all([
                fetchExpensesAction(filters),
                getFilterDataAction(),
                getCategoryMappingAction(),
                fetchExpensesAction({ ...filters, dateRange: { from: undefined, to: undefined }, timeRange: 'All Time', categories: [], subcategories: [], searchQuery: '' }),
                getBudgetsAction()
            ]);

            setFilteredExpenses(data);
            setAllExpenses(fullData);
            setBudgets(budgetData);
            setCategories(filterMetaData.categories);
            setSubcategories(filterMetaData.subcategories);

            // Merge file mapping with actual DB mapping for maximum coverage
            const combinedMapping = { ...mapping };
            if (filterMetaData.dbMapping) {
                Object.entries(filterMetaData.dbMapping).forEach(([cat, subs]) => {
                    const existing = combinedMapping[cat] || [];
                    const merged = Array.from(new Set([...existing, ...(subs as string[])]));
                    combinedMapping[cat] = merged;
                });
            }
            setCategoryMapping(combinedMapping);

            // For AveragesTable (filtered by search/date only)
            const baseData = await fetchExpensesAction({
                ...filters,
                categories: [],
                subcategories: [],
            });
            setBaseFilteredExpenses(baseData);
            setRefreshCounter(prev => prev + 1);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData(true);
    }, []);

    const refreshData = async () => {
        try {
            const prevPeriod = getPreviousPeriod(filters.dateRange.from, filters.dateRange.to);
            const [data, baseData, prevData, budgetData] = await Promise.all([
                fetchExpensesAction(filters),
                fetchExpensesAction({
                    ...filters,
                    categories: [],
                    subcategories: [],
                }),
                prevPeriod.from ? fetchExpensesAction({ ...filters, dateRange: prevPeriod }) : Promise.resolve([]),
                getBudgetsAction()
            ]);
            setFilteredExpenses(data);
            setBaseFilteredExpenses(baseData);
            setBudgets(budgetData);
            setPrevMetrics(calculateMetrics(prevData));
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    };

    // Re-fetch data whenever filters change (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isLoading) {
                refreshData();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [filters]);

    const metrics = useMemo(() => {
        const current = calculateMetrics(filteredExpenses);
        return {
            ...current,
            prevTotalIncome: prevMetrics?.totalIncome,
            prevTotalExpenses: prevMetrics?.totalExpenses,
            prevNetSavings: prevMetrics?.netSavings,
        };
    }, [filteredExpenses, prevMetrics]);

    const handleSync = async () => {
        setIsImporting(true);
        try {
            const result = await syncWithSourceAction();
            if (result.success) {
                await loadData();
                alert(`Successfully synced ${result.count} transactions from source.`);
            } else {
                alert(`Sync failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Sync error:', error);
            alert('An error occurred during sync.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsImporting(true);
            try {
                const text = await file.text();
                const result = await importExpensesAction(text);
                if (result.success) {
                    await loadData(false);
                } else {
                    alert('Failed to import CSV: ' + result.error);
                }
            } catch (error) {
                console.error('Upload error:', error);
            } finally {
                setIsImporting(false);
            }
        }
    };

    const [viewMode, setViewMode] = useState<'list' | 'rollup'>('list');

    const handleExportCSV = async () => {
        try {
            // First take a server-side backup as requested
            const backupResult = await backupDefaultCSVAction();
            if (!backupResult.success) {
                console.warn('Backup failed, but proceeding with export:', backupResult.error);
            }

            const csv = await exportToCSVAction();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);

            // The download name is already timestamped to avoid overwriting 
            // but the user can choose to overwrite manually. 
            // The server backup we just took protects the source file.
            link.setAttribute('download', `expensemanager_updated_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export CSV');
        }
    };

    const toggleCategory = (category: string) => {
        setFilters((prev) => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter((c) => c !== category)
                : [...prev.categories, category],
        }));
    };

    const toggleSubcategory = (sub: string) => {
        setFilters((prev) => ({
            ...prev,
            subcategories: prev.subcategories.includes(sub)
                ? prev.subcategories.filter((s) => s !== sub)
                : [...prev.subcategories, sub],
        }));
    };

    const handleSelectCategories = (cats: string[], select: boolean) => {
        setFilters((prev) => {
            const newCategories = select
                ? Array.from(new Set([...prev.categories, ...cats]))
                : prev.categories.filter((c) => !cats.includes(c));
            return { ...prev, categories: newCategories, subcategories: [] };
        });
    };

    if (isLoading && filteredExpenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-muted-foreground animate-pulse font-medium">Initializing Secure Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 p-2 sm:p-4 rounded-3xl bg-slate-50/30 backdrop-blur-sm border border-white/20 shadow-2xl shadow-indigo-500/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-indigo-100/30">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                        Financial Intelligence
                    </h1>
                    {filteredExpenses.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Monitored Period:
                            </span>
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-indigo-500 text-white shadow-lg shadow-indigo-100 uppercase tracking-wider">
                                {filters.dateRange.from ? format(filters.dateRange.from, 'dd MMM yyyy') : format(new Date(Math.min(...filteredExpenses.map(e => e.parsedDate.getTime()))), 'dd MMM yyyy')}
                                <span className="mx-2 opacity-50">—</span>
                                {filters.dateRange.to ? format(filters.dateRange.to, 'dd MMM yyyy') : format(new Date(Math.max(...filteredExpenses.map(e => e.parsedDate.getTime()))), 'dd MMM yyyy')}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleSync}
                        disabled={isImporting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-[0.15em] px-5 h-11 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                        {isImporting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Sync Intelligence
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-11 px-5 rounded-xl border-white/60 bg-white/50 backdrop-blur-sm font-black uppercase text-[10px] tracking-[0.15em] text-slate-600 hover:bg-white hover:text-indigo-600 transition-all shadow-sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                    </Button>
                    <input
                        type="file"
                        id="csv-upload-top"
                        className="hidden"
                        accept=".csv"
                        onChange={handleFileUpload}
                    />
                    <Button variant="outline" size="sm" asChild disabled={isImporting} className="h-11 px-5 rounded-xl border-white/60 bg-white/50 backdrop-blur-sm font-black uppercase text-[10px] tracking-[0.15em] text-slate-600 hover:bg-white hover:text-indigo-600 transition-all shadow-sm">
                        <label htmlFor="csv-upload-top" className="cursor-pointer">
                            {isImporting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> ...</>
                            ) : (
                                <><Upload className="w-4 h-4 mr-2" /> Import Local</>
                            )}
                        </label>
                    </Button>
                </div>
            </div>

            <FilterBar
                filters={filters}
                setFilters={setFilters}
                categories={categories}
                subcategories={subcategories}
                categoryMapping={categoryMapping}
            />

            <MetricCards metrics={metrics} />

            <div className="w-full">
                <BudgetTracker
                    budgets={budgets}
                    expenses={allExpenses}
                    onRefresh={refreshData}
                />
            </div>

            <QuickSummary refreshTrigger={refreshCounter} />

            <div className="space-y-12">
                {/* Sankey Flow Section (Collapsible) */}
                <div className="relative">
                    <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg font-black text-slate-800">Sankey Fund Flow</CardTitle>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Income to Category Distribution</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSankeyExpanded(!isSankeyExpanded)}
                                className="font-bold text-slate-600"
                            >
                                {isSankeyExpanded ? 'Hide Chart' : 'Show Chart'}
                            </Button>
                        </CardHeader>
                        {isSankeyExpanded && (
                            <CardContent className="p-0 border-t border-slate-50">
                                <SankeyFlow expenses={filteredExpenses} />
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* Smart Insights Section */}
                <div className="relative py-8 border-t border-b border-slate-100 bg-slate-50/10 -mx-4 px-4 sm:-mx-6 sm:px-6">
                    <SmartInsights expenses={allExpenses} />
                </div>

                {/* Primary Metrics & Summaries */}
                <SpendingInsights expenses={filteredExpenses} viewMode={filters.viewMode} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 rounded-2xl border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-50 pb-4">
                        <CardTitle className="text-lg font-bold text-slate-800">
                            {filters.viewMode === 'expense' ? 'Spending Trends' : 'Income Trends'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <TrendChart expenses={filteredExpenses} viewMode={filters.viewMode} />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1 ring-1 ring-slate-200 shadow-sm overflow-hidden rounded-2xl">
                    <CardHeader className="bg-white border-b border-slate-50 pb-4 text-center">
                        <CardTitle className="text-lg font-bold text-slate-800">
                            {filters.viewMode === 'expense' ? 'Expense Distribution' : 'Income Distribution'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 h-[350px]">
                        <CategoryDonut expenses={filteredExpenses} onToggleCategory={toggleCategory} viewMode={filters.viewMode} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-50 pb-4">
                        <CardTitle className="text-lg font-bold text-slate-800">
                            {filters.viewMode === 'expense' ? 'Top Expense Subcategories' : 'Top Income Subcategories'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 h-[400px]">
                        <SubcategoryBar expenses={filteredExpenses} onToggleSubcategory={toggleSubcategory} viewMode={filters.viewMode} />
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-50 pb-4">
                        <CardTitle className="text-lg font-bold text-slate-800">
                            {filters.viewMode === 'expense' ? 'Monthly Expense Averages' : 'Monthly Income Averages'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <AveragesTable
                            expenses={baseFilteredExpenses}
                            onToggleCategory={toggleCategory}
                            onToggleSubcategory={toggleSubcategory}
                            onSelectCategories={handleSelectCategories}
                            filters={filters}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Daily Heatmap (Collapsible) */}
            <div className="my-8">
                <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg font-black text-slate-800">Daily Activity Heatmap</CardTitle>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Spending Frequency & Velocity</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsHeatmapExpanded(!isHeatmapExpanded)}
                            className="font-bold text-slate-600"
                        >
                            {isHeatmapExpanded ? 'Hide Calendar' : 'Show Calendar'}
                        </Button>
                    </CardHeader>
                    {isHeatmapExpanded && (
                        <CardContent className="p-0 border-t border-slate-50">
                            <SpendingHeatmap expenses={filteredExpenses} />
                        </CardContent>
                    )}
                </Card>
            </div>

            <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-50 pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-800">
                        Detailed {filters.viewMode === 'expense' ? 'Expenses' : 'Income'}
                    </CardTitle>
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setTransactionView('list')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                transactionView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            Detailed List
                        </button>
                        <button
                            onClick={() => setTransactionView('rollup')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                transactionView === 'rollup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            Roll-up View
                        </button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4">
                        {transactionView === 'list' ? (
                            <TransactionTable
                                expenses={filteredExpenses}
                                onToggleCategory={toggleCategory}
                                onToggleSubcategory={toggleSubcategory}
                                filters={filters}
                                categories={categories}
                                subcategories={subcategories}
                                categoryMapping={categoryMapping}
                                onRefresh={refreshData}
                            />
                        ) : (
                            <RollupTable
                                expenses={filteredExpenses}
                                filters={filters}
                                onToggleCategory={toggleCategory}
                                onToggleSubcategory={toggleSubcategory}
                                categories={categories}
                                subcategories={subcategories}
                                categoryMapping={categoryMapping}
                                onRefresh={refreshData}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
