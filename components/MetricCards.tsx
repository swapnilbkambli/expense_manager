import { DashboardMetrics } from '@/lib/types/expense';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react';

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

    const cards = [
        {
            title: 'Total Income',
            value: formatCurrency(metrics.totalIncome),
            icon: ArrowUpRight,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
        },
        {
            title: 'Total Expenses',
            value: formatCurrency(metrics.totalExpenses),
            icon: ArrowDownRight,
            color: 'text-rose-500',
            bgColor: 'bg-rose-500/10',
        },
        {
            title: 'Net Savings',
            value: formatCurrency(metrics.netSavings),
            icon: metrics.netSavings >= 0 ? TrendingUp : ArrowDownRight,
            color: metrics.netSavings >= 0 ? 'text-blue-500' : 'text-amber-500',
            bgColor: metrics.netSavings >= 0 ? 'bg-blue-500/10' : 'bg-amber-500/10',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => (
                <Card key={card.title} className="overflow-hidden border-none shadow-sm bg-card hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                                <h3 className="text-2xl font-bold tracking-tight">{card.value}</h3>
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
