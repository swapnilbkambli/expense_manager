import Papa from 'papaparse';
import { parse, isValid } from 'date-fns';
import { Expense } from './types/expense';

import { toTitleCase } from './data-utils';

export const parseExpenseCSV = (csvString: string): Promise<Expense[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsedData: Expense[] = results.data.map((row: any) => {
                    const dateStr = row['Date'] || '';
                    // Support multiple formats: YYYY-MM-DD or DD-MM-YYYY
                    let parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
                    if (!isValid(parsedDate)) {
                        parsedDate = parse(dateStr, 'dd-MM-yyyy', new Date());
                    }

                    if (!isValid(parsedDate)) {
                        parsedDate = new Date(0);
                    }

                    return {
                        date: dateStr,
                        parsedDate,
                        amount: parseFloat(row['Amount']) || 0,
                        category: toTitleCase(row['Category']) || 'Uncategorized',
                        subcategory: toTitleCase(row['Subcategory']) || '',
                        paymentMethod: row['Payment Method'] || '',
                        description: row['Description'] || '',
                        refCheckNo: row['Ref/Check No'] || '',
                        payeePayer: row['Payee/Payer'] || '',
                        status: row['Status'] || '',
                        receiptPicture: row['Receipt Picture'] || '',
                        account: row['Account'] || '',
                        tag: row['Tag'] || '',
                        tax: row['Tax'] || '',
                        quantity: row['Quantity'] || '',
                        splitTotal: row['Split Total'] || '',
                        rowId: row['Row Id'] || '',
                        typeId: row['Type Id'] || '',
                    };
                });
                resolve(parsedData);
            },
            error: (error: any) => {
                reject(error);
            }
        });
    });
};
