'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Target, Pencil, Check, X, Plus, Trash2, CalendarDays } from 'lucide-react';
import { CategoryBudget, Expense } from '../lib/types/expense';
import { updateBudgetAction, removeBudgetAction } from '../lib/actions';
import { BudgetRadialSummary } from './Charts/BudgetRadialSummary';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BudgetTrackerProps {
    budgets: CategoryBudget[];
    expenses: Expense[];
    onRefresh: () => void;
}

const CATEGORY_COLORS: { [key: string]: string } = {
    'Investments': 'indigo',
    'Food': 'amber',
    'Living': 'emerald',
    'Transport': 'sky',
    'Shopping': 'rose',
    'Leisure': 'violet',
    'Health': 'cyan',
    'Education': 'indigo',
    'Bills': 'amber',
    'Salary': 'emerald',
    'Default': 'slate',
};

const getCategoryColor = (cat: string) => {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.Default;
};

export default function BudgetTracker({ budgets, expenses, onRefresh }: BudgetTrackerProps) {
    const [editing, setEditing] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [showAddModal, setShowAddModal] = useState(false);

    const [newBudgetCat, setNewBudgetCat] = useState<string>('');
    const [newBudgetSub, setNewBudgetSub] = useState<string>('__all__');
    const [newBudgetAmount, setNewBudgetAmount] = useState<string>('');

    // Spending states
    const [currentMonthSpend, setCurrentMonthSpend] = useState<{ [key: string]: number }>({});
    const [ytdSpend, setYtdSpend] = useState<{ [key: string]: number }>({});

    // Calculate spend mappings
    useEffect(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const mSpend: { [key: string]: number } = {};
        const ySpend: { [key: string]: number } = {};

        expenses.forEach(e => {
            if (e.amount < 0) {
                const absAmount = Math.abs(e.amount);
                const cat = e.category;
                const sub = e.subcategory;

                // Monthly
                if (e.parsedDate >= startOfMonth) {
                    mSpend[cat] = (mSpend[cat] || 0) + absAmount;
                    if (sub) {
                        mSpend[`${cat}|${sub}`] = (mSpend[`${cat}|${sub}`] || 0) + absAmount;
                    }
                }

                // YTD
                if (e.parsedDate >= startOfYear) {
                    ySpend[cat] = (ySpend[cat] || 0) + absAmount;
                    if (sub) {
                        ySpend[`${cat}|${sub}`] = (ySpend[`${cat}|${sub}`] || 0) + absAmount;
                    }
                }
            }
        });

        setCurrentMonthSpend(mSpend);
        setYtdSpend(ySpend);
    }, [expenses]);

    const handleUpdateBudget = async (category: string, subcategory?: string) => {
        const amount = parseFloat(editValue);
        if (!isNaN(amount)) {
            await updateBudgetAction(category, amount, subcategory || '');
            setEditing(null);
            onRefresh();
        }
    };

    const handleRemoveBudget = async (category: string, subcategory: string = '') => {
        if (confirm(`Remove budget for ${subcategory || category}?`)) {
            await removeBudgetAction(category, subcategory);
            onRefresh();
        }
    };

    const handleAddBudget = async () => {
        const amount = parseFloat(newBudgetAmount);
        if (newBudgetCat && !isNaN(amount)) {
            const sub = newBudgetSub === '__all__' ? '' : newBudgetSub;
            await updateBudgetAction(newBudgetCat, amount, sub);
            setNewBudgetAmount('');
            setNewBudgetCat('');
            setNewBudgetSub('__all__');
            setShowAddModal(false);
            onRefresh();
        }
    };

    // Get available categories and subcategories for the dropdowns
    const availableMapping = useMemo(() => {
        const mapping: { [cat: string]: Set<string> } = {};
        expenses.forEach(e => {
            if (!mapping[e.category]) mapping[e.category] = new Set();
            if (e.subcategory) mapping[e.category].add(e.subcategory);
        });
        return mapping;
    }, [expenses]);

    const categories = Object.keys(availableMapping).sort();
    const subcategories = newBudgetCat ? Array.from(availableMapping[newBudgetCat]).sort() : [];

    // Aggregated Metrics for Summary
    const totalMonthlyBudget = budgets.reduce((acc, b) => acc + b.amount, 0);
    const totalYearlyBudget = totalMonthlyBudget * 12;

    const totalMonthlySpent = budgets.reduce((acc, b) => {
        const key = b.subcategory ? `${b.category}|${b.subcategory}` : b.category;
        return acc + (currentMonthSpend[key] || 0);
    }, 0);

    const totalYearlySpent = budgets.reduce((acc, b) => {
        const key = b.subcategory ? `${b.category}|${b.subcategory}` : b.category;
        return acc + (ytdSpend[key] || 0);
    }, 0);

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Budget Dashboard</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Concentric Target Monitoring
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                        <DialogTrigger asChild>
                            <Button className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-sm hover:shadow-indigo-100">
                                <Plus className="h-4 w-4 mr-2" />
                                New Target
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black">Set New Target</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500">Category</Label>
                                    <Select value={newBudgetCat} onValueChange={(v) => { setNewBudgetCat(v); setNewBudgetSub('__all__'); }}>
                                        <SelectTrigger className="font-bold">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => (
                                                <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500">Sub-Category (Optional)</Label>
                                    <Select value={newBudgetSub} onValueChange={setNewBudgetSub}>
                                        <SelectTrigger className="font-bold">
                                            <SelectValue placeholder="Entire Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__all__" className="font-bold text-indigo-600">Entire Category</SelectItem>
                                            {subcategories.map(s => (
                                                <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500">Monthly Budget (₹)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 5000"
                                        value={newBudgetAmount}
                                        onChange={(e) => setNewBudgetAmount(e.target.value)}
                                        className="font-bold"
                                    />
                                    <p className="text-[10px] text-slate-400 italic">Automatically tracked as ₹{(parseFloat(newBudgetAmount) * 12 || 0).toLocaleString()} yearly</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button className="w-full font-black uppercase" onClick={handleAddBudget}>Create Target</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {budgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-12">
                        <Target className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-sm font-black text-slate-500">No targets set yet</p>
                        <p className="text-xs font-bold text-slate-400 mt-2">Click the button above to start tracking</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Global Health Row */}
                        <div className="w-full">
                            <BudgetRadialSummary
                                title="Overall Financial Health"
                                subtitle="Consolidated All-Targets View"
                                monthlyBudget={totalMonthlyBudget}
                                monthlySpent={totalMonthlySpent}
                                yearlyBudget={totalYearlyBudget}
                                yearlySpent={totalYearlySpent}
                                colorScheme="indigo"
                                variant="semicircle"
                            />
                        </div>

                        {/* Individual Budget Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-4 border-t border-slate-50 pt-6">
                            {budgets.map((b, idx) => {
                                const key = b.subcategory ? `${b.category}|${b.subcategory}` : b.category;
                                const mSpent = currentMonthSpend[key] || 0;
                                const ySpent = ytdSpend[key] || 0;
                                const yearlyBudget = b.amount * 12;
                                const editKey = `${b.category}|${b.subcategory || ''}`;

                                return (
                                    <BudgetRadialSummary
                                        key={idx}
                                        title={b.category}
                                        subtitle={b.subcategory || 'Entire Category'}
                                        monthlyBudget={b.amount}
                                        monthlySpent={mSpent}
                                        yearlyBudget={yearlyBudget}
                                        yearlySpent={ySpent}
                                        colorScheme={getCategoryColor(b.category)}
                                        onRemove={() => handleRemoveBudget(b.category, b.subcategory)}
                                        onEdit={() => {
                                            setEditing(editKey);
                                            setEditValue(b.amount.toString());
                                            const newVal = prompt(`Edit monthly budget for ${b.subcategory || b.category}:`, b.amount.toString());
                                            if (newVal !== null) {
                                                const amount = parseFloat(newVal);
                                                if (!isNaN(amount)) {
                                                    updateBudgetAction(b.category, amount, b.subcategory || '').then(() => onRefresh());
                                                }
                                            }
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
