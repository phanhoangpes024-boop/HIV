"use client";

import { useState, useRef } from 'react';
import { createClient } from '../../../utils/supabase/client';

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const RESIZE_MAX_WIDTH = 1200;
const RESIZE_MAX_HEIGHT = 1200;

export default function CreatePost({ user, tagOptions, onClose, onCreated }) {
    const supabase = createClient();
    const fileInputRef = useRef(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [images, setImages] = useState([]); // { file, preview, uploading }
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Resize và convert sang WebP
    const processImage = (file) => {
        return new Promise((resolve, reject) => {
            // Kiểm tra kích thước
            if (file.size > MAX_IMAGE_SIZE) {
                reject(new Error(`Ảnh "${file.name}" quá lớn (tối đa 5MB)`));
                return;
            }

            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                let { width, height } = img;

                // Resize nếu cần
                if (width > RESIZE_MAX_WIDTH || height > RESIZE_MAX_HEIGHT) {
                    const ratio = Math.min(RESIZE_MAX_WIDTH / width, RESIZE_MAX_HEIGHT / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convert sang WebP
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Không thể chuyển đổi ảnh'));
                        }
                    },
                    'image/webp',
                    0.82 // Quality 82%
                );
            };

            img.onerror = () => reject(new Error('Không đọc được ảnh'));
            img.src = URL.createObjectURL(file);
        });
    };

    const handleImageSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        if (images.length + files.length > MAX_IMAGES) {
            setError(`Tối đa ${MAX_IMAGES} ảnh`);
            return;
        }

        setError('');

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                setError('Chỉ chấp nhận file ảnh');
                continue;
            }

            try {
                const webpBlob = await processImage(file);
                const preview = URL.createObjectURL(webpBlob);
                setImages(prev => [...prev, { blob: webpBlob, preview, name: file.name }]);
            } catch (err) {
                setError(err.message);
            }
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (idx) => {
        setImages(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[idx].preview);
            updated.splice(idx, 1);
            return updated;
        });
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSubmit = async () => {
        if (!title.trim()) return setError('Vui lòng nhập tiêu đề');
        if (!content.trim()) return setError('Vui lòng nhập nội dung');

        setSubmitting(true);
        setError('');

        try {
            // Upload ảnh lên Supabase Storage
            const imageUrls = [];
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                const fileName = `${user.id}/${Date.now()}_${i}.webp`;
                const { data, error: uploadErr } = await supabase.storage
                    .from('forum-images')
                    .upload(fileName, img.blob, {
                        contentType: 'image/webp',
                        cacheControl: '31536000',
                    });
                if (uploadErr) throw uploadErr;

                const { data: { publicUrl } } = supabase.storage
                    .from('forum-images')
                    .getPublicUrl(fileName);
                imageUrls.push(publicUrl);
            }

            // Tạo bài đăng
            const { data: newPost, error: postErr } = await supabase
                .from('forum_posts')
                .insert({
                    user_id: user.id,
                    title: title.trim(),
                    content: content.trim(),
                    tags: selectedTags,
                    images: imageUrls,
                })
                .select()
                .single();

            if (postErr) throw postErr;

            // Cleanup previews
            images.forEach(img => URL.revokeObjectURL(img.preview));

            onCreated(newPost);
        } catch (err) {
            console.error('Error creating post:', err);
            setError('Đã xảy ra lỗi khi đăng bài. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="fm-modal">
                <div className="fm-modal-header">
                    <h2>Đăng bài mới</h2>
                    <button className="fm-modal-close" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="fm-modal-body">
                    {error && <div className="fm-error">{error}</div>}

                    <input
                        type="text"
                        className="fm-input"
                        placeholder="Tiêu đề câu hỏi / bài chia sẻ *"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={200}
                    />

                    <textarea
                        className="fm-textarea"
                        placeholder="Mô tả chi tiết vấn đề của bạn... *"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={6}
                    />

                    {/* Tags */}
                    <div className="fm-tags-section">
                        <label className="fm-label">Chọn chủ đề (không bắt buộc)</label>
                        <div className="fm-tags-list">
                            {tagOptions.map(tag => (
                                <button
                                    key={tag}
                                    className={`fm-tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                                    onClick={() => toggleTag(tag)}
                                    type="button"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Image upload */}
                    <div className="fm-images-section">
                        <label className="fm-label">Đính kèm ảnh (tối đa {MAX_IMAGES}, tự động resize & chuyển WebP)</label>
                        <div className="fm-images-grid">
                            {images.map((img, idx) => (
                                <div key={idx} className="fm-image-preview">
                                    <img src={img.preview} alt="" />
                                    <button className="fm-image-remove" onClick={() => removeImage(idx)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {images.length < MAX_IMAGES && (
                                <button className="fm-image-add" onClick={() => fileInputRef.current?.click()}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                    <span>Thêm ảnh</span>
                                </button>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleImageSelect}
                        />
                    </div>
                </div>

                <div className="fm-modal-footer">
                    <button className="fm-btn-secondary" onClick={onClose} disabled={submitting}>Hủy</button>
                    <button className="fm-btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? (
                            <>
                                <span className="fm-btn-spinner" />
                                Đang đăng...
                            </>
                        ) : 'Đăng bài'}
                    </button>
                </div>
            </div>
        </div>
    );
}