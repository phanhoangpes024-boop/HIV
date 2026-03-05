import NewsListServer from "../components/NewsList/NewsListServer";

export const metadata = {
  title: "EpiHouse – Cơ Sở Dữ Liệu Bệnh Truyền Nhiễm Việt Nam",
  description: "Tra cứu tin tức bệnh truyền nhiễm, hướng dẫn lâm sàng HIV, vaccine, dịch bệnh và nghiên cứu y khoa mới nhất tại Việt Nam.",
  alternates: {
    canonical: "https://epihouse.org",
  },
  openGraph: {
    title: "EpiHouse – Cơ Sở Dữ Liệu Bệnh Truyền Nhiễm Việt Nam",
    description: "Tra cứu tin tức bệnh truyền nhiễm, hướng dẫn lâm sàng HIV, vaccine, dịch bệnh và nghiên cứu y khoa mới nhất tại Việt Nam.",
    url: "https://epihouse.org",
    type: "website",
  },
};

export default function Home() {
  return (
    <>
      <NewsListServer />
    </>
  );
}
