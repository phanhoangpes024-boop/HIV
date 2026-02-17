"use client";

import { useState } from 'react';

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

export default function PostCard({ post, onClick, onLike, currentUser }) {
    const [imgModal, setImgModal] = useState(null);
    const profile = post.user_profiles || {};
    const avatarUrl = profile.avatar_url;
    const displayName = profile.display_name || 'Ẩn danh';
    const initial = displayName.charAt(0).toUpperCase();

    // Rút gọn nội dung
    const maxLen = 250;
    const shortContent = post.content.length > maxLen
        ? post.content.substring(0, maxLen) + '...'
        : post.content;

    return (
        <>
            <div className="fm-post-card" onClick={onClick}>
                {/* Pinned badge */}
                {post.is_pinned && (
                    <div className="fm-pinned-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                        Ghim
                    </div>
                )}

                {/* Header */}
                <div className="fm-post-header">
                    <div className="fm-post-avatar">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" />
                        ) : (
                            <span>{initial}</span>
                        )}
                    </div>
                    <div className="fm-post-meta">
                        <span className="fm-post-author">{displayName}</span>
                        <span className="fm-post-time">{timeAgo(post.created_at)}</span>
                    </div>
                    {post.is_resolved && (
                        <div className="fm-resolved-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Đã giải quyết
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="fm-post-title">{post.title}</h3>

                {/* Content preview */}
                <p className="fm-post-content">{shortContent}</p>

                {/* Images preview */}
                {post.images && post.images.length > 0 && (
                    <div className={`fm-post-images count-${Math.min(post.images.length, 4)}`}>
                        {post.images.slice(0, 4).map((url, idx) => (
                            <div
                                key={idx}
                                className="fm-post-img-wrap"
                                onClick={(e) => { e.stopPropagation(); setImgModal(url); }}
                            >
                                <img src={url} alt="" loading="lazy" />
                                {idx === 3 && post.images.length > 4 && (
                                    <div className="fm-post-img-more">+{post.images.length - 4}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                    <div className="fm-post-tags">
                        {post.tags.map(tag => (
                            <span key={tag} className="fm-post-tag">{tag}</span>
                        ))}
                    </div>
                )}

                {/* Footer actions */}
                <div className="fm-post-footer" onClick={(e) => e.stopPropagation()}>
                    <button
                        className={`fm-action-btn ${post._liked ? 'liked' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onLike(); }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={post._liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{post.likes_count || 0}</span>
                    </button>

                    <button className="fm-action-btn" onClick={onClick}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        <span>{post.comments_count || 0}</span>
                    </button>

                    <button className="fm-action-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>{post.views_count || 0}</span>
                    </button>
                </div>
            </div>

            {/* Image Modal */}
            {imgModal && (
                <div className="fm-img-modal" onClick={() => setImgModal(null)}>
                    <img src={imgModal} alt="" />
                    <button className="fm-img-modal-close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}
        </>
    );
}