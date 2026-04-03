export const metadata = {
    title: 'Máy tính nguy cơ phơi nhiễm HIV',
    description:
        'Ước tính xác suất lây nhiễm HIV sau phơi nhiễm dựa trên loại hành vi, tình trạng bạn tình và các yếu tố nguy cơ. Dữ liệu từ CDC, Patel et al. 2014. Hỗ trợ quyết định dùng PEP.',
    keywords: [
        'nguy cơ HIV',
        'xác suất lây HIV',
        'máy tính HIV',
        'phơi nhiễm HIV',
        'PEP HIV',
        'đánh giá nguy cơ HIV',
        'HIV risk calculator',
        'HIV exposure risk',
        'tính nguy cơ HIV Việt Nam',
    ],
    alternates: {
        canonical: 'https://epihouse.org/tools/hiv-risk-calculator',
    },
    openGraph: {
        title: 'Máy tính nguy cơ phơi nhiễm HIV — EpiHouse',
        description:
            'Ước tính xác suất lây nhiễm HIV sau phơi nhiễm. Dựa trên dữ liệu CDC/Patel 2014. Hỗ trợ quyết định PEP.',
        url: 'https://epihouse.org/tools/hiv-risk-calculator',
        type: 'website',
        siteName: 'EpiHouse',
        locale: 'vi_VN',
        images: [
            {
                url: 'https://epihouse.org/og-hiv-risk-calculator.png',
                width: 1200,
                height: 630,
                alt: 'Máy tính nguy cơ phơi nhiễm HIV — EpiHouse',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Máy tính nguy cơ phơi nhiễm HIV — EpiHouse',
        description:
            'Ước tính xác suất lây nhiễm HIV sau phơi nhiễm dựa trên dữ liệu CDC/Patel 2014. Hỗ trợ quyết định PEP.',
        images: ['https://epihouse.org/og-hiv-risk-calculator.png'],
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
    name: 'Máy tính nguy cơ phơi nhiễm HIV',
    url: 'https://epihouse.org/tools/hiv-risk-calculator',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript',
    description:
        'Công cụ ước tính xác suất lây nhiễm HIV sau phơi nhiễm dựa trên loại hành vi, tình trạng HIV của bạn tình, và các yếu tố nguy cơ/bảo vệ. Dữ liệu từ CDC và Patel et al. 2014.',
    author: {
        '@type': 'Organization',
        name: 'EpiHouse',
        url: 'https://epihouse.org',
    },
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
            name: 'PEP là gì và khi nào cần dùng?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'PEP (Post-Exposure Prophylaxis) là thuốc dự phòng sau phơi nhiễm HIV, cần bắt đầu trong vòng 72 giờ sau phơi nhiễm và uống đủ 28 ngày. Nên xem xét PEP khi nguy cơ phơi nhiễm đáng kể.',
            },
        },
        {
            '@type': 'Question',
            name: 'Làm sao tính nguy cơ lây nhiễm HIV sau quan hệ tình dục?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Nguy cơ lây HIV phụ thuộc vào loại hành vi (hậu môn, âm đạo, miệng), tình trạng HIV của bạn tình, và các yếu tố như STI, chảy máu, sử dụng bao cao su, PrEP. Máy tính này ước tính dựa trên dữ liệu từ CDC và Patel et al. 2014.',
            },
        },
        {
            '@type': 'Question',
            name: 'U=U nghĩa là gì?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'U=U (Undetectable = Untransmittable) có nghĩa là người HIV dương tính đang điều trị ARV đạt tải lượng virus không phát hiện được (< 200 bản sao/mL) sẽ không lây truyền HIV qua đường tình dục.',
            },
        },
    ],
};

export default function HivRiskCalculatorLayout({ children }) {
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
