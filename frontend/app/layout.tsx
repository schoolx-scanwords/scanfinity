import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './contexts/auth_context';
import { LanguageProvider } from './contexts/LanguageContext';

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
      <body className="font-sans">
        {/* No navbar - just  the content */}
        <main className="min-h-screen">
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </AuthProvider>
        </main>
      </body>
    </html>
  );
}