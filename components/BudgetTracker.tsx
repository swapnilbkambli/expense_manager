'use client';

import React, { useState, useEffect } from 'react';
import { Target, Pencil, Check, X, ChevronRight } from 'lucide-react';
import { CategoryBudget, Expense } from '../lib/types/expense';
import { updateBudgetAction } from '../lib/actions';

interface BudgetTrackerProps {
    budgets: CategoryBudget[];
    expenses: Expense[];
    onRefresh: () => void;
}

export default function BudgetTracker({ budgets, expenses, onRefresh }: BudgetTrackerProps) {
    const [editing, setEditing] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [currentSpend, setCurrentSpend] = useState<{ [cat: string]: number }>({});

    // Calculate current month spend per category
    useEffect(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const spend: { [cat: string]: number } = {};
        expenses.forEach(e => {
            if (e.parsedDate >= startOfMonth && e.amount < 0 && e.category.toLowerCase() !== 'investment') {
                spend[e.category] = (spend[e.category] || 0) + Math.abs(e.amount);
            }
        });
        setCurrentSpend(spend);
    }, [expenses]);

    const handleUpdateBudget = async (category: string) => {
        const amount = parseFloat(editValue);
        if (!isNaN(amount)) {
            await updateBudgetAction(category, amount);
            setEditing(null);
            onRefresh();
        }
    };

    // Get all unique categories from expenses to show as candidates for budgeting
    const categories = Array.from(new Set(expenses
        .filter(e => e.category.toLowerCase() !== 'investment' && e.amount < 0)
        .map(e => e.category)
    )).sort();

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Category Budgets</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Monthly Limits (Excl. Investments)
                    </p>
                </div>
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100">
                    <Target className="w-4 h-4 text-amber-600" />
                </div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {categories.map((cat) => {
                    const budget = budgets.find(b => b.category === cat)?.amount || 0;
                    const spent = currentSpend[cat] || 0;
                    const percent = budget > 0 ? (spent / budget) * 100 : 0;
                    const isOver = percent > 100;

                    return (
                        <div key={cat} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{cat}</span>
                                <div className="flex items-center gap-2">
                                    {editing === cat ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                autoFocus
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="w-20 px-2 py-1 text-xs font-bold border border-indigo-300 rounded outline-none"
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudget(cat)}
                                            />
                                            <button onClick={() => handleUpdateBudget(cat)} className="p-1 hover:bg-emerald-50 text-emerald-600 rounded">
                                                <Check className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => setEditing(null)} className="p-1 hover:bg-rose-50 text-rose-600 rounded">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            className="flex items-center gap-2 cursor-pointer group"
                                            onClick={() => {
                                                setEditing(cat);
                                                setEditValue(budget.toString());
                                            }}
                                        >
                                            <span className="text-xs font-bold text-slate-500">
                                                ₹{spent.toLocaleString('en-IN')} /
                                                <span className="text-slate-900 ml-1">₹{budget.toLocaleString('en-IN')}</span>
                                            </span>
                                            <Pencil className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <div
                                    className={`h-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-indigo-600'
                                        }`}
                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                />
                            </div>

                            {budget === 0 && !editing && (
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">
                                    Set a budget to track spending
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
