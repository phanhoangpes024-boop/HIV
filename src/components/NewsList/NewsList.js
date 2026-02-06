"use client";

import { useState } from 'react';
import Link from 'next/link';
import './NewsList.css';
import newsData from './data/news.json';

const ITEMS_PER_PAGE = 10;

export default function NewsList() {
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState('articles'); // articles, standards
    const [activeFilter, setActiveFilter] = useState('hot'); // hot, recommended
    const [likedArticles, setLikedArticles] = useState({});
    const [bookmarkedArticles, setBookmarkedArticles] = useState({});

    const totalPages = Math.ceil(newsData.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentNews = newsData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const toggleLike = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setLikedArticles(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const toggleBookmark = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setBookmarkedArticles(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Previous
        pages.push(
            <button
                key="prev"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            >
                ‹
            </button>
        );

        // First page + dots
        if (startPage > 1) {
            pages.push(
                <button key={1} onClick={() => setCurrentPage(1)}>1</button>
            );
            if (startPage > 2) {
                pages.push(<span key="dots1" className="dots">...</span>);
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    className={currentPage === i ? 'active' : ''}
                    onClick={() => setCurrentPage(i)}
                >
                    {i}
                </button>
            );
        }

        // Last page + dots
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(<span key="dots2" className="dots">...</span>);
            }
            pages.push(
                <button key={totalPages} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
            );
        }

        // Next
        pages.push(
            <button
                key="next"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
            >
                ›
            </button>
        );

        return pages;
    };

    return (
        <div className="news-container">
            <div className="news-tabs">
                <button
                    className={`tab ${activeTab === 'articles' ? 'active' : ''}`}
                    onClick={() => setActiveTab('articles')}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Các bài báo
                </button>
                <button
                    className={`tab ${activeTab === 'standards' ? 'active' : ''}`}
                    onClick={() => setActiveTab('standards')}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Tiêu chuẩn
                </button>
            </div>

            <div className="news-filters">
                <button className="filter-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                </button>
                <button
                    className={`filter-btn ${activeFilter === 'hot' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('hot')}
                >
                    Nóng
                </button>
                <button
                    className={`filter-btn ${activeFilter === 'recommended' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('recommended')}
                >
                    Khuyến khích
                </button>
            </div>

            <div className="customize-feed">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span>Tùy chỉnh nguồn cấp dữ liệu của bạn</span>
            </div>

            <div className="news-list">
                {currentNews.map((news) => (
                    <Link href={`/news/${news.id}`} key={news.id} className="news-card-link">
                        <article className="news-card">
                            <div className="news-content">
                                <h3 className="news-title">{news.title}</h3>

                                <div className="news-meta">
                                    <span className="news-date">{news.date}</span>
                                    <span className="news-separator">•</span>
                                    <span className="news-institution">{news.institution}</span>
                                    <span className="news-separator">•</span>
                                    <span className="news-authors">{news.authors.join(", ")}</span>
                                </div>

                                <p className="news-description">{news.description}</p>

                                <div className="news-tags">
                                    {news.tags.map((tag) => (
                                        <span key={tag} className="tag">#{tag}</span>
                                    ))}
                                </div>

                                <div className="news-footer">
                                    <div className="news-actions">
                                        <button
                                            className={`action-btn like-btn ${likedArticles[news.id] ? 'liked' : ''}`}
                                            onClick={(e) => toggleLike(e, news.id)}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill={likedArticles[news.id] ? 'currentColor' : 'none'} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                            </svg>
                                            <span>{news.likes + (likedArticles[news.id] ? 1 : 0)}</span>
                                        </button>

                                        <button
                                            className={`action-btn bookmark-btn ${bookmarkedArticles[news.id] ? 'bookmarked' : ''}`}
                                            onClick={(e) => toggleBookmark(e, news.id)}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarkedArticles[news.id] ? 'currentColor' : 'none'} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                            </svg>
                                            <span>Đánh dấu trang</span>
                                        </button>

                                        <button className="action-btn resource-btn">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span>Tài nguyên</span>
                                        </button>

                                        <button className="action-btn github-btn">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                            </svg>
                                            <span>3</span>
                                        </button>
                                    </div>

                                    <div className="view-btn">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="news-image">
                                <img src={news.image} alt={news.title} />
                                <div className="news-views">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {news.views.toLocaleString()}
                                </div>
                            </div>
                        </article>
                    </Link>
                ))}
            </div>

            <div className="pagination">
                {renderPagination()}
            </div>
        </div>
    );
}
