import { Expense } from '@/lib/types/expense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Info, AlertCircle, Lightbulb } from 'lucide-react';
import { useMemo } from 'react';
import { differenceInMonths, startOfMonth, endOfMonth, format } from 'date-fns';

interface SpendingInsightsProps {
    expenses: Expense[];
    viewMode?: 'expense' | 'income';
}

export function SpendingInsights({ expenses, viewMode = 'expense' }: SpendingInsightsProps) {
    const isExpense = viewMode === 'expense';
    const insights = useMemo(() => {
        const records = expenses.filter((e) => isExpense ? e.amount < 0 : e.amount > 0);
        if (records.length === 0) return null;

        // Sort to get date range
        const sorted = [...records].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
        const startDate = sorted[0].parsedDate;
        const endDate = sorted[sorted.length - 1].parsedDate;

        // Calculate total months in range (minimum 1)
        const monthsRange = Math.max(1, differenceInMonths(endOfMonth(endDate), startOfMonth(startDate)) + 1);

        const totalAmount = records.reduce((sum, e) => sum + Math.abs(e.amount), 0);
        const avgMonthly = totalAmount / monthsRange;

        // Find highest category
        const categoryTotals: { [key: string]: number } = {};
        records.forEach((e) => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Math.abs(e.amount);
        });

        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        const topCategoryAvg = (topCategory?.[1] || 0) / monthsRange;

        // Find highest month
        const monthlyTotals: { [key: string]: number } = {};
        records.forEach((e) => {
            const monthKey = format(e.parsedDate, 'MMM yyyy');
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + Math.abs(e.amount);
        });
        const topMonth = Object.entries(monthlyTotals).sort((a, b) => b[1] - a[1])[0];

        return {
            avgMonthly,
            monthsRange,
            topCategory: topCategory?.[0],
            topCategoryAvg,
            topMonth: topMonth?.[0],
            topMonthAmount: topMonth?.[1],
        };
    }, [expenses, isExpense]);

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
            <Card className="glass-card bg-white/40 border-white/40 hover:shadow-2xl transition-all duration-300">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-100 shadow-sm transition-transform hover:scale-110">
                            <Info className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{isExpense ? 'Avg Monthly Spend' : 'Avg Monthly Income'}</p>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(insights.avgMonthly)}</h4>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Across {insights.monthsRange} month(s)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card bg-white/40 border-white/40 hover:shadow-2xl transition-all duration-300">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-100 shadow-sm transition-transform hover:scale-110">
                            <Lightbulb className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{isExpense ? 'Top Category Impact' : 'Primary Income Source'}</p>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{insights.topCategory}</h4>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Avg {formatCurrency(insights.topCategoryAvg)} / mo</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card bg-white/40 border-white/40 hover:shadow-2xl transition-all duration-300">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-100 shadow-sm transition-transform hover:scale-110">
                            <AlertCircle className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{isExpense ? 'Peak Spending Period' : 'Highest Income Month'}</p>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{insights.topMonth}</h4>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{isExpense ? 'Spike' : 'High'} of {formatCurrency(insights.topMonthAmount || 0)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card bg-white/40 border-white/40 hover:shadow-2xl transition-all duration-300">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-100 shadow-sm transition-transform hover:scale-110">
                            {isExpense ? <TrendingDown className="w-5 h-5 text-emerald-600" /> : <TrendingUp className="w-5 h-5 text-indigo-600" />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{isExpense ? 'Potential Savings' : 'Income Stability'}</p>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{isExpense ? '~15% Target' : 'Growth Focus'}</h4>
                            <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase font-black">
                                {isExpense
                                    ? `Save ${formatCurrency(insights.avgMonthly * 0.15)} more`
                                    : `Scale ${insights.topCategory}`}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
