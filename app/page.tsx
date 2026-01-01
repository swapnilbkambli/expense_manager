import ExpenseDashboard from "@/components/ExpenseDashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-12 md:px-8">
      <div className="max-w-7xl mx-auto">
        <ExpenseDashboard />
      </div>
    </main>
  );
}
