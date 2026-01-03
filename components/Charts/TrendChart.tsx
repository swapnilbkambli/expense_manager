'use client';

import { Expense } from '@/lib/types/expense';
import { getTrendData } from '@/lib/data-utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

interface TrendChartProps {
    expenses: Expense[];
    viewMode?: 'expense' | 'income';
}

export function TrendChart({ expenses }: TrendChartProps) {
    const data = useMemo(() => getTrendData(expenses), [expenses]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }}
                    tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                />
                <Tooltip
                    contentStyle={{
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        backdropFilter: 'blur(12px)',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '12px',
                        fontWeight: '900',
                        fontSize: '11px'
                    }}
                    itemStyle={{ padding: '2px 0' }}
                    cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '4 4' }}
                    formatter={(value: number | undefined, name?: string) => {
                        if (value === undefined) return ['', ''];
                        const displayName = name || 'Value';
                        const color = displayName.toLowerCase() === 'income' ? '#10b981' : '#6366f1';
                        return [
                            <span key="val" style={{ color, fontWeight: '900' }}>₹{value.toLocaleString('en-IN')}</span>,
                            <span key="name" style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{displayName}</span>
                        ];
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    name="Income"
                    animationDuration={1500}
                />
                <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                    name="Expense"
                    animationDuration={1500}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
