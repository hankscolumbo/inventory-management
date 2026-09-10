//layout.tsx

import type { Metadata, Viewport } from 'next';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import OfflineBanner from '@/components/OfflineBanner';
import OfflineSyncHandler from '@/components/OfflineSyncHandler';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import PullToRefresh from '@/components/PullToRefresh';
import '@/app/globals.css';
import Navbar from '@/components/NavBar';

export const viewport: Viewport = {
  themeColor: '#0f172a',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Game Log',
  description: 'Track and manage your video game collection.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Game Log',
    startupImage: [
      {
        url: '/splash/apple-splash-1179-2556.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1290-2796.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-slate-950 text-slate-100 touch-pan-y">
      <body className="min-h-screen flex flex-col">
        <ServiceWorkerRegister />
        <OfflineSyncHandler />
        <OfflineBanner />
        <Navbar />
        <PullToRefresh>
          <main className="flex-1 pb-28">{children}</main>
        </PullToRefresh>
        <BottomNav />
      </body>
    </html>
  );
}


