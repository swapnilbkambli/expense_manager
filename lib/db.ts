import Database from 'better-sqlite3';
import path from 'path';
import { Expense, FilterState, CategoryBudget } from './types/expense';

const DB_PATH = path.join(process.cwd(), 'expenses.db');

let db: Database.Database | null = null;

export function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        initDb();
    }
    return db;
}

function initDb() {
    const database = getDb();
    database.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            parsedDate INTEGER,
            amount REAL,
            category TEXT,
            subcategory TEXT,
            paymentMethod TEXT,
            description TEXT,
            refCheckNo TEXT,
            payeePayer TEXT,
            status TEXT,
            receiptPicture TEXT,
            account TEXT,
            tag TEXT,
            tax TEXT,
            quantity TEXT,
            splitTotal TEXT,
            rowId TEXT,
            typeId TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_category ON expenses(category);
        CREATE INDEX IF NOT EXISTS idx_subcategory ON expenses(subcategory);
        CREATE INDEX IF NOT EXISTS idx_parsedDate ON expenses(parsedDate);

        CREATE TABLE IF NOT EXISTS budgets (
            category TEXT,
            subcategory TEXT DEFAULT '',
            amount REAL,
            PRIMARY KEY (category, subcategory)
        );

        CREATE TABLE IF NOT EXISTS ignored_insights (
            type TEXT,
            identifier TEXT,
            PRIMARY KEY (type, identifier)
        );
    `);
}


export function clearExpenses() {
    const database = getDb();
    database.prepare('DELETE FROM expenses').run();
}

export function bulkInsertExpenses(expenses: Expense[]) {
    const database = getDb();
    const insert = database.prepare(`
        INSERT INTO expenses (
            date, parsedDate, amount, category, subcategory, paymentMethod, 
            description, refCheckNo, payeePayer, status, receiptPicture, 
            account, tag, tax, quantity, splitTotal, rowId, typeId
        ) VALUES (
            @date, @parsedDate, @amount, @category, @subcategory, @paymentMethod, 
            @description, @refCheckNo, @payeePayer, @status, @receiptPicture, 
            @account, @tag, @tax, @quantity, @splitTotal, @rowId, @typeId
        )
    `);

    const insertMany = database.transaction((items: Expense[]) => {
        for (const item of items) {
            insert.run({
                ...item,
                parsedDate: item.parsedDate.getTime()
            });
        }
    });

    insertMany(expenses);
}

export function queryExpenses(filters?: FilterState): Expense[] {
    const database = getDb();
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params: any = {};

    if (filters) {
        if (filters.dateRange.from) {
            query += ' AND parsedDate >= @from';
            params.from = filters.dateRange.from.getTime();
        }
        if (filters.dateRange.to) {
            query += ' AND parsedDate <= @to';
            params.to = filters.dateRange.to.getTime();
        }
        if (filters.categories.length > 0 || filters.subcategories.length > 0) {
            const conditions: string[] = [];

            // 1. Subcategories always take precedence (Union across everything explicitly selected)
            if (filters.subcategories.length > 0) {
                const subPlaceholders = filters.subcategories.map((_, i) => `@sub${i}`).join(',');
                conditions.push(`subcategory IN (${subPlaceholders})`);
                filters.subcategories.forEach((sub, i) => {
                    params[`sub${i}`] = sub;
                });
            }

            // 2. Categories take effect if they are selected AND none of their subcategories are explicitly filtered.
            // For simplicity in SQL (since we don't have the full mapping easily available in a single query),
            // we will build a filter that says: (Category is X AND Subcategory is NOT in the list of selected subcategories)
            // This effectively allows "Selection" to mean "The rest of this category".
            if (filters.categories.length > 0) {
                const catPlaceholders = filters.categories.map((_, i) => `@cat${i}`).join(',');
                let catClause = `category IN (${catPlaceholders})`;

                // If there are subcategory filters, we exclude them from the category match to prevent overlap
                // and correctly implement the "Refinement" logic.
                if (filters.subcategories.length > 0) {
                    const subPlaceholders = filters.subcategories.map((_, i) => `@sub_ex${i}`).join(',');
                    catClause += ` AND subcategory NOT IN (${subPlaceholders})`;
                    filters.subcategories.forEach((sub, i) => {
                        params[`sub_ex${i}`] = sub;
                    });
                }

                conditions.push(`(${catClause})`);
                filters.categories.forEach((cat, i) => {
                    params[`cat${i}`] = cat;
                });
            }

            if (conditions.length > 0) {
                query += ` AND (${conditions.join(' OR ')})`;
            }
        }
        if (filters.searchQuery) {
            query += ' AND (description LIKE @search OR payeePayer LIKE @search)';
            params.search = `%${filters.searchQuery}%`;
        }
    }

    query += ' ORDER BY parsedDate DESC';

    const rows = database.prepare(query).all(params) as any[];

    return rows.map(row => ({
        ...row,
        parsedDate: new Date(row.parsedDate)
    }));
}
export function updateExpense(id: number, updates: Partial<Expense>) {
    const database = getDb();
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = @${field}`).join(', ');
    const query = `UPDATE expenses SET ${setClause} WHERE id = @id`;

    const preparedParams = { ...updates, id };

    // special handling for parsedDate if it's being updated
    if (updates.parsedDate) {
        (preparedParams as any).parsedDate = updates.parsedDate.getTime();
    }

    database.prepare(query).run(preparedParams);
}

export function getAllExpensesForExport(): Expense[] {
    const database = getDb();
    const rows = database.prepare('SELECT * FROM expenses ORDER BY parsedDate ASC').all() as any[];
    return rows.map(row => ({
        ...row,
        parsedDate: new Date(row.parsedDate)
    }));
}

export function setBudget(category: string, amount: number, subcategory: string = '') {
    const database = getDb();
    database.prepare('INSERT OR REPLACE INTO budgets (category, subcategory, amount) VALUES (?, ?, ?)').run(category, subcategory, amount);
}

export function getBudgets(): CategoryBudget[] {
    const database = getDb();
    return database.prepare('SELECT category, subcategory, amount FROM budgets').all() as CategoryBudget[];
}

export function removeBudget(category: string, subcategory: string = '') {
    const database = getDb();
    database.prepare('DELETE FROM budgets WHERE category = ? AND subcategory = ?').run(category, subcategory);
}

export function clearBudgets() {
    const database = getDb();
    database.prepare('DELETE FROM budgets').run();
}

export function setIgnoredInsight(type: string, identifier: string) {
    const database = getDb();
    database.prepare('INSERT OR REPLACE INTO ignored_insights (type, identifier) VALUES (?, ?)').run(type, identifier);
}

export function bulkSetIgnoredInsights(type: string, identifiers: string[]) {
    const database = getDb();
    const insert = database.prepare('INSERT OR REPLACE INTO ignored_insights (type, identifier) VALUES (?, ?)');
    const insertMany = database.transaction((ids: string[]) => {
        for (const id of ids) {
            insert.run(type, id);
        }
    });
    insertMany(identifiers);
}

export function getIgnoredInsights(): { type: string, identifier: string }[] {
    const database = getDb();
    return database.prepare('SELECT * FROM ignored_insights').all() as { type: string, identifier: string }[];
}

export function getExpenseCount(): number {
    const database = getDb();
    const result = database.prepare('SELECT COUNT(*) as count FROM expenses').get() as { count: number };
    return result.count;
}

export function clearIgnoredInsights() {
    const database = getDb();
    database.prepare('DELETE FROM ignored_insights').run();
}
