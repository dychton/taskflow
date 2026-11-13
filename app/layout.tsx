import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'TaskFlow | Project workspace', description: 'Private project management workspace', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
