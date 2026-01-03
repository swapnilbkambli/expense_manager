'use client';

import React, { useMemo } from 'react';
import { Expense } from '@/lib/types/expense';
import { ResponsiveContainer, Sankey, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SankeyFlowProps {
    expenses: Expense[];
}

const COLORS = {
    income: '#10b981', // emerald-500
    savings: '#3b82f6', // blue-500
    category: '#6366f1', // indigo-500
    subcategory: '#94a3b8', // slate-400
    link: '#cbd5e1',
};

export function SankeyFlow({ expenses }: SankeyFlowProps) {
    const data = useMemo(() => {
        const income = expenses.filter(e => e.amount > 0);
        const spend = expenses.filter(e => e.amount < 0);

        const totalIncomeValue = income.reduce((sum, e) => sum + e.amount, 0);
        const totalSpendValue = spend.reduce((sum, e) => sum + Math.abs(e.amount), 0);
        const savingsValue = Math.max(0, totalIncomeValue - totalSpendValue);

        if (totalIncomeValue === 0) return { nodes: [], links: [] };

        const nodes: { name: string, color: string }[] = [];
        const links: { source: number, target: number, value: number }[] = [];

        // 1. Total Income Node
        nodes.push({ name: 'Total Income', color: COLORS.income });
        const incomeIdx = 0;

        // 2. Categories
        const categories: { [key: string]: number } = {};
        spend.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + Math.abs(e.amount);
        });

        // Add Savings Node as a "Category" of sorts for the flow
        if (savingsValue > 0) {
            nodes.push({ name: 'Net Savings', color: COLORS.savings });
            const savingsIdx = nodes.length - 1;
            links.push({ source: incomeIdx, target: savingsIdx, value: savingsValue });
        }

        // Add Category Nodes and links from Income
        const categoryIndices: { [key: string]: number } = {};
        Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([name, val]) => {
            nodes.push({ name, color: COLORS.category });
            const idx = nodes.length - 1;
            categoryIndices[name] = idx;
            links.push({ source: incomeIdx, target: idx, value: val });
        });

        // 3. Subcategories - with Aggregation for small values
        const spendThreshold = totalSpendValue * 0.02; // Group items < 2% of total spend

        Object.entries(categoryIndices).forEach(([catName, catIdx]) => {
            const catExpenses = spend.filter(e => e.category === catName);
            const subMap: { [sub: string]: number } = {};
            catExpenses.forEach(e => {
                subMap[e.subcategory] = (subMap[e.subcategory] || 0) + Math.abs(e.amount);
            });

            let otherTotal = 0;
            const sortedSubs = Object.entries(subMap).sort((a, b) => b[1] - a[1]);

            sortedSubs.forEach(([subName, val]) => {
                if (val < spendThreshold && sortedSubs.length > 5) {
                    otherTotal += val;
                } else {
                    let subIdx = nodes.findIndex(n => n.name === subName && n.color === COLORS.subcategory);
                    if (subIdx === -1) {
                        nodes.push({ name: subName, color: COLORS.subcategory });
                        subIdx = nodes.length - 1;
                    }
                    links.push({ source: catIdx, target: subIdx, value: val });
                }
            });

            if (otherTotal > 0) {
                const otherLabel = `Others (${catName})`;
                nodes.push({ name: otherLabel, color: COLORS.subcategory });
                links.push({ source: catIdx, target: nodes.length - 1, value: otherTotal });
            }
        });

        return { nodes, links };
    }, [expenses]);

    const CustomNode = ({ x, y, width, height, index, payload, containerWidth }: any) => {
        if (height < 2) return null; // Don't render tiny slivers
        return (
            <g>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={payload.color}
                    fillOpacity="0.9"
                    rx={2}
                />
                {height > 10 && (
                    <text
                        x={x < containerWidth / 2 ? x + width + 6 : x - 6}
                        y={y + height / 2 - (height > 25 ? 6 : 0)}
                        textAnchor={x < containerWidth / 2 ? 'start' : 'end'}
                        fill="#1e293b"
                        fontSize="11"
                        fontWeight="700"
                        alignmentBaseline="middle"
                    >
                        {payload.name}
                    </text>
                )}
                {height > 25 && (
                    <text
                        x={x < containerWidth / 2 ? x + width + 6 : x - 6}
                        y={y + height / 2 + 7}
                        textAnchor={x < containerWidth / 2 ? 'start' : 'end'}
                        fill="#475569"
                        fontSize="10"
                        fontWeight="600"
                        alignmentBaseline="middle"
                    >
                        {payload.value.toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0
                        })}
                    </text>
                )}
            </g>
        );
    };

    if (data.nodes.length === 0) {
        return (
            <Card className="rounded-2xl border-none shadow-sm h-full flex items-center justify-center">
                <p className="text-muted-foreground">Insufficient data for Sankey flow.</p>
            </Card>
        );
    }

    // Dynamic height based on node count to prevent squashing
    const chartHeight = Math.max(600, data.nodes.length * 18);

    return (
        <Card className="rounded-2xl border-none shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-white border-b border-slate-50 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-800">Fund Flow (Income → Category → Subcategory)</CardTitle>
                <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded">Scroll to see details</span>
            </CardHeader>
            <CardContent className="h-[700px] p-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div style={{ minWidth: '900px', height: `${chartHeight}px`, padding: '40px 20px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <Sankey
                            data={data}
                            node={<CustomNode />}
                            link={{ stroke: COLORS.link, strokeOpacity: 0.3 }}
                            margin={{ top: 20, right: 160, bottom: 20, left: 10 }}
                            nodePadding={12}
                            iterations={64}
                        >
                            <RechartsTooltip
                                formatter={(value: number | undefined) => [
                                    value !== undefined ? `${value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}` : '0',
                                    'Value'
                                ]}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                        </Sankey>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
