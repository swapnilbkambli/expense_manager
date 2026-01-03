'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { getAdvancedInsightsAction } from '../lib/actions';
import { AdvancedInsights, Expense } from '../lib/types/expense';
import SavingsRateTrend from './SavingsRateTrend';
import RecurringMonitor from './RecurringMonitor';
import AnomalyDetector from './AnomalyDetector';
import BudgetTracker from './BudgetTracker';

interface SmartInsightsProps {
    expenses: Expense[];
}

export default function SmartInsights({ expenses }: SmartInsightsProps) {
    const [insights, setInsights] = useState<AdvancedInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const fetchInsights = async () => {
            setLoading(true);
            try {
                const data = await getAdvancedInsightsAction();
                setInsights(data);
            } catch (error) {
                console.error('Failed to fetch insights:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, [expenses, refreshTrigger]);

    if (loading && !insights) {
        return (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Analysing Financial Patterns...</p>
            </div>
        );
    }

    if (!insights) return null;

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between border-b border-indigo-100/30 pb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Sparkles className="w-6 h-6 text-white relative z-10" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent">Smart Intelligence</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            Automated Pattern Analysis & Forecasting
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <SavingsRateTrend data={insights.savingsTrend} />
                <RecurringMonitor
                    recurring={insights.recurring}
                    onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                />
                <AnomalyDetector
                    anomalies={insights.anomalies}
                    onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                />
            </div>
        </div>
    );
}
