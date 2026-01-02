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
import { Loader2 } from 'lucide-react';

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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Transaction</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right text-xs font-semibold uppercase text-slate-500">
                            Category
                        </Label>
                        <div className="col-span-3">
                            <Select
                                value={formData.category}
                                onValueChange={(val) => {
                                    setFormData(prev => {
                                        const newCategory = val;
                                        const availableSubs = categoryMapping[newCategory] || [];
                                        // If current subcategory is not in the new available list, clear it or set to first one
                                        // But only if we have a mapping.
                                        const subcategory = availableSubs.includes(prev.subcategory || '')
                                            ? prev.subcategory
                                            : '';

                                        return { ...prev, category: newCategory, subcategory };
                                    });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.filter(Boolean).map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="subcategory" className="text-right text-xs font-semibold uppercase text-slate-500">
                            Subcategory
                        </Label>
                        <div className="col-span-3">
                            <Select
                                value={formData.subcategory}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, subcategory: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Subcategory" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(() => {
                                        const availableSubs = formData.category
                                            ? (categoryMapping[formData.category] || []).filter(s => subcategories.includes(s))
                                            : subcategories;

                                        return availableSubs.filter(Boolean).map(sub => (
                                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                        ));
                                    })()}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right text-xs font-semibold uppercase text-slate-500">
                            Amount
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right text-xs font-semibold uppercase text-slate-500">
                            Desc
                        </Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
