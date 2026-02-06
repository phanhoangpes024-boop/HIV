import Link from 'next/link';
import { notFound } from 'next/navigation';
import newsData from '@/components/NewsList/data/news.json';
import './NewsDetail.css';

export function generateStaticParams() {
    return newsData.map((news) => ({
        id: news.id.toString(),
    }));
}

export default async function NewsDetailPage({ params }) {
    const { id } = await params;
    const news = newsData.find(n => n.id.toString() === id);

    if (!news) {
        notFound();
    }

    return (
        <div className="article-container">
            <Link href="/" className="back-link">
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại
            </Link>

            <article className="article-content">
                <div className="article-header">
                    <div className="article-meta-top">
                        <span className="institution">{news.institution}</span>
                        <span className="date">{news.date}</span>
                    </div>

                    <h1 className="article-title">{news.title}</h1>

                    <div className="article-authors">
                        <span>Tác giả: </span>
                        {news.authors.join(", ")}
                    </div>

                    <div className="article-tags">
                        {news.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
                    </div>
                </div>

                <div className="article-image">
                    <img src={news.image} alt={news.title} />
                </div>

                <div
                    className="article-body"
                    dangerouslySetInnerHTML={{ __html: news.content }}
                />

                <div className="article-footer">
                    <div className="stats">
                        <span className="stat">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {news.views.toLocaleString()} lượt xem
                        </span>
                        <span className="stat">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {news.likes} lượt thích
                        </span>
                    </div>
                </div>
            </article>
        </div>
    );
}
