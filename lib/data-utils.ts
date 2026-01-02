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
    return str
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
