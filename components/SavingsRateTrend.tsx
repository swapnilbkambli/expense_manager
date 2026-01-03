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
            <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <div className="space-y-1">
                    <p className="text-sm font-bold flex justify-between gap-4">
                        <span className="text-slate-600">Savings Rate:</span>
                        <span className={data.savingsRate >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {data.savingsRate}%
                        </span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Income: ₹{data.income.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Consumption: ₹{data.consumption.toLocaleString('en-IN')}
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
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Savings Rate Trend</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Monthly (Income - Expenses) / Income
                    </p>
                </div>
                <div className="px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                    <span className="text-[10px] font-black text-emerald-700 uppercase">Target: 30%+</span>
                </div>
            </div>

            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                            tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                        <ReferenceLine y={30} stroke="#10b981" strokeDasharray="5 5" strokeWidth={1} />
                        <Area
                            type="monotone"
                            dataKey="savingsRate"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorSavings)"
                            animationDuration={1500}
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
