export interface Expense {
    id?: number;
    date: string; // Original string DD-MM-YYYY
    parsedDate: Date;
    amount: number;
    category: string;
    subcategory: string;
    paymentMethod: string;
    description: string;
    refCheckNo: string;
    payeePayer: string;
    status: string;
    receiptPicture: string;
    account: string;
    tag: string;
    tax: string;
    quantity: string;
    splitTotal: string;
    rowId: string;
    typeId: string;
}

export type TimeRange = 'YTD' | 'All Time' | 'Last 30 Days' | 'Last 1 Year' | 'Last 2 Years' | 'Last 3 Years' | 'Last 4 Years' | 'Last 5 Years' | 'Custom';

export interface FilterState {
    dateRange: {
        from: Date | undefined;
        to: Date | undefined;
    };
    timeRange: TimeRange;
    categories: string[];
    subcategories: string[];
    searchQuery: string;
    viewMode: 'expense' | 'income';
}

export interface DashboardMetrics {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    prevTotalIncome?: number;
    prevTotalExpenses?: number;
    prevNetSavings?: number;
}

export interface CategoryMapping {
    [category: string]: string[];
}

export interface PeriodSummary {
    income: number;
    expenses: number;
}

export interface SummaryMetrics {
    today: PeriodSummary;
    thisWeek: PeriodSummary;
    thisMonth: PeriodSummary;
    ytd: PeriodSummary;
}

export interface RecurringExpense {
    description: string;
    category: string;
    subcategory: string;
    avgAmount: number;
    frequency: string;
    count: number;
    lastSeen: string;
    transactions: Expense[];
}

export interface Anomaly extends Expense {
    avgForCategory: number;
}

export interface SavingsTrendItem {
    month: string;
    income: number;
    consumption: number;
    savingsRate: number;
}

export interface CategoryBudget {
    category: string;
    subcategory?: string;
    amount: number;
}

export interface AdvancedInsights {
    recurring: RecurringExpense[];
    anomalies: Anomaly[];
    savingsTrend: SavingsTrendItem[];
    budgets: CategoryBudget[];
}
