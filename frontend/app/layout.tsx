import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
        {/* No navbar - just the content */}
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}