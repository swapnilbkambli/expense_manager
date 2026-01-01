# Personal Expense Analytics Dashboard

A high-performance, privacy-first financial reporting tool built with Next.js. This dashboard transforms raw CSV expense data into actionable insights with interactive visualizations and advanced filtering.

![Dashboard Preview](public/preview.png)

## 🚀 Features

-   **Privacy First**: All CSV parsing and data processing happen client-side in your browser. No financial data ever leaves your machine.
-   **Interactive Visualizations**:
    -   **Trend Analysis**: Area charts showing daily/monthly spending vs income.
    -   **Category Breakdown**: Interactive donut charts with click-to-filter capability.
    -   **Subcategory Ranking**: Bar charts ranking your highest spending areas.
-   **Advanced Filtering**:
    -   **Temporal Intelligence**: Pre-defined ranges (YTD, Last 30 Days) and a custom date picker with manual text input.
    -   **Multi-Select Filters**: Filter by one or more categories and subcategories.
    -   **Search**: Instant search across descriptions, categories, and payees.
-   **Financial Insights**:
    -   **Stat Cards**: Real-time Total Income, Total Expenses, and Net Savings.
    -   **Spending Insights**: Automaticaly identifies average monthly spend, peak spending periods, and top category impacts.
    -   **Monthly Averages Table**: Detailed breakdown of monthly average spend per category/subcategory with interactive selection.

## 🛠️ Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Styling**: Tailwind CSS + Shadcn UI
-   **Data Processing**: PapaParse (CSV)
-   **Charts**: Recharts
-   **Date Handling**: date-fns
-   **Icons**: Lucide React

## 📋 Setup Instructions

Follow these steps to get the project running locally:

### 1. Clone the repository
```bash
git clone https://github.com/swapnilbkambli/expense_manager.git
cd expense_manager
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
```bash
npm run dev -- -p 3005
```
The application will be available at [http://localhost:3005](http://localhost:3005).

### 4. Upload your data
1.  Locate your `expensemanager.csv` file.
2.  Drag and drop it into the dashboard upload area.
3.  Explore your financial insights!

## 📄 CSV Data Structure
The application expects a CSV with the following headers:
`Date, Amount, Category, Subcategory, Description` (Additional columns are ignored but won't break the app).

## 📝 License
MIT

---

> [!WARNING]
> **Privacy Reminder**: This dashboard processes all data client-side for privacy. However, if you use a **Public** GitHub repository, do not commit your real `expensemanager.csv` or any file containing sensitive financial data to the repository, as it will be visible to anyone. The default `project_documentation/expensemanager.csv` provided here is sample data only.
