'use client';

import React, { useState } from 'react';
import { CategoryMapping, Expense } from '@/lib/types/expense';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateExpenseAction } from '@/lib/actions';
import { Loader2, Edit } from 'lucide-react';

interface EditTransactionModalProps {
    expense: Expense | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categories: string[];
    subcategories: string[];
    categoryMapping: CategoryMapping;
}

export function EditTransactionModal({
    expense,
    isOpen,
    onClose,
    onSuccess,
    categories,
    subcategories,
    categoryMapping
}: EditTransactionModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<Expense>>({});

    // Reset form data when expense changes
    React.useEffect(() => {
        if (expense) {
            setFormData({
                category: expense.category,
                subcategory: expense.subcategory,
                description: expense.description,
                amount: expense.amount,
            });
        }
    }, [expense]);

    const handleSave = async () => {
        if (!expense || !expense.id) return;

        setIsSaving(true);
        try {
            const result = await updateExpenseAction(expense.id, formData);
            if (result.success) {
                onSuccess();
                onClose();
            } else {
                alert('Failed to update: ' + result.error);
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('An unexpected error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    if (!expense) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-8 rounded-[2.5rem] border-white/40 backdrop-blur-3xl bg-white/80 shadow-2xl overflow-hidden">
                <DialogHeader className="mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Edit className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight text-slate-800">Edit Entry</DialogTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Transaction Refinement</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid gap-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Core Category</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(val) => {
                                setFormData(prev => {
                                    const newCategory = val;
                                    const availableSubs = categoryMapping[newCategory] || [];
                                    const subcategory = availableSubs.includes(prev.subcategory || '')
                                        ? prev.subcategory
                                        : '';
                                    return { ...prev, category: newCategory, subcategory };
                                });
                            }}
                        >
                            <SelectTrigger className="h-12 rounded-2xl border-white/40 bg-white/50 backdrop-blur-sm shadow-sm font-black text-sm text-slate-700 hover:bg-white transition-all">
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-white/40 backdrop-blur-xl bg-white/90 shadow-2xl">
                                {categories.filter(Boolean).map(cat => (
                                    <SelectItem key={cat} value={cat} className="font-bold text-slate-600">{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Detailed Segment</Label>
                        <Select
                            value={formData.subcategory}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, subcategory: val }))}
                        >
                            <SelectTrigger className="h-12 rounded-2xl border-white/40 bg-white/50 backdrop-blur-sm shadow-sm font-black text-sm text-slate-700 hover:bg-white transition-all">
                                <SelectValue placeholder="Select Subcategory" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-white/40 backdrop-blur-xl bg-white/90 shadow-2xl">
                                {(() => {
                                    const availableSubs = formData.category
                                        ? (categoryMapping[formData.category] || []).filter(s => subcategories.includes(s))
                                        : subcategories;

                                    return availableSubs.filter(Boolean).map(sub => (
                                        <SelectItem key={sub} value={sub} className="font-bold text-slate-600">{sub}</SelectItem>
                                    ));
                                })()}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Volume</Label>
                            <div className="relative">
                                <Input
                                    id="amount"
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                                    className="h-12 rounded-2xl border-white/40 bg-white/50 backdrop-blur-sm shadow-sm font-black text-sm text-slate-700 pl-8 focus:bg-white transition-all"
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Payee / Desc</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="h-12 rounded-2xl border-white/40 bg-white/50 backdrop-blur-sm shadow-sm font-black text-sm text-slate-700 focus:bg-white transition-all"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-10 gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSaving}
                        className="h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        Discard
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-12 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-200 transition-all active:scale-95 flex-1"
                    >
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            'Commit Changes'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
