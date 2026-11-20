import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/styles/design/theme.css';
import '@/styles/design/tines.css';
import Script from 'next/script';
import {
  Anek_Latin,
  DM_Mono,
  Anek_Telugu,
  Anek_Devanagari,
  Anek_Kannada,
  Anek_Tamil,
  Anek_Malayalam,
  Anek_Bangla,
  Anek_Gujarati,
  Anek_Gurmukhi,
} from 'next/font/google';

// Anek (Ek Type, Mumbai) for English and all ten Indian scripts, so Hindi and English sit together
// evenly; DM Mono only where digits must line up (the UTR, times).
const sans = Anek_Latin({ subsets: ['latin'], variable: '--font-face-sans', display: 'swap', axes: ['wdth'] });
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-face-mono', display: 'swap' });
// Indian scripts load only when a page uses them.
const anekTe = Anek_Telugu({ display: 'swap', preload: false, variable: '--font-anek-te' });
const anekHi = Anek_Devanagari({ display: 'swap', preload: false, variable: '--font-anek-hi' });
const anekKn = Anek_Kannada({ display: 'swap', preload: false, variable: '--font-anek-kn' });
const anekTa = Anek_Tamil({ display: 'swap', preload: false, variable: '--font-anek-ta' });
const anekMl = Anek_Malayalam({ display: 'swap', preload: false, variable: '--font-anek-ml' });
const anekBn = Anek_Bangla({ display: 'swap', preload: false, variable: '--font-anek-bn' });
const anekGu = Anek_Gujarati({ display: 'swap', preload: false, variable: '--font-anek-gu' });
const anekPa = Anek_Gurmukhi({ display: 'swap', preload: false, variable: '--font-anek-pa' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Fraud First Aid for UPI scams: on the call and after, in your mother tongue',
  description:
    "Catches the scam on the call. Chases the money if it's gone. A voice agent in ten Indian languages: it warns you during a scam call, takes your complaint with every number right, and speaks to 1930 for you.",
  metadataBase: new URL('https://fraudfirstaid.vercel.app'),
  manifest: '/site.webmanifest',
  openGraph: {
    title: "Fraud First Aid: catches the scam on the call, chases the money if it's gone",
    description: 'A voice agent in ten Indian languages, built on Agora Conversational AI and Murf Falcon.',
    url: 'https://fraudfirstaid.vercel.app',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Fraud First Aid: the headline above its product window, where a sample fake KYC call runs as a heart-monitor line that spikes red at the red flag, beside a drawing of scam-call warnings turning into a first-aid kit' }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
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
      className={`h-full ${sans.variable} ${mono.variable} ${[anekTe, anekHi, anekKn, anekTa, anekMl, anekBn, anekGu, anekPa].map((f) => f.variable).join(' ')}`}
      suppressHydrationWarning
    >
      <body className="h-full min-h-screen">
        <Script src="/design/runtime.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
