"use client";

import React from "react";
import { SchoolSettingsData } from "./PrintHeader";

interface PrintFooterProps {
  institution?: SchoolSettingsData | null;
  generatedDate?: string;
  generatedBy?: string;
  reportCode?: string;
  metadata?: string;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({
  institution,
  generatedDate,
  generatedBy,
  reportCode,
  metadata,
}) => {
  const schoolName = institution?.name || "Institution";
  const displayMetadata = metadata || `Official Financial Record • ${schoolName} Accounting System`;

  return (
    <div className="print-footer-container mt-8 pt-4 border-t-2 border-slate-800 text-[10px] text-slate-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-black uppercase tracking-wider">
            {schoolName} — Financial Treasury Directorate
          </p>
          <p className="text-[9px] text-slate-600 italic">{displayMetadata}</p>
        </div>

        <div className="text-right space-y-0.5 text-[9px] font-mono">
          <div>
            <span className="font-semibold text-slate-700">Generated:</span>{" "}
            {generatedDate || new Date().toLocaleString()}
          </div>
          {generatedBy && (
            <div>
              <span className="font-semibold text-slate-700">Officer:</span>{" "}
              {generatedBy}
            </div>
          )}
          {reportCode && (
            <div className="text-slate-500 uppercase">
              Doc Ref: {reportCode}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
