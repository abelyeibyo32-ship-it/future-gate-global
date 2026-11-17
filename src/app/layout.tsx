import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Future Gate Global (FGG)',
  description: 'Global Clearing & Escrow Terminal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F5F7FA] text-[#0B1B36] font-sans antialiased selection:bg-[#0B1B36] selection:text-white">
        {children}
      </body>
    </html>
  );
}