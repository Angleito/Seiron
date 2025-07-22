import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Seiron - AI Portfolio Manager',
  description: 'AI-powered conversational portfolio manager for Sei Network',
  keywords: ['Sei Network', 'DeFi', 'Portfolio Management', 'AI', 'Cryptocurrency'],
  authors: [{ name: 'Seiron Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#000000',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Seiron - AI Portfolio Manager',
    description: 'AI-powered conversational portfolio manager for Sei Network',
    type: 'website',
    locale: 'en_US',
    siteName: 'Seiron',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seiron - AI Portfolio Manager',
    description: 'AI-powered conversational portfolio manager for Sei Network',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { StoreProvider } from './providers/StoreProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-background antialiased">
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}