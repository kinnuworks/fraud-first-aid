import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/styles/design/theme.css';
import { Archivo, Inter_Tight, IBM_Plex_Mono } from 'next/font/google';

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', axes: ['wdth'], display: 'swap' });
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-mono', display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'UTR Pakka: your UPI fraud complaint, spoken',
  description:
    'Tell a voice agent what happened in Telugu, Hindi, Kannada or seven more languages. It reads your 12-digit UTR back in groups of four and builds the 1930 script and bank letter.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
    other: [
      {
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full ${archivo.variable} ${interTight.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="h-full min-h-screen">
        {children}
      </body>
    </html>
  );
}
