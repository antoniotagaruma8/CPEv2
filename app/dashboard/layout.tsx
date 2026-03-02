'use client';

import React from 'react';
import { ExamProvider } from './ExamContext';
import { SessionProvider } from 'next-auth/react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <ExamProvider>
        {children}
      </ExamProvider>
    </SessionProvider>
  );
}
