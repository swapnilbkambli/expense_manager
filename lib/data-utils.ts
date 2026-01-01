import { Expense, FilterState, DashboardMetrics } from './types/expense';
import { isWithinInterval, startOfYear, endOfYear, subDays, startOfMonth, endOfMonth } from 'date-fns';

export const filterExpenses = (expenses: Expense[], filters: FilterState): Expense[] => {
    return expenses.filter((expense) => {
        // Date filtering (Independent From/To)
        const date = expense.parsedDate;
        if (filters.dateRange.from && date < filters.dateRange.from) {
            return false;
        }
        if (filters.dateRange.to && date > filters.dateRange.to) {
            return false;
        }

        // Category and Subcategory filtering (Union/OR relationship)
        const hasCategoryFilter = filters.categories.length > 0;
        const hasSubcategoryFilter = filters.subcategories.length > 0;

        if (hasCategoryFilter || hasSubcategoryFilter) {
            const matchesCategory = hasCategoryFilter && filters.categories.includes(expense.category);
            const matchesSubcategory = hasSubcategoryFilter && filters.subcategories.includes(expense.subcategory);

            if (!matchesCategory && !matchesSubcategory) {
                return false;
            }
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
        if (expense.amount > 0) {
            totalIncome += expense.amount;
        } else {
            totalExpenses += Math.abs(expense.amount);
        }
    });

    return {
        totalIncome,
        totalExpenses,
        netSavings: totalIncome - totalExpenses,
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

export const getCategoryData = (expenses: Expense[]) => {
    const categoryMap: { [key: string]: number } = {};

    expenses.filter(e => e.amount < 0).forEach((expense) => {
        categoryMap[expense.category] = (categoryMap[expense.category] || 0) + Math.abs(expense.amount);
    });

    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
};

export const getSubcategoryData = (expenses: Expense[]) => {
    const subcategoryMap: { [key: string]: number } = {};

    expenses.filter(e => e.amount < 0).forEach((expense) => {
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
        case 'All Time':
        default:
            return { from: undefined, to: undefined };
    }
};
