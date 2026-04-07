'use client';

import { ThemeProvider } from 'next-themes';
import { IntlProvider } from 'next-intl';
import { ZustandProvider } from '@/lib/zustand-provider';
import './globals.css';
import { Toaster } from 'shadcn/ui';
import { useEffect } from 'react';

export default function Layout({ children }) {
  const locale = 'ar'; // dynamic locale logic here

  return (
    <ThemeProvider attribute="class">
      <IntlProvider locale={locale}>
        <ZustandProvider>
          <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <meta name="theme-color" content="#0D4026" />
              <link rel="manifest" href="/manifest.json" />
            </head>
            <body>{children}<Toaster /></body>
          </html>
        </ZustandProvider>
      </IntlProvider>
    </ThemeProvider>
  );
}