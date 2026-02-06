'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const navLinks = [
  { href: '/', label: 'Intelligence' },
  { href: '/payments', label: 'Transactions' },
  { href: '/stats', label: 'Overview' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(6, 8, 15, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{
              background: 'linear-gradient(135deg, #6c5ce7, #0984e3)',
            }}
          >
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Pay<span style={{ color: '#a29bfe' }}>Mind</span>
          </span>
          <span className="bnb-badge ml-1 hidden sm:inline-flex">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L7.172 4.828l-1.414-1.414L12 -2.828l6.242 6.242-1.414 1.414L12 0zm-7.172 12L0 16.828l4.828 4.828 1.414-1.414L1.414 16.828 4.828 12zM12 24l4.828-4.828 1.414 1.414L12 26.828l-6.242-6.242 1.414-1.414L12 24zm7.172-12L24 7.172l-4.828-4.828-1.414 1.414 4.828 4.828L19.172 12zM12 8l4 4-4 4-4-4 4-4z"/>
            </svg>
            BNB Chain
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative rounded-lg px-3 py-1.5 text-[0.82rem] font-medium transition-colors"
                style={{
                  color: isActive ? '#e8eaf0' : '#6b7a99',
                  background: isActive ? 'rgba(108, 92, 231, 0.1)' : 'transparent',
                }}
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #6c5ce7, #0984e3)' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          <ConnectButton
            chainStatus="icon"
            accountStatus="address"
            showBalance={false}
          />
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex items-center gap-1 overflow-x-auto px-5 py-1.5 md:hidden"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-md px-3 py-1 text-xs font-medium"
              style={{
                color: isActive ? '#e8eaf0' : '#6b7a99',
                background: isActive ? 'rgba(108, 92, 231, 0.1)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
