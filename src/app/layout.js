import { Playfair_Display, Noto_Serif } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar/Navbar";
import ProgressBar from "../components/ProgressBar";
import { Suspense } from "react";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: 'swap',
});

const notoSerif = Noto_Serif({
  subsets: ["latin", "vietnamese"],
  variable: "--font-noto-serif",
  display: 'swap',
});

export const metadata = {
  title: {
    default: "EpiHouse – Cơ Sở Dữ Liệu Bệnh Truyền Nhiễm Việt Nam",
    template: "%s | EpiHouse",
  },
  description: "EpiHouse – Cơ sở dữ liệu tin tức bệnh truyền nhiễm, hướng dẫn lâm sàng và nghiên cứu y khoa mới nhất tại Việt Nam.",
  keywords: ["bệnh truyền nhiễm", "HIV", "vaccine", "y tế", "tin tức y khoa", "hướng dẫn lâm sàng", "dịch bệnh", "EpiHouse"],
  authors: [{ name: "EpiHouse" }],
  creator: "EpiHouse",
  publisher: "EpiHouse",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "vi-VN": "/",
    },
  },
  openGraph: {
    title: "EpiHouse – Cơ Sở Dữ Liệu Bệnh Truyền Nhiễm Việt Nam",
    description: "EpiHouse – Cơ sở dữ liệu tin tức bệnh truyền nhiễm, hướng dẫn lâm sàng và nghiên cứu y khoa mới nhất tại Việt Nam.",
    url: "https://epihouse.org",
    siteName: "EpiHouse",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "https://epihouse.org/og-default.png",
        width: 1200,
        height: 630,
        alt: "EpiHouse – Cơ Sở Dữ Liệu Bệnh Truyền Nhiễm Việt Nam",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EpiHouse – Cơ Sở Dữ Liệu Bệnh Truyền Nhiễm Việt Nam",
    description: "EpiHouse – Cơ sở dữ liệu tin tức bệnh truyền nhiễm, hướng dẫn lâm sàng và nghiên cứu y khoa mới nhất tại Việt Nam.",
    images: ["https://epihouse.org/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'EpiHouse',
  alternateName: 'THE EPIDEMIC HOUSE',
  url: 'https://epihouse.org',
  logo: {
    '@type': 'ImageObject',
    url: 'https://epihouse.org/Logo.png',
  },
  description: 'Cơ sở dữ liệu tin tức bệnh truyền nhiễm, hướng dẫn lâm sàng và nghiên cứu y khoa mới nhất tại Việt Nam.',
  sameAs: [],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'EpiHouse',
  url: 'https://epihouse.org',
  description: 'Cơ sở dữ liệu tin tức bệnh truyền nhiễm và hướng dẫn lâm sàng Việt Nam.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://epihouse.org/?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${playfair.variable} ${notoSerif.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <ProgressBar />
        </Suspense>
        <Navbar />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}

