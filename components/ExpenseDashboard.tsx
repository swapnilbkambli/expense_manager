'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Expense, FilterState, TimeRange } from '@/lib/types/expense';
import { parseExpenseCSV } from '@/lib/csv-parser';
import { filterExpenses, calculateMetrics, getDateRangeFromType } from '@/lib/data-utils';
import { MetricCards } from './MetricCards';
import { SpendingInsights } from './SpendingInsights';
import { FilterBar } from './FilterBar';
import { TransactionTable } from './TransactionTable';
import { TrendChart } from './Charts/TrendChart';
import { CategoryDonut } from './Charts/CategoryDonut';
import { SubcategoryBar } from './Charts/SubcategoryBar';
import { AveragesTable } from './AveragesTable';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { getDefaultCSVData } from '@/lib/actions';
import { Upload, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExpenseDashboard() {
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [filters, setFilters] = useState<FilterState>({
        dateRange: { from: undefined, to: new Date() },
        timeRange: 'Custom',
        categories: [],
        subcategories: [],
        searchQuery: '',
    });

    useEffect(() => {
        // Load default CSV on mount via Server Action
        const loadDefaultData = async () => {
            try {
                const csvText = await getDefaultCSVData();
                const parsed = await parseExpenseCSV(csvText);
                setAllExpenses(parsed);
            } catch (error) {
                console.error('Error loading default data:', error);
            }
        };
        loadDefaultData();
    }, []);

    const filteredExpenses = useMemo(() => {
        return filterExpenses(allExpenses, filters);
    }, [allExpenses, filters]);

    // Used for AveragesTable to keep all categories visible during multi-select
    const baseFilteredExpenses = useMemo(() => {
        return filterExpenses(allExpenses, {
            ...filters,
            categories: [],
            subcategories: [],
        });
    }, [allExpenses, filters.dateRange, filters.searchQuery]);

    const metrics = useMemo(() => {
        return calculateMetrics(filteredExpenses);
    }, [filteredExpenses]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const text = await file.text();
            const parsed = await parseExpenseCSV(text);
            setAllExpenses(parsed);
        }
    };

    const categories = useMemo(() => {
        const set = new Set(allExpenses.map((e) => e.category));
        return Array.from(set).sort();
    }, [allExpenses]);

    const subcategories = useMemo(() => {
        const set = new Set(
            allExpenses
                .filter((e) => filters.categories.length === 0 || filters.categories.includes(e.category))
                .map((e) => e.subcategory)
        );
        return Array.from(set).filter(Boolean).sort();
    }, [allExpenses, filters.categories]);

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

    if (allExpenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="p-12 border-2 border-dashed border-muted-foreground/25 rounded-2xl text-center bg-card">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-2xl font-semibold mb-2 text-foreground">Upload your CSV</h2>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                        Drag and drop your `expensemanager.csv` file here to get started with your analytics.
                    </p>
                    <input
                        type="file"
                        id="csv-upload"
                        className="hidden"
                        accept=".csv"
                        onChange={handleFileUpload}
                    />
                    <Button asChild>
                        <label htmlFor="csv-upload" className="cursor-pointer">
                            Choose File
                        </label>
                    </Button>
                </div>
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
                    {allExpenses.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Active Period:
                            </span>
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                {filters.dateRange.from ? format(filters.dateRange.from, 'dd MMM yyyy') : format(new Date(Math.min(...allExpenses.map(e => e.parsedDate.getTime()))), 'dd MMM yyyy')}
                                <span className="mx-1.5 opacity-50">—</span>
                                {filters.dateRange.to ? format(filters.dateRange.to, 'dd MMM yyyy') : format(new Date(Math.max(...allExpenses.map(e => e.parsedDate.getTime()))), 'dd MMM yyyy')}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        id="csv-upload-top"
                        className="hidden"
                        accept=".csv"
                        onChange={handleFileUpload}
                    />
                    <Button variant="outline" size="sm" asChild>
                        <label htmlFor="csv-upload-top" className="cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload New CSV
                        </label>
                    </Button>
                </div>
            </div>

            <FilterBar
                filters={filters}
                setFilters={setFilters}
                categories={categories}
                subcategories={subcategories}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Monthly Averages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AveragesTable
                            expenses={baseFilteredExpenses}
                            filters={filters}
                            onToggleCategory={toggleCategory}
                            onToggleSubcategory={toggleSubcategory}
                        />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Top Subcategories</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <SubcategoryBar expenses={filteredExpenses} onToggleSubcategory={toggleSubcategory} />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionTable expenses={filteredExpenses} onToggleCategory={toggleCategory} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
