'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../utils/supabase/client';
import { createSlugWithId } from '../../lib/slugify';
import './Profile.css';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const AVATAR_DIMENSION = 256; // resize to 256x256

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef(null);

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [activeTab, setActiveTab] = useState('general');

    // Profile data
    const [profile, setProfile] = useState({
        display_name: '',
        avatar_url: '',
        age: '',
        gender: '',
        medical_history: '',
        medications_allergies: '',
    });

    // Bookmarks
    const [bookmarks, setBookmarks] = useState([]);
    const [bookmarksLoading, setBookmarksLoading] = useState(false);

    // Auth check + load profile
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/signin'); return; }
            setUser(user);
            await loadProfile(user.id);
            setLoading(false);
        };
        init();
    }, []);

    // Load bookmarks when tab switches
    useEffect(() => {
        if (activeTab === 'bookmarks' && user && bookmarks.length === 0) {
            loadBookmarks(user.id);
        }
    }, [activeTab, user]);

    const loadProfile = async (userId) => {
        const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            setProfile({
                display_name: data.display_name || '',
                avatar_url: data.avatar_url || '',
                age: data.age || '',
                gender: data.gender || '',
                medical_history: data.medical_history || '',
                medications_allergies: data.medications_allergies || '',
            });
        }
    };

    const loadBookmarks = async (userId) => {
        setBookmarksLoading(true);
        const { data } = await supabase
            .from('article_bookmarks')
            .select('article_id, created_at, articles(id, title, institution, date, description)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (data) {
            setBookmarks(data.map(b => ({ ...b.articles, bookmarked_at: b.created_at })).filter(Boolean));
        }
        setBookmarksLoading(false);
    };

    const removeBookmark = async (articleId) => {
        await supabase.from('article_bookmarks').delete()
            .eq('user_id', user.id).eq('article_id', articleId);
        setBookmarks(prev => prev.filter(b => b.id !== articleId));
    };

    // === AVATAR UPLOAD with RESIZE ===
    const resizeImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = AVATAR_DIMENSION;
                    canvas.height = AVATAR_DIMENSION;
                    const ctx = canvas.getContext('2d');

                    // Crop center square
                    const size = Math.min(img.width, img.height);
                    const sx = (img.width - size) / 2;
                    const sy = (img.height - size) / 2;
                    ctx.drawImage(img, sx, sy, size, size, 0, 0, AVATAR_DIMENSION, AVATAR_DIMENSION);

                    canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.85);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_AVATAR_SIZE) {
            alert('Ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB.');
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file ảnh.');
            return;
        }

        setUploadingAvatar(true);
        try {
            const resized = await resizeImage(file);
            const filePath = `${user.id}/avatar.webp`;

            // Upload
            const { error: uploadErr } = await supabase.storage
                .from('avatars')
                .upload(filePath, resized, { upsert: true, contentType: 'image/webp' });

            if (uploadErr) throw uploadErr;

            // Get public URL
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

            setProfile(p => ({ ...p, avatar_url: avatarUrl }));

            // Save to profile
            await supabase.from('user_profiles').upsert({
                id: user.id,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
            });
        } catch (err) {
            console.error('Upload error:', err);
            alert('Không thể tải ảnh lên. Vui lòng thử lại.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // === SAVE PROFILE ===
    const handleSave = async () => {
        setSaving(true);
        setSaveMsg('');

        try {
            const { error } = await supabase.from('user_profiles').upsert({
                id: user.id,
                display_name: profile.display_name || null,
                avatar_url: profile.avatar_url || null,
                age: profile.age ? parseInt(profile.age) : null,
                gender: profile.gender || null,
                medical_history: profile.medical_history || null,
                medications_allergies: profile.medications_allergies || null,
                updated_at: new Date().toISOString(),
            });

            if (error) throw error;
            setSaveMsg('success');
            setTimeout(() => setSaveMsg(''), 3000);
        } catch (err) {
            console.error('Save error:', err);
            setSaveMsg('error');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field, value) => {
        setProfile(p => ({ ...p, [field]: value }));
    };

    // Display helpers
    const getAvatarDisplay = () => {
        if (profile.avatar_url) return { type: 'image', src: profile.avatar_url };
        const email = user?.email || '';
        return { type: 'initial', letter: email.charAt(0).toUpperCase() };
    };

    if (loading) {
        return (
            <div className="pf-container">
                <div className="pf-loading">
                    <div className="pf-spinner"></div>
                    <span>Đang tải hồ sơ...</span>
                </div>
            </div>
        );
    }

    const avatar = getAvatarDisplay();

    const tabs = [
        {
            key: 'general', label: 'Thông tin chung', icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            )
        },
        {
            key: 'tests', label: 'Xét nghiệm', icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            )
        },
        {
            key: 'treatments', label: 'Phác đồ điều trị', icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            )
        },
        {
            key: 'bookmarks', label: 'Bài viết đã lưu', icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
            )
        },
    ];

    return (
        <div className="pf-container">
            {/* Header */}
            <div className="pf-header">
                <div className="pf-header-top">
                    {/* Avatar */}
                    <div className="pf-avatar-section">
                        <div className="pf-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
                            {avatar.type === 'image' ? (
                                <img src={avatar.src} alt="Avatar" className="pf-avatar-img" />
                            ) : (
                                <div className="pf-avatar-initial">{avatar.letter}</div>
                            )}
                            <div className="pf-avatar-overlay">
                                {uploadingAvatar ? (
                                    <div className="pf-spinner-sm"></div>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <circle cx="12" cy="13" r="3" />
                                    </svg>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="pf-header-info">
                        <h1 className="pf-header-name">{profile.display_name || user?.email?.split('@')[0] || 'Người dùng'}</h1>
                        <p className="pf-header-email">{user?.email}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="pf-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`pf-tab ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="pf-content">
                {/* === TAB: THÔNG TIN CHUNG === */}
                {activeTab === 'general' && (
                    <div className="pf-section-wrap">
                        {/* Thông tin cá nhân */}
                        <section className="pf-section">
                            <div className="pf-section-header">
                                <h2 className="pf-section-title">Thông tin cá nhân</h2>
                                <p className="pf-section-desc">Thông tin hiển thị trên hồ sơ của bạn</p>
                            </div>

                            <div className="pf-form-grid">
                                <div className="pf-field">
                                    <label className="pf-label">Tên hiển thị</label>
                                    <input
                                        type="text"
                                        className="pf-input"
                                        placeholder="Nhập tên hiển thị..."
                                        value={profile.display_name}
                                        onChange={(e) => updateField('display_name', e.target.value)}
                                        maxLength={50}
                                    />
                                    <span className="pf-hint">Tên này sẽ hiển thị công khai thay cho email</span>
                                </div>

                                <div className="pf-field-row">
                                    <div className="pf-field">
                                        <label className="pf-label">Tuổi</label>
                                        <input
                                            type="number"
                                            className="pf-input"
                                            placeholder="VD: 30"
                                            value={profile.age}
                                            onChange={(e) => updateField('age', e.target.value)}
                                            min="1"
                                            max="120"
                                        />
                                    </div>
                                    <div className="pf-field">
                                        <label className="pf-label">Giới tính</label>
                                        <div className="pf-radio-group">
                                            {[
                                                { value: 'male', label: 'Nam' },
                                                { value: 'female', label: 'Nữ' },
                                                { value: 'other', label: 'Khác' },
                                            ].map(opt => (
                                                <label key={opt.value} className={`pf-radio-card ${profile.gender === opt.value ? 'active' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        name="gender"
                                                        value={opt.value}
                                                        checked={profile.gender === opt.value}
                                                        onChange={(e) => updateField('gender', e.target.value)}
                                                    />
                                                    <span>{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Thông tin y tế */}
                        <section className="pf-section">
                            <div className="pf-section-header">
                                <h2 className="pf-section-title">Thông tin y tế</h2>
                                <p className="pf-section-desc">Giúp chúng tôi đề xuất nội dung phù hợp hơn với bạn</p>
                            </div>

                            <div className="pf-medical-notice">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Thông tin y tế của bạn được bảo mật tuyệt đối và chỉ bạn mới có quyền xem.
                            </div>

                            <div className="pf-form-grid">
                                <div className="pf-field">
                                    <label className="pf-label">
                                        Tiền sử bệnh lý
                                        <span className="pf-label-optional">Tùy chọn</span>
                                    </label>
                                    <textarea
                                        className="pf-textarea"
                                        rows="3"
                                        placeholder="VD: Tiểu đường type 2, huyết áp cao, đang điều trị từ 2020..."
                                        value={profile.medical_history}
                                        onChange={(e) => updateField('medical_history', e.target.value)}
                                        maxLength={1000}
                                    />
                                    <span className="pf-hint">Bạn có đang điều trị bệnh mãn tính nào không? (tiểu đường, huyết áp, tim mạch...)</span>
                                </div>

                                <div className="pf-field">
                                    <label className="pf-label">
                                        Thuốc đang dùng &amp; Dị ứng
                                        <span className="pf-label-optional">Tùy chọn</span>
                                    </label>
                                    <textarea
                                        className="pf-textarea"
                                        rows="3"
                                        placeholder="VD: Đang dùng Metformin 500mg. Dị ứng Penicillin..."
                                        value={profile.medications_allergies}
                                        onChange={(e) => updateField('medications_allergies', e.target.value)}
                                        maxLength={1000}
                                    />
                                    <span className="pf-hint">Bạn có đang dùng thuốc gì hay dị ứng với thành phần nào không?</span>
                                </div>
                            </div>
                        </section>

                        {/* Save button */}
                        <div className="pf-save-bar">
                            {saveMsg === 'success' && (
                                <span className="pf-save-msg success">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Đã lưu thành công
                                </span>
                            )}
                            {saveMsg === 'error' && (
                                <span className="pf-save-msg error">Có lỗi xảy ra. Vui lòng thử lại.</span>
                            )}
                            <button className="pf-save-btn" onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <><div className="pf-spinner-sm"></div> Đang lưu...</>
                                ) : (
                                    'Lưu thay đổi'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* === TAB: XÉT NGHIỆM === */}
                {activeTab === 'tests' && (
                    <div className="pf-empty-tab">
                        <div className="pf-empty-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <h3 className="pf-empty-title">Kết quả xét nghiệm</h3>
                        <p className="pf-empty-desc">Tính năng đang được phát triển. Bạn sẽ có thể lưu trữ và theo dõi các kết quả xét nghiệm tại đây.</p>
                        <span className="pf-coming-badge">Sắp ra mắt</span>
                    </div>
                )}

                {/* === TAB: PHÁC ĐỒ ĐIỀU TRỊ === */}
                {activeTab === 'treatments' && (
                    <div className="pf-empty-tab">
                        <div className="pf-empty-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h3 className="pf-empty-title">Phác đồ điều trị</h3>
                        <p className="pf-empty-desc">Tính năng đang được phát triển. Bạn sẽ có thể theo dõi các phác đồ điều trị gần đây tại đây.</p>
                        <span className="pf-coming-badge">Sắp ra mắt</span>
                    </div>
                )}

                {/* === TAB: BÀI VIẾT ĐÃ LƯU === */}
                {activeTab === 'bookmarks' && (
                    <div className="pf-bookmarks">
                        {bookmarksLoading ? (
                            <div className="pf-loading-sm">
                                <div className="pf-spinner"></div>
                            </div>
                        ) : bookmarks.length === 0 ? (
                            <div className="pf-empty-tab">
                                <div className="pf-empty-icon">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                </div>
                                <h3 className="pf-empty-title">Chưa có bài viết nào được lưu</h3>
                                <p className="pf-empty-desc">Khi đọc bài viết, nhấn nút "Lưu" để đánh dấu và xem lại tại đây.</p>
                                <Link href="/" className="pf-empty-btn">Khám phá bài viết</Link>
                            </div>
                        ) : (
                            <div className="pf-bookmark-list">
                                {bookmarks.map(article => (
                                    <div key={article.id} className="pf-bookmark-card">
                                        <Link href={`/news/${createSlugWithId(article.title, article.id)}`} className="pf-bookmark-body">
                                            <h4 className="pf-bookmark-title">{article.title}</h4>
                                            <p className="pf-bookmark-desc">{article.description}</p>
                                            <div className="pf-bookmark-meta">
                                                <span>{article.institution}</span>
                                                <span>·</span>
                                                <span>{new Date(article.date).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        </Link>
                                        <button className="pf-bookmark-remove" onClick={() => removeBookmark(article.id)} title="Bỏ lưu">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}