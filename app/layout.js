import './globals.css';
import { AnalyticsProvider, PostHogPageView } from '../components/AnalyticsProvider';

export const metadata = {
  title: "OK LET'S GO · Okanagan events this week",
  description: 'The weekly guide to what\'s actually happening in Kelowna and the Okanagan. Events, live music, food, drink, and fun—curated every Monday.',
  metadataBase: new URL('https://okletsgo.ca'),
  openGraph: {
    title: "OK LET'S GO · Okanagan events this week",
    description: 'The weekly guide to what\'s actually happening in Kelowna and the Okanagan.',
    url: 'https://okletsgo.ca',
    siteName: "OK LET'S GO",
    locale: 'en_CA',
    type: 'website',
    images: [{ url: 'https://okletsgo.ca/icon.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "OK LET'S GO · Okanagan events this week",
    description: 'The weekly guide to what\'s actually happening in Kelowna and the Okanagan.',
    images: ['https://okletsgo.ca/icon.png'],
  },
  alternates: { canonical: 'https://okletsgo.ca' },
  robots: { index: true, follow: true },
  keywords: ['Kelowna events', 'Okanagan events', 'things to do Kelowna', 'live music Kelowna', 'weekly events guide'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider>
          <PostHogPageView />
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
