"use client";

import React from "react";

interface PrintLayoutProps {
  children: React.ReactNode;
}

export default function PrintLayout({ children }: PrintLayoutProps) {
  return (
    <div className="print:w-full print:absolute print:top-0 print:left-0 print:m-0 print:bg-white print:z-50">
      <style jsx global>{`
        @media print {
          @page {
            margin: 2cm;
            size: A4;
          }
          
          /* Hide all other UI elements when printing */
          body > *:not(.print-wrapper) {
            display: none;
          }
        }
      `}</style>
      
      {/* This wrapper ensures only this content is visible */}
      <div className="print-wrapper w-full max-w-4xl mx-auto p-8 bg-white shadow-none">
        {children}
      </div>
    </div>
  );
}