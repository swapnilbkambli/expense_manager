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
        <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm transition-all hover:shadow-md relative overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Spending Anomalies</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Significant Outliers Detected
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleIgnoreAll}
                        className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-colors"
                    >
                        Ignore All
                    </button>
                    <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center border border-rose-100 animate-pulse">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                    </div>
                </div>
            </div>

            <div className="space-y-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                {anomalies.map((anomaly, idx) => {
                    const deviation = (Math.abs(anomaly.amount) / anomaly.avgForCategory).toFixed(1);

                    return (
                        <div
                            key={idx}
                            className="flex flex-col p-4 bg-rose-50/50 rounded-xl border border-rose-100 hover:bg-rose-50 transition-all border-l-4 border-l-rose-500"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded uppercase">
                                            {anomaly.category}
                                        </span>
                                        {anomaly.subcategory && (
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                {anomaly.subcategory}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-bold text-slate-300 ml-auto">{anomaly.date}</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-900 truncate">
                                        {anomaly.description}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <div>
                                        <p className="text-lg font-black text-rose-600">
                                            ₹{Math.abs(anomaly.amount).toLocaleString('en-IN')}
                                        </p>
                                        <div className="flex items-center justify-end gap-1 text-[10px] font-black text-rose-500 uppercase">
                                            <TrendingUp className="w-3 h-3" />
                                            {deviation}x Avg
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleIgnore(anomaly.rowId)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-all flex items-center gap-1 border border-transparent hover:border-rose-100"
                                        title="Ignore this anomaly"
                                    >
                                        <EyeOff className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase">Ignore</span>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500 border-t border-rose-100/50 pt-2">
                                <span>Typical: ₹{anomaly.avgForCategory.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                <button
                                    onClick={() => setSelectedAnomaly(anomaly)}
                                    className="flex items-center gap-1 text-rose-600 hover:underline font-bold"
                                >
                                    View Details <ArrowUpRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Subtle background warning sign */}
            <div className="absolute -left-8 -bottom-8 opacity-[0.03] pointer-events-none">
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
