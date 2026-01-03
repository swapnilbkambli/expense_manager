'use client';

import { Expense } from '@/lib/types/expense';
import { getCategoryData } from '@/lib/data-utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

interface CategoryDonutProps {
    expenses: Expense[];
    onToggleCategory?: (category: string) => void;
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

export function CategoryDonut({ expenses, onToggleCategory, viewMode = 'expense' }: CategoryDonutProps) {
    const data = useMemo(() => getCategoryData(expenses, viewMode), [expenses, viewMode]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={115}
                    paddingAngle={6}
                    dataKey="value"
                    onClick={(data) => onToggleCategory?.(data.name)}
                    className="cursor-pointer outline-none"
                    stroke="none"
                    animationDuration={1500}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            className="hover:opacity-80 transition-opacity"
                        />
                    ))}
                </Pie>
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
                        const displayName = name || 'Volume';
                        return [
                            <span key="val" style={{ color: '#0f172a', fontWeight: '900' }}>₹{value.toLocaleString('en-IN')}</span>,
                            <span key="name" style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{displayName}</span>
                        ];
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
