'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Target, Pencil, Check, X, Plus, Trash2, CalendarDays } from 'lucide-react';
import { CategoryBudget, Expense } from '../lib/types/expense';
import { updateBudgetAction, removeBudgetAction } from '../lib/actions';
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

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Financial Targets</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Monthly & Yearly Budget Tracking
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50">
                                <Plus className="h-4 w-4" />
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
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100">
                        <Target className="w-4 h-4 text-amber-600" />
                    </div>
                </div>
            </div>

            <div className="space-y-8 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {budgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-12">
                        <Target className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-sm font-black text-slate-500">No targets set yet</p>
                        <p className="text-xs font-bold text-slate-400 mt-2">Click the plus icon to start tracking</p>
                    </div>
                ) : (
                    budgets.map((b, idx) => {
                        const key = b.subcategory ? `${b.category}|${b.subcategory}` : b.category;
                        const mSpent = currentMonthSpend[key] || 0;
                        const ySpent = ytdSpend[key] || 0;

                        const mPercent = Math.min((mSpent / b.amount) * 100, 100);
                        const yearlyBudget = b.amount * 12;
                        const yPercent = Math.min((ySpent / yearlyBudget) * 100, 100);

                        const editKey = `${b.category}|${b.subcategory || ''}`;

                        return (
                            <div key={idx} className="group relative">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                                                {b.category}
                                            </span>
                                            {b.subcategory && (
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight">
                                                    / {b.subcategory}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {editing === editKey ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    autoFocus
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-20 px-2 py-1 text-xs font-bold border border-indigo-300 rounded outline-none"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudget(b.category, b.subcategory)}
                                                />
                                                <button onClick={() => handleUpdateBudget(b.category, b.subcategory)} className="p-1 hover:bg-emerald-50 text-emerald-600 rounded">
                                                    <Check className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => setEditing(null)} className="p-1 hover:bg-rose-50 text-rose-600 rounded">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditing(editKey);
                                                        setEditValue(b.amount.toString());
                                                    }}
                                                    className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveBudget(b.category, b.subcategory)}
                                                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        <div className="text-right">
                                            <p className="text-[11px] font-black text-slate-900">₹{b.amount.toLocaleString('en-IN')}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Monthly</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Monthly Progress */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter">
                                            <span className="text-indigo-500">Current Month Progress</span>
                                            <span className={mSpent > b.amount ? 'text-rose-500' : 'text-slate-500'}>
                                                ₹{mSpent.toLocaleString('en-IN')} / {mPercent.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${mSpent > b.amount ? 'bg-rose-500' : mPercent > 85 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                                                style={{ width: `${mPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Yearly Progress */}
                                    <div className="space-y-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter">
                                            <span className="text-emerald-600 flex items-center gap-1">
                                                <CalendarDays className="w-3 h-3" /> Yearly Run-rate
                                            </span>
                                            <span className={ySpent > yearlyBudget ? 'text-rose-500' : 'text-slate-500'}>
                                                ₹{ySpent.toLocaleString('en-IN')} / ₹{yearlyBudget.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${ySpent > yearlyBudget ? 'bg-rose-400' : 'bg-emerald-500'}`}
                                                style={{ width: `${yPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
