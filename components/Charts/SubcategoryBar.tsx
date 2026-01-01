'use client';

import { Expense } from '@/lib/types/expense';
import { getSubcategoryData } from '@/lib/data-utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useMemo } from 'react';

interface SubcategoryBarProps {
    expenses: Expense[];
    onToggleSubcategory?: (subcategory: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function SubcategoryBar({ expenses, onToggleSubcategory }: SubcategoryBarProps) {
    const data = useMemo(() => getSubcategoryData(expenses), [expenses]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    width={100}
                />
                <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number | undefined) => {
                        if (value === undefined) return '';
                        return `₹${value.toLocaleString()}`;
                    }}
                    cursor={{ fill: 'transparent' }}
                />
                <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    onClick={(data) => {
                        if (data && data.name) {
                            onToggleSubcategory?.(data.name as string);
                        }
                    }}
                    className="cursor-pointer"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
