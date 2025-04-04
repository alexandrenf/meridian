"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SunIcon, MoonIcon } from '@heroicons/react/20/solid';
import { useTheme } from './ThemeProvider';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-3xl mx-auto px-6 w-full flex-1">
        <nav className="py-4">
          <ul className="flex space-x-4 items-center font-medium">
            <div className="flex w-full flex-row gap-4">
              <li>
                <Link 
                  href="/" 
                  className={`hover:underline ${pathname === '/' ? 'underline' : ''}`}
                >
                  home
                </Link>
              </li>
              <li>
                <Link 
                  href="/briefs" 
                  className={`hover:underline ${pathname === '/briefs' ? 'underline' : ''}`}
                >
                  briefs
                </Link>
              </li>
            </div>
            {theme === 'dark' ? (
              <button
                className="hover:cursor-pointer"
                onClick={() => setTheme('light')}
              >
                <SunIcon className="w-5 h-5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-600" />
              </button>
            ) : (
              <button
                className="hover:cursor-pointer"
                onClick={() => setTheme('dark')}
              >
                <MoonIcon className="w-5 h-5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-600" />
              </button>
            )}
          </ul>
        </nav>
        <div className="h-px w-full bg-gray-300 mb-4" />
        <main>{children}</main>
      </div>
      <footer>
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="h-px w-full bg-gray-300 mb-4" />
          <p className="text-sm text-center">
            built by
            <strong className="underline ml-1">
              <a href="https://iliane.xyz">iliane</a>
            </strong>
            {' · '}
            <span>
              open source on
              <strong className="underline ml-1">
                <a href="https://github.com/iliane5/meridian" target="_blank" rel="noopener noreferrer">
                  github
                </a>
              </strong>
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
} 