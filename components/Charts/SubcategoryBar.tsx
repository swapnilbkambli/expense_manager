'use client';

import { Expense } from '@/lib/types/expense';
import { getSubcategoryData } from '@/lib/data-utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useMemo } from 'react';

interface SubcategoryBarProps {
    expenses: Expense[];
    onToggleSubcategory?: (subcategory: string) => void;
    viewMode?: 'expense' | 'income';
}

const COLORS = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#f43f5e', // Rose
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#14b8a6'  // Teal
];

export function SubcategoryBar({ expenses, onToggleSubcategory, viewMode = 'expense' }: SubcategoryBarProps) {
    const data = useMemo(() => getSubcategoryData(expenses, viewMode), [expenses, viewMode]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                barSize={12}
            >
                <CartesianGrid strokeDasharray="4 4" horizontal={false} vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }}
                    width={100}
                    className="uppercase tracking-tighter"
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
                    formatter={(value: number | undefined, name?: string) => {
                        if (value === undefined) return ['', ''];
                        return [
                            <span key="val" style={{ color: '#0f172a', fontWeight: '900' }}>₹{value.toLocaleString('en-IN')}</span>,
                            <span key="name" style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Distribution</span>
                        ];
                    }}
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)', radius: 8 }}
                />
                <Bar
                    dataKey="value"
                    radius={[0, 10, 10, 0]}
                    onClick={(data) => {
                        if (data && data.name) {
                            onToggleSubcategory?.(data.name as string);
                        }
                    }}
                    className="cursor-pointer"
                    animationDuration={1500}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            className="hover:opacity-80 transition-opacity"
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
