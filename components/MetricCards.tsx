import { DashboardMetrics } from '@/lib/types/expense';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardsProps {
    metrics: DashboardMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const calculateChange = (current: number, previous?: number) => {
        if (previous === undefined || previous === 0) return null;
        const change = ((current - previous) / previous) * 100;
        return change;
    };

    const formatChange = (change: number | null) => {
        if (change === null) return null;
        const isPositive = change > 0;
        return (
            <div className={cn(
                "flex items-center text-xs font-bold mt-1",
                isPositive ? "text-emerald-500" : "text-rose-500"
            )}>
                {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {Math.abs(change).toFixed(1)}%
                <span className="text-slate-600 font-bold ml-1">vs prev. period</span>
            </div>
        );
    };

    const cards = [
        {
            title: 'Total Income',
            value: formatCurrency(metrics.totalIncome),
            change: calculateChange(metrics.totalIncome, metrics.prevTotalIncome),
            icon: ArrowUpRight,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
            invertColor: false, // Income up is good
        },
        {
            title: 'Total Expenses',
            value: formatCurrency(metrics.totalExpenses),
            change: calculateChange(metrics.totalExpenses, metrics.prevTotalExpenses),
            icon: ArrowDownRight,
            color: 'text-rose-500',
            bgColor: 'bg-rose-500/10',
            invertColor: true, // Expenses up is bad
        },
        {
            title: 'Net Savings',
            value: formatCurrency(metrics.netSavings),
            change: calculateChange(metrics.netSavings, metrics.prevNetSavings),
            icon: metrics.netSavings >= 0 ? TrendingUp : ArrowDownRight,
            color: metrics.netSavings >= 0 ? 'text-blue-500' : 'text-amber-500',
            bgColor: metrics.netSavings >= 0 ? 'bg-blue-500/10' : 'bg-amber-500/10',
            invertColor: false, // Savings up is good
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => (
                <Card key={card.title} className="overflow-hidden border-none shadow-sm bg-card hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">{card.title}</p>
                                <h3 className="text-2xl font-black tracking-tight text-slate-900">{card.value}</h3>
                                {formatChange(card.change)}
                            </div>
                            <div className={`p-3 rounded-xl ${card.bgColor}`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
