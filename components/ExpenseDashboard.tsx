'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Expense, FilterState, TimeRange } from '@/lib/types/expense';
import { calculateMetrics, getDateRangeFromType } from '@/lib/data-utils';
import { MetricCards } from './MetricCards';
import { SpendingInsights } from './SpendingInsights';
import { FilterBar } from './FilterBar';
import { TransactionTable } from './TransactionTable';
import { TrendChart } from './Charts/TrendChart';
import { CategoryDonut } from './Charts/CategoryDonut';
import { SubcategoryBar } from './Charts/SubcategoryBar';
import { AveragesTable } from './AveragesTable';
import { RollupTable } from './RollupTable';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { getDefaultCSVData, importExpensesAction, fetchExpensesAction, getFilterDataAction, exportToCSVAction, backupDefaultCSVAction, getCategoryMappingAction } from '@/lib/actions';
import { Upload, Plus, Loader2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryMapping } from '@/lib/types/expense';

export default function ExpenseDashboard() {
    const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
    const [baseFilteredExpenses, setBaseFilteredExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [categoryMapping, setCategoryMapping] = useState<CategoryMapping>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        dateRange: { from: undefined, to: new Date() },
        timeRange: 'Custom',
        categories: [],
        subcategories: [],
        searchQuery: '',
    });
    const loadData = async (shouldImportDefault = false) => {
        setIsLoading(true);
        try {
            if (shouldImportDefault) {
                const csvText = await getDefaultCSVData();
                await importExpensesAction(csvText);
            }

            const [data, filterMetaData, mapping] = await Promise.all([
                fetchExpensesAction(filters),
                getFilterDataAction(),
                getCategoryMappingAction()
            ]);

            setFilteredExpenses(data);
            setCategories(filterMetaData.categories);
            setSubcategories(filterMetaData.subcategories);
            setCategoryMapping(mapping);

            // For AveragesTable (filtered by search/date only)
            const baseData = await fetchExpensesAction({
                ...filters,
                categories: [],
                subcategories: [],
            });
            setBaseFilteredExpenses(baseData);

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
            const [data, baseData] = await Promise.all([
                fetchExpensesAction(filters),
                fetchExpensesAction({
                    ...filters,
                    categories: [],
                    subcategories: [],
                })
            ]);
            setFilteredExpenses(data);
            setBaseFilteredExpenses(baseData);
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
        return calculateMetrics(filteredExpenses);
    }, [filteredExpenses]);

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
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        Personal Expense Analytics
                    </h1>
                    {filteredExpenses.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Active Period:
                            </span>
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                {filters.dateRange.from ? format(filters.dateRange.from, 'dd MMM yyyy') : format(new Date(Math.min(...filteredExpenses.map(e => e.parsedDate.getTime()))), 'dd MMM yyyy')}
                                <span className="mx-1.5 opacity-50">—</span>
                                {filters.dateRange.to ? format(filters.dateRange.to, 'dd MMM yyyy') : format(new Date(Math.max(...filteredExpenses.map(e => e.parsedDate.getTime()))), 'dd MMM yyyy')}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Export to CSV
                    </Button>
                    <input
                        type="file"
                        id="csv-upload-top"
                        className="hidden"
                        accept=".csv"
                        onChange={handleFileUpload}
                    />
                    <Button variant="outline" size="sm" asChild disabled={isImporting}>
                        <label htmlFor="csv-upload-top" className="cursor-pointer">
                            {isImporting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                            ) : (
                                <><Upload className="w-4 h-4 mr-2" /> Upload New CSV</>
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

            <SpendingInsights expenses={filteredExpenses} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Spending Trends</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <TrendChart expenses={filteredExpenses} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Category Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <CategoryDonut expenses={filteredExpenses} onToggleCategory={toggleCategory} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Monthly Averages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AveragesTable
                            expenses={baseFilteredExpenses}
                            filters={filters}
                            onToggleCategory={toggleCategory}
                            onToggleSubcategory={toggleSubcategory}
                            onSelectCategories={handleSelectCategories}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Top Subcategories</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <SubcategoryBar expenses={filteredExpenses} onToggleSubcategory={toggleSubcategory} />
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">Transactions</CardTitle>
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'list'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Detailed List
                        </button>
                        <button
                            onClick={() => setViewMode('rollup')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'rollup'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Roll-up View
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {viewMode === 'list' ? (
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
                </CardContent>
            </Card>
        </div >
    );
}
