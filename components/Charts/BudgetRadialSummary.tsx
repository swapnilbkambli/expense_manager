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

const THEMES: { [key: string]: ColorTheme } = {
    indigo: { ring1: '#818cf8', ring2: '#34d399', bg: 'bg-indigo-50/40', border: 'border-indigo-100', text: 'text-indigo-900' },
    rose: { ring1: '#fb7185', ring2: '#fbbf24', bg: 'bg-rose-50/40', border: 'border-rose-100', text: 'text-rose-900' },
    emerald: { ring1: '#34d399', ring2: '#60a5fa', bg: 'bg-emerald-50/40', border: 'border-emerald-100', text: 'text-emerald-900' },
    amber: { ring1: '#fbbf24', ring2: '#f87171', bg: 'bg-amber-50/40', border: 'border-amber-100', text: 'text-amber-900' },
    cyan: { ring1: '#22d3ee', ring2: '#a78bfa', bg: 'bg-cyan-50/40', border: 'border-cyan-100', text: 'text-cyan-900' },
    violet: { ring1: '#a78bfa', ring2: '#fb7185', bg: 'bg-violet-50/40', border: 'border-violet-100', text: 'text-violet-900' },
    sky: { ring1: '#38bdf8', ring2: '#34d399', bg: 'bg-sky-50/40', border: 'border-sky-100', text: 'text-sky-900' },
    slate: { ring1: '#94a3b8', ring2: '#cbd5e1', bg: 'bg-slate-50/40', border: 'border-slate-200', text: 'text-slate-900' },
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

    const data = [
        {
            name: 'Yearly',
            value: Math.min(yPercent, 100),
            fill: yPercent > 100 ? '#f43f5e' : theme.ring2,
        },
        {
            name: 'Monthly',
            value: Math.min(mPercent, 100),
            fill: mPercent > 100 ? '#f43f5e' : theme.ring1,
        }
    ];

    return (
        <div className={`group relative p-5 rounded-3xl border ${theme.border} ${theme.bg} backdrop-blur-sm hover:shadow-xl transition-all duration-500 h-full flex flex-col shadow-sm`}>
            {/* Header Controls */}
            <div className="flex justify-between items-start mb-2 group-hover:opacity-100 opacity-0 transition-opacity absolute top-3 right-3 z-10">
                <div className="flex gap-1 bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-100">
                    {onEdit && (
                        <button onClick={onEdit} className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                            <span className="sr-only">Edit</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    )}
                    {onRemove && (
                        <button onClick={onRemove} className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors">
                            <span className="sr-only">Remove</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="text-center mb-1 pr-8 truncate">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider truncate">{title}</h4>
                {subtitle && <p className="text-[9px] font-bold text-slate-500 uppercase truncate leading-none mt-1 opacity-80">{subtitle}</p>}
            </div>

            <div className={`flex-1 w-full relative ${isSemi ? 'min-h-[140px]' : 'min-h-[120px]'}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        innerRadius={isSemi ? "80%" : "65%"}
                        outerRadius="100%"
                        data={data}
                        startAngle={isSemi ? 180 : 90}
                        endAngle={isSemi ? 0 : 450}
                        barSize={isSemi ? 12 : 8}
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
                            cornerRadius={12}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>

                <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none ${isSemi ? 'pt-8' : ''}`}>
                    <span className={`font-black tracking-tighter leading-none ${isSemi ? 'text-3xl' : 'text-xl'} ${mPercent > 100 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {Math.round(mPercent)}%
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-widest opacity-60">
                        {isSemi ? 'Total Health' : 'Health'}
                    </span>
                </div>
            </div>

            <div className={`mt-2 pt-3 border-t border-black/5 flex justify-between items-center px-1 ${isSemi ? 'bg-white/40 -mx-5 px-6 pb-2 rounded-b-3xl' : ''}`}>
                <div className="flex flex-col items-start gap-1">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter leading-none opacity-60">Target</span>
                    <span className={`font-black tabular-nums ${isSemi ? 'text-sm text-slate-900' : 'text-[11px] text-slate-900'}`}>₹{Math.round(monthlyBudget).toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter leading-none opacity-60">Spent</span>
                    <span className={`font-black tabular-nums ${isSemi ? 'text-sm' : 'text-[11px]'} ${monthlySpent > monthlyBudget ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>₹{Math.round(monthlySpent).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
