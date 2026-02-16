import { Cinzel } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar/Navbar";

const cinzel = Cinzel({
  subsets: ["latin", "vietnamese"],
  variable: "--font-cinzel",
});

export const metadata = {
  title: "THE EPIDEMIC HOUSE",
  description: "Cơ sở dữ liệu tin tức bệnh truyền nhiễm",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={cinzel.variable}>
      <body>
        <Navbar />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
