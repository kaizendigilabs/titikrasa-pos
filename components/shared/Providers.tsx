"use client";

import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { createQueryClient } from "@/lib/query";

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Single QueryClient instance per app mount
  const [queryClient] = React.useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
