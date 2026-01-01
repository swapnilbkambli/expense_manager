import { Expense } from '@/lib/types/expense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Info, AlertCircle, Lightbulb } from 'lucide-react';
import { useMemo } from 'react';
import { differenceInMonths, startOfMonth, endOfMonth, format } from 'date-fns';

interface SpendingInsightsProps {
    expenses: Expense[];
}

export function SpendingInsights({ expenses }: SpendingInsightsProps) {
    const insights = useMemo(() => {
        const expenseRecords = expenses.filter((e) => e.amount < 0);
        if (expenseRecords.length === 0) return null;

        // Sort to get date range
        const sorted = [...expenseRecords].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
        const startDate = sorted[0].parsedDate;
        const endDate = sorted[sorted.length - 1].parsedDate;

        // Calculate total months in range (minimum 1)
        const monthsRange = Math.max(1, differenceInMonths(endOfMonth(endDate), startOfMonth(startDate)) + 1);

        const totalExpense = expenseRecords.reduce((sum, e) => sum + Math.abs(e.amount), 0);
        const avgMonthlySpend = totalExpense / monthsRange;

        // Find highest spending category
        const categoryTotals: { [key: string]: number } = {};
        expenseRecords.forEach((e) => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Math.abs(e.amount);
        });

        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        const topCategoryAvg = (topCategory?.[1] || 0) / monthsRange;

        // Find highest spending month
        const monthlyTotals: { [key: string]: number } = {};
        expenseRecords.forEach((e) => {
            const monthKey = format(e.parsedDate, 'MMM yyyy');
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + Math.abs(e.amount);
        });
        const topMonth = Object.entries(monthlyTotals).sort((a, b) => b[1] - a[1])[0];

        return {
            avgMonthlySpend,
            monthsRange,
            topCategory: topCategory?.[0],
            topCategoryAvg,
            topMonth: topMonth?.[0],
            topMonthAmount: topMonth?.[1],
        };
    }, [expenses]);

    if (!insights) return null;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-50 border-none shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Info className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Avg Monthly Spend</p>
                            <h4 className="text-xl font-bold text-slate-900">{formatCurrency(insights.avgMonthlySpend)}</h4>
                            <p className="text-xs text-slate-400 mt-1">Based on {insights.monthsRange} month(s)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-50 border-none shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Lightbulb className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Top Category Impact</p>
                            <h4 className="text-xl font-bold text-slate-900">{insights.topCategory}</h4>
                            <p className="text-xs text-slate-400 mt-1">Avg {formatCurrency(insights.topCategoryAvg)} / mo</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-50 border-none shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Peak Spending Period</p>
                            <h4 className="text-xl font-bold text-slate-900">{insights.topMonth}</h4>
                            <p className="text-xs text-slate-400 mt-1">Spike of {formatCurrency(insights.topMonthAmount || 0)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-50 border-none shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <TrendingDown className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Potential Savings</p>
                            <h4 className="text-xl font-bold text-slate-900">~15% Targeting</h4>
                            <p className="text-xs text-slate-400 mt-1">Aim to save {formatCurrency(insights.avgMonthlySpend * 0.15)} more</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
