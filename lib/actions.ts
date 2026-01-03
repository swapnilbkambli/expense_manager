'use server';

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { parseExpenseCSV } from './csv-parser';
import { clearExpenses, bulkInsertExpenses, queryExpenses, updateExpense, getAllExpensesForExport } from './db';
import { FilterState, Expense, CategoryMapping, SummaryMetrics, PeriodSummary } from './types/expense';
import { toTitleCase } from './data-utils';
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

export async function getDefaultCSVData() {
    try {
        const filePath = path.join(process.cwd(), 'project_documentation', 'expensemanager.csv');
        const fileContent = await fs.readFile(filePath, 'utf8');
        return fileContent;
    } catch (error) {
        console.error('Error reading default CSV data:', error);
        throw new Error('Failed to load default data');
    }
}

export async function importExpensesAction(csvText: string) {
    try {
        const expenses = await parseExpenseCSV(csvText);
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
