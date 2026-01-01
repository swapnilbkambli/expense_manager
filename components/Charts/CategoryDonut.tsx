'use client';

import { Expense } from '@/lib/types/expense';
import { getCategoryData } from '@/lib/data-utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

interface CategoryDonutProps {
    expenses: Expense[];
    onToggleCategory?: (category: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function CategoryDonut({ expenses, onToggleCategory }: CategoryDonutProps) {
    const data = useMemo(() => getCategoryData(expenses), [expenses]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(data) => onToggleCategory?.(data.name)}
                    className="cursor-pointer"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number | undefined) => {
                        if (value === undefined) return '';
                        return `₹${value.toLocaleString()}`;
                    }}
                />
                {/* Legend removed to prevent layout spillover with many categories */}
            </PieChart>
        </ResponsiveContainer>
    );
}
