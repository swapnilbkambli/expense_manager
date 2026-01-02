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
}

export interface CategoryMapping {
    [category: string]: string[];
}
