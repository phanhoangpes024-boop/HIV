"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '../../utils/supabase/client';
import CreatePost from './components/CreatePost';
import PostCard from './components/PostCard';
import PostDetail from './components/PostDetail';
import './Forum.css';

const POSTS_PER_PAGE = 10;

const TAG_OPTIONS = [
    'HIV/AIDS', 'Viêm gan', 'Lao phổi', 'COVID-19', 'Sốt xuất huyết',
    'STIs', 'Sốt rét', 'Cúm', 'Tiêm chủng', 'Dinh dưỡng',
    'Sức khỏe tâm thần', 'Hỏi bác sĩ', 'Chia sẻ kinh nghiệm', 'Thuốc & điều trị', 'Khác'
];

export default function ForumClient() {
    const supabase = createClient();
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    // Filters
    const [sortBy, setSortBy] = useState('latest'); // latest, popular, unanswered
    const [filterTag, setFilterTag] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const searchTimeout = useRef(null);

    // Detail view
    const [selectedPost, setSelectedPost] = useState(null);
    const [showCreatePost, setShowCreatePost] = useState(false);

    // Filter dropdown
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef(null);

    const observerRef = useRef(null);
    const loadMoreRef = useRef(null);

    // Auth
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('display_name, avatar_url')
                    .eq('id', user.id)
                    .single();
                setUserProfile(profile);
            }
        };
        init();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    // Close filter dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Fetch posts
    const fetchPosts = useCallback(async (pageNum = 0, append = false) => {
        if (pageNum === 0) setLoading(true);
        else setLoadingMore(true);

        try {
            let query = supabase
                .from('forum_posts')
                .select(`
                    *,
                    user_profiles (display_name, avatar_url)
                `)
                .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

            // Sort
            if (sortBy === 'latest') {
                query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
            } else if (sortBy === 'popular') {
                query = query.order('likes_count', { ascending: false });
            } else if (sortBy === 'unanswered') {
                query = query.eq('comments_count', 0).order('created_at', { ascending: false });
            }

            // Filter by tag
            if (filterTag) {
                query = query.contains('tags', [filterTag]);
            }

            // Search
            if (searchTerm) {
                query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Supabase error:', error.message, error.details, error.hint);
                // Fallback: fetch không join profile
                let fallback = supabase
                    .from('forum_posts')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);
                const { data: fbData } = await fallback;
                const posts = (fbData || []).map(p => ({ ...p, user_profiles: null }));
                if (append) setPosts(prev => [...prev, ...posts]);
                else setPosts(posts);
                setHasMore(posts.length === POSTS_PER_PAGE);
                return;
            }

            if (append) {
                setPosts(prev => [...prev, ...(data || [])]);
            } else {
                setPosts(data || []);
            }

            setHasMore((data || []).length === POSTS_PER_PAGE);
        } catch (err) {
            console.error('Error fetching posts:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [sortBy, filterTag, searchTerm]);

    // Reset & fetch khi filter thay đổi
    useEffect(() => {
        setPage(0);
        setPosts([]);
        setHasMore(true);
        fetchPosts(0, false);
    }, [sortBy, filterTag, searchTerm, fetchPosts]);

    // Infinite scroll observer
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchPosts(nextPage, true);
            }
        }, { threshold: 0.1 });

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => observerRef.current?.disconnect();
    }, [hasMore, loadingMore, loading, page, fetchPosts]);

    // Debounce search
    const handleSearchInput = (val) => {
        setSearchInput(val);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setSearchTerm(val.trim());
        }, 400);
    };

    // Sau khi tạo bài mới
    const handlePostCreated = (newPost) => {
        // Thêm profile info vào post mới
        const enriched = {
            ...newPost,
            user_profiles: userProfile || { display_name: user?.email, avatar_url: null }
        };
        setPosts(prev => [enriched, ...prev]);
        setShowCreatePost(false);
    };

    // Anti-spam ref
    const likingPosts = useRef({});

    // Like bài — Optimistic + chống spam
    const handleToggleLike = async (postId) => {
        if (!user) return alert('Vui lòng đăng nhập để thích bài viết');
        if (likingPosts.current[postId]) return; // chặn spam click
        likingPosts.current[postId] = true;

        const post = posts.find(p => p.id === postId);
        if (!post) { delete likingPosts.current[postId]; return; }

        const wasLiked = !!post._liked;
        const prevCount = post.likes_count || 0;

        // Optimistic — cập nhật UI ngay
        setPosts(prev => prev.map(p =>
            p.id === postId ? {
                ...p,
                likes_count: wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
                _liked: !wasLiked
            } : p
        ));

        try {
            if (wasLiked) {
                const { error } = await supabase
                    .from('forum_post_likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('forum_post_likes')
                    .insert({ post_id: postId, user_id: user.id });
                if (error) throw error;
            }
        } catch (err) {
            // Rollback nếu lỗi
            setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, likes_count: prevCount, _liked: wasLiked } : p
            ));
        } finally {
            delete likingPosts.current[postId];
        }
    };

    // Check liked status
    useEffect(() => {
        if (!user || posts.length === 0) return;
        const checkLikes = async () => {
            const postIds = posts.map(p => p.id);
            const { data } = await supabase
                .from('forum_post_likes')
                .select('post_id')
                .eq('user_id', user.id)
                .in('post_id', postIds);
            if (data) {
                const likedSet = new Set(data.map(d => d.post_id));
                setPosts(prev => prev.map(p => ({ ...p, _liked: likedSet.has(p.id) })));
            }
        };
        checkLikes();
    }, [user, posts.length]);

    // Nếu đang xem chi tiết 1 bài
    if (selectedPost) {
        return (
            <PostDetail
                postId={selectedPost}
                user={user}
                userProfile={userProfile}
                onBack={() => setSelectedPost(null)}
                onLikePost={handleToggleLike}
            />
        );
    }

    return (
        <div className="fm-container">
            {/* Hero */}
            <div className="fm-hero">
                <div className="fm-hero-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-1" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 4H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l4-4h4a2 2 0 002-2V6a2 2 0 00-2-2z" />
                    </svg>
                </div>
                <h1 className="fm-hero-title">Diễn đàn cộng đồng</h1>
                <p className="fm-hero-desc">
                    Đặt câu hỏi, chia sẻ kinh nghiệm và kết nối với cộng đồng y tế
                </p>
            </div>

            {/* Search */}
            <div className="fm-search-bar">
                <svg className="fm-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                    type="text"
                    className="fm-search-input"
                    placeholder="Tìm kiếm bài đăng..."
                    value={searchInput}
                    onChange={(e) => handleSearchInput(e.target.value)}
                />
                {searchInput && (
                    <button className="fm-search-clear" onClick={() => { setSearchInput(''); setSearchTerm(''); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Toolbar */}
            <div className="fm-toolbar">
                <div className="fm-toolbar-left">
                    {/* Create Post Button */}
                    <button
                        className="fm-create-btn"
                        onClick={() => {
                            if (!user) return alert('Vui lòng đăng nhập để đăng bài');
                            setShowCreatePost(true);
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Đăng bài
                    </button>

                    {/* Sort buttons */}
                    <div className="fm-sort-group">
                        {[
                            { key: 'latest', label: 'Mới nhất' },
                            { key: 'popular', label: 'Phổ biến' },
                            { key: 'unanswered', label: 'Chưa trả lời' },
                        ].map(s => (
                            <button
                                key={s.key}
                                className={`fm-sort-btn ${sortBy === s.key ? 'active' : ''}`}
                                onClick={() => setSortBy(s.key)}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filter */}
                <div className="fm-filter-wrap" ref={filterRef}>
                    <button className={`fm-filter-btn ${filterTag ? 'active' : ''}`} onClick={() => setFilterOpen(!filterOpen)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        {filterTag || 'Lọc theo chủ đề'}
                    </button>
                    {filterOpen && (
                        <div className="fm-filter-dropdown">
                            <button
                                className={`fm-filter-option ${!filterTag ? 'active' : ''}`}
                                onClick={() => { setFilterTag(''); setFilterOpen(false); }}
                            >
                                Tất cả chủ đề
                            </button>
                            {TAG_OPTIONS.map(tag => (
                                <button
                                    key={tag}
                                    className={`fm-filter-option ${filterTag === tag ? 'active' : ''}`}
                                    onClick={() => { setFilterTag(tag); setFilterOpen(false); }}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Active filter indicator */}
            {filterTag && (
                <div className="fm-active-filter">
                    <span>Đang lọc: <strong>{filterTag}</strong></span>
                    <button onClick={() => setFilterTag('')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Create Post Modal */}
            {showCreatePost && (
                <CreatePost
                    user={user}
                    tagOptions={TAG_OPTIONS}
                    onClose={() => setShowCreatePost(false)}
                    onCreated={handlePostCreated}
                />
            )}

            {/* Posts Feed */}
            <div className="fm-feed">
                {loading ? (
                    <div className="fm-loading">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="fm-skeleton">
                                <div className="fm-skeleton-header">
                                    <div className="fm-skeleton-avatar" />
                                    <div className="fm-skeleton-lines">
                                        <div className="fm-skeleton-line w40" />
                                        <div className="fm-skeleton-line w20" />
                                    </div>
                                </div>
                                <div className="fm-skeleton-line w80" />
                                <div className="fm-skeleton-line w60" />
                            </div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="fm-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p>Chưa có bài đăng nào</p>
                        <span>Hãy là người đầu tiên đăng bài!</span>
                    </div>
                ) : (
                    posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onClick={() => setSelectedPost(post.id)}
                            onLike={() => handleToggleLike(post.id)}
                            currentUser={user}
                        />
                    ))
                )}

                {/* Infinite scroll trigger */}
                {hasMore && !loading && (
                    <div ref={loadMoreRef} className="fm-load-more">
                        {loadingMore && (
                            <div className="fm-spinner">
                                <div className="fm-spinner-dot" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}