'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createSlugWithId } from '../../../lib/slugify';

// ── Helpers ────────────────────────────────────────────────────────────────
function cleanHtml(html) {
    if (!html) return '';
    return html
        .replace(/&nbsp;/g, ' ')
        .replace(/\u00A0/g, ' ');
}

// ── LazySection: chỉ render khi sắp vào viewport ─────────────────────────
function LazySection({ children }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '400px' } // bắt đầu render trước 400px
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref}>
            {visible
                ? children
                // Placeholder giữ chiều cao để scroll không bị nhảy layout
                : <div style={{ minHeight: 400 }} aria-hidden="true" />
            }
        </div>
    );
}

// ── SectionContent: nội dung 1 section ────────────────────────────────────
function SectionContent({ g, idx, sec }) {
    const linkedArticles = g.guideline_articles?.map(ga => ga.articles).filter(Boolean) || [];

    return (
        <section id={`section-${g.id}`} className="gd-section">
            <div className="gd-section-header">
                <div
                    className="gd-section-badge"
                    style={{
                        backgroundColor: sec.color + '12',
                        color: sec.color,
                        borderColor: sec.color + '30',
                    }}
                >
                    {sec.label}
                </div>
                <h2 className="gd-section-title">
                    <span className="gd-section-num">{idx + 1}.</span>
                    {g.title}
                </h2>
                {g.source_name && (
                    <div className="gd-section-source">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Nguồn: {g.source_name}
                    </div>
                )}
            </div>

            {g.content && (
                <div
                    className="nd-body"
                    dangerouslySetInnerHTML={{ __html: cleanHtml(g.content) }}
                />
            )}

            {g.external_url && (
                <a
                    href={g.external_url}
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
                        <span className="brand-font" style={{ fontSize: '0.9em' }}>THE EPIDEMIC HOUSE</span>
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
        </section>
    );
}

// ── GuidelineSections: orchestrate lazy rendering ─────────────────────────
const sectionLabels = {
    overview: { label: 'Tổng quan', color: '#3b82f6' },
    diagnosis: { label: 'Chẩn đoán', color: '#8b5cf6' },
    treatment: { label: 'Điều trị', color: '#10b981' },
    prevention: { label: 'Dự phòng', color: '#f59e0b' },
    research: { label: 'Nghiên cứu mới', color: '#ef4444' },
};

export default function GuidelineSections({ sections }) {
    return (
        <div className="gd-sections">
            {sections.map((g, idx) => {
                const sec = sectionLabels[g.section_type] || sectionLabels.overview;
                const content = <SectionContent key={g.id} g={g} idx={idx} sec={sec} />;

                // 2 sections đầu: render ngay (above the fold)
                if (idx < 2) return content;

                // Phần còn lại: lazy render khi scroll tới
                return (
                    <LazySection key={g.id}>
                        {content}
                    </LazySection>
                );
            })}
        </div>
    );
}
