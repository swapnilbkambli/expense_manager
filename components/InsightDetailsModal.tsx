'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Expense } from '@/lib/types/expense';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface InsightDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    transactions: Expense[];
}

export function InsightDetailsModal({
    isOpen,
    onClose,
    title,
    description,
    transactions
}: InsightDetailsModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-6 bg-slate-900 text-white">
                    <DialogTitle className="text-xl font-black tracking-tight">{title}</DialogTitle>
                    <DialogDescription className="text-slate-400 font-medium">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 bg-white">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                            {transactions.length} Transactions Found
                        </span>
                        <div className="h-1 flex-1 mx-4 bg-slate-100 rounded-full" />
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
                        <div className="max-h-[50vh] overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
                            <Table>
                                <TableHeader className="bg-slate-100/50 sticky top-0 z-10">
                                    <TableRow className="hover:bg-transparent border-slate-200">
                                        <TableHead className="text-[10px] font-black uppercase text-slate-600">Date</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-slate-600">Category</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-slate-600">Account</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-600">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((t, idx) => (
                                        <TableRow key={idx} className="border-slate-100 hover:bg-white transition-colors">
                                            <TableCell className="text-xs font-bold text-slate-900">{t.date}</TableCell>
                                            <TableCell>
                                                <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase">
                                                    {t.category}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-slate-500">{t.account}</TableCell>
                                            <TableCell className="text-right text-sm font-black text-slate-900">
                                                ₹{Math.abs(t.amount).toLocaleString('en-IN')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                        Close Details
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
