'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SummaryMetrics } from '@/lib/types/expense';
import { getSummaryMetricsAction } from '@/lib/actions';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface QuickSummaryProps {
    refreshTrigger?: number;
}

export function QuickSummary({ refreshTrigger = 0 }: QuickSummaryProps) {
    const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);

    const loadMetrics = useCallback(async () => {
        try {
            const data = await getSummaryMetricsAction();
            setMetrics(data);
        } catch (error) {
            console.error('Failed to load summary metrics:', error);
        }
    }, []);

    useEffect(() => {
        loadMetrics();
    }, [loadMetrics, refreshTrigger]);

    if (!metrics) return null;

    const periods = [
        { key: 'today', label: 'Today', data: metrics.today },
        { key: 'thisWeek', label: 'This Week', data: metrics.thisWeek },
        { key: 'thisMonth', label: 'This Month', data: metrics.thisMonth },
        { key: 'ytd', label: 'Year to Date', data: metrics.ytd },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {periods.map((period) => (
                <Card key={period.key} className="border-none shadow-sm bg-white overflow-hidden transition-all hover:shadow-md">
                    <CardContent className="p-4">
                        <div className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest mb-3 border-b border-slate-50 pb-1">{period.label}</div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-600">
                                    <div className="p-1 bg-emerald-50 rounded-full">
                                        <TrendingUp className="w-3 h-3" />
                                    </div>
                                    <span className="text-[12px] font-bold uppercase tracking-tight">Income</span>
                                </div>
                                <span className="text-[15px] font-black text-slate-900">
                                    {period.data.income.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-rose-500">
                                    <div className="p-1 bg-rose-50 rounded-full">
                                        <TrendingDown className="w-3 h-3" />
                                    </div>
                                    <span className="text-[12px] font-bold uppercase tracking-tight">Expenses</span>
                                </div>
                                <span className="text-[15px] font-black text-slate-900">
                                    {period.data.expenses.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
