'use client';

import { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface AdminRootLayoutProps {
  children: ReactNode;
}

export default function AdminRootLayout({ children }: AdminRootLayoutProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';

  return (
    <RouteGuard requiredRole="admin">
      <AdminLayout locale={locale}>
        {children}
      </AdminLayout>
    </RouteGuard>
  );
}