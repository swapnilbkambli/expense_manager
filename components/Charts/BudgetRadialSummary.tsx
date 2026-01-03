'use client';

import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface ColorTheme {
    ring1: string; // Inner (Monthly)
    ring2: string; // Outer (Yearly)
    bg: string;
    border: string;
    text: string;
}

const THEMES: { [key: string]: { primary: string; secondary: string; bg: string; border: string; glow: string } } = {
    indigo: { primary: '#6366f1', secondary: '#818cf8', bg: 'bg-indigo-50/40', border: 'border-indigo-100/50', glow: 'shadow-indigo-500/20' },
    rose: { primary: '#f43f5e', secondary: '#fb7185', bg: 'bg-rose-50/40', border: 'border-rose-100/50', glow: 'shadow-rose-500/20' },
    emerald: { primary: '#10b981', secondary: '#34d399', bg: 'bg-emerald-50/40', border: 'border-emerald-100/50', glow: 'shadow-emerald-500/20' },
    amber: { primary: '#f59e0b', secondary: '#fbbf24', bg: 'bg-amber-50/40', border: 'border-amber-100/50', glow: 'shadow-amber-500/20' },
    cyan: { primary: '#06b6d4', secondary: '#22d3ee', bg: 'bg-cyan-50/40', border: 'border-cyan-100/50', glow: 'shadow-cyan-500/20' },
    violet: { primary: '#8b5cf6', secondary: '#a78bfa', bg: 'bg-violet-50/40', border: 'border-violet-100/50', glow: 'shadow-violet-500/20' },
    sky: { primary: '#0ea5e9', secondary: '#38bdf8', bg: 'bg-sky-50/40', border: 'border-sky-100/50', glow: 'shadow-sky-500/20' },
    orange: { primary: '#f97316', secondary: '#fb923c', bg: 'bg-orange-50/40', border: 'border-orange-100/50', glow: 'shadow-orange-500/20' },
    slate: { primary: '#64748b', secondary: '#94a3b8', bg: 'bg-slate-50/40', border: 'border-slate-200/50', glow: 'shadow-slate-500/10' },
};

interface BudgetRadialSummaryProps {
    monthlySpent: number;
    monthlyBudget: number;
    yearlySpent: number;
    yearlyBudget: number;
    title: string;
    subtitle?: string;
    onRemove?: () => void;
    onEdit?: () => void;
    colorScheme?: string;
    variant?: 'circle' | 'semicircle';
}

export function BudgetRadialSummary({
    monthlySpent,
    monthlyBudget,
    yearlySpent,
    yearlyBudget,
    title,
    subtitle,
    onRemove,
    onEdit,
    colorScheme = 'slate',
    variant = 'circle'
}: BudgetRadialSummaryProps) {
    const isSemi = variant === 'semicircle';
    const theme = THEMES[colorScheme] || THEMES.slate;
    const mPercent = monthlyBudget > 0 ? (monthlySpent / monthlyBudget) * 100 : 0;
    const yPercent = yearlyBudget > 0 ? (yearlySpent / yearlyBudget) * 100 : 0;

    // To show concentric circles, Recharts needs distinct data points that map to the radial axis.
    // By default, it maps them inner-to-outer.
    const data = [
        {
            name: 'Yearly',
            value: Math.min(yPercent, 100),
            fill: yPercent > 100 ? '#f43f5e' : theme.secondary,
        },
        {
            name: 'Monthly',
            value: Math.min(mPercent, 100),
            fill: mPercent > 100 ? '#f43f5e' : theme.primary,
        }
    ];

    return (
        <div className={`group relative p-6 rounded-[2rem] border ${theme.border} ${theme.bg} ${theme.glow} backdrop-blur-xl hover:shadow-2xl hover:${theme.glow.replace('20', '40')} transition-all duration-500 h-full flex flex-col border-white/40`}>
            {/* Header Controls */}
            <div className="flex justify-between items-start mb-2 group-hover:opacity-100 opacity-0 transition-opacity absolute top-4 right-4 z-10">
                <div className="flex gap-1.5 bg-white/50 backdrop-blur-xl rounded-xl p-1.5 shadow-xl border border-white/40">
                    {onEdit && (
                        <button onClick={onEdit} className="p-2 hover:bg-white text-slate-500 hover:text-indigo-600 rounded-lg transition-all shadow-sm">
                            <span className="sr-only">Edit</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    )}
                    {onRemove && (
                        <button onClick={onRemove} className="p-2 hover:bg-white text-slate-500 hover:text-rose-600 rounded-lg transition-all shadow-sm">
                            <span className="sr-only">Remove</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="text-center mb-2 pr-8 truncate">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] truncate">{title}</h4>
                {subtitle && <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate leading-none mt-1.5 opacity-80">{subtitle}</p>}
            </div>

            <div className={`flex-1 w-full relative ${isSemi ? 'min-h-[160px]' : 'min-h-[140px]'}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        innerRadius={isSemi ? "70%" : "70%"}
                        outerRadius="100%"
                        data={data}
                        startAngle={isSemi ? 180 : 90}
                        endAngle={isSemi ? 0 : 450}
                        barSize={isSemi ? 20 : 12}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            background={{ fill: '#000', fillOpacity: 0.03 }}
                            dataKey="value"
                            cornerRadius={20}
                            animationDuration={1500}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>

                <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none ${isSemi ? 'pt-10' : ''}`}>
                    <span className={`font-black tracking-tighter leading-none ${isSemi ? 'text-4xl' : 'text-2xl'} ${mPercent > 100 ? 'text-rose-600 drop-shadow-[0_0_10px_rgba(225,29,72,0.3)]' : `text-[${theme.primary}]`}`} style={{ color: mPercent > 100 ? undefined : theme.primary }}>
                        {Math.round(mPercent)}%
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase mt-2 tracking-[0.2em]">
                        {isSemi ? 'Health' : 'Spent'}
                    </span>
                </div>
            </div>

            <div className={`mt-4 pt-4 border-t border-indigo-100/50 flex justify-between items-center px-1 ${isSemi ? 'bg-indigo-50/50 -mx-6 px-8 pb-4 rounded-b-[2rem]' : ''}`}>
                <div className="flex flex-col items-start gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Target</span>
                    <span className={`font-black tabular-nums text-slate-900 ${isSemi ? 'text-base' : 'text-xs'}`}>₹{Math.round(monthlyBudget).toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Actual</span>
                    <span className={`font-black tabular-nums ${isSemi ? 'text-base' : 'text-xs'} ${monthlySpent > monthlyBudget ? 'text-rose-600 flex items-center gap-1' : 'text-slate-900'}`}>
                        ₹{Math.round(monthlySpent).toLocaleString()}
                        {monthlySpent > monthlyBudget && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]" />}
                    </span>
                </div>
            </div>
        </div>
    );
}
