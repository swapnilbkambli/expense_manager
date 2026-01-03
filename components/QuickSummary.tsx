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
                <Card key={period.key} className="group relative border border-white/40 bg-white/40 backdrop-blur-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-4 relative z-10">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            {period.label}
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between group/line">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg group-hover/line:bg-emerald-500 group-hover/line:text-white transition-colors duration-300">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Income</span>
                                </div>
                                <span className="text-sm font-black text-slate-900 tabular-nums">
                                    {period.data.income.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between group/line">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg group-hover/line:bg-rose-500 group-hover/line:text-white transition-colors duration-300">
                                        <TrendingDown className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Spent</span>
                                </div>
                                <span className="text-sm font-black text-slate-900 tabular-nums">
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
