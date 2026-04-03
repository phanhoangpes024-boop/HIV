export const metadata = {
    title: 'Cửa sổ xét nghiệm HIV (Window Period)',
    description:
        'Tra cứu độ nhạy của 3 loại xét nghiệm HIV theo số ngày sau phơi nhiễm: RNA PCR, Ag/Ab thế hệ 4, Test nhanh. Dựa trên mô hình sigmoid từ Delaney et al. 2017. Kèm khuyến nghị lâm sàng.',
    keywords: [
        'cửa sổ xét nghiệm HIV',
        'window period HIV',
        'độ nhạy xét nghiệm HIV',
        'xét nghiệm HIV sau bao lâu',
        'HIV window period',
        'HIV test sensitivity',
        'RNA PCR HIV',
        'test nhanh HIV',
        'Ag/Ab HIV thế hệ 4',
        'khi nào xét nghiệm HIV chính xác',
    ],
    alternates: {
        canonical: 'https://epihouse.org/tools/hiv-window-period',
    },
    openGraph: {
        title: 'Cửa sổ xét nghiệm HIV (Window Period) — EpiHouse',
        description:
            'Tra cứu độ nhạy 3 loại xét nghiệm HIV theo ngày sau phơi nhiễm. Mô hình sigmoid từ Delaney et al. 2017.',
        url: 'https://epihouse.org/tools/hiv-window-period',
        type: 'website',
        siteName: 'EpiHouse',
        locale: 'vi_VN',
        images: [
            {
                url: 'https://epihouse.org/og-hiv-window-period.png',
                width: 1200,
                height: 630,
                alt: 'Cửa sổ xét nghiệm HIV (Window Period) — EpiHouse',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Cửa sổ xét nghiệm HIV (Window Period) — EpiHouse',
        description:
            'Tra cứu độ nhạy 3 loại xét nghiệm HIV theo ngày sau phơi nhiễm. Dựa trên Delaney et al. 2017.',
        images: ['https://epihouse.org/og-hiv-window-period.png'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
            'max-image-preview': 'large',
        },
    },
};

const toolSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Cửa sổ xét nghiệm HIV (Window Period)',
    url: 'https://epihouse.org/tools/hiv-window-period',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript',
    description:
        'Tra cứu độ nhạy của 3 loại xét nghiệm HIV (RNA PCR, Ag/Ab thế hệ 4, Test nhanh) theo số ngày sau phơi nhiễm. Dựa trên mô hình sigmoid từ Delaney KP et al. CID 2017.',
    author: {
        '@type': 'Organization',
        name: 'EpiHouse',
        url: 'https://epihouse.org',
    },
    citation: [
        {
            '@type': 'ScholarlyArticle',
            name: 'Time Until Emergence of HIV Test Reactivity Following Infection With HIV-1',
            author: 'Delaney KP et al.',
            datePublished: '2017',
            url: 'https://academic.oup.com/cid/article/64/1/53/2197867',
        },
    ],
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'VND',
    },
    isPartOf: {
        '@type': 'WebSite',
        name: 'EpiHouse',
        url: 'https://epihouse.org',
    },
    inLanguage: 'vi',
    audience: {
        '@type': 'PeopleAudience',
        audienceType: 'Healthcare professionals and patients',
    },
};

const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'Cửa sổ xét nghiệm HIV (window period) là gì?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Cửa sổ xét nghiệm HIV là khoảng thời gian từ khi phơi nhiễm HIV đến khi xét nghiệm có thể phát hiện được. Trong giai đoạn này, xét nghiệm có thể cho kết quả âm tính dù đã bị nhiễm HIV.',
            },
        },
        {
            '@type': 'Question',
            name: 'Sau bao lâu xét nghiệm HIV mới chính xác?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Tùy loại xét nghiệm: RNA PCR chính xác nhất từ ngày 33, Ag/Ab combo thế hệ 4 từ ngày 45, Test nhanh kháng thể từ ngày 57–90 sau phơi nhiễm.',
            },
        },
        {
            '@type': 'Question',
            name: 'Xét nghiệm HIV nào nhanh và chính xác nhất?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'HIV RNA PCR có thể phát hiện sớm nhất (từ ngày 7–10 sau phơi nhiễm) nhưng cần làm tại phòng xét nghiệm. Ag/Ab combo thế hệ 4 cân bằng tốt giữa tốc độ và độ chính xác, kết luận được sau ngày 45.',
            },
        },
        {
            '@type': 'Question',
            name: 'Người dùng PrEP có thể dùng đường cong này không?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Không. Người đang dùng PrEP hoặc PEP có thể có quá trình chuyển đảo huyết thanh bị trì hoãn nhiều tháng, cần dùng RNA PCR + Ag/Ab thế hệ 4 song song và không tham khảo đường cong này.',
            },
        },
    ],
};

export default function HivWindowPeriodLayout({ children }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(toolSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
            {children}
        </>
    );
}
