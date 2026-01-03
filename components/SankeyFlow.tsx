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
    savings: '#8b5cf6', // violet-500
    category: '#6366f1', // indigo-500
    subcategory: '#94a3b8', // slate-400
    link: '#e2e8f0',
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
            nodes.push({ name: 'Financial Surplus', color: COLORS.savings });
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
                    fillOpacity="0.85"
                    rx={4}
                    className="shadow-sm"
                />
                {height > 10 && (
                    <text
                        x={x < containerWidth / 2 ? x + width + 8 : x - 8}
                        y={y + height / 2 - (height > 25 ? 7 : 0)}
                        textAnchor={x < containerWidth / 2 ? 'start' : 'end'}
                        fill="#0f172a"
                        fontSize="11"
                        fontWeight="900"
                        className="uppercase tracking-tighter"
                        alignmentBaseline="middle"
                    >
                        {payload.name}
                    </text>
                )}
                {height > 25 && (
                    <text
                        x={x < containerWidth / 2 ? x + width + 8 : x - 8}
                        y={y + height / 2 + 9}
                        textAnchor={x < containerWidth / 2 ? 'start' : 'end'}
                        fill="#64748b"
                        fontSize="10"
                        fontWeight="800"
                        className="font-black"
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
            <div className="h-[400px] flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-2xl border border-white/40">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Insufficient flow data</p>
            </div>
        );
    }

    // Dynamic height based on node count to prevent squashing
    const chartHeight = Math.max(600, data.nodes.length * 20);

    return (
        <div className="w-full">
            <div className="max-h-[700px] overflow-auto custom-scrollbar bg-white/10 backdrop-blur-sm rounded-t-2xl border-x border-t border-white/40">
                <div style={{ minWidth: '940px', height: `${chartHeight}px`, padding: '40px 60px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <Sankey
                            data={data}
                            node={<CustomNode containerWidth={940} />}
                            link={{ stroke: COLORS.link, strokeOpacity: 0.15 }}
                            margin={{ top: 20, right: 180, bottom: 20, left: 10 }}
                            nodePadding={20}
                            iterations={64}
                        >
                            <RechartsTooltip
                                formatter={(value: number | undefined) => [
                                    value !== undefined ? `${value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}` : '0',
                                    'Flow Value'
                                ]}
                                contentStyle={{
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.4)',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                    backdropFilter: 'blur(12px)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    padding: '12px',
                                    fontWeight: '900',
                                    fontSize: '12px'
                                }}
                            />
                        </Sankey>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="p-4 border border-white/40 bg-white/30 backdrop-blur-md rounded-b-2xl text-center shadow-lg shadow-indigo-500/5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic opacity-60">
                    Interactive Revenue Flow • Scroll horizontally or vertically to explore
                </span>
            </div>
        </div>
    );
}
