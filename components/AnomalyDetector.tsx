'use client';

import React, { useState } from 'react';
import { AlertCircle, ArrowUpRight, TrendingUp, EyeOff } from 'lucide-react';
import { Anomaly } from '../lib/types/expense';
import { ignoreInsightAction, bulkIgnoreInsightsAction } from '../lib/actions';
import { InsightDetailsModal } from './InsightDetailsModal';

interface AnomalyDetectorProps {
    anomalies: Anomaly[];
    onRefresh: () => void;
}

export default function AnomalyDetector({ anomalies, onRefresh }: AnomalyDetectorProps) {
    const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

    const handleIgnore = async (rowId: string) => {
        await ignoreInsightAction('anomaly', rowId);
        onRefresh();
    };

    const handleIgnoreAll = async () => {
        if (anomalies.length === 0) return;
        const ids = anomalies.map(a => a.rowId);
        await bulkIgnoreInsightsAction('anomaly', ids);
        onRefresh();
    };

    if (anomalies.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col items-center justify-center text-center min-h-[400px]">
                <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Smart Monitoring</h3>
                <p className="text-sm text-slate-500 font-medium mt-2">Everything looks normal! No unusual spending spikes detected.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/40 backdrop-blur-md p-8 rounded-3xl border border-white/40 shadow-2xl shadow-indigo-500/5 transition-all hover:bg-white/50 h-full flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-700 to-rose-500">Anomaly Radar</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse" />
                        Significant Outliers Detected
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleIgnoreAll}
                        className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-rose-600 transition-colors"
                    >
                        Clear Issues
                    </button>
                    <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-100 group-hover:scale-110 transition-transform">
                        <AlertCircle className="w-5 h-5 text-white animate-pulse" />
                    </div>
                </div>
            </div>

            <div className="space-y-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                {anomalies.map((anomaly, idx) => {
                    const deviation = (Math.abs(anomaly.amount) / anomaly.avgForCategory).toFixed(1);

                    return (
                        <div
                            key={idx}
                            className="group flex flex-col p-5 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 hover:border-rose-200/50 hover:bg-white hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300 overflow-hidden relative border-l-4 border-l-rose-500"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[8px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-full uppercase tracking-widest shadow-sm">
                                            {anomaly.category}
                                        </span>
                                        {anomaly.subcategory && (
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                {anomaly.subcategory}
                                            </span>
                                        )}
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-auto">{anomaly.date}</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-900 truncate group-hover:text-rose-600 transition-colors">
                                        {anomaly.description}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-3">
                                    <div>
                                        <p className="text-xl font-black text-rose-600 tracking-tight">
                                            ₹{Math.abs(anomaly.amount).toLocaleString('en-IN')}
                                        </p>
                                        <div className="flex items-center justify-end gap-1.5 text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            {deviation}x Typical Spend
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleIgnore(anomaly.rowId)}
                                        className="p-2 h-8 px-3 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                        title="Ignore this anomaly"
                                    >
                                        <EyeOff className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-wider">Dismiss</span>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between text-[9px] font-black text-slate-400 border-t border-rose-50/50 pt-4 uppercase tracking-widest">
                                <span className="opacity-60">Avg for Category: <span className="text-slate-600">₹{anomaly.avgForCategory.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></span>
                                <button
                                    onClick={() => setSelectedAnomaly(anomaly)}
                                    className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 transition-colors"
                                >
                                    Deep Dive <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Subtle background warning sign */}
            <div className="absolute -left-10 -bottom-10 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-1000 -rotate-12 pointer-events-none">
                <AlertCircle className="w-48 h-48 text-rose-900" />
            </div>

            <InsightDetailsModal
                isOpen={!!selectedAnomaly}
                onClose={() => setSelectedAnomaly(null)}
                title="Anomaly Deep Dive"
                description={`Analysis of unusual spending in ${selectedAnomaly?.category}`}
                transactions={selectedAnomaly ? [selectedAnomaly] : []}
            />
        </div>
    );
}
