import React from 'react';
import { Toaster } from '@/shared/components/ui/sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-background text-foreground overflow-hidden">
      <Toaster position="top-center" richColors />
      <main className="flex-1 w-full relative flex flex-col min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
};
