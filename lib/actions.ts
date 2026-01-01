'use server';

import { promises as fs } from 'fs';
import path from 'path';

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
