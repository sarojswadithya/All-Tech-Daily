// frontend/src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'All Tech Daily | News Today. Scripts Tomorrow.',
  description: 'Scrape, summarize, and script tech news with AI.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // THE FIX: Added scroll-smooth here
  return (
    <html lang="en" className="scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
      <body className={`${inter.className} selection:bg-[#1A1A1A] selection:text-[#F9F7F1]`}>
        {children}
      </body>
    </html>
  );
}