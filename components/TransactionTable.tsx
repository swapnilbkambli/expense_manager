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
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TransactionTableProps {
    expenses: Expense[];
    onToggleCategory?: (category: string) => void;
}

const ITEMS_PER_PAGE = 10;

export function TransactionTable({ expenses, onToggleCategory }: TransactionTableProps) {
    const [currentPage, setCurrentPage] = useState(1);

    const sortedExpenses = [...expenses].sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

    const totalPages = Math.ceil(sortedExpenses.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedExpenses = sortedExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Subcategory</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
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
                    Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, sortedExpenses.length)} of {sortedExpenses.length} transactions
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
