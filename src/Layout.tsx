import React from 'react';
import { Toaster } from '@/shared/components/ui/sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden relative">
      <Toaster position="top-center" richColors />
      <div className="flex-1 w-full relative">
        {children}
      </div>
    </div>
  );
};
