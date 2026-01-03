'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { SavingsTrendItem } from '../lib/types/expense';

interface SavingsRateTrendProps {
    data: SavingsTrendItem[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white/90 backdrop-blur-xl p-4 border border-white/40 shadow-2xl rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</p>
                <div className="space-y-2">
                    <p className="text-sm font-black flex justify-between gap-6">
                        <span className="text-slate-500 uppercase tracking-tighter text-[11px]">Savings Rate:</span>
                        <span className={data.savingsRate >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {data.savingsRate}%
                        </span>
                    </p>
                    <p className="text-xs font-bold text-slate-700 flex justify-between">
                        <span className="opacity-60">Income:</span>
                        <span>₹{data.income.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="text-xs font-bold text-slate-700 flex justify-between">
                        <span className="opacity-60">Consumption:</span>
                        <span>₹{data.consumption.toLocaleString('en-IN')}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export default function SavingsRateTrend({ data }: SavingsRateTrendProps) {
    // Sort and limit to last 24 months for better view
    const displayData = data.slice(-24);

    return (
        <div className="bg-white/40 backdrop-blur-md p-8 rounded-3xl border border-white/40 shadow-2xl shadow-indigo-500/5 transition-all hover:bg-white/50 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Savings Velocity</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        Monthly Margin Trends
                    </p>
                </div>
                <div className="px-4 py-1.5 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-100 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Bench: 30%+</span>
                </div>
            </div>

            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                            dy={15}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                            tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '5 5' }} />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} strokeOpacity={0.5} />
                        <ReferenceLine y={30} stroke="#10b981" strokeDasharray="8 4" strokeWidth={2} label={{ value: 'BENCHMARK', position: 'right', fill: '#10b981', fontSize: 9, fontWeight: 900, dy: -10 }} />
                        <Area
                            type="monotone"
                            dataKey="savingsRate"
                            stroke="#10b981"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorSavings)"
                            animationDuration={2000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-600 leading-relaxed italic">
                    <span className="font-bold">Note:</span> Savings rate reflects the percentage of income remaining after all outgoings (including investments) are deducted.
                </p>
            </div>
        </div>
    );
}
