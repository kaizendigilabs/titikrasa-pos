import FinancePageClient from "./finance-page-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keuangan | Titik Rasa POS",
  description: "Kelola arus kas dan keuangan bisnis",
};

export default function FinancePage() {
  return <FinancePageClient />;
}
