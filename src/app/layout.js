import "./globals.css";
import Navbar from "../components/Navbar/Navbar";

export const metadata = {
  title: "InfectiXiv",
  description: "Dự án tin tức AIDS viết bằng Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <Navbar />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
