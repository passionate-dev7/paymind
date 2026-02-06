import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Navbar from '@/components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PayMind - Autonomous Blockchain Intelligence',
  description:
    'AI agent that autonomously pays for blockchain intelligence using x402 micropayments on BNB Chain.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
        style={{ background: 'var(--background)', color: 'var(--foreground)' }}
      >
        <div className="page-bg" />
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-[1200px] px-5 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
