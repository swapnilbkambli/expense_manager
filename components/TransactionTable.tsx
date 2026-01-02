'use client';

import { CategoryMapping, Expense, FilterState } from '@/lib/types/expense';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X, Edit } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { EditTransactionModal } from './EditTransactionModal';

interface TransactionTableProps {
    expenses: Expense[];
    onToggleCategory?: (category: string) => void;
    onToggleSubcategory?: (subcategory: string) => void;
    filters?: FilterState;
    categories?: string[];
    subcategories?: string[];
    categoryMapping: CategoryMapping;
    onRefresh?: () => void;
}

type SortConfig = {
    key: keyof Expense | 'absAmount';
    direction: 'asc' | 'desc';
} | null;

export function TransactionTable({
    expenses,
    onToggleCategory,
    onToggleSubcategory,
    filters,
    categories,
    subcategories,
    categoryMapping,
    onRefresh
}: TransactionTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'parsedDate', direction: 'desc' });
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const itemsPerPage = 10;

    // Use global filters if available, otherwise fallback to empty (though they should be provided)
    const activeCategories = filters?.categories || [];
    const activeSubcategories = filters?.subcategories || [];

    const sortedExpenses = useMemo(() => {
        if (!sortConfig) return expenses;

        return [...expenses].sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof Expense];
            let bValue: any = b[sortConfig.key as keyof Expense];

            if (sortConfig.key === 'absAmount') {
                aValue = Math.abs(a.amount);
                bValue = Math.abs(b.amount);
            } else if (sortConfig.key === 'parsedDate') {
                aValue = a.parsedDate.getTime();
                bValue = b.parsedDate.getTime();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [expenses, sortConfig]);

    const totalPages = Math.ceil(sortedExpenses.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedExpenses = sortedExpenses.slice(startIndex, startIndex + itemsPerPage);

    const requestSort = (key: keyof Expense | 'absAmount') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Expense | 'absAmount') => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-2">
                {categories && categories.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                Filter Categories {activeCategories.length > 0 && `(${activeCategories.length})`}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b">
                                    <span className="text-xs font-semibold">Filter Category</span>
                                    {activeCategories.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] uppercase font-bold text-slate-500"
                                            onClick={() => activeCategories.forEach((cat: string) => onToggleCategory?.(cat))}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                {categories.map(cat => (
                                    <div key={cat} className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-50 rounded">
                                        <Checkbox
                                            id={`table-cat-${cat}`}
                                            checked={activeCategories.includes(cat)}
                                            onCheckedChange={() => {
                                                onToggleCategory?.(cat);
                                                setCurrentPage(1);
                                            }}
                                        />
                                        <label htmlFor={`table-cat-${cat}`} className="text-sm font-normal cursor-pointer flex-1">
                                            {cat}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {subcategories && subcategories.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                Filter Subcategories {activeSubcategories.length > 0 && `(${activeSubcategories.length})`}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b">
                                    <span className="text-xs font-semibold">Filter Subcategory</span>
                                    {activeSubcategories.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] uppercase font-bold text-slate-500"
                                            onClick={() => activeSubcategories.forEach((sub: string) => onToggleSubcategory?.(sub))}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                {(() => {
                                    const availableSubs = filters?.categories && filters.categories.length > 0
                                        ? Array.from(new Set(filters.categories.flatMap(cat => categoryMapping[cat] || [])))
                                            .filter(s => subcategories.includes(s))
                                            .sort()
                                        : subcategories;

                                    return availableSubs.map(sub => (
                                        <div key={sub} className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-50 rounded">
                                            <Checkbox
                                                id={`table-sub-${sub}`}
                                                checked={activeSubcategories.includes(sub)}
                                                onCheckedChange={() => {
                                                    onToggleSubcategory?.(sub);
                                                    setCurrentPage(1);
                                                }}
                                            />
                                            <label htmlFor={`table-sub-${sub}`} className="text-sm font-normal cursor-pointer flex-1">
                                                {sub}
                                            </label>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {(activeCategories.length > 0 || activeSubcategories.length > 0) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-red-500 hover:text-red-700"
                        onClick={() => {
                            activeCategories.forEach((cat: string) => onToggleCategory?.(cat));
                            activeSubcategories.forEach((sub: string) => onToggleSubcategory?.(sub));
                        }}
                    >
                        Reset All Filters
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => requestSort('parsedDate')}
                            >
                                <div className="flex items-center">
                                    Date {getSortIcon('parsedDate')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => requestSort('category')}
                            >
                                <div className="flex items-center">
                                    Category {getSortIcon('category')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => requestSort('subcategory')}
                            >
                                <div className="flex items-center">
                                    Subcategory {getSortIcon('subcategory')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => requestSort('description')}
                            >
                                <div className="flex items-center">
                                    Description {getSortIcon('description')}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-right cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => requestSort('absAmount')}
                            >
                                <div className="flex items-center justify-end">
                                    Amount {getSortIcon('absAmount')}
                                </div>
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedExpenses.map((expense, index) => (
                            <TableRow key={`${expense.rowId}-${index}`}>
                                <TableCell className="font-medium">{expense.date}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className="bg-slate-50 font-normal cursor-pointer hover:bg-slate-100"
                                        onClick={() => onToggleCategory?.(expense.category)}
                                    >
                                        {expense.category}
                                    </Badge>
                                </TableCell>
                                <TableCell
                                    className="text-muted-foreground cursor-pointer hover:underline hover:text-slate-900 transition-colors"
                                    onClick={() => onToggleSubcategory?.(expense.subcategory)}
                                >
                                    {expense.subcategory}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                                <TableCell className={`text-right font-semibold ${expense.amount > 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                                    {expense.amount > 0 ? '+' : ''}
                                    {expense.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                        onClick={() => setEditingExpense(expense)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {paginatedExpenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No transactions found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between px-2">
                <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedExpenses.length)} of {sortedExpenses.length} transactions
                </p>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium">
                        Page {currentPage} of {totalPages || 1}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <EditTransactionModal
                expense={editingExpense}
                isOpen={!!editingExpense}
                onClose={() => setEditingExpense(null)}
                onSuccess={() => onRefresh?.()}
                categories={categories || []}
                subcategories={subcategories || []}
                categoryMapping={categoryMapping}
            />
        </div>
    );
}
