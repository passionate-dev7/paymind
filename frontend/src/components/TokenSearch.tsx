'use client';

import { useState, useEffect, useRef } from 'react';

interface TokenSearchProps {
  onSearch: (address: string) => void;
  isLoading: boolean;
  defaultAddress?: string;
}

const BSC_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('paymind_recent_searches');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(address: string) {
  if (typeof window === 'undefined') return;
  try {
    const searches = getRecentSearches().filter((s) => s !== address);
    searches.unshift(address);
    localStorage.setItem(
      'paymind_recent_searches',
      JSON.stringify(searches.slice(0, 10))
    );
  } catch {
    // ignore storage errors
  }
}

export default function TokenSearch({ onSearch, isLoading, defaultAddress = '' }: TokenSearchProps) {
  const [address, setAddress] = useState(defaultAddress);
  const [isValid, setIsValid] = useState<boolean | null>(
    defaultAddress ? BSC_ADDRESS_REGEX.test(defaultAddress) : null
  );
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowRecent(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (value: string) => {
    setAddress(value);
    if (value.length === 0) {
      setIsValid(null);
    } else {
      setIsValid(BSC_ADDRESS_REGEX.test(value));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isLoading) {
      addRecentSearch(address);
      setRecentSearches(getRecentSearches());
      onSearch(address);
    }
  };

  const handleSelectRecent = (addr: string) => {
    setAddress(addr);
    setIsValid(true);
    setShowRecent(false);
    addRecentSearch(addr);
    setRecentSearches(getRecentSearches());
    onSearch(addr);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7a99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => recentSearches.length > 0 && setShowRecent(true)}
            placeholder="Paste BSC token address (0x...)"
            className="w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 transition-all focus:outline-none focus:ring-1"
            style={{
              background: 'rgba(15, 18, 30, 0.8)',
              border: `1px solid ${
                isValid === false
                  ? 'rgba(255, 107, 107, 0.4)'
                  : isValid === true
                  ? 'rgba(0, 184, 148, 0.3)'
                  : 'var(--border-subtle)'
              }`,
            }}
            disabled={isLoading}
          />
          {isValid === false && address.length > 0 && (
            <p className="absolute -bottom-5 left-2 text-[0.7rem]" style={{ color: '#ff6b6b' }}>
              Invalid address format
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className="shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            background: isLoading
              ? 'rgba(108, 92, 231, 0.3)'
              : 'linear-gradient(135deg, #6c5ce7, #0984e3)',
          }}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Analyzing...
            </span>
          ) : (
            'Analyze'
          )}
        </button>
      </form>

      {/* Recent searches dropdown */}
      {showRecent && recentSearches.length > 0 && !isLoading && (
        <div
          className="absolute z-50 mt-2 w-full rounded-xl shadow-2xl"
          style={{
            background: 'rgba(15, 18, 30, 0.95)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="p-2">
            <p className="section-label mb-1 px-3 py-1">Recent</p>
            {recentSearches.map((addr) => (
              <button
                key={addr}
                onClick={() => handleSelectRecent(addr)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                style={{ color: '#8b95ad' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="truncate font-mono text-xs">{addr}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
