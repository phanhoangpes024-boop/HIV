import Link from 'next/link';
import './Tools.css';

export const metadata = {
    title: 'Công cụ y tế — EpiHouse',
    description: 'Bộ công cụ y tế trực tuyến: đánh giá nguy cơ HIV, tính liều thuốc và nhiều tiện ích lâm sàng khác.',
    alternates: {
        canonical: 'https://epihouse.org/tools',
    },
    openGraph: {
        title: 'Công cụ y tế — EpiHouse',
        description: 'Bộ công cụ y tế trực tuyến: đánh giá nguy cơ HIV, tính liều thuốc và nhiều tiện ích lâm sàng khác.',
        url: 'https://epihouse.org/tools',
        type: 'website',
    },
};

const tools = [
    {
        href: '/tools/hiv-risk-calculator',
        name: 'Đánh giá nguy cơ phơi nhiễm HIV',
        description: 'Công cụ ước tính xác suất lây nhiễm HIV sau phơi nhiễm, dựa trên dữ liệu CDC/Patel 2014. Hỗ trợ đánh giá nhu cầu PEP.',
        tag: 'HIV / PEP',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
    },
];

export default function ToolsPage() {
    return (
        <div className="tools-container">
            <div className="tools-hero">
                <h1 className="tools-hero-title">Công cụ y tế</h1>
                <p className="tools-hero-desc">
                    Các công cụ hỗ trợ lâm sàng trực tuyến — hoàn toàn miễn phí, xử lý ngay trên trình duyệt, không lưu trữ hay gửi dữ liệu đi đâu.
                </p>
            </div>

            <div className="tools-grid">
                {tools.map((tool) => (
                    <Link href={tool.href} key={tool.href} className="tools-card-link">
                        <div className="tools-card">
                            <div className="tools-card-icon">{tool.icon}</div>
                            <div className="tools-card-body">
                                <h3 className="tools-card-name">{tool.name}</h3>
                                <p className="tools-card-desc">{tool.description}</p>
                            </div>
                            <div className="tools-card-footer">
                                <span className="tools-card-tag">{tool.tag}</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
