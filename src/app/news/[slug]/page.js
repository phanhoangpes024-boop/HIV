import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import NewsDetailClient from './NewsDetailClient';
import Breadcrumb from '../../../components/Breadcrumb/Breadcrumb';
import { getIdFromSlug, createSlugWithId } from '../../../lib/slugify';
import './NewsDetail.css';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getAllArticles() {
    const { data } = await supabase.from('articles').select('id, title');
    return data || [];
}

async function getArticleById(id) {
    const { data: article, error } = await supabase
        .from('articles').select('*').eq('id', id).single();
    if (error || !article) return null;

    const { data: authorData } = await supabase
        .from('article_authors').select('author_id, authors(name)').eq('article_id', id);
    const authors = authorData?.map(i => i.authors.name) || [];

    const { data: tagData } = await supabase
        .from('article_tags').select('tag_id, tags(name)').eq('article_id', id);
    const tags = tagData?.map(i => i.tags.name) || [];

    return {
        ...article, authors, tags,
        dateFormatted: new Date(article.date).toLocaleDateString('vi-VN', {
            year: 'numeric', month: 'long', day: 'numeric'
        }),
        dateISO: article.date,
    };
}

export async function generateStaticParams() {
    const articles = await getAllArticles();
    return articles.map((a) => ({ slug: createSlugWithId(a.title, a.id) }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const id = getIdFromSlug(slug);
    const article = await getArticleById(id);
    if (!article) return { title: 'Không tìm thấy bài viết' };

    const canonicalSlug = createSlugWithId(article.title, article.id);
    const url = `https://epihouse.org/news/${canonicalSlug}`;

    return {
        title: article.title,
        description: article.description,
        alternates: {
            canonical: url,
        },
        openGraph: {
            title: article.title,
            description: article.description,
            url: url,
            type: 'article',
            publishedTime: article.dateISO,
            authors: article.authors,
            tags: article.tags,
            images: article.image
                ? [{ url: article.image, width: 1200, height: 630, alt: article.title }]
                : [{ url: 'https://epihouse.org/og-default.png', width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.description,
            images: article.image
                ? [article.image]
                : ['https://epihouse.org/og-default.png'],
        },
    };
}


export default async function NewsDetailPage({ params }) {
    const { slug } = await params;
    const id = getIdFromSlug(slug);
    const news = await getArticleById(id);
    if (!news) notFound();

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'MedicalArticle',
        headline: news.title,
        description: news.description,
        image: news.image ? [news.image] : [],
        datePublished: news.dateISO,
        dateModified: news.dateISO, // Giả sử cùng ngày nếu không có cập nhật
        author: news.authors.map(name => ({
            '@type': 'Person',
            name: name,
        })),
        publisher: {
            '@type': 'Organization',
            name: 'THE EPIDEMIC HOUSE',
            logo: {
                '@type': 'ImageObject',
                url: 'https://epihouse.org/logo.png',
            },
        },
        healthCondition: {
            '@type': 'MedicalCondition',
            name: news.tags?.[0] || 'Infectious Disease',
        },
    };

    return (
        <div className="nd-layout">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <article className="nd-article">
                <Breadcrumb
                    items={[
                        { label: 'Trang chủ', href: '/' },
                        { label: 'Chi tiết bài viết', current: true }
                    ]}
                />

                {/* Header */}
                <header className="nd-header">
                    <div className="nd-institution-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {news.institution}
                    </div>

                    <h1 className="nd-title">{news.title}</h1>

                    {news.authors.length > 0 && (
                        <div className="nd-authors">
                            {news.authors.map((author, i) => (
                                <span key={author}>
                                    <span className="nd-author-name">{author}</span>
                                    {i < news.authors.length - 1 && ', '}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="nd-meta-bar">
                        <div className="nd-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <time dateTime={news.dateISO}>{news.dateFormatted}</time>
                        </div>
                        <div className="nd-meta-divider"></div>
                        <div className="nd-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {news.views?.toLocaleString()} lượt xem
                        </div>
                        <div className="nd-meta-divider"></div>
                        <div className="nd-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {news.likes} lượt thích
                        </div>
                    </div>

                    {news.tags.length > 0 && (
                        <div className="nd-tags">
                            {news.tags.map(tag => (
                                <span key={tag} className="nd-tag">#{tag}</span>
                            ))}
                        </div>
                    )}
                </header>

                {/* Abstract */}
                {news.description && (
                    <section className="nd-abstract">
                        <h2 className="nd-section-label">Tóm tắt</h2>
                        <p className="nd-abstract-text">{news.description}</p>
                    </section>
                )}

                {/* Image */}
                {news.image && (
                    <figure className="nd-figure">
                        <Image
                            src={news.image}
                            alt={news.title}
                            width={1200}
                            height={630}
                            priority={true}
                            className="nd-image"
                        />
                    </figure>
                )}

                {/* Body */}
                <section className="nd-body" dangerouslySetInnerHTML={{ __html: news.content }} />

                {/* Footer */}
                <footer className="nd-footer">
                    <div className="nd-footer-meta">
                        <div className="nd-footer-item">
                            <span className="nd-footer-label">Tổ chức</span>
                            <span className="nd-footer-value">{news.institution}</span>
                        </div>
                        <div className="nd-footer-item">
                            <span className="nd-footer-label">Ngày xuất bản</span>
                            <span className="nd-footer-value">{news.dateFormatted}</span>
                        </div>
                        {news.authors.length > 0 && (
                            <div className="nd-footer-item">
                                <span className="nd-footer-label">Tác giả</span>
                                <span className="nd-footer-value">{news.authors.join(', ')}</span>
                            </div>
                        )}
                        {news.tags.length > 0 && (
                            <div className="nd-footer-item">
                                <span className="nd-footer-label">Chủ đề</span>
                                <span className="nd-footer-value">{news.tags.join(', ')}</span>
                            </div>
                        )}
                    </div>
                    <div className="nd-footer-nav">
                        <Link href="/" className="nd-back-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Quay lại danh sách bài viết
                        </Link>
                    </div>
                </footer>
            </article>

            {/* Sidebar — Client Component để xử lý tương tác */}
            <NewsDetailClient articleId={news.id} views={news.views} likes={news.likes} dateFormatted={news.dateFormatted} />
        </div>
    );
}