import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Crossword Challenge',
  description: 'Test your vocabulary with engaging crossword puzzles',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/menu" className="text-lg font-semibold tracking-wide text-gray-900">
              SCANFINITY
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/menu" className="text-gray-700 hover:text-green-600">
                Меню
              </Link>
              <Link href="/login" className="text-gray-700 hover:text-green-600">
                Вход
              </Link>
              <Link href="/register" className="text-gray-700 hover:text-green-600">
                Регистрация
              </Link>
            </nav>
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}