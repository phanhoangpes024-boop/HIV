"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '../../utils/supabase/client';
import CreatePost from './components/CreatePost';
import PostCard from './components/PostCard';
import './Forum.css';

const POSTS_PER_PAGE = 10;

const TAG_OPTIONS = [
    'HIV/AIDS', 'Viêm gan', 'Lao phổi', 'COVID-19', 'Sốt xuất huyết',
    'STIs', 'Sốt rét', 'Cúm', 'Tiêm chủng', 'Dinh dưỡng',
    'Sức khỏe tâm thần', 'Hỏi bác sĩ', 'Chia sẻ kinh nghiệm', 'Thuốc & điều trị', 'Khác'
];

export default function ForumClient({ initialPosts = [] }) {
    const supabase = createClient();
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [posts, setPosts] = useState(initialPosts);
    const [loading, setLoading] = useState(initialPosts.length === 0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialPosts.length >= POSTS_PER_PAGE);
    const [page, setPage] = useState(0);

    const [sortBy, setSortBy] = useState('latest');
    const [filterTag, setFilterTag] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const searchTimeout = useRef(null);

    const [showCreatePost, setShowCreatePost] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef(null);
    const observerRef = useRef(null);
    const loadMoreRef = useRef(null);
    const likingPosts = useRef({});

    // ===== AUTH =====
    useEffect(() => {
        const init = async () => {
            const { data: { user: u } } = await supabase.auth.getUser();
            setUser(u);
            if (u) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('display_name, avatar_url')
                    .eq('id', u.id)
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

    // ===== CHECK LIKED khi user login =====
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
    }, [user]);

    // Close filter dropdown
    useEffect(() => {
        const handler = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ===== FETCH POSTS =====
    const fetchPosts = useCallback(async (pageNum = 0, append = false) => {
        if (!append) {
            if (pageNum === 0 && initialPosts.length > 0 && !filterTag && !searchTerm && sortBy === 'latest') return;
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            let query = supabase
                .from('forum_posts')
                .select('*, user_profiles (display_name, avatar_url)')
                .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

            if (sortBy === 'latest') query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
            else if (sortBy === 'popular') query = query.order('likes_count', { ascending: false });
            else if (sortBy === 'unanswered') query = query.eq('comments_count', 0).order('created_at', { ascending: false });

            if (filterTag) query = query.contains('tags', [filterTag]);
            if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);

            const { data, error } = await query;
            if (error) { console.error('Supabase error:', error.message); return; }

            let result = data || [];
            if (user && result.length > 0) {
                const { data: likes } = await supabase
                    .from('forum_post_likes')
                    .select('post_id')
                    .eq('user_id', user.id)
                    .in('post_id', result.map(p => p.id));
                if (likes) {
                    const s = new Set(likes.map(l => l.post_id));
                    result = result.map(p => ({ ...p, _liked: s.has(p.id) }));
                }
            }

            if (append) setPosts(prev => [...prev, ...result]);
            else setPosts(result);
            setHasMore(result.length === POSTS_PER_PAGE);
        } catch (err) {
            console.error('Error fetching posts:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [sortBy, filterTag, searchTerm, initialPosts.length, user]);

    useEffect(() => {
        if (page === 0 && initialPosts.length > 0 && !filterTag && !searchTerm && sortBy === 'latest') return;
        setPage(0);
        fetchPosts(0, false);
    }, [sortBy, filterTag, searchTerm, fetchPosts]);

    // Infinite scroll
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                const next = page + 1;
                setPage(next);
                fetchPosts(next, true);
            }
        }, { threshold: 0.1 });
        if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
        return () => observerRef.current?.disconnect();
    }, [hasMore, loadingMore, loading, page, fetchPosts]);

    // Debounce search
    const handleSearchInput = (val) => {
        setSearchInput(val);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => setSearchTerm(val.trim()), 400);
    };

    // ===== OPTIMISTIC LIKE =====
    const handleToggleLike = async (postId) => {
        if (!user) return alert('Vui lòng đăng nhập để thích bài viết');
        if (likingPosts.current[postId]) return;
        likingPosts.current[postId] = true;

        const post = posts.find(p => p.id === postId);
        if (!post) { delete likingPosts.current[postId]; return; }

        const wasLiked = !!post._liked;
        const prevCount = post.likes_count || 0;

        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, _liked: !wasLiked, likes_count: wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1 } : p
        ));

        try {
            if (wasLiked) {
                const { error } = await supabase.from('forum_post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('forum_post_likes').insert({ post_id: postId, user_id: user.id });
                if (error) throw error;
            }
        } catch (err) {
            console.error('Lỗi like:', err);
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, _liked: wasLiked, likes_count: prevCount } : p));
        } finally {
            delete likingPosts.current[postId];
        }
    };

    const handlePostCreated = (newPost) => {
        const enriched = { ...newPost, user_profiles: userProfile || { display_name: user?.email, avatar_url: null }, _liked: false };
        setPosts(prev => [enriched, ...prev]);
        setShowCreatePost(false);
    };

    return (
        <div className="fm-container">
            <div className="fm-hero">

                <h1 className="fm-hero-title">Diễn đàn cộng đồng</h1>
                <p className="fm-hero-desc">Đặt câu hỏi, chia sẻ kinh nghiệm và kết nối với cộng đồng y tế</p>
            </div>

            <div className="fm-search-bar">
                <svg className="fm-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
                <input type="text" className="fm-search-input" placeholder="Tìm kiếm bài đăng..." value={searchInput} onChange={(e) => handleSearchInput(e.target.value)} />
                {searchInput && (
                    <button className="fm-search-clear" onClick={() => { setSearchInput(''); setSearchTerm(''); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                )}
            </div>

            <div className="fm-toolbar">
                <div className="fm-toolbar-left">
                    <button className="fm-create-btn" onClick={() => { if (!user) return alert('Vui lòng đăng nhập để đăng bài'); setShowCreatePost(true); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Đăng bài
                    </button>
                    <div className="fm-sort-group">
                        {[{ key: 'latest', label: 'Mới nhất' }, { key: 'popular', label: 'Phổ biến' }, { key: 'unanswered', label: 'Chưa trả lời' }].map(s => (
                            <button key={s.key} className={`fm-sort-btn ${sortBy === s.key ? 'active' : ''}`} onClick={() => setSortBy(s.key)}>{s.label}</button>
                        ))}
                    </div>
                </div>
                <div className="fm-filter-wrap" ref={filterRef}>
                    <button className={`fm-filter-btn ${filterTag ? 'active' : ''}`} onClick={() => setFilterOpen(!filterOpen)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                        {filterTag || 'Lọc theo chủ đề'}
                    </button>
                    {filterOpen && (
                        <div className="fm-filter-dropdown">
                            <button className={`fm-filter-option ${!filterTag ? 'active' : ''}`} onClick={() => { setFilterTag(''); setFilterOpen(false); }}>Tất cả chủ đề</button>
                            {TAG_OPTIONS.map(tag => (
                                <button key={tag} className={`fm-filter-option ${filterTag === tag ? 'active' : ''}`} onClick={() => { setFilterTag(tag); setFilterOpen(false); }}>{tag}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {filterTag && (
                <div className="fm-active-filter">
                    <span>Đang lọc: <strong>{filterTag}</strong></span>
                    <button onClick={() => setFilterTag('')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                </div>
            )}

            {showCreatePost && <CreatePost user={user} tagOptions={TAG_OPTIONS} onClose={() => setShowCreatePost(false)} onCreated={handlePostCreated} />}

            <div className="fm-feed">
                {loading ? (
                    <div className="fm-loading">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="fm-skeleton"><div className="fm-skeleton-header"><div className="fm-skeleton-avatar" /><div className="fm-skeleton-lines"><div className="fm-skeleton-line w40" /><div className="fm-skeleton-line w20" /></div></div><div className="fm-skeleton-line w80" /><div className="fm-skeleton-line w60" /></div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="fm-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <p>Chưa có bài đăng nào</p>
                        <span>Hãy là người đầu tiên đăng bài!</span>
                    </div>
                ) : posts.map(post => <PostCard key={post.id} post={post} onLike={() => handleToggleLike(post.id)} currentUser={user} />)}
                {hasMore && !loading && <div ref={loadMoreRef} className="fm-load-more">{loadingMore && <div className="fm-spinner"><div className="fm-spinner-dot" /></div>}</div>}
            </div>
        </div>
    );
}