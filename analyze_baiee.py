import sqlite3
from datetime import datetime
from dateutil.relativedelta import relativedelta
import re

def analyze():
    conn = sqlite3.connect('expenses.db')
    cursor = conn.cursor()
    
    query = """
    SELECT date, amount, description 
    FROM expenses 
    WHERE category = 'Household' AND subcategory = 'Baiee' 
    AND parsedDate >= 1672531200000 
    ORDER BY parsedDate ASC
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    
    if not rows:
        print("No rows found in database.")
        return

    # Organize by month
    by_month = {}
    for date_str, amount, desc in rows:
        try:
            d = datetime.strptime(date_str, '%d-%m-%Y')
        except ValueError:
            # Try other formats if needed
            try:
                d = datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                print(f"Skipping row with invalid date: {date_str}")
                continue

        month_key = d.strftime('%Y-%m')
        if month_key not in by_month:
            by_month[month_key] = []
        by_month[month_key].append({'amount': abs(amount), 'desc': desc or '', 'date': date_str})
    
    start_date = datetime(2023, 1, 1)
    # Analysis up to today
    end_date = datetime.now()
    current = start_date
    
    maid_months_paid = [] # List of months covered by maid payments
    nanny_months_paid = [] # List of months covered by nanny payments
    
    monthly_data = []
    
    while current <= end_date:
        month_key = current.strftime('%Y-%m')
        month_data = by_month.get(month_key, [])
        
        maid_entries = []
        nanny_entries = []
        
        for entry in month_data:
            desc = entry['desc'].lower()
            amt = entry['amount']
            
            is_nanny = 'nanny' in desc or amt >= 10000
            is_maid = 'maid' in desc or 'baiee' in desc or 'baee' in desc or amt in [2500, 2800]
            
            if is_nanny:
                nanny_entries.append(entry)
                # Check for "X months"
                match = re.search(r'(\d+)\s+months', desc)
                if match:
                    count = int(match.group(1))
                    for i in range(count):
                        # For simplicity, we assume arrears cover previous months
                        cov_month = (current - relativedelta(months=i)).strftime('%Y-%m')
                        nanny_months_paid.append(cov_month)
                else:
                    nanny_months_paid.append(month_key)
            
            elif is_maid:
                maid_entries.append(entry)
                match = re.search(r'(\d+)\s+months', desc)
                if match:
                    count = int(match.group(1))
                    for i in range(count):
                        cov_month = (current - relativedelta(months=i)).strftime('%Y-%m')
                        maid_months_paid.append(cov_month)
                else:
                    maid_months_paid.append(month_key)
        
        monthly_data.append({
            'month': month_key,
            'maid_count': len(maid_entries),
            'nanny_count': len(nanny_entries),
            'entries': month_data
        })
        current += relativedelta(months=1)

    # Now check which months are NOT in maid_months_paid or nanny_months_paid
    nanny_months_paid = set(nanny_months_paid)
    maid_months_paid = set(maid_months_paid)
    
    print("--- MAID STATUS ---")
    current = start_date
    while current <= end_date:
        m = current.strftime('%Y-%m')
        if m not in maid_months_paid:
            print(f"MISSING MAID: {m}")
        current += relativedelta(months=1)

    print("\n--- NANNY STATUS ---")
    current = start_date
    while current <= end_date:
        m = current.strftime('%Y-%m')
        if m not in nanny_months_paid:
            print(f"MISSING NANNY: {m}")
        current += relativedelta(months=1)

    print("\n--- RAW DATA ---")
    for m in monthly_data:
        entries_str = "; ".join([f"{e['amount']} ({e['desc']})" for e in m['entries']])
        print(f"{m['month']}: {entries_str}")

analyze()
