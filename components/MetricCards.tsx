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
            color: 'text-emerald-600',
            gradient: 'from-emerald-500/10 to-teal-500/5',
            iconBg: 'bg-emerald-500 text-white shadow-emerald-200',
        },
        {
            title: 'Total Expenses',
            value: formatCurrency(metrics.totalExpenses),
            change: calculateChange(metrics.totalExpenses, metrics.prevTotalExpenses),
            icon: ArrowDownRight,
            color: 'text-rose-600',
            gradient: 'from-rose-500/10 to-orange-500/5',
            iconBg: 'bg-rose-500 text-white shadow-rose-200',
        },
        {
            title: 'Net Savings',
            value: formatCurrency(metrics.netSavings),
            change: calculateChange(metrics.netSavings, metrics.prevNetSavings),
            icon: metrics.netSavings >= 0 ? TrendingUp : ArrowDownRight,
            color: metrics.netSavings >= 0 ? 'text-indigo-600' : 'text-amber-600',
            gradient: metrics.netSavings >= 0 ? 'from-indigo-500/10 to-violet-500/5' : 'from-amber-500/10 to-orange-500/5',
            iconBg: metrics.netSavings >= 0 ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-amber-500 text-white shadow-amber-200',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => (
                <Card key={card.title} className="group relative overflow-hidden border border-white/40 bg-white/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-1">
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity duration-500", card.gradient)} />
                    <CardContent className="relative p-6 z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{card.title}</p>
                                <h3 className="text-3xl font-black tracking-tight text-slate-900 drop-shadow-sm">{card.value}</h3>
                                {formatChange(card.change)}
                            </div>
                            <div className={cn("p-4 rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", card.iconBg)}>
                                <card.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
