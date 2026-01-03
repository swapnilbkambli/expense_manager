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
        if (!amount || amount === 0) return 'bg-slate-50';
        const ratio = amount / heatmapData.maxSpend;
        if (ratio < 0.2) return 'bg-blue-100';
        if (ratio < 0.4) return 'bg-blue-200';
        if (ratio < 0.6) return 'bg-blue-300';
        if (ratio < 0.8) return 'bg-blue-500';
        return 'bg-blue-700';
    };

    return (
        <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-50 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800">Spending Heatmap (Daily)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 overflow-x-auto">
                <div className="min-w-[700px]">
                    <div className="flex gap-1">
                        {/* Days of week labels */}
                        <div className="flex flex-col gap-1 pr-2 text-[10px] text-slate-400 font-medium justify-between pt-6 h-[100px]">
                            <span>Mon</span>
                            <span>Wed</span>
                            <span>Fri</span>
                            <span>Sun</span>
                        </div>

                        {/* The Grid */}
                        <div className="flex gap-1">
                            <TooltipProvider>
                                {weeks.map((week, weekIdx) => (
                                    <div key={weekIdx} className="flex flex-col gap-1">
                                        {/* Month labels (sparse) */}
                                        <div className="h-4 text-[10px] text-slate-400 mb-1">
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
                                                                "w-3 h-3 rounded-sm transition-colors",
                                                                intensity,
                                                                (isFuture || isPastStart) && "opacity-20 bg-slate-100"
                                                            )}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs font-medium">
                                                            {format(day, 'PPP')}
                                                        </p>
                                                        <p className="text-xs font-bold text-blue-600">
                                                            {amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                ))}
                            </TooltipProvider>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-slate-400 font-medium">
                        <span>Less</span>
                        <div className="w-3 h-3 bg-slate-50 rounded-sm" />
                        <div className="w-3 h-3 bg-blue-100 rounded-sm" />
                        <div className="w-3 h-3 bg-blue-300 rounded-sm" />
                        <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                        <div className="w-3 h-3 bg-blue-700 rounded-sm" />
                        <span>More</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
