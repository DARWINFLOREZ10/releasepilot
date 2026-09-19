import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReleasePilot',
  description: 'A local feature flag control plane with deterministic rollouts and an audit trail.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
