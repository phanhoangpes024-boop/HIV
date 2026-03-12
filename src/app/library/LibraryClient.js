"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function getThumbnailUrl(url, width = 400) {
    if (!url) return '';
    if (url.includes('cdn.epihouse.org')) {
        // BunnyNet Optimizer parameters: auto format, compression, and smart resizing
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

export default function LibraryClient({ illustrations = [], clinicalCount = 0, diseases = [] }) {
    const [activeTab, setActiveTab] = useState('illustration');
    const [lightboxImage, setLightboxImage] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [clinicalAccepted, setClinicalAccepted] = useState(false);
    const [showClinicalModal, setShowClinicalModal] = useState(false);
    const [openIds, setOpenIds] = useState(new Set());

    // Clinical images - loaded only after confirmation
    const [clinicalImages, setClinicalImages] = useState([]);
    const [loadingClinical, setLoadingClinical] = useState(false);

    // Check sessionStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const accepted = sessionStorage.getItem('clinical_accepted');
            if (accepted === 'true') {
                setClinicalAccepted(true);
                fetchClinicalImages();
            }
        }
    }, []);

    // No blanket noindex — per-image sensitivity control handles SEO

    const fetchClinicalImages = async () => {
        try {
            setLoadingClinical(true);
            const { data, error } = await supabase
                .from('symptom_images')
                .select('id, name, description, image_url, source_url, tags, type, created_at, disease_id, is_sensitive')
                .eq('type', 'clinical')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setClinicalImages(data || []);
        } catch (error) {
            console.error('Error fetching clinical images:', error);
        } finally {
            setLoadingClinical(false);
        }
    };

    // Current tab's source images
    const tabImages = useMemo(() => {
        return activeTab === 'illustration' ? illustrations : clinicalImages;
    }, [activeTab, illustrations, clinicalImages]);

    // Group images by disease
    const groupedImages = useMemo(() => {
        // Apply search filter
        let filtered = tabImages;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = tabImages.filter(img =>
                img.name?.toLowerCase().includes(q) ||
                img.description?.toLowerCase().includes(q)
            );
        }

        // Initialize groups from diseases list (preserves sort_order)
        const groups = new Map();
        diseases.forEach(d => {
            groups.set(d.id, {
                disease: d,
                images: [],
            });
        });

        // Ungrouped bucket
        groups.set(UNGROUPED_KEY, {
            disease: { id: UNGROUPED_KEY, name_vi: 'Khác', sort_order: 9999 },
            images: [],
        });

        // Distribute images
        filtered.forEach(img => {
            const key = img.disease_id || UNGROUPED_KEY;
            if (groups.has(key)) {
                groups.get(key).images.push(img);
            } else {
                groups.get(UNGROUPED_KEY).images.push(img);
            }
        });

        // Filter out empty groups
        return Array.from(groups.values()).filter(g => g.images.length > 0);
    }, [tabImages, diseases, searchQuery]);

    // Accordion controls
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

    const handleTabClick = (tab) => {
        if (tab === 'clinical' && !clinicalAccepted) {
            setShowClinicalModal(true);
            return;
        }
        setActiveTab(tab);
        setSearchQuery('');
        setOpenIds(new Set());
    };

    const handleClinicalAccept = () => {
        setClinicalAccepted(true);
        sessionStorage.setItem('clinical_accepted', 'true');
        setShowClinicalModal(false);
        setActiveTab('clinical');
        setSearchQuery('');
        setOpenIds(new Set());
        fetchClinicalImages();
    };

    const handleClinicalDecline = () => {
        setShowClinicalModal(false);
    };

    // Close lightbox on Escape
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                setLightboxImage(null);
                setShowClinicalModal(false);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    // Lock body scroll
    useEffect(() => {
        if (lightboxImage || showClinicalModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [lightboxImage, showClinicalModal]);

    const getAltText = (img) => {
        const type = img.type === 'illustration' ? 'minh họa y khoa' : 'hình ảnh lâm sàng';
        return `${img.name} — ${type}`;
    };

    return (
        <div className="lib-container">
            {/* Hero */}
            <div className="lib-hero">
                <h1 className="lib-hero-title">Thư viện triệu chứng</h1>
                <p className="lib-hero-desc">
                    Bộ sưu tập hình ảnh minh họa và lâm sàng các triệu chứng bệnh truyền nhiễm, phục vụ mục đích học tập và nghiên cứu.
                </p>
            </div>

            {/* Disclaimer */}
            <div className="lib-disclaimer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p>
                    <strong>Lưu ý:</strong> Hình ảnh trong thư viện chỉ mang tính chất tham khảo, phục vụ mục đích học tập và nghiên cứu y khoa. Không sử dụng để tự chẩn đoán hoặc thay thế tư vấn y tế chuyên nghiệp.
                </p>
            </div>

            {/* Tabs */}
            <div className="lib-tabs">
                <button
                    className={`lib-tab ${activeTab === 'illustration' ? 'active' : ''}`}
                    onClick={() => handleTabClick('illustration')}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
                    </svg>
                    Minh họa ({illustrations.length})
                </button>
                <button
                    className={`lib-tab ${activeTab === 'clinical' ? 'active' : ''}`}
                    onClick={() => handleTabClick('clinical')}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Lâm sàng ({clinicalAccepted ? clinicalImages.length : clinicalCount})
                </button>
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

            {/* Loading state for clinical */}
            {activeTab === 'clinical' && loadingClinical && (
                <div className="lib-empty">
                    <div className="lib-loading-spinner"></div>
                    <p>Đang tải hình ảnh lâm sàng...</p>
                </div>
            )}

            {/* Accordion Controls + List */}
            {!loadingClinical && groupedImages.length > 0 ? (
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
                                                                priority={activeTab === 'illustration' && index < 8}
                                                                loading={activeTab === 'illustration' && index < 8 ? undefined : "lazy"}
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
                !loadingClinical && (
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
                )
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

            {/* Clinical Confirmation Modal */}
            {showClinicalModal && (
                <div className="lib-modal-overlay" onClick={handleClinicalDecline}>
                    <div className="lib-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="lib-modal-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="lib-modal-title">Xác nhận mục đích học thuật</h3>
                        <p className="lib-modal-text">
                            Hình ảnh lâm sàng có thể chứa nội dung nhạy cảm. Chỉ dành cho mục đích học tập, nghiên cứu y khoa hoặc chuyên gia y tế.
                            <br /><br />
                            Bạn xác nhận đang truy cập vì mục đích học thuật?
                        </p>
                        <div className="lib-modal-actions">
                            <button className="lib-modal-btn secondary" onClick={handleClinicalDecline}>
                                Quay lại
                            </button>
                            <button className="lib-modal-btn primary" onClick={handleClinicalAccept}>
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
