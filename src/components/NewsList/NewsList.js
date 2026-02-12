"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './NewsList.css';
import { createClient } from '../../utils/supabase/client';

const ITEMS_PER_PAGE = 10;

export default function NewsList() {
    const router = useRouter();
    const supabase = createClient(); // Tạo client mới
    const [newsData, setNewsData] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState('latest');
    const [likedArticles, setLikedArticles] = useState({});
    const [bookmarkedArticles, setBookmarkedArticles] = useState({});
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [dateFilter, setDateFilter] = useState('all');
    const [user, setUser] = useState(null);
    const filterRef = useRef(null);

    // Kiểm tra user đã đăng nhập chưa
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            // Nếu user đã đăng nhập, lấy danh sách bài viết user đã like
            if (user) {
                fetchUserLikes(user.id);
            }
        };
        getUser();

        // Lắng nghe thay đổi trạng thái đăng nhập
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserLikes(session.user.id);
            } else {
                setLikedArticles({});
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Lấy danh sách bài viết user đã like
    const fetchUserLikes = async (userId) => {
        const { data, error } = await supabase
            .from('article_likes')
            .select('article_id')
            .eq('user_id', userId);

        if (data && !error) {
            const likes = {};
            data.forEach(item => {
                likes[item.article_id] = true;
            });
            setLikedArticles(likes);
        }
    };

    useEffect(() => {
        fetchArticles();
        fetchTags();
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        }

        if (isFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            if (window.innerWidth <= 768) {
                document.body.style.overflow = 'hidden';
            }
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isFilterOpen]);

    const fetchTags = async () => {
        const { data } = await supabase.from('tags').select('name').order('name');
        if (data) setAllTags(data.map(t => t.name));
    };

    const fetchArticles = async () => {
        try {
            setLoading(true);

            let query = supabase.from('articles').select(`
                *,
                article_authors (
                    authors ( name )
                ),
                article_tags (
                    tags ( name )
                )
            `);

            if (dateFilter === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                query = query.gte('date', weekAgo.toISOString().split('T')[0]);
            } else if (dateFilter === 'month') {
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                query = query.gte('date', monthAgo.toISOString().split('T')[0]);
            }

            const { data: articles, error: articlesError } = await query;
            if (articlesError) throw articlesError;

            let articlesWithDetails = articles.map(article => ({
                ...article,
                authors: article.article_authors?.map(a => a.authors?.name).filter(Boolean) || [],
                tags: article.article_tags?.map(t => t.tags?.name).filter(Boolean) || [],
                date: new Date(article.date).toLocaleDateString('vi-VN')
            }));

            if (selectedTags.length > 0) {
                articlesWithDetails = articlesWithDetails.filter(article =>
                    article.tags.some(tag => selectedTags.includes(tag))
                );
            }

            if (searchTerm) {
                articlesWithDetails = articlesWithDetails.filter(article =>
                    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    article.description.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            if (activeFilter === 'latest') {
                articlesWithDetails.sort((a, b) => new Date(b.date) - new Date(a.date));
            } else if (activeFilter === 'liked') {
                articlesWithDetails.sort((a, b) => b.likes - a.likes);
            }

            setNewsData(articlesWithDetails);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, [activeFilter, searchTerm, selectedTags, dateFilter]);

    // Xử lý Like
    // Xử lý Like (Optimistic UI)
    const toggleLike = async (e, articleId) => {
        e.preventDefault();
        e.stopPropagation();

        // Kiểm tra user đã đăng nhập chưa
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
            router.push('/signin');
            return;
        }

        const isLiked = likedArticles[articleId];

        // 1. Cập nhật UI ngay lập tức (Optimistic Update)
        setLikedArticles(prev => {
            const newLikes = { ...prev };
            if (isLiked) delete newLikes[articleId];
            else newLikes[articleId] = true;
            return newLikes;
        });

        setNewsData(prev => prev.map(article =>
            article.id === articleId
                ? { ...article, likes: article.likes + (isLiked ? -1 : 1) }
                : article
        ));

        // 2. Gọi API xử lý ngầm
        try {
            if (isLiked) {
                // Bỏ like
                const { error } = await supabase
                    .from('article_likes')
                    .delete()
                    .eq('user_id', currentUser.id)
                    .eq('article_id', articleId);

                if (error) throw error;
            } else {
                // Thêm like
                const { error } = await supabase
                    .from('article_likes')
                    .insert({
                        user_id: currentUser.id,
                        article_id: articleId
                    });

                if (error) throw error;
            }
        } catch (error) {
            console.error('Lỗi khi like/unlike:', error);

            // 3. Rollback nếu API lỗi
            setLikedArticles(prev => {
                const newLikes = { ...prev };
                if (isLiked) newLikes[articleId] = true; // Khôi phục like cũ
                else delete newLikes[articleId]; // Khôi phục chưa like
                return newLikes;
            });

            setNewsData(prev => prev.map(article =>
                article.id === articleId
                    ? { ...article, likes: article.likes + (isLiked ? 1 : -1) } // Trả lại số like cũ
                    : article
            ));
        }
    };

    const toggleBookmark = (e, id) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            router.push('/signin');
            return;
        }

        setBookmarkedArticles(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const totalPages = Math.ceil(newsData.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentNews = newsData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        pages.push(
            <button
                key="prev"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            >
                ‹
            </button>
        );

        if (startPage > 1) {
            pages.push(
                <button key={1} onClick={() => setCurrentPage(1)}>1</button>
            );
            if (startPage > 2) {
                pages.push(<span key="dots1" className="dots">...</span>);
            }
        }

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

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(<span key="dots2" className="dots">...</span>);
            }
            pages.push(
                <button key={totalPages} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
            );
        }

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

    if (loading) {
        return (
            <div className="news-container">
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Đang tải dữ liệu...
                </div>
            </div>
        );
    }

    return (
        <div className="news-container">
            <div className="news-header">
                <h2 className="news-header-title">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="news-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Tin tức
                </h2>
            </div>

            <div className="news-filters">
                <div className="filter-left">
                    <div className={`filter-overlay ${isFilterOpen ? 'active' : ''}`} onClick={() => setIsFilterOpen(false)}></div>
                    <div className="filter-dropdown" ref={filterRef}>
                        <button
                            className="filter-trigger-btn"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        </button>

                        {isFilterOpen && (
                            <div className="filter-dropdown-menu">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm chủ đề..."
                                    className="filter-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />

                                <div className="filter-section">
                                    <div className="filter-section-header">
                                        <span>Chủ đề</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <div className="filter-tags">
                                        {allTags.map(tag => (
                                            <button
                                                key={tag}
                                                className={`filter-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSelectedTags(prev =>
                                                        prev.includes(tag)
                                                            ? prev.filter(t => t !== tag)
                                                            : [...prev, tag]
                                                    );
                                                }}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="filter-section">
                                    <div className="filter-section-header">
                                        <span>Thời gian xuất bản</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <div className="filter-options">
                                        <label className="filter-radio">
                                            <input
                                                type="radio"
                                                name="dateFilter"
                                                checked={dateFilter === 'all'}
                                                onChange={() => setDateFilter('all')}
                                            />
                                            <span>Tất cả</span>
                                        </label>
                                        <label className="filter-radio">
                                            <input
                                                type="radio"
                                                name="dateFilter"
                                                checked={dateFilter === 'week'}
                                                onChange={() => setDateFilter('week')}
                                            />
                                            <span>Tuần này</span>
                                        </label>
                                        <label className="filter-radio">
                                            <input
                                                type="radio"
                                                name="dateFilter"
                                                checked={dateFilter === 'month'}
                                                onChange={() => setDateFilter('month')}
                                            />
                                            <span>Tháng này</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className={`filter-btn ${activeFilter === 'latest' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('latest')}
                    >
                        Mới nhất
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'liked' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('liked')}
                    >
                        Yêu thích
                    </button>
                </div>
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
                                            <span>{news.likes}</span>
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