import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@fontsource/open-runde/500.css';
import '@fontsource/open-runde/600.css';
import '@/styles/design/theme.css';
import Script from 'next/script';
import {
  Archivo,
  Inter_Tight,
  IBM_Plex_Mono,
  Figtree,
  Anek_Latin,
  Anek_Telugu,
  Anek_Devanagari,
  Anek_Kannada,
  Anek_Tamil,
  Anek_Malayalam,
  Anek_Bangla,
  Anek_Gujarati,
  Anek_Gurmukhi,
} from 'next/font/google';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' });
const anekLatin = Anek_Latin({ subsets: ['latin'], variable: '--font-anek-latin', display: 'swap', axes: ['wdth'] });
// Indian scripts load only when a page uses them.
const anekTe = Anek_Telugu({ display: 'swap', preload: false, variable: '--font-anek-te' });
const anekHi = Anek_Devanagari({ display: 'swap', preload: false, variable: '--font-anek-hi' });
const anekKn = Anek_Kannada({ display: 'swap', preload: false, variable: '--font-anek-kn' });
const anekTa = Anek_Tamil({ display: 'swap', preload: false, variable: '--font-anek-ta' });
const anekMl = Anek_Malayalam({ display: 'swap', preload: false, variable: '--font-anek-ml' });
const anekBn = Anek_Bangla({ display: 'swap', preload: false, variable: '--font-anek-bn' });
const anekGu = Anek_Gujarati({ display: 'swap', preload: false, variable: '--font-anek-gu' });
const anekPa = Anek_Gurmukhi({ display: 'swap', preload: false, variable: '--font-anek-pa' });
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
      className={`h-full ${figtree.variable} ${anekLatin.variable} ${[anekTe, anekHi, anekKn, anekTa, anekMl, anekBn, anekGu, anekPa].map((f) => f.variable).join(' ')} ${archivo.variable} ${interTight.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="h-full min-h-screen">
        <Script src="/design/runtime.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
