'use client';

import React, { useState } from 'react';
import { Calendar, Repeat, ArrowRight, EyeOff, ArrowUpRight } from 'lucide-react';
import { RecurringExpense } from '../lib/types/expense';
import { ignoreInsightAction } from '../lib/actions';
import { InsightDetailsModal } from './InsightDetailsModal';

interface RecurringMonitorProps {
    recurring: RecurringExpense[];
    onRefresh: () => void;
}

export default function RecurringMonitor({ recurring, onRefresh }: RecurringMonitorProps) {
    const [selectedRecurring, setSelectedRecurring] = useState<RecurringExpense | null>(null);

    const handleIgnore = async (description: string) => {
        const identifier = description.toLowerCase().trim().substring(0, 20);
        await ignoreInsightAction('recurring', identifier);
        onRefresh();
    };

    if (recurring.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col items-center justify-center text-center min-h-[400px]">
                <Repeat className="w-12 h-12 text-slate-200 mb-4" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Recurring Commitments</h3>
                <p className="text-sm text-slate-500 font-medium mt-2">No repetitive monthly expenses detected yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Recurring Commitments</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Detected Monthly Bills & Subs
                    </p>
                </div>
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                    <Repeat className="w-4 h-4 text-indigo-600" />
                </div>
            </div>

            <div className="space-y-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {recurring.map((item, idx) => (
                    <div
                        key={idx}
                        className="group flex flex-col p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all overflow-hidden relative"
                    >
                        <div className="flex items-start justify-between z-10">
                            <div className="flex-1 min-w-0 pr-4">
                                <p className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                                    {item.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Last: {item.lastSeen}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-bold uppercase">
                                        {item.frequency}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <div>
                                    <p className="text-lg font-black text-slate-900">
                                        ₹{item.avgAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase text-right">Avg / Period</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedRecurring(item)}
                                        className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all flex items-center gap-1"
                                        title="View transaction history"
                                    >
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase">History</span>
                                    </button>
                                    <button
                                        onClick={() => handleIgnore(item.description)}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all flex items-center gap-1"
                                        title="Ignore this commitment"
                                    >
                                        <EyeOff className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase">Ignore</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center z-10">
                            <span className="text-[10px] font-bold text-slate-400">Tracked {item.count} times</span>
                        </div>

                        {/* Subtle background decoration */}
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Repeat className="w-24 h-24 text-indigo-900" />
                        </div>
                    </div>
                ))}
            </div>

            <InsightDetailsModal
                isOpen={!!selectedRecurring}
                onClose={() => setSelectedRecurring(null)}
                title="Recurring History"
                description={`Historical payments for ${selectedRecurring?.description}`}
                transactions={selectedRecurring?.transactions || []}
            />
        </div>
    );
}
