"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';

function getThumbnailUrl(url, width = 400) {
    if (!url) return '';
    if (url.includes('cdn.epihouse.org')) {
        return `${url}?width=${width}&height=${width}&crop_margin=10&quality=80&sharpen=true`;
    }
    return url;
}

function getFullUrl(url) {
    if (!url) return '';
    if (url.includes('cdn.epihouse.org')) {
        return `${url}?width=1200&quality=90`;
    }
    return url;
}

const UNGROUPED_KEY = '__ungrouped__';

export default function LibraryClient({ images = [], diseases = [] }) {
    const [lightboxImage, setLightboxImage] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [openIds, setOpenIds] = useState(new Set());

    // Group images by disease
    const groupedImages = useMemo(() => {
        let filtered = images;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = images.filter(img =>
                img.name?.toLowerCase().includes(q) ||
                img.description?.toLowerCase().includes(q)
            );
        }

        const groups = new Map();
        diseases.forEach(d => {
            groups.set(d.id, {
                disease: d,
                images: [],
            });
        });

        groups.set(UNGROUPED_KEY, {
            disease: { id: UNGROUPED_KEY, name_vi: 'Khác', sort_order: 9999 },
            images: [],
        });

        filtered.forEach(img => {
            const key = img.disease_id || UNGROUPED_KEY;
            if (groups.has(key)) {
                groups.get(key).images.push(img);
            } else {
                groups.get(UNGROUPED_KEY).images.push(img);
            }
        });

        return Array.from(groups.values()).filter(g => g.images.length > 0);
    }, [images, diseases, searchQuery]);

    const toggleSection = useCallback((diseaseId) => {
        setOpenIds(prev => {
            const next = new Set(prev);
            if (next.has(diseaseId)) {
                next.delete(diseaseId);
            } else {
                next.add(diseaseId);
            }
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        setOpenIds(new Set(groupedImages.map(g => g.disease.id)));
    }, [groupedImages]);

    const collapseAll = useCallback(() => {
        setOpenIds(new Set());
    }, []);

    // Auto-expand when searching, collapse when clearing
    useEffect(() => {
        if (searchQuery.trim()) {
            setOpenIds(new Set(groupedImages.map(g => g.disease.id)));
        } else {
            setOpenIds(new Set());
        }
    }, [searchQuery, groupedImages]);

    // Close lightbox on Escape
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') setLightboxImage(null);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = lightboxImage ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [lightboxImage]);

    const getAltText = (img) => `${img.name} — hình ảnh lâm sàng`;

    return (
        <div className="lib-container">
            {/* Hero */}
            <div className="lib-hero">
                <h1 className="lib-hero-title">Thư viện triệu chứng</h1>
                <p className="lib-hero-desc">
                    Bộ sưu tập hình ảnh lâm sàng các triệu chứng bệnh truyền nhiễm, phục vụ mục đích học tập và nghiên cứu.
                </p>
            </div>

            {/* Disclaimer */}
            <div className="lib-disclaimer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p>
                    <strong>Lưu ý:</strong> Hình ảnh trong thư viện có thể chứa nội dung nhạy cảm, chỉ mang tính chất tham khảo phục vụ mục đích học tập và nghiên cứu y khoa. Không sử dụng để tự chẩn đoán hoặc thay thế tư vấn y tế chuyên nghiệp.
                </p>
            </div>

            {/* Search */}
            <div className="lib-search">
                <span className="lib-search-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                    </svg>
                </span>
                <input
                    type="text"
                    placeholder="Tìm kiếm triệu chứng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Accordion Controls + List */}
            {groupedImages.length > 0 ? (
                <>
                    <div className="lib-accordion-controls">
                        <button
                            className="lib-accordion-toggle-all"
                            onClick={openIds.size === groupedImages.length ? collapseAll : expandAll}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {openIds.size === groupedImages.length
                                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                }
                            </svg>
                            {openIds.size === groupedImages.length ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
                        </button>
                        <span className="lib-accordion-info">
                            {groupedImages.length} nhóm bệnh
                        </span>
                    </div>

                    <div className="lib-accordion-list">
                        {groupedImages.map(group => {
                            const isOpen = openIds.has(group.disease.id);
                            return (
                                <section
                                    key={group.disease.id}
                                    className={`lib-accordion-item ${isOpen ? 'open' : ''}`}
                                >
                                    <button
                                        className="lib-accordion-trigger"
                                        onClick={() => toggleSection(group.disease.id)}
                                        aria-expanded={isOpen}
                                    >
                                        <div className="lib-accordion-left">
                                            <h2 className="lib-accordion-title">
                                                {group.disease.name_vi}
                                            </h2>
                                        </div>
                                        <div className="lib-accordion-right">
                                            <span className="lib-accordion-count">
                                                {group.images.length} ảnh
                                            </span>
                                            <svg
                                                className={`lib-accordion-chevron ${isOpen ? 'rotated' : ''}`}
                                                width="20" height="20" viewBox="0 0 24 24"
                                                fill="none" stroke="currentColor" strokeWidth="2"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="lib-accordion-body">
                                            <div className="lib-grid">
                                                {group.images.map((img, index) => (
                                                    <div key={img.id} className="lib-card" onClick={() => setLightboxImage(img)}>
                                                        <div className={`lib-card-img-wrap${img.is_sensitive ? ' sensitive' : ''}`}>
                                                            <Image
                                                                src={getThumbnailUrl(img.image_url, 400)}
                                                                alt={getAltText(img)}
                                                                width={400}
                                                                height={400}
                                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                                quality={80}
                                                                priority={index < 8 && groupedImages.indexOf(group) === 0}
                                                                loading={index < 8 && groupedImages.indexOf(group) === 0 ? undefined : "lazy"}
                                                                placeholder="blur"
                                                                blurDataURL={`${getThumbnailUrl(img.image_url, 20)}&blur=10`}
                                                                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                                            />
                                                            {img.is_sensitive && (
                                                                <div className="lib-sensitive-overlay">
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                                    </svg>
                                                                    <span>Nhạy cảm</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="lib-card-body">
                                                            <div className="lib-card-name">{img.name}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="lib-empty">
                    <div className="lib-empty-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
                        </svg>
                    </div>
                    <p>Chưa có hình ảnh nào{searchQuery ? ` cho "${searchQuery}"` : ''}.</p>
                </div>
            )}

            {/* Lightbox */}
            {lightboxImage && (
                <div className="lib-lightbox-overlay" onClick={() => setLightboxImage(null)}>
                    <div className="lib-lightbox" onClick={(e) => e.stopPropagation()}>
                        <div className="lib-lightbox-img-wrap">
                            <button className="lib-lightbox-close" onClick={() => setLightboxImage(null)}>✕</button>
                            <Image
                                src={getFullUrl(lightboxImage.image_url)}
                                alt={getAltText(lightboxImage)}
                                width={1200}
                                height={800}
                                quality={90}
                                priority
                                style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '60vh', width: 'auto', height: 'auto' }}
                            />
                        </div>
                        <div className="lib-lightbox-info">
                            <h2 className="lib-lightbox-name">{lightboxImage.name}</h2>
                            {lightboxImage.description && (
                                <p className="lib-lightbox-desc">{lightboxImage.description}</p>
                            )}
                            {lightboxImage.source_url && (
                                <a
                                    href={lightboxImage.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="lib-lightbox-source"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Xem nguồn
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
