'use client';

import React, { useMemo } from 'react';
import { Expense } from '@/lib/types/expense';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    subMonths,
    isSameDay,
    startOfWeek,
    endOfWeek,
    addDays
} from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SpendingHeatmapProps {
    expenses: Expense[];
}

export function SpendingHeatmap({ expenses }: SpendingHeatmapProps) {
    const heatmapData = useMemo(() => {
        // We'll show the last 6 months by default, or the range covered by expenses
        const today = new Date();
        const endDate = today;
        const startDate = subMonths(today, 5); // 6 months total

        const days = eachDayOfInterval({ start: startDate, end: endDate });

        const dailySpending: { [key: string]: number } = {};
        expenses.filter(e => e.amount < 0).forEach(e => {
            const key = format(e.parsedDate, 'yyyy-MM-dd');
            dailySpending[key] = (dailySpending[key] || 0) + Math.abs(e.amount);
        });

        const maxSpend = Math.max(...Object.values(dailySpending), 1000);

        return {
            days,
            dailySpending,
            maxSpend,
            startDate,
            endDate
        };
    }, [expenses]);

    // Group days by week for the grid
    const weeks = useMemo(() => {
        const result: Date[][] = [];
        let currentWeek: Date[] = [];

        // Align to the start of the first week
        const firstDay = startOfWeek(heatmapData.startDate);
        const lastDay = endOfWeek(heatmapData.endDate);
        const allDays = eachDayOfInterval({ start: firstDay, end: lastDay });

        allDays.forEach((day, i) => {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                result.push(currentWeek);
                currentWeek = [];
            }
        });

        return result;
    }, [heatmapData]);

    const getColorIntensity = (amount: number) => {
        if (!amount || amount === 0) return 'bg-white/40 border border-white/60';
        const ratio = amount / heatmapData.maxSpend;
        if (ratio < 0.2) return 'bg-indigo-100/50 border border-indigo-200/50';
        if (ratio < 0.4) return 'bg-indigo-300/60 border border-indigo-400/50';
        if (ratio < 0.6) return 'bg-indigo-500/80 border border-indigo-600/50';
        if (ratio < 0.8) return 'bg-indigo-600 border border-indigo-700/50 shadow-sm shadow-indigo-100';
        return 'bg-indigo-800 border border-indigo-900/50 shadow-md shadow-indigo-200';
    };

    return (
        <div className="glass-card bg-white/40 backdrop-blur-md rounded-[2rem] border border-white/60 p-8 shadow-2xl shadow-indigo-500/5 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Financial Velocity</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Daily Spend Intensity Mapping</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar pb-2">
                <div className="min-w-[700px]">
                    <div className="flex gap-4">
                        {/* Days of week labels */}
                        <div className="flex flex-col gap-2 pr-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 justify-between pt-8 h-[110px]">
                            <span>Mon</span>
                            <span>Wed</span>
                            <span>Fri</span>
                            <span>Sun</span>
                        </div>

                        {/* The Grid */}
                        <div className="flex gap-1.5">
                            <TooltipProvider>
                                {weeks.map((week, weekIdx) => (
                                    <div key={weekIdx} className="flex flex-col gap-1.5">
                                        {/* Month labels */}
                                        <div className="h-4 text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">
                                            {week[0].getDate() <= 7 ? format(week[0], 'MMM') : ''}
                                        </div>
                                        {week.map((day, dayIdx) => {
                                            const key = format(day, 'yyyy-MM-dd');
                                            const amount = heatmapData.dailySpending[key] || 0;
                                            const intensity = getColorIntensity(amount);
                                            const isFuture = day > new Date();
                                            const isPastStart = day < heatmapData.startDate;

                                            return (
                                                <Tooltip key={dayIdx}>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className={cn(
                                                                "w-3.5 h-3.5 rounded-md transition-all duration-300 cursor-pointer active:scale-90",
                                                                intensity,
                                                                (isFuture || isPastStart) && "opacity-20 bg-slate-100 border-none pointer-events-none"
                                                            )}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="p-3 border-white/40 backdrop-blur-xl bg-white/95 rounded-2xl shadow-2xl border-none">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">
                                                                {format(day, 'EEEE, MMM do')}
                                                            </span>
                                                            <span className="text-sm font-black text-indigo-600 tabular-nums">
                                                                {amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                            </span>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                ))}
                            </TooltipProvider>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-end gap-3 px-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Quiescent</span>
                        <div className="flex gap-1">
                            <div className="w-3.5 h-3.5 rounded-md bg-white/40 border border-white/60" />
                            <div className="w-3.5 h-3.5 rounded-md bg-indigo-100/50" />
                            <div className="w-3.5 h-3.5 rounded-md bg-indigo-300/60" />
                            <div className="w-3.5 h-3.5 rounded-md bg-indigo-500/80" />
                            <div className="w-3.5 h-3.5 rounded-md bg-indigo-700 shadow-sm" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Volatile</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
