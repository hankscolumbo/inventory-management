//layout.tsx

import "./globals.css";
import Navbar from "@/components/NavBar";
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
    <html
      lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen"
    >
      <SessionProvider>
        <Navbar />
          {children}
      </SessionProvider>
      </body>
    </html>
  );
}
