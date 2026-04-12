import React from 'react';
import { Toaster } from '@/shared/components/ui/sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      {children}
    </div>
  );
};
