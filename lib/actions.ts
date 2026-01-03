'use server';

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { parseExpenseCSV } from './csv-parser';
import {
    getDb,
    queryExpenses,
    clearExpenses,
    bulkInsertExpenses,
    updateExpense,
    getBudgets,
    setBudget,
    removeBudget,
    getAllExpensesForExport,
    getIgnoredInsights,
    setIgnoredInsight,
    bulkSetIgnoredInsights,
    clearIgnoredInsights
} from './db';
import { FilterState, Expense, CategoryMapping, SummaryMetrics, PeriodSummary, AdvancedInsights, CategoryBudget } from './types/expense';
import { toTitleCase, getDateRangeFromType, detectRecurringExpenses, detectAnomalies, getSavingsRateTrend } from './data-utils';
import {
    startOfToday,
    startOfWeek,
    startOfMonth,
    startOfYear,
    endOfToday,
    endOfWeek,
    endOfMonth,
    endOfYear
} from 'date-fns';

const REMOTE_CSV_URL = 'https://drive.google.com/uc?export=download&id=1QynFzfTQdqQPviMmhaIeJgPcig3YQRRH';

export async function getDefaultCSVData() {
    try {
        console.log('Attempting to fetch remote CSV...');
        const response = await fetch(REMOTE_CSV_URL, {
            headers: {
                // Add User-Agent to avoid being blocked or getting a limited response
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (response.ok) {
            const remoteContent = await response.text();

            // SECURITY/VALIDATION: Ensure we got a CSV, not a HTML login/preview page
            const isHtml = remoteContent.trim().toLowerCase().startsWith('<!doctype html') ||
                remoteContent.toLowerCase().includes('<html');
            const hasCsvHeader = remoteContent.includes('Date,') || remoteContent.includes('Amount,');

            if (!isHtml && hasCsvHeader) {
                console.log('Remote CSV successfully fetched and validated.');
                return remoteContent;
            } else {
                console.warn('Remote URL returned non-CSV content (likely HTML/Login page). Falling back to local.');
            }
        } else {
            console.warn(`Remote fetch failed with status: ${response.status}. Falling back to local.`);
        }
    } catch (error) {
        console.warn('Network error during remote fetch, falling back to local file.');
    }

    // Default Fallback to local file
    try {
        const filePath = path.join(process.cwd(), 'project_documentation', 'expensemanager.csv');
        const fileContent = await fs.readFile(filePath, 'utf8');
        return fileContent;
    } catch (localError) {
        console.error('CRITICAL: Failed to load both remote and local CSV data:', localError);
        throw new Error('Failed to load default data');
    }
}

export async function importExpensesAction(csvText: string) {
    try {
        if (!csvText || csvText.length < 50) {
            throw new Error('CSV content too short or empty');
        }

        const expenses = await parseExpenseCSV(csvText);

        if (expenses.length === 0) {
            console.warn('Import resulted in zero expenses. Aborting database clear to prevent data loss.');
            return { success: false, error: 'No valid expenses found in CSV' };
        }

        // Only clear if we actually have data to replace it with
        clearExpenses();
        bulkInsertExpenses(expenses);
        return { success: true, count: expenses.length };
    } catch (error: any) {
        console.error('Error importing expenses:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchExpensesAction(filters: FilterState) {
    try {
        const expenses = queryExpenses(filters);
        return expenses;
    } catch (error) {
        console.error('Error fetching expenses:', error);
        throw new Error('Failed to fetch data');
    }
}

export async function getFilterDataAction() {
    try {
        const db = (await import('./db')).getDb();
        const categories = db.prepare("SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL AND category != '' ORDER BY category ASC").all().map((r: any) => r.category);
        const subcategories = db.prepare("SELECT DISTINCT subcategory FROM expenses WHERE subcategory IS NOT NULL AND subcategory != '' ORDER BY subcategory ASC").all().map((r: any) => r.subcategory);

        // Build actual mapping from DB
        const rawMapping = db.prepare("SELECT DISTINCT category, subcategory FROM expenses WHERE category IS NOT NULL AND category != ''").all() as { category: string, subcategory: string }[];
        const dbMapping: CategoryMapping = {};
        rawMapping.forEach(r => {
            if (!dbMapping[r.category]) dbMapping[r.category] = [];
            if (r.subcategory && !dbMapping[r.category].includes(r.subcategory)) {
                dbMapping[r.category].push(r.subcategory);
            }
        });

        return { categories, subcategories, dbMapping };
    } catch (error) {
        console.error('Error fetching filter data:', error);
        throw new Error('Failed to fetch filter data');
    }
}

export async function updateExpenseAction(id: number, updates: Partial<Expense>) {
    try {
        updateExpense(id, updates);
        return { success: true };
    } catch (error: any) {
        console.error('Error updating expense:', error);
        return { success: false, error: error.message };
    }
}

export async function exportToCSVAction() {
    try {
        const expenses = getAllExpensesForExport();

        // Remove internal fields and format for CSV
        const csvData = expenses.map(e => {
            const { id, parsedDate, ...rest } = e;
            return rest;
        });

        const csv = Papa.unparse(csvData);
        return csv;
    } catch (error) {
        console.error('Error exporting CSV:', error);
        throw new Error('Failed to export CSV');
    }
}

export async function backupDefaultCSVAction() {
    try {
        const sourcePath = path.join(process.cwd(), 'project_documentation', 'expensemanager.csv');

        if (!existsSync(sourcePath)) {
            console.warn('Source CSV not found for backup, skipping.');
            return { success: true, message: 'Source not found, nothing to backup' };
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(process.cwd(), 'project_documentation', `expensemanager_backup_${timestamp}.csv`);

        await fs.copyFile(sourcePath, backupPath);
        return { success: true, backupFile: path.basename(backupPath) };
    } catch (error: any) {
        console.error('Backup error:', error);
        return { success: false, error: error.message };
    }
}

export async function getCategoryMappingAction(): Promise<CategoryMapping> {
    try {
        const filePath = path.join(process.cwd(), 'project_documentation', 'category.txt');
        if (!existsSync(filePath)) {
            return {};
        }
        const content = await fs.readFile(filePath, 'utf8');
        const mapping: CategoryMapping = {};

        content.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            if (trimmedLine.includes('/')) {
                const [rawCategory, subcatsStr] = trimmedLine.split('/');
                const category = toTitleCase(rawCategory.trim());
                const subcategories = subcatsStr
                    ? subcatsStr.split(',').map(s => toTitleCase(s.trim())).filter(Boolean)
                    : [];
                mapping[category] = subcategories;
            } else {
                mapping[toTitleCase(trimmedLine)] = [];
            }
        });

        return mapping;
    } catch (error) {
        console.error('Error reading category mapping:', error);
        return {};
    }
}

export async function getSummaryMetricsAction(): Promise<SummaryMetrics> {
    try {
        const db = (await import('./db')).getDb();
        const now = new Date();

        const getMetricsForRange = (from: Date, to: Date): PeriodSummary => {
            const result = db.prepare(`
                SELECT 
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
                FROM expenses 
                WHERE parsedDate >= ? AND parsedDate <= ?
            `).get(from.getTime(), to.getTime()) as { income: number | null, expenses: number | null };

            return {
                income: result.income || 0,
                expenses: result.expenses || 0
            };
        };

        return {
            today: getMetricsForRange(startOfToday(), endOfToday()),
            thisWeek: getMetricsForRange(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })),
            thisMonth: getMetricsForRange(startOfMonth(now), endOfMonth(now)),
            ytd: getMetricsForRange(startOfYear(now), endOfYear(now))
        };
    } catch (error) {
        console.error('Error in getSummaryMetricsAction:', error);
        throw new Error('Failed to fetch summary metrics');
    }
}

export async function getAdvancedInsightsAction(): Promise<AdvancedInsights> {
    try {
        const db = (await import('./db')).getDb();
        const rows = db.prepare('SELECT * FROM expenses').all() as any[];
        const expenses = rows.map(r => ({ ...r, parsedDate: new Date(r.parsedDate) })) as Expense[];

        const ignored = getIgnoredInsights();
        const ignoredRecurring = ignored.filter(i => i.type === 'recurring').map(i => i.identifier);
        const ignoredAnomalies = ignored.filter(i => i.type === 'anomaly').map(i => i.identifier);

        return {
            recurring: detectRecurringExpenses(expenses, ignoredRecurring),
            anomalies: detectAnomalies(expenses, ignoredAnomalies),
            savingsTrend: getSavingsRateTrend(expenses),
            budgets: getBudgets()
        };
    } catch (error) {
        console.error('Error in getAdvancedInsightsAction:', error);
        throw new Error('Failed to fetch advanced insights');
    }
}

export async function ignoreInsightAction(type: 'recurring' | 'anomaly', identifier: string) {
    try {
        setIgnoredInsight(type, identifier);
        return { success: true };
    } catch (error) {
        console.error('Error in ignoreInsightAction:', error);
        return { success: false, error: 'Failed to ignore insight' };
    }
}

export async function bulkIgnoreInsightsAction(type: 'recurring' | 'anomaly', identifiers: string[]) {
    try {
        bulkSetIgnoredInsights(type, identifiers);
        return { success: true };
    } catch (error) {
        console.error('Error in bulkIgnoreInsightsAction:', error);
        return { success: false, error: 'Failed to bulk ignore insights' };
    }
}

export async function clearIgnoredInsightsAction() {
    try {
        clearIgnoredInsights();
        return { success: true };
    } catch (error) {
        console.error('Error in clearIgnoredInsightsAction:', error);
        return { success: false, error: 'Failed to clear ignored insights' };
    }
}

export async function updateBudgetAction(category: string, amount: number, subcategory: string = '') {
    try {
        setBudget(category, amount, subcategory);
        return { success: true };
    } catch (error) {
        console.error('Error in updateBudgetAction:', error);
        return { success: false, error: 'Failed to update budget' };
    }
}

export async function removeBudgetAction(category: string, subcategory: string = '') {
    try {
        removeBudget(category, subcategory);
        return { success: true };
    } catch (error) {
        console.error('Error in removeBudgetAction:', error);
        return { success: false, error: 'Failed to remove budget' };
    }
}

export async function getBudgetsAction(): Promise<CategoryBudget[]> {
    try {
        return getBudgets();
    } catch (error) {
        console.error('Error in getBudgetsAction:', error);
        return [];
    }
}
