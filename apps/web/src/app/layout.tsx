import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FinApp - Inteligentná správa financií',
  description: 'Moderná aplikácia na správu osobných financií, úverov, výdavkov a majetku',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

