'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createSlugWithId } from '../../../lib/slugify';

// ── Helpers ────────────────────────────────────────────────────────────────
function cleanHtml(html) {
    if (!html) return '';
    return html.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
}

// ── Fetch nội dung 1 section từ API ────────────────────────────────────────
async function fetchSectionContent(guidelineId) {
    const res = await fetch(`/api/guidelines?id=${guidelineId}`);
    if (!res.ok) return null;
    return res.json();
}

// ── SectionContent: hiển thị nội dung đã fetch ────────────────────────────
function SectionContent({ data }) {
    const linkedArticles = data.guideline_articles?.map(ga => ga.articles).filter(Boolean) || [];

    return (
        <div className="gd-accordion-body">
            {data.content && (
                <div
                    className="nd-body"
                    dangerouslySetInnerHTML={{ __html: cleanHtml(data.content) }}
                />
            )}

            {data.external_url && (
                <a
                    href={data.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gd-external-link"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Xem tài liệu gốc
                </a>
            )}

            {linkedArticles.length > 0 && (
                <div className="gd-linked">
                    <h4 className="gd-linked-title">
                        Bài viết liên quan trên{' '}
                        <span className="brand-font" style={{ fontSize: '0.9em' }}>EpiHouse</span>
                    </h4>
                    {linkedArticles.map(a => (
                        <Link
                            href={`/news/${createSlugWithId(a.title, a.id)}`}
                            key={a.id}
                            className="gd-linked-card"
                        >
                            <span className="gd-linked-name">{a.title}</span>
                            <span className="gd-linked-meta">
                                {a.institution} · {new Date(a.date).toLocaleDateString('vi-VN')}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Loading skeleton ───────────────────────────────────────────────────────
function SectionLoading() {
    return (
        <div className="gd-accordion-body gd-loading">
            <div className="gd-skeleton-line" style={{ width: '90%' }} />
            <div className="gd-skeleton-line" style={{ width: '75%' }} />
            <div className="gd-skeleton-line" style={{ width: '85%' }} />
            <div className="gd-skeleton-line" style={{ width: '60%' }} />
            <div className="gd-skeleton-line" style={{ width: '80%' }} />
        </div>
    );
}

// ── AccordionSection ───────────────────────────────────────────────────────
function AccordionSection({ g, idx, isOpen, onToggle, contentData, isLoading }) {
    return (
        <section id={`section-${g.id}`} className={`gd-accordion-item ${isOpen ? 'open' : ''}`}>
            <button
                className="gd-accordion-trigger"
                onClick={onToggle}
                aria-expanded={isOpen}
                aria-controls={`content-${g.id}`}
            >
                <div className="gd-accordion-left">
                    <span className="gd-accordion-num">{idx + 1}</span>
                    <h2 className="gd-accordion-title">{g.title}</h2>
                </div>
                <div className="gd-accordion-right">
                    {g.source_name && (
                        <span className="gd-accordion-source">{g.source_name}</span>
                    )}
                    <svg
                        className={`gd-accordion-chevron ${isOpen ? 'rotated' : ''}`}
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            <div
                id={`content-${g.id}`}
                className="gd-accordion-content"
                role="region"
                hidden={!isOpen}
            >
                {isOpen && (
                    isLoading
                        ? <SectionLoading />
                        : contentData
                            ? <SectionContent data={contentData} />
                            : <SectionLoading />
                )}
            </div>
        </section>
    );
}

// ── GuidelineSections: controller ───────────────────────────────────────────
export default function GuidelineSections({ sections }) {
    // Tất cả đóng ban đầu — không load gì cả
    const [openIds, setOpenIds] = useState(new Set());
    // Cache nội dung đã fetch: { [guidelineId]: data }
    const [contentCache, setContentCache] = useState({});
    // Đang loading: { [guidelineId]: true }
    const [loadingIds, setLoadingIds] = useState({});
    // Đã preload chưa
    const preloadStarted = useRef(false);

    // Fetch 1 section (nếu chưa có trong cache)
    const loadSection = useCallback(async (id) => {
        if (contentCache[id]) return;

        setLoadingIds(prev => ({ ...prev, [id]: true }));
        try {
            const data = await fetchSectionContent(id);
            if (data) {
                setContentCache(prev => ({ ...prev, [id]: data }));
            }
        } finally {
            setLoadingIds(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    }, [contentCache]);

    // Preload tất cả sections còn lại (âm thầm, tuần tự)
    const preloadRemaining = useCallback(async (excludeId) => {
        if (preloadStarted.current) return;
        preloadStarted.current = true;

        for (const s of sections) {
            if (s.id === excludeId) continue;
            // Chờ 300ms giữa mỗi fetch để không quá tải
            await new Promise(r => setTimeout(r, 300));
            const data = await fetchSectionContent(s.id);
            if (data) {
                setContentCache(prev => ({ ...prev, [s.id]: data }));
            }
        }
    }, [sections]);

    const toggleSection = useCallback(async (id) => {
        setOpenIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

        // Fetch nội dung nếu chưa có
        if (!contentCache[id]) {
            await loadSection(id);
        }

        // Sau khi mở section đầu tiên → preload phần còn lại âm thầm
        preloadRemaining(id);
    }, [contentCache, loadSection, preloadRemaining]);

    const expandAll = useCallback(async () => {
        setOpenIds(new Set(sections.map(s => s.id)));
        for (const s of sections) {
            if (!contentCache[s.id]) {
                loadSection(s.id);
            }
        }
    }, [sections, contentCache, loadSection]);

    const collapseAll = useCallback(() => {
        setOpenIds(new Set());
    }, []);

    const allOpen = openIds.size === sections.length;

    return (
        <div className="gd-sections">
            {sections.length > 1 && (
                <div className="gd-accordion-controls">
                    <button
                        className="gd-accordion-toggle-all"
                        onClick={allOpen ? collapseAll : expandAll}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {allOpen
                                ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            }
                        </svg>
                        {allOpen ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
                    </button>
                    <span className="gd-accordion-info">
                        {sections.length} phần · {openIds.size} đang mở
                    </span>
                </div>
            )}

            {sections.map((g, idx) => (
                <AccordionSection
                    key={g.id}
                    g={g}
                    idx={idx}
                    isOpen={openIds.has(g.id)}
                    onToggle={() => toggleSection(g.id)}
                    contentData={contentCache[g.id]}
                    isLoading={!!loadingIds[g.id]}
                />
            ))}
        </div>
    );
}
