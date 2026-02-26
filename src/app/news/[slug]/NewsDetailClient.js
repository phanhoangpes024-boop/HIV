'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';

export default function NewsDetailClient({ articleId, views, likes, dateFormatted }) {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarkLoading, setBookmarkLoading] = useState(false);
    const [shareMsg, setShareMsg] = useState('');
    const viewTracked = useRef(false);

    // Lấy user + check bookmark
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const { data } = await supabase
                    .from('article_bookmarks')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('article_id', articleId)
                    .limit(1);
                if (data && data.length > 0) setIsBookmarked(true);
            }
        };
        init();
    }, [articleId]);

    // Ghi nhận lượt xem — chỉ 1 lần duy nhất mỗi lần vào trang
    useEffect(() => {
        if (viewTracked.current) return;
        viewTracked.current = true;

        // Thêm kiểm tra sessionStorage để tránh đếm khi quay lại trang
        const viewKey = `viewed_${articleId}`;
        const lastViewed = sessionStorage.getItem(viewKey);
        const now = Date.now();

        // Nếu đã xem trong 30 phút gần đây (client-side check)
        if (lastViewed && now - parseInt(lastViewed) < 30 * 60 * 1000) return;

        sessionStorage.setItem(viewKey, now.toString());

        // Gọi API (server sẽ kiểm tra thêm bằng IP)
        fetch('/api/views', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleId }),
        }).catch(() => { });
    }, [articleId]);

    // Toggle bookmark
    const toggleBookmark = async () => {
        if (!user) { router.push('/signin'); return; }
        setBookmarkLoading(true);

        try {
            if (isBookmarked) {
                await supabase
                    .from('article_bookmarks')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('article_id', articleId);
                setIsBookmarked(false);
            } else {
                await supabase
                    .from('article_bookmarks')
                    .insert({ user_id: user.id, article_id: articleId });
                setIsBookmarked(true);
            }
        } catch (err) {
            console.error('Bookmark error:', err);
        } finally {
            setBookmarkLoading(false);
        }
    };

    // Chia sẻ
    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: document.title, url });
            } catch { }
        } else {
            await navigator.clipboard.writeText(url);
            setShareMsg('Đã sao chép liên kết!');
            setTimeout(() => setShareMsg(''), 2000);
        }
    };

    return (
        <aside className="nd-sidebar">
            <div className="nd-sidebar-sticky">
                {/* Actions */}
                <div className="nd-sidebar-section">
                    <h3 className="nd-sidebar-title">Hành động</h3>
                    <div className="nd-sidebar-actions">
                        <button className="nd-sidebar-btn" onClick={handleShare} title="Chia sẻ">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                            {shareMsg || 'Chia sẻ'}
                        </button>

                        <button
                            className={`nd-sidebar-btn ${isBookmarked ? 'active' : ''}`}
                            onClick={toggleBookmark}
                            disabled={bookmarkLoading}
                            title="Lưu bài viết"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            {isBookmarked ? 'Đã lưu' : 'Lưu bài viết'}
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="nd-sidebar-section">
                    <h3 className="nd-sidebar-title">Thông tin bài viết</h3>
                    <dl className="nd-sidebar-info">
                        <div className="nd-info-row">
                            <dt>Lượt xem</dt>
                            <dd>{views?.toLocaleString()}</dd>
                        </div>
                        <div className="nd-info-row">
                            <dt>Lượt thích</dt>
                            <dd>{likes}</dd>
                        </div>
                        <div className="nd-info-row">
                            <dt>Xuất bản</dt>
                            <dd>{dateFormatted}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </aside>
    );
}