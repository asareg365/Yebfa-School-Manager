"use client";

import React from "react";

interface PrintDocumentLayoutProps {
  children: React.ReactNode;
  orientation?: "portrait" | "landscape";
  documentTitle?: string;
}

export const PrintDocumentLayout: React.FC<PrintDocumentLayoutProps> = ({
  children,
  orientation = "portrait",
}) => {
  return (
    <div
      className={`print-document-layout bg-white text-black font-sans leading-relaxed ${
        orientation === "landscape" ? "print-landscape" : "print-portrait"
      }`}
    >
      <div className="mx-auto w-full max-w-[210mm] p-6 sm:p-10 print:p-0 print:max-w-none print:w-full">
        {children}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: ${orientation === "landscape" ? "A4 landscape" : "A4 portrait"};
            margin: 12mm 10mm 14mm 10mm;
          }

          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide all screen components, portals, and dashboard chrome when printing document */
          .no-print,
          aside,
          header,
          nav,
          button,
          .dashboard-main-content,
          [data-sidebar] {
            display: none !important;
          }

          /* Show global print container cleanly */
          #global-print-portal {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .print-document-layout {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Table print safety */
          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};
