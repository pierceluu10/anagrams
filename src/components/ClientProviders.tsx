"use client";

import { PageTransitionProvider } from "@/components/PageTransition";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <PageTransitionProvider>{children}</PageTransitionProvider>;
}
