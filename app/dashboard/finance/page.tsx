import { FinanceTable } from "./_components/finance-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keuangan | Titik Rasa POS",
  description: "Kelola arus kas dan keuangan bisnis",
};

export default function FinancePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Keuangan (Cash Flow)</h1>
        <p className="text-muted-foreground">
          Monitor arus kas masuk dan keluar secara real-time.
        </p>
      </div>
      
      <FinanceTable />
    </div>
  );
}
