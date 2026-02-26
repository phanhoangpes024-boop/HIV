import { Playfair_Display, Noto_Serif } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar/Navbar";

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
    default: "THE EPIDEMIC HOUSE",
    template: "%s | THE EPIDEMIC HOUSE",
  },
  description: "Cơ sở dữ liệu tin tức bệnh truyền nhiễm, hướng dẫn lâm sàng và diễn đàn y khoa chuyên nghiệp.",
  keywords: ["bệnh truyền nhiễm", "HIV", "vaccine", "y tế", "tin tức y khoa", "hướng dẫn lâm sàng"],
  authors: [{ name: "THE EPIDEMIC HOUSE Team" }],
  creator: "THE EPIDEMIC HOUSE",
  publisher: "THE EPIDEMIC HOUSE",
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
    title: "THE EPIDEMIC HOUSE",
    description: "Cơ sở dữ liệu tin tức bệnh truyền nhiễm hàng đầu.",
    url: "https://epihouse.org",
    siteName: "THE EPIDEMIC HOUSE",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "https://epihouse.org/og-default.png",
        width: 1200,
        height: 630,
        alt: "THE EPIDEMIC HOUSE",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "THE EPIDEMIC HOUSE",
    description: "Cơ sở dữ liệu tin tức bệnh truyền nhiễm hàng đầu.",
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
      </head>
      <body>
        <Navbar />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}

