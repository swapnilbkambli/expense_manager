'use client';

import { Expense } from '@/lib/types/expense';
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
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TransactionTableProps {
    expenses: Expense[];
    onToggleCategory?: (category: string) => void;
}

type SortConfig = {
    key: keyof Expense | 'absAmount';
    direction: 'asc' | 'desc';
} | null;

export function TransactionTable({ expenses, onToggleCategory }: TransactionTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'parsedDate', direction: 'desc' });
    const itemsPerPage = 10;

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
                                <TableCell className="text-muted-foreground">{expense.subcategory}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                                <TableCell className={`text-right font-semibold ${expense.amount > 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                                    {expense.amount > 0 ? '+' : ''}
                                    {expense.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                </TableCell>
                            </TableRow>
                        ))}
                        {paginatedExpenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
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
        </div>
    );
}
