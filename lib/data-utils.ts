import { Expense, FilterState, DashboardMetrics, CategoryMapping } from './types/expense';
import { isWithinInterval, startOfYear, endOfYear, subDays, startOfMonth, endOfMonth, subYears } from 'date-fns';

export const filterExpenses = (expenses: Expense[], filters: FilterState, categoryMapping: CategoryMapping = {}): Expense[] => {
    return expenses.filter((expense) => {
        // Date filtering (Independent From/To)
        const date = expense.parsedDate;
        if (filters.dateRange.from && date < filters.dateRange.from) {
            return false;
        }
        if (filters.dateRange.to && date > filters.dateRange.to) {
            return false;
        }

        // Hierarchical Selection Logic
        const hasCategoryFilter = filters.categories.length > 0;
        const hasSubcategoryFilter = filters.subcategories.length > 0;

        if (hasCategoryFilter || hasSubcategoryFilter) {
            // Logic: Include expense if:
            // 1. Its subcategory is explicitly selected (regardless of category)
            // 2. Its category is selected AND none of the subcategories for THIS SPECIFIC category are selected (meaning "whole category" is intended)

            const isSubcatSelected = filters.subcategories.includes(expense.subcategory);
            if (isSubcatSelected) return true;

            const isCatSelected = filters.categories.includes(expense.category);
            if (isCatSelected) {
                // If the category is selected, we only include the expense if the user hasn't 
                // refined this specific category by selecting other subcategories within it.
                const subcategoriesForThisCat = categoryMapping[expense.category] || [];
                const anySubcatFromThisCatSelected = subcategoriesForThisCat.some(s => filters.subcategories.includes(s));

                if (!anySubcatFromThisCatSelected) {
                    return true;
                }
            }

            // If we have filters but this expense didn't match the hierarchical rules
            return false;
        }

        // Search query
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const match =
                expense.description.toLowerCase().includes(query) ||
                expense.category.toLowerCase().includes(query) ||
                expense.subcategory.toLowerCase().includes(query) ||
                expense.payeePayer.toLowerCase().includes(query);
            if (!match) return false;
        }

        return true;
    });
};

export const calculateMetrics = (expenses: Expense[]): DashboardMetrics => {
    let totalIncome = 0;
    let totalExpenses = 0;

    expenses.forEach((expense) => {
        const absAmount = Math.abs(expense.amount);
        if (expense.amount > 0) {
            totalIncome += absAmount;
        } else {
            totalExpenses += absAmount;
        }
    });

    return {
        totalIncome,
        totalExpenses,
        netSavings: totalIncome - totalExpenses,
    };
};

export const getPreviousPeriod = (from?: Date, to?: Date) => {
    if (!from || !to) return { from: undefined, to: undefined };
    const diff = to.getTime() - from.getTime();
    return {
        from: new Date(from.getTime() - diff - 86400000), // -1 day to be safe
        to: new Date(from.getTime() - 86400000)
    };
};

export const getTrendData = (expenses: Expense[]) => {
    // Simple monthly aggregation for now
    const monthlyData: { [key: string]: { date: string; income: number; expense: number } } = {};

    expenses.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()).forEach((expense) => {
        const monthKey = expense.date.substring(3); // "MM-YYYY"
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { date: monthKey, income: 0, expense: 0 };
        }
        if (expense.amount > 0) {
            monthlyData[monthKey].income += expense.amount;
        } else {
            monthlyData[monthKey].expense += Math.abs(expense.amount);
        }
    });

    return Object.values(monthlyData);
};

export const getCategoryData = (expenses: Expense[], viewMode: 'expense' | 'income' = 'expense') => {
    const categoryMap: { [key: string]: number } = {};
    const filtered = expenses.filter(e => viewMode === 'expense' ? e.amount < 0 : e.amount > 0);

    filtered.forEach((expense) => {
        categoryMap[expense.category] = (categoryMap[expense.category] || 0) + Math.abs(expense.amount);
    });

    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
};

export const getSubcategoryData = (expenses: Expense[], viewMode: 'expense' | 'income' = 'expense') => {
    const subcategoryMap: { [key: string]: number } = {};
    const filtered = expenses.filter(e => viewMode === 'expense' ? e.amount < 0 : e.amount > 0);

    filtered.forEach((expense) => {
        const key = expense.subcategory || 'Other';
        subcategoryMap[key] = (subcategoryMap[key] || 0) + Math.abs(expense.amount);
    });

    return Object.entries(subcategoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10
};

export const getDateRangeFromType = (type: string) => {
    const now = new Date();
    switch (type) {
        case 'YTD':
            return { from: startOfYear(now), to: endOfYear(now) };
        case 'Last 30 Days':
            return { from: subDays(now, 30), to: now };
        case 'Last 1 Year':
            return { from: subYears(now, 1), to: now };
        case 'Last 2 Years':
            return { from: subYears(now, 2), to: now };
        case 'Last 3 Years':
            return { from: subYears(now, 3), to: now };
        case 'Last 4 Years':
            return { from: subYears(now, 4), to: now };
        case 'Last 5 Years':
            return { from: subYears(now, 5), to: now };
        case 'All Time':
        default:
            return { from: undefined, to: undefined };
    }
};

export const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const detectRecurringExpenses = (expenses: Expense[], ignoredIdentifiers: string[] = []) => {
    const sorted = [...expenses].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    const outgoing = sorted.filter(e => e.amount < 0);
    const groups: { [key: string]: Expense[] } = {};

    outgoing.forEach(e => {
        // Group by category + subcategory + normalized description
        const descKey = e.description.toLowerCase().trim().substring(0, 20);
        const groupKey = `${e.category}|${e.subcategory}|${descKey}`;

        if (ignoredIdentifiers.includes(descKey)) return;
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(e);
    });

    const recurring = Object.entries(groups)
        .filter(([_, items]) => items.length >= 2) // Happens at least twice
        .map(([name, items]) => {
            // Check if intervals are roughly monthly
            const intervals = [];
            for (let i = 1; i < items.length; i++) {
                const diffDays = (items[i].parsedDate.getTime() - items[i - 1].parsedDate.getTime()) / (1000 * 60 * 60 * 24);
                intervals.push(diffDays);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const isMonthly = avgInterval >= 25 && avgInterval <= 35;

            return {
                description: items[0].description,
                category: items[0].category,
                subcategory: items[0].subcategory,
                avgAmount: Math.abs(items.reduce((a, b) => a + b.amount, 0) / items.length),
                frequency: isMonthly ? 'Monthly' : 'Periodic',
                count: items.length,
                lastSeen: items[items.length - 1].date,
                transactions: items
            };
        })
        .filter(r => r.count >= 3 || r.frequency === 'Monthly')
        .sort((a, b) => b.avgAmount - a.avgAmount);

    return recurring;
};

export const detectAnomalies = (expenses: Expense[], ignoredIdentifiers: string[] = []) => {
    const categories: { [key: string]: number[] } = {};
    const outgoing = expenses.filter(e => e.amount < 0);

    outgoing.forEach(e => {
        if (!categories[e.category]) categories[e.category] = [];
        categories[e.category].push(Math.abs(e.amount));
    });

    const anomalies: (Expense & { avgForCategory: number })[] = [];

    outgoing.forEach(e => {
        if (e.rowId && ignoredIdentifiers.includes(e.rowId)) return;

        const amounts = categories[e.category];
        if (amounts.length < 5) return; // Need some history

        const sum = amounts.reduce((a, b) => a + b, 0);
        const avg = sum / amounts.length;
        const current = Math.abs(e.amount);

        // Flag if > 3x average AND > 1000 (to avoid small noise)
        if (current > avg * 3 && current > 1000) {
            anomalies.push({ ...e, avgForCategory: avg });
        }
    });

    return anomalies.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 10);
};

export const getSavingsRateTrend = (expenses: Expense[]) => {
    const monthlyData: { [key: string]: { month: string; income: number; consumption: number; savings: number } } = {};

    expenses.forEach(e => {
        const monthKey = e.date.substring(3); // "MM-YYYY"
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthKey, income: 0, consumption: 0, savings: 0 };
        }

        const absAmount = Math.abs(e.amount);
        if (e.amount > 0) {
            monthlyData[monthKey].income += absAmount;
        } else {
            monthlyData[monthKey].consumption += absAmount;
        }
    });

    return Object.values(monthlyData).map(d => {
        const totalSavings = d.income - d.consumption;
        const rate = d.income > 0 ? (totalSavings / d.income) * 100 : 0;
        return {
            ...d,
            savingsRate: parseFloat(rate.toFixed(1))
        };
    }).sort((a, b) => {
        const [ma, ya] = a.month.split('-').map(Number);
        const [mb, yb] = b.month.split('-').map(Number);
        return ya !== yb ? ya - yb : ma - mb;
    });
};
