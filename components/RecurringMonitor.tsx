'use client';

import React, { useState } from 'react';
import { Calendar, Repeat, ArrowRight, EyeOff, ArrowUpRight } from 'lucide-react';
import { RecurringExpense } from '../lib/types/expense';
import { ignoreInsightAction, bulkIgnoreInsightsAction } from '../lib/actions';
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

    const handleIgnoreAll = async () => {
        if (recurring.length === 0) return;
        const identifiers = recurring.map(r => r.description.toLowerCase().trim().substring(0, 20));
        await bulkIgnoreInsightsAction('recurring', identifiers);
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
        <div className="bg-white/40 backdrop-blur-md p-8 rounded-3xl border border-white/40 shadow-2xl shadow-indigo-500/5 transition-all hover:bg-white/50 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-indigo-500">Fixed Commitments</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                        Detected Monthly Bills & Subs
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleIgnoreAll}
                        className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors"
                    >
                        Hide All
                    </button>
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                        <Repeat className="w-5 h-5 text-white" />
                    </div>
                </div>
            </div>

            <div className="space-y-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {recurring.map((item, idx) => (
                    <div
                        key={idx}
                        className="group flex flex-col p-5 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 hover:border-indigo-200/50 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden relative"
                    >
                        <div className="flex items-start justify-between z-10">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[8px] font-black px-2 py-0.5 bg-indigo-500 text-white rounded-full uppercase tracking-widest shadow-sm">
                                        {item.category}
                                    </span>
                                    {item.subcategory && (
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            {item.subcategory}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                    {item.description}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                        Last: {item.lastSeen}
                                    </span>
                                    <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg font-black uppercase tracking-wider">
                                        {item.frequency}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-3">
                                <div>
                                    <p className="text-xl font-black text-slate-900 tracking-tight">
                                        ₹{item.avgAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-right mt-1">Avg / Cycle</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedRecurring(item)}
                                        className="p-2 h-8 px-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                        title="View transaction history"
                                    >
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-wider">History</span>
                                    </button>
                                    <button
                                        onClick={() => handleIgnore(item.description)}
                                        className="p-2 h-8 px-3 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                        title="Ignore this commitment"
                                    >
                                        <EyeOff className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-wider">Mute</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-indigo-50/50 flex justify-between items-center z-10">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic tracking-[0.2em]">Validated {item.count} Cycles</span>
                        </div>

                        {/* Subtle background decoration */}
                        <div className="absolute -right-6 -bottom-6 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-1000 rotate-12">
                            <Repeat className="w-32 h-32 text-indigo-900" />
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
