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
        <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Smart Discovery</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Automated Intelligence & Planning</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <SavingsRateTrend data={insights.savingsTrend} />
                <RecurringMonitor
                    recurring={insights.recurring}
                    onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                />
                <BudgetTracker
                    budgets={insights.budgets}
                    expenses={expenses}
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
