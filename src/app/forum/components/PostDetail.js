"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';

function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}

export default function PostDetail({ postId }) {
    const router = useRouter();
    const supabase = createClient();

    // ===== TỰ FETCH AUTH (không phụ thuộc props) =====
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likedComments, setLikedComments] = useState({});
    const [imgModal, setImgModal] = useState(null);
    const commentInputRef = useRef(null);

    const likingPost = useRef(false);
    const likingComments = useRef({});

    const [commentImages, setCommentImages] = useState([]);
    const commentFileRef = useRef(null);

    // ===== FETCH USER AUTH =====
    useEffect(() => {
        const getAuth = async () => {
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
        getAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    // ===== FETCH POST + COMMENTS =====
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Fetch post
            const { data: postData, error: postErr } = await supabase
                .from('forum_posts')
                .select('*, user_profiles (display_name, avatar_url)')
                .eq('id', postId)
                .single();

            if (postErr) {
                const { data: fb } = await supabase.from('forum_posts').select('*').eq('id', postId).single();
                setPost(fb ? { ...fb, user_profiles: null } : null);
            } else {
                setPost(postData);
            }

            // Tăng view qua API (chống spam F5)
            try {
                fetch('/api/forum-views', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId }),
                });
            } catch (e) { /* bỏ qua */ }

            // Fetch comments
            const { data: cmtData, error: cmtErr } = await supabase
                .from('forum_comments')
                .select('*, user_profiles (display_name, avatar_url)')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (cmtErr) {
                const { data: fb } = await supabase.from('forum_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
                setComments((fb || []).map(c => ({ ...c, user_profiles: null })));
            } else {
                setComments(cmtData || []);
            }

            setLoading(false);
        };
        fetchData();
    }, [postId]);

    // ===== CHECK LIKED khi user sẵn sàng =====
    useEffect(() => {
        if (!user || !post) return;
        const checkLiked = async () => {
            const { data } = await supabase
                .from('forum_post_likes')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', user.id)
                .maybeSingle();
            setLiked(!!data);

            if (comments.length > 0) {
                const { data: cLikes } = await supabase
                    .from('forum_comment_likes')
                    .select('comment_id')
                    .eq('user_id', user.id)
                    .in('comment_id', comments.map(c => c.id));
                if (cLikes) {
                    const map = {};
                    cLikes.forEach(l => { map[l.comment_id] = true; });
                    setLikedComments(map);
                }
            }
        };
        checkLiked();
    }, [user, post, comments.length]);

    // ===== OPTIMISTIC LIKE POST =====
    const togglePostLike = useCallback(async () => {
        if (!user) return alert('Vui lòng đăng nhập');
        if (likingPost.current) return;
        likingPost.current = true;

        const wasLiked = liked;
        const prevCount = post.likes_count || 0;

        setLiked(!wasLiked);
        setPost(p => ({ ...p, likes_count: wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1 }));

        try {
            if (wasLiked) {
                const { error } = await supabase.from('forum_post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('forum_post_likes').insert({ post_id: postId, user_id: user.id });
                if (error) throw error;
            }
        } catch (err) {
            setLiked(wasLiked);
            setPost(p => ({ ...p, likes_count: prevCount }));
        } finally {
            likingPost.current = false;
        }
    }, [liked, post, user, postId]);

    // ===== OPTIMISTIC LIKE COMMENT =====
    const toggleCommentLike = useCallback(async (commentId) => {
        if (!user) return alert('Vui lòng đăng nhập');
        if (likingComments.current[commentId]) return;
        likingComments.current[commentId] = true;

        const wasLiked = !!likedComments[commentId];
        const prev = comments.find(c => c.id === commentId);
        const prevCount = prev?.likes_count || 0;

        setLikedComments(p => ({ ...p, [commentId]: !wasLiked }));
        setComments(p => p.map(c => c.id === commentId ? { ...c, likes_count: wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1 } : c));

        try {
            if (wasLiked) {
                const { error } = await supabase.from('forum_comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('forum_comment_likes').insert({ comment_id: commentId, user_id: user.id });
                if (error) throw error;
            }
        } catch (err) {
            setLikedComments(p => ({ ...p, [commentId]: wasLiked }));
            setComments(p => p.map(c => c.id === commentId ? { ...c, likes_count: prevCount } : c));
        } finally {
            delete likingComments.current[commentId];
        }
    }, [likedComments, comments, user]);

    // ===== IMAGE PROCESSING =====
    const processImage = (file) => {
        return new Promise((resolve, reject) => {
            if (file.size > 5 * 1024 * 1024) { reject(new Error('Ảnh quá lớn')); return; }
            const img = new Image();
            const canvas = document.createElement('canvas');
            img.onload = () => {
                let { width, height } = img;
                const max = 800;
                if (width > max || height > max) {
                    const r = Math.min(max / width, max / height);
                    width = Math.round(width * r);
                    height = Math.round(height * r);
                }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Lỗi')), 'image/webp', 0.8);
            };
            img.onerror = () => reject(new Error('Lỗi'));
            img.src = URL.createObjectURL(file);
        });
    };

    const handleCommentImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        try {
            const blob = await processImage(file);
            setCommentImages([{ blob, preview: URL.createObjectURL(blob) }]);
        } catch (err) { alert(err.message); }
        if (commentFileRef.current) commentFileRef.current.value = '';
    };

    // ===== SUBMIT COMMENT =====
    const handleSubmitComment = async () => {
        if (!user) return alert('Vui lòng đăng nhập để bình luận');
        if (!commentText.trim() && commentImages.length === 0) return;

        setSubmitting(true);
        try {
            let imageUrls = [];
            for (const img of commentImages) {
                const fileName = `${user.id}/${Date.now()}_cmt.webp`;
                const { error: upErr } = await supabase.storage.from('forum-images').upload(fileName, img.blob, { contentType: 'image/webp', cacheControl: '31536000' });
                if (!upErr) {
                    const { data: { publicUrl } } = supabase.storage.from('forum-images').getPublicUrl(fileName);
                    imageUrls.push(publicUrl);
                }
            }

            const { data: newComment, error } = await supabase
                .from('forum_comments')
                .insert({ post_id: postId, user_id: user.id, parent_id: replyTo?.id || null, content: commentText.trim(), images: imageUrls })
                .select('*, user_profiles (display_name, avatar_url)')
                .single();

            if (error) {
                // Fallback
                const { data: fb } = await supabase
                    .from('forum_comments').select('*')
                    .eq('post_id', postId).eq('user_id', user.id)
                    .order('created_at', { ascending: false }).limit(1).single();
                if (fb) setComments(prev => [...prev, { ...fb, user_profiles: userProfile || null }]);
            } else {
                setComments(prev => [...prev, newComment]);
            }

            setCommentText('');
            setReplyTo(null);
            commentImages.forEach(img => URL.revokeObjectURL(img.preview));
            setCommentImages([]);
            setPost(p => ({ ...p, comments_count: (p.comments_count || 0) + 1 }));
        } catch (err) {
            console.error('Error posting comment:', err);
            alert('Lỗi khi gửi bình luận');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = (comment) => {
        const name = comment.user_profiles?.display_name || 'Ẩn danh';
        setReplyTo({ id: comment.id, authorName: name });
        commentInputRef.current?.focus();
    };

    // ===== NESTED COMMENTS =====
    const buildTree = (list) => {
        const map = {};
        const roots = [];
        list.forEach(c => { map[c.id] = { ...c, children: [] }; });
        list.forEach(c => {
            if (c.parent_id && map[c.parent_id]) map[c.parent_id].children.push(map[c.id]);
            else roots.push(map[c.id]);
        });
        return roots;
    };

    const renderComment = (comment, depth = 0) => {
        const profile = comment.user_profiles || {};
        const name = profile.display_name || 'Ẩn danh';
        const avatar = profile.avatar_url;

        return (
            <div key={comment.id} className="fm-comment" style={{ marginLeft: Math.min(depth, 3) * 24 }}>
                <div className="fm-comment-inner">
                    <div className="fm-comment-avatar">
                        {avatar ? <img src={avatar} alt="" /> : <span>{name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="fm-comment-body">
                        <div className="fm-comment-bubble">
                            <span className="fm-comment-author">{name}</span>
                            {comment.parent_id && (
                                <span className="fm-comment-reply-to">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 00-4-4H4" /></svg>
                                </span>
                            )}
                            <p className="fm-comment-text">{comment.content}</p>
                            {comment.images && comment.images.length > 0 && (
                                <div className="fm-comment-images">
                                    {comment.images.map((url, i) => (
                                        <img key={i} src={url} alt="" className="fm-comment-img" onClick={() => setImgModal(url)} loading="lazy" />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="fm-comment-actions">
                            <button className={`fm-comment-action ${likedComments[comment.id] ? 'liked' : ''}`} onClick={() => toggleCommentLike(comment.id)}>
                                Thích{comment.likes_count > 0 ? ` (${comment.likes_count})` : ''}
                            </button>
                            <button className="fm-comment-action" onClick={() => handleReply(comment)}>Trả lời</button>
                            <span className="fm-comment-time" suppressHydrationWarning>{timeAgo(comment.created_at)}</span>
                        </div>
                    </div>
                </div>
                {comment.children?.map(child => renderComment(child, depth + 1))}
            </div>
        );
    };

    // ===== RENDER =====
    if (loading) {
        return (
            <div className="fm-container">
                <div className="fm-detail-loading"><div className="fm-spinner"><div className="fm-spinner-dot" /></div><p>Đang tải...</p></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="fm-container">
                <p>Không tìm thấy bài đăng</p>
                <button className="fm-back-btn" onClick={() => router.push('/forum')}>Quay lại</button>
            </div>
        );
    }

    const postProfile = post.user_profiles || {};
    const postName = postProfile.display_name || 'Ẩn danh';
    const postAvatar = postProfile.avatar_url;
    const commentTree = buildTree(comments);

    return (
        <div className="fm-container">
            <button className="fm-back-btn" onClick={() => router.push('/forum')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" /></svg>
                Quay lại diễn đàn
            </button>

            <div className="fm-detail-card">
                <div className="fm-post-header">
                    <div className="fm-post-avatar">
                        {postAvatar ? <img src={postAvatar} alt="" /> : <span>{postName.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="fm-post-meta">
                        <span className="fm-post-author">{postName}</span>
                        <span className="fm-post-time" suppressHydrationWarning>{timeAgo(post.created_at)}</span>
                    </div>
                    {post.is_resolved && (
                        <div className="fm-resolved-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            Đã giải quyết
                        </div>
                    )}
                </div>

                <h2 className="fm-detail-title">{post.title}</h2>
                <div className="fm-detail-content">{post.content}</div>

                {post.images && post.images.length > 0 && (
                    <div className="fm-detail-images">
                        {post.images.map((url, i) => <img key={i} src={url} alt="" className="fm-detail-img" onClick={() => setImgModal(url)} loading="lazy" />)}
                    </div>
                )}

                {post.tags?.length > 0 && (
                    <div className="fm-post-tags">
                        {post.tags.map(tag => <span key={tag} className="fm-post-tag">{tag}</span>)}
                    </div>
                )}

                <div className="fm-detail-actions">
                    <button className={`fm-action-btn ${liked ? 'liked' : ''}`} onClick={togglePostLike}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={liked ? 'fm-like-pop' : ''}>
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {post.likes_count || 0} Thích
                    </button>
                    <span className="fm-action-btn disabled">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                        {post.comments_count || 0} Bình luận
                    </span>
                    <span className="fm-action-btn disabled">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        {post.views_count || 0} Lượt xem
                    </span>
                </div>
            </div>

            {/* Comments */}
            <div className="fm-comments-section">
                <h3 className="fm-comments-title">Bình luận ({comments.length})</h3>

                {commentTree.map(c => renderComment(c, 0))}

                {comments.length === 0 && <p className="fm-no-comments">Chưa có bình luận nào. Hãy là người đầu tiên!</p>}

                <div className="fm-comment-input-wrap">
                    {replyTo && (
                        <div className="fm-reply-indicator">
                            <span>Đang trả lời <strong>{replyTo.authorName}</strong></span>
                            <button onClick={() => setReplyTo(null)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                    )}

                    {commentImages.length > 0 && (
                        <div className="fm-comment-img-preview">
                            {commentImages.map((img, i) => (
                                <div key={i} className="fm-comment-img-thumb">
                                    <img src={img.preview} alt="" />
                                    <button onClick={() => { URL.revokeObjectURL(img.preview); setCommentImages([]); }}>×</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="fm-comment-input-row">
                        <div className="fm-comment-input-avatar">
                            {userProfile?.avatar_url ? (
                                <img src={userProfile.avatar_url} alt="" />
                            ) : (
                                <span>{user ? (userProfile?.display_name || user.email || '?').charAt(0).toUpperCase() : '?'}</span>
                            )}
                        </div>
                        <div className="fm-comment-input-field">
                            <textarea
                                ref={commentInputRef}
                                className="fm-comment-textarea"
                                placeholder={user ? "Viết bình luận..." : "Đăng nhập để bình luận"}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                rows={2}
                                disabled={!user}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                            />
                            <div className="fm-comment-input-actions">
                                <button className="fm-comment-img-btn" onClick={() => commentFileRef.current?.click()} disabled={!user} title="Đính kèm ảnh">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                                </button>
                                <input ref={commentFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCommentImage} />
                                <button className="fm-comment-send" onClick={handleSubmitComment} disabled={submitting || (!commentText.trim() && commentImages.length === 0)}>
                                    {submitting ? <span className="fm-btn-spinner" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {imgModal && (
                <div className="fm-img-modal" onClick={() => setImgModal(null)}>
                    <img src={imgModal} alt="" />
                    <button className="fm-img-modal-close"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                </div>
            )}
        </div>
    );
}