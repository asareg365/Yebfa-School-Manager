"use client";

import React from "react";
import Image from "next/image";
import { School } from "lucide-react";

export interface SchoolSettingsData {
  name?: string;
  schoolCode?: string;
  logoUrl?: string | null;
  address?: string;
  location?: string;
  phone?: string;
  email?: string;
  ownerEmail?: string;
  motto?: string;
  academicYear?: string;
  currentTerm?: string;
}

interface PrintHeaderProps {
  institution?: SchoolSettingsData | null;
  title: string;
  subtitle?: string;
  periodLabel?: string;
  academicYear?: string;
  term?: string;
  generatedDate?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  institution,
  title,
  subtitle,
  periodLabel,
  academicYear,
  term,
  generatedDate,
}) => {
  const schoolName = institution?.name || "Institution";
  const motto = institution?.motto || "";
  const contactParts: string[] = [];
  
  if (institution?.location) contactParts.push(institution.location);
  if (institution?.address && institution.address !== institution.location) contactParts.push(institution.address);
  if (institution?.phone) contactParts.push(`Tel: ${institution.phone}`);
  const email = institution?.email || institution?.ownerEmail;
  if (email) contactParts.push(`Email: ${email}`);

  return (
    <div className="print-header-container border-b-2 border-black pb-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        {/* School Logo */}
        <div className="shrink-0">
          {institution?.logoUrl ? (
            <div className="relative size-20 rounded-md overflow-hidden border border-slate-300">
              <Image
                src={institution.logoUrl}
                alt={schoolName}
                fill
                sizes="80px"
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="size-20 rounded-md bg-slate-100 border border-slate-400 flex flex-col items-center justify-center text-slate-700">
              <School className="size-9 mb-1" />
              <span className="text-[8px] font-bold uppercase tracking-wider">Logo</span>
            </div>
          )}
        </div>

        {/* School Details */}
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight text-black font-serif">
            {schoolName}
          </h1>
          {motto ? (
            <p className="text-xs italic text-slate-800 font-medium my-0.5">
              &ldquo;{motto}&rdquo;
            </p>
          ) : null}
          {contactParts.length > 0 && (
            <p className="text-[11px] text-slate-700 font-medium">
              {contactParts.join(" • ")}
            </p>
          )}
        </div>

        {/* Top Right Code Badge */}
        <div className="shrink-0 text-right">
          <span className="inline-block border border-black px-2 py-1 text-[10px] font-mono font-bold tracking-widest uppercase">
            {institution?.schoolCode || "SCH"}
          </span>
          <p className="text-[9px] text-slate-600 mt-1 uppercase font-semibold">
            Official Audit
          </p>
        </div>
      </div>

      {/* Document Title Banner */}
      <div className="mt-4 pt-3 border-t border-dashed border-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider text-black">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-700 font-medium">{subtitle}</p>
          )}
        </div>

        <div className="text-right text-[11px] text-slate-800 space-y-0.5">
          {periodLabel && (
            <div>
              <span className="font-bold">Period:</span> {periodLabel}
            </div>
          )}
          {(academicYear || term) && (
            <div>
              <span className="font-bold">Session:</span>{" "}
              {[academicYear, term].filter(Boolean).join(" • ")}
            </div>
          )}
          {generatedDate && (
            <div className="text-[10px] text-slate-600">
              <span className="font-semibold">Generated:</span> {generatedDate}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
