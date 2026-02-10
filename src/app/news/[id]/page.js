import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import './NewsDetail.css';

// Tạo Supabase client cho server-side
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Hàm lấy tất cả bài viết để generate static paths
async function getAllArticles() {
    const { data, error } = await supabase
        .from('articles')
        .select('id');
    
    if (error) {
        console.error('Lỗi khi lấy danh sách bài viết:', error);
        return [];
    }
    
    return data || [];
}

// Hàm lấy chi tiết một bài viết
async function getArticleById(id) {
    // Lấy thông tin bài viết
    const { data: article, error: articleError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

    if (articleError || !article) {
        return null;
    }

    // Lấy tác giả
    const { data: authorData } = await supabase
        .from('article_authors')
        .select('author_id, authors(name)')
        .eq('article_id', id);

    const authors = authorData?.map(item => item.authors.name) || [];

    // Lấy tags
    const { data: tagData } = await supabase
        .from('article_tags')
        .select('tag_id, tags(name)')
        .eq('article_id', id);

    const tags = tagData?.map(item => item.tags.name) || [];

    return {
        ...article,
        authors,
        tags,
        date: new Date(article.date).toLocaleDateString('vi-VN')
    };
}

// Generate static paths cho tất cả bài viết
export async function generateStaticParams() {
    const articles = await getAllArticles();
    return articles.map((article) => ({
        id: article.id.toString(),
    }));
}

// Component hiển thị trang chi tiết
export default async function NewsDetailPage({ params }) {
    const { id } = await params;
    const news = await getArticleById(id);

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