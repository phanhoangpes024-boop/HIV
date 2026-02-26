"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import './NewsList.css';
import { createClient } from '../../utils/supabase/client';
import { createSlugWithId } from '../../lib/slugify';

const ITEMS_PER_PAGE = 10;

export default function NewsList() {
    const router = useRouter();
    const supabase = createClient();
    const [newsData, setNewsData] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [allInstitutions, setAllInstitutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState('latest');
    const [likedArticles, setLikedArticles] = useState({});
    const [bookmarkedArticles, setBookmarkedArticles] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [dateFilter, setDateFilter] = useState('all');
    const [user, setUser] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const filterRef = useRef(null);
    const searchTimeout = useRef(null);

    // Auth
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                fetchUserLikes(user.id);
                fetchUserBookmarks(user.id);
            }
        };
        getUser();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserLikes(session.user.id);
                fetchUserBookmarks(session.user.id);
            } else {
                setLikedArticles({});
                setBookmarkedArticles({});
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const fetchUserLikes = async (userId) => {
        const { data } = await supabase
            .from('article_likes')
            .select('article_id')
            .eq('user_id', userId);
        if (data) {
            const likes = {};
            data.forEach(i => { likes[i.article_id] = true; });
            setLikedArticles(likes);
        }
    };

    const fetchUserBookmarks = async (userId) => {
        const { data } = await supabase
            .from('article_bookmarks')
            .select('article_id')
            .eq('user_id', userId);
        if (data) {
            const bookmarks = {};
            data.forEach(i => { bookmarks[i.article_id] = true; });
            setBookmarkedArticles(bookmarks);
        }
    };

    // Fetch metadata
    useEffect(() => {
        fetchTags();
        fetchInstitutions();
    }, []);

    const fetchTags = async () => {
        const { data } = await supabase.from('tags').select('name').order('name');
        if (data) setAllTags(data.map(t => t.name));
    };

    const fetchInstitutions = async () => {
        const { data } = await supabase
            .from('articles')
            .select('institution');
        if (data) {
            const unique = [...new Set(data.map(a => a.institution).filter(Boolean))].sort();
            setAllInstitutions(unique);
        }
    };

    // Fetch articles
    const fetchArticles = async () => {
        try {
            setLoading(true);
            let query = supabase.from('articles').select(`
                *,
                article_authors ( authors ( name ) ),
                article_tags ( tags ( name ) )
            `);

            if (dateFilter === 'week') {
                const d = new Date(); d.setDate(d.getDate() - 7);
                query = query.gte('date', d.toISOString().split('T')[0]);
            } else if (dateFilter === 'month') {
                const d = new Date(); d.setMonth(d.getMonth() - 1);
                query = query.gte('date', d.toISOString().split('T')[0]);
            } else if (dateFilter === 'year') {
                const d = new Date(); d.setFullYear(d.getFullYear() - 1);
                query = query.gte('date', d.toISOString().split('T')[0]);
            }

            if (selectedInstitutions.length > 0) {
                query = query.in('institution', selectedInstitutions);
            }

            const { data: articles, error } = await query;
            if (error) throw error;

            let result = articles.map(a => ({
                ...a,
                authors: a.article_authors?.map(x => x.authors?.name).filter(Boolean) || [],
                tags: a.article_tags?.map(x => x.tags?.name).filter(Boolean) || [],
                dateFormatted: new Date(a.date).toLocaleDateString('vi-VN'),
                dateRaw: a.date
            }));

            // Filter by tags
            if (selectedTags.length > 0) {
                result = result.filter(a => a.tags.some(t => selectedTags.includes(t)));
            }

            // Search
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                result = result.filter(a =>
                    a.title.toLowerCase().includes(q) ||
                    a.description?.toLowerCase().includes(q) ||
                    a.institution?.toLowerCase().includes(q) ||
                    a.authors.some(au => au.toLowerCase().includes(q))
                );
            }

            // Sort
            if (sortBy === 'latest') {
                result.sort((a, b) => new Date(b.dateRaw) - new Date(a.dateRaw));
            } else if (sortBy === 'popular') {
                result.sort((a, b) => b.likes - a.likes);
            } else if (sortBy === 'views') {
                result.sort((a, b) => b.views - a.views);
            }

            setTotalCount(result.length);
            setNewsData(result);
        } catch (err) {
            console.error('Lỗi khi lấy dữ liệu:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchArticles(); }, [sortBy, searchTerm, selectedTags, selectedInstitutions, dateFilter]);

    // Debounce search
    const handleSearchInput = (val) => {
        setSearchInput(val);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setSearchTerm(val);
            setCurrentPage(1);
        }, 400);
    };

    // Close filter on outside click
    useEffect(() => {
        const handler = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
        };
        if (filterOpen) {
            document.addEventListener('mousedown', handler);
            if (window.innerWidth <= 768) document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.removeEventListener('mousedown', handler); document.body.style.overflow = 'unset'; };
    }, [filterOpen]);

    // Like
    const toggleLike = async (e, articleId) => {
        e.preventDefault();
        e.stopPropagation();
        const { data: { user: cur } } = await supabase.auth.getUser();
        if (!cur) { router.push('/signin'); return; }

        const isLiked = likedArticles[articleId];
        setLikedArticles(p => { const n = { ...p }; isLiked ? delete n[articleId] : n[articleId] = true; return n; });
        setNewsData(p => p.map(a => a.id === articleId ? { ...a, likes: a.likes + (isLiked ? -1 : 1) } : a));

        try {
            if (isLiked) {
                const { error } = await supabase.from('article_likes').delete().eq('user_id', cur.id).eq('article_id', articleId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('article_likes').insert({ user_id: cur.id, article_id: articleId });
                if (error) throw error;
            }
        } catch {
            setLikedArticles(p => { const n = { ...p }; isLiked ? n[articleId] = true : delete n[articleId]; return n; });
            setNewsData(p => p.map(a => a.id === articleId ? { ...a, likes: a.likes + (isLiked ? 1 : -1) } : a));
        }
    };

    const toggleBookmark = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) { router.push('/signin'); return; }

        const isBookmarked = bookmarkedArticles[id];
        setBookmarkedArticles(p => ({ ...p, [id]: !isBookmarked }));

        try {
            if (isBookmarked) {
                const { error } = await supabase
                    .from('article_bookmarks')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('article_id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('article_bookmarks')
                    .insert({ user_id: user.id, article_id: id });
                if (error) throw error;
            }
        } catch (err) {
            console.error('Bookmark error:', err);
            // Rollback on error
            setBookmarkedArticles(p => ({ ...p, [id]: isBookmarked }));
        }
    };

    // Pagination
    const totalPages = Math.ceil(newsData.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentNews = newsData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const activeFilterCount = selectedTags.length + selectedInstitutions.length + (dateFilter !== 'all' ? 1 : 0);

    const clearAllFilters = () => {
        setSelectedTags([]);
        setSelectedInstitutions([]);
        setDateFilter('all');
        setSearchInput('');
        setSearchTerm('');
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const pages = [];
        const max = 5;
        let start = Math.max(1, currentPage - Math.floor(max / 2));
        let end = Math.min(totalPages, start + max - 1);
        if (end - start < max - 1) start = Math.max(1, end - max + 1);

        pages.push(
            <button key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="pg-btn pg-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
        );
        if (start > 1) {
            pages.push(<button key={1} onClick={() => setCurrentPage(1)} className="pg-btn">1</button>);
            if (start > 2) pages.push(<span key="d1" className="pg-dots">...</span>);
        }
        for (let i = start; i <= end; i++) {
            pages.push(<button key={i} className={`pg-btn ${currentPage === i ? 'active' : ''}`} onClick={() => setCurrentPage(i)}>{i}</button>);
        }
        if (end < totalPages) {
            if (end < totalPages - 1) pages.push(<span key="d2" className="pg-dots">...</span>);
            pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="pg-btn">{totalPages}</button>);
        }
        pages.push(
            <button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="pg-btn pg-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
        );
        return pages;
    };

    // === RENDER ===
    return (
        <div className="nl-container">
            {/* Hero Search Bar */}
            <div className="nl-hero">
                <Image src="/Logo.png" alt="THE EPIDEMIC HOUSE Logo" width={120} height={120} className="nl-hero-logo logo-light" />
                <Image src="/Dark Logo.png" alt="THE EPIDEMIC HOUSE Logo" width={120} height={120} className="nl-hero-logo logo-dark" />
                <h1 className="nl-hero-title brand-font">THE EPIDEMIC HOUSE</h1>
                <p className="nl-hero-subtitle">Dự án cung cấp thông tin y tế mới nhất về bệnh truyền nhiễm</p>
                <div className="nl-search-bar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nl-search-icon">
                        <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Tìm kiếm bài viết, tác giả, tổ chức..."
                        value={searchInput}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        className="nl-search-input"
                    />
                    {searchInput && (
                        <button className="nl-search-clear" onClick={() => { setSearchInput(''); setSearchTerm(''); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="nl-toolbar">
                <div className="nl-toolbar-left">
                    <span className="nl-result-count">{totalCount.toLocaleString()} kết quả</span>

                    {/* Sort */}
                    <div className="nl-sort-group">
                        <span className="nl-sort-label">Sắp xếp:</span>
                        {[
                            { key: 'latest', label: 'Mới nhất' },
                            { key: 'popular', label: 'Yêu thích' },
                            { key: 'views', label: 'Lượt xem' },
                        ].map(s => (
                            <button
                                key={s.key}
                                className={`nl-sort-btn ${sortBy === s.key ? 'active' : ''}`}
                                onClick={() => { setSortBy(s.key); setCurrentPage(1); }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="nl-toolbar-right">
                    {/* Filter Button */}
                    <div className="nl-filter-wrap" ref={filterRef}>
                        <button className={`nl-filter-btn ${filterOpen ? 'active' : ''}`} onClick={() => setFilterOpen(!filterOpen)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Bộ lọc
                            {activeFilterCount > 0 && <span className="nl-filter-badge">{activeFilterCount}</span>}
                        </button>

                        {filterOpen && (
                            <>
                                <div className="nl-filter-overlay" onClick={() => setFilterOpen(false)}></div>
                                <div className="nl-filter-panel">
                                    <div className="nl-filter-header">
                                        <span className="nl-filter-title">Bộ lọc nâng cao</span>
                                        {activeFilterCount > 0 && (
                                            <button className="nl-filter-clear" onClick={clearAllFilters}>Xóa tất cả</button>
                                        )}
                                    </div>

                                    {/* Date Filter */}
                                    <div className="nl-filter-section">
                                        <div className="nl-filter-section-title">Thời gian xuất bản</div>
                                        <div className="nl-filter-chips">
                                            {[
                                                { key: 'all', label: 'Tất cả' },
                                                { key: 'week', label: '7 ngày' },
                                                { key: 'month', label: '30 ngày' },
                                                { key: 'year', label: '1 năm' },
                                            ].map(d => (
                                                <button
                                                    key={d.key}
                                                    className={`nl-chip ${dateFilter === d.key ? 'active' : ''}`}
                                                    onClick={() => { setDateFilter(d.key); setCurrentPage(1); }}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div className="nl-filter-section">
                                        <div className="nl-filter-section-title">Chủ đề</div>
                                        <div className="nl-filter-chips">
                                            {allTags.map(tag => (
                                                <button
                                                    key={tag}
                                                    className={`nl-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setSelectedTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                            {allTags.length === 0 && <span className="nl-filter-empty">Chưa có chủ đề</span>}
                                        </div>
                                    </div>

                                    {/* Institutions */}
                                    <div className="nl-filter-section">
                                        <div className="nl-filter-section-title">Tổ chức / Viện nghiên cứu</div>
                                        <div className="nl-filter-chips">
                                            {allInstitutions.map(inst => (
                                                <button
                                                    key={inst}
                                                    className={`nl-chip ${selectedInstitutions.includes(inst) ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setSelectedInstitutions(p => p.includes(inst) ? p.filter(i => i !== inst) : [...p, inst]);
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    {inst}
                                                </button>
                                            ))}
                                            {allInstitutions.length === 0 && <span className="nl-filter-empty">Chưa có tổ chức</span>}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
                <div className="nl-active-filters">
                    {dateFilter !== 'all' && (
                        <span className="nl-active-chip">
                            {dateFilter === 'week' ? '7 ngày' : dateFilter === 'month' ? '30 ngày' : '1 năm'}
                            <button onClick={() => setDateFilter('all')}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </span>
                    )}
                    {selectedTags.map(t => (
                        <span key={t} className="nl-active-chip">
                            {t}
                            <button onClick={() => setSelectedTags(p => p.filter(x => x !== t))}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </span>
                    ))}
                    {selectedInstitutions.map(i => (
                        <span key={i} className="nl-active-chip inst">
                            {i}
                            <button onClick={() => setSelectedInstitutions(p => p.filter(x => x !== i))}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </span>
                    ))}
                    <button className="nl-clear-all" onClick={clearAllFilters}>Xóa tất cả</button>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="nl-loading">
                    <div className="nl-spinner"></div>
                    <span>Đang tải dữ liệu...</span>
                </div>
            )}

            {/* Empty state */}
            {!loading && currentNews.length === 0 && (
                <div className="nl-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>Không tìm thấy bài viết nào</p>
                    <button className="nl-empty-btn" onClick={clearAllFilters}>Xóa bộ lọc</button>
                </div>
            )}

            {/* Article List */}
            {!loading && (
                <div className="nl-list">
                    {currentNews.map((news, idx) => (
                        <Link href={`/news/${createSlugWithId(news.title, news.id)}`} key={news.id} className="nl-card-link">
                            <article className="nl-card">
                                {/* Left content */}
                                <div className="nl-card-body">
                                    {/* Meta line */}
                                    <div className="nl-card-meta">
                                        <span className="nl-card-institution">{news.institution}</span>
                                        <span className="nl-card-dot">·</span>
                                        <span className="nl-card-date" suppressHydrationWarning>{news.dateFormatted}</span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="nl-card-title">{news.title}</h3>

                                    {/* Authors */}
                                    <div className="nl-card-authors">
                                        {news.authors.map((author, i) => (
                                            <span key={author}>
                                                <span className="nl-author-name">{author}</span>
                                                {i < news.authors.length - 1 && <span className="nl-author-sep">, </span>}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Description */}
                                    <p className="nl-card-desc">{news.description}</p>

                                    {/* Tags */}
                                    <div className="nl-card-tags">
                                        {news.tags.map(tag => (
                                            <span key={tag} className="nl-tag">#{tag}</span>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="nl-card-actions">
                                        <button
                                            className={`nl-action ${likedArticles[news.id] ? 'liked' : ''}`}
                                            onClick={(e) => toggleLike(e, news.id)}
                                            title="Thích"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill={likedArticles[news.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                            </svg>
                                            <span>{news.likes}</span>
                                        </button>

                                        <button
                                            className={`nl-action ${bookmarkedArticles[news.id] ? 'bookmarked' : ''}`}
                                            onClick={(e) => toggleBookmark(e, news.id)}
                                            title="Đánh dấu"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarkedArticles[news.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                            </svg>
                                            <span>Lưu</span>
                                        </button>

                                        <div className="nl-action nl-views" title="Lượt xem">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            <span>{news.views?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Thumbnail */}
                                {news.image && (
                                    <div className="nl-card-thumb">
                                        <Image
                                            src={news.image}
                                            alt={news.title}
                                            width={240}
                                            height={160}
                                            className="nl-thumb-img"
                                            loading="lazy"
                                        />
                                    </div>
                                )}
                            </article>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="nl-pagination">
                    <div className="nl-pg-info">
                        Trang {currentPage} / {totalPages}
                    </div>
                    <div className="nl-pg-buttons">
                        {renderPagination()}
                    </div>
                </div>
            )}
        </div>
    );
}