import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SahaySathi | Right Help. Right Place. Right Time.',
  description: 'Hyperlocal Disaster Volunteer Coordination Platform',
};

import { ThemeProvider } from '../lib/theme-provider';
import SessionGuard from '../components/SessionGuard';
import OfflineIndicator from '../components/OfflineIndicator';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} transition-colors duration-300`}>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const theme = localStorage.getItem('theme');
                const classList = document.documentElement.classList;
                if (theme === 'dark') {
                  classList.add('dark');
                } else {
                  classList.remove('dark');
                }
              } catch (error) {
                // ignore localStorage access errors
              }
            })();`,
          }}
        />
        <ClerkProvider>
          <SessionGuard />
          <ThemeProvider>
            <OfflineIndicator />
            {children}
            <ToastContainer theme="dark" position="bottom-right" />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
