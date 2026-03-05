import Link from 'next/link';
import './Breadcrumb.css';

const HomeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    </svg>
);

const ChevronRight = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="breadcrumb-sep">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

/**
 * Breadcrumb Component
 * @param {Object} props
 * @param {Array<{label: string, href: string, current?: boolean}>} props.items
 */
export default function Breadcrumb({ items }) {
    if (!items || items.length === 0) return null;

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.label,
            "item": item.current ? undefined : (item.href.startsWith('http') ? item.href : `https://epihouse.org${item.href}`)
        }))
    };

    return (
        <nav className="breadcrumb-nav">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            {items.map((item, index) => (
                <div key={index} className="breadcrumb-item-wrapper">
                    {item.current ? (
                        <span className="breadcrumb-current">{item.label}</span>
                    ) : (
                        <Link href={item.href} className="breadcrumb-link">
                            {index === 0 && <HomeIcon />}
                            {item.label}
                        </Link>
                    )}
                    {index < items.length - 1 && <ChevronRight />}
                </div>
            ))}
        </nav>
    );
}
