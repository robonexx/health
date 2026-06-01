import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Health 2026',
  description: 'Private health meal planner for Robert and Erika',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
