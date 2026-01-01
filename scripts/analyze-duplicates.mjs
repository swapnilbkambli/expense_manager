
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const filePath = path.join(process.cwd(), 'project_documentation', 'expensemanager.csv');

async function analyze() {
    const csvString = fs.readFileSync(filePath, 'utf8');

    Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const categories = new Set();
            const subcategories = new Set();

            const catMap = new Map(); // lowercase -> Set of actual casings
            const subMap = new Map(); // lowercase -> Set of actual casings

            results.data.forEach((row) => {
                const cat = row['Category'] || 'Uncategorized';
                const sub = row['Subcategory'] || 'Other';

                const catLower = cat.toLowerCase();
                if (!catMap.has(catLower)) catMap.set(catLower, new Set());
                catMap.get(catLower).add(cat);

                const subLower = sub.toLowerCase();
                if (!subMap.has(subLower)) subMap.set(subLower, new Set());
                subMap.get(subLower).add(sub);
            });

            console.log('\n--- Category Case Variations ---');
            let catDupesFound = false;
            for (const [lower, variations] of catMap.entries()) {
                if (variations.size > 1) {
                    console.log(`- "${lower}": [${Array.from(variations).join(', ')}]`);
                    catDupesFound = true;
                }
            }
            if (!catDupesFound) console.log('None found.');

            console.log('\n--- Subcategory Case Variations ---');
            let subDupesFound = false;
            for (const [lower, variations] of subMap.entries()) {
                if (variations.size > 1) {
                    console.log(`- "${lower}": [${Array.from(variations).join(', ')}]`);
                    subDupesFound = true;
                }
            }
            if (!subDupesFound) console.log('None found.');
        }
    });
}

analyze();
