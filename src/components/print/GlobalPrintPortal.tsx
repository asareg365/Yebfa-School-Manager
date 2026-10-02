"use client";

import React, { useEffect, useState } from "react";
import { printService, PrintJob } from "@/services/print/printService";
import { ProfitLossPrintDoc } from "./documents/ProfitLossPrintDoc";

/**
 * Centralized Global Print Portal.
 * Renders active print jobs dynamically and provides isolated print rendering.
 */
export const GlobalPrintPortal: React.FC = () => {
  const [activeJob, setActiveJob] = useState<PrintJob | null>(null);

  useEffect(() => {
    const unsubscribe = printService.subscribe((job) => {
      setActiveJob(job);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (!activeJob) {
    return <div id="global-print-portal" className="hidden" aria-hidden="true" />;
  }

  return (
    <div id="global-print-portal" className="print-portal-active">
      {activeJob.type === "profit-loss" && (
        <ProfitLossPrintDoc data={activeJob.data} />
      )}
    </div>
  );
};
