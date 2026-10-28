import type { Metadata, Viewport } from 'next';
import '@fontsource/ibm-plex-sans-hebrew/400.css';
import '@fontsource/ibm-plex-sans-hebrew/500.css';
import '@fontsource/ibm-plex-sans-hebrew/600.css';
import '@fontsource/ibm-plex-sans-hebrew/700.css';
import '@fontsource/ibm-plex-mono/500.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'עלמא · ניהול מלאי',
  description: 'מערכת ניהול מלאי – אינסטלציה, מיזוג וחשמל',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#17191c' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0d0e' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
