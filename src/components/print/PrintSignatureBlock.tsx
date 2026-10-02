"use client";

import React from "react";

export interface Signatory {
  role: string;
  name?: string;
  dateLabel?: string;
}

interface PrintSignatureBlockProps {
  signatories?: Signatory[];
}

export const PrintSignatureBlock: React.FC<PrintSignatureBlockProps> = ({
  signatories = [
    { role: "Prepared By: Bursar / Accountant", name: "Finance Officer" },
    { role: "Certified By: Head of Institution / Principal", name: "Principal" },
  ],
}) => {
  return (
    <div className="print-signature-container mt-10 pt-4 break-inside-avoid">
      <div className="grid grid-cols-2 gap-12">
        {signatories.map((sig, idx) => (
          <div key={idx} className="flex flex-col justify-end">
            <div className="border-b border-black w-full pb-1 mb-1">
              <span className="text-[10px] text-slate-500 italic block">Signature & Date</span>
            </div>
            <p className="text-xs font-bold text-black uppercase tracking-tight">
              {sig.role}
            </p>
            {sig.name && (
              <p className="text-[10px] text-slate-750 font-medium">
                {sig.name}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
