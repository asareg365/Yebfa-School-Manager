import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import {FirebaseClientProvider} from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'YSM - Yebfa School Manager | Enterprise SaaS',
  description: 'YSM (Yebfa School Manager) is a modern, multi-tenant school management system with AI-driven insights for student management, financial forecasting, and academic excellence in 2026.',
  keywords: ['YSM', 'Yebfa School Manager', 'School Management System', 'SaaS', 'Education AI', 'Ghana Education', 'Ahafo Region'],
  authors: [{ name: 'Yebfa Technology Hub' }],
  openGraph: {
    title: 'YSM - Yebfa School Manager',
    description: 'The Operating System for Modern Schools. AI-powered student registry, financial modeling, and academic reporting.',
    url: 'https://ysm.yebfa.com',
    siteName: 'YSM Yebfa School Manager',
    images: [
      {
        url: 'https://picsum.photos/seed/ysm-og/1200/630',
        width: 1200,
        height: 630,
        alt: 'YSM Dashboard Preview',
      },
    ],
    locale: 'en_GH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YSM - Yebfa School Manager',
    description: 'The Operating System for Modern Schools. AI-powered student registry, financial modeling, and academic reporting.',
    images: ['https://picsum.photos/seed/ysm-og/1200/630'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
