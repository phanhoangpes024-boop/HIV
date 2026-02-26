import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Breadcrumb from '../../../components/Breadcrumb/Breadcrumb';
import { getIdFromSlug, createSlugWithId } from '../../../lib/slugify';
import '../Guidelines.css';
import '../../news/[slug]/NewsDetail.css';


const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const sectionLabels = {
    overview: { label: 'Tổng quan', icon: '📋', color: '#3b82f6' },
    diagnosis: { label: 'Chẩn đoán', icon: '🔬', color: '#8b5cf6' },
    treatment: { label: 'Điều trị', icon: '💊', color: '#10b981' },
    prevention: { label: 'Dự phòng', icon: '🛡️', color: '#f59e0b' },
    research: { label: 'Nghiên cứu mới', icon: '🧪', color: '#ef4444' },
};

// ====================================================
// HÀM QUAN TRỌNG: Xử lý nội dung HTML từ editor
// Editor lưu &nbsp; giữa mọi từ -> trình duyệt không 
// thể xuống dòng -> chữ bị đứt giữa chừng
// Giải pháp: thay &nbsp; thành dấu cách thường
// ====================================================
function cleanHtml(html) {
    if (!html) return '';
    return html
        // Thay &nbsp; thành dấu cách thường
        .replace(/&nbsp;/g, ' ')
        // Thay ký tự Unicode non-breaking space (U+00A0)
        .replace(/\u00A0/g, ' ');
}

async function getDisease(id) {
    const { data, error } = await supabase
        .from('diseases').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data;
}

async function getGuidelines(diseaseId) {
    const { data } = await supabase
        .from('guidelines')
        .select(`
            *,
            guideline_articles (
                article_id,
                articles ( id, title, description, date, institution )
            )
        `)
        .eq('disease_id', diseaseId)
        .order('sort_order');
    return data || [];
}

async function getRelatedArticles(diseaseName) {
    const keywords = diseaseName.toLowerCase().split(/[\s/]+/);
    const { data } = await supabase
        .from('articles')
        .select('id, title, description, date, institution')
        .order('date', { ascending: false })
        .limit(50);
    if (!data) return [];
    return data.filter(article => {
        const text = `${article.title} ${article.description}`.toLowerCase();
        return keywords.some(kw => kw.length > 2 && text.includes(kw));
    }).slice(0, 6);
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const id = getIdFromSlug(slug);
    const disease = await getDisease(id);
    if (!disease) return { title: 'Không tìm thấy hướng dẫn' };

    const canonicalSlug = createSlugWithId(disease.name_vi, disease.id);
    const url = `https://epihouse.org/guidelines/${canonicalSlug}`;

    return {
        title: `${disease.name_vi} — Hướng dẫn lâm sàng`,
        description: disease.description,
        alternates: { canonical: url },
        openGraph: {
            title: `${disease.name_vi} — Hướng dẫn lâm sàng y khoa`,
            description: disease.description,
            url,
            type: 'website',
            locale: 'vi_VN',
            images: [{ url: 'https://epihouse.org/og-default.png', width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${disease.name_vi} — Hướng dẫn lâm sàng y khoa`,
            description: disease.description,
            images: ['https://epihouse.org/og-default.png'],
        },
    };
}

export default async function DiseasePage({ params }) {
    const { slug } = await params;
    const id = getIdFromSlug(slug);
    const disease = await getDisease(id);
    if (!disease) notFound();

    const guidelines = await getGuidelines(id);
    const relatedArticles = await getRelatedArticles(disease.name);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': ['MedicalWebPage', 'MedicalGuideline'],
        name: `${disease.name_vi} - Hướng dẫn lâm sàng`,
        description: disease.description,
        lastReviewed: disease.updated_at,
        specialty: 'InfectiousDisease',
        audience: { '@type': 'MedicalAudience', medicalAudienceType: 'Clinician' },
        mainEntity: { '@type': 'MedicalCondition', name: disease.name_vi, alternateName: disease.name },
        publisher: { '@type': 'Organization', name: 'THE EPIDEMIC HOUSE' },
    };

    return (
        <div className="gd-layout">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            {/* Breadcrumb */}
            <Breadcrumb
                items={[
                    { label: 'Trang chủ', href: '/' },
                    { label: 'Hướng dẫn lâm sàng', href: '/guidelines' },
                    { label: disease.name_vi, current: true }
                ]}
            />

            {/* Header */}
            <header className="gd-header">
                <h1 className="gd-title">{disease.name_vi}</h1>
                {disease.name !== disease.name_vi && <span className="gd-title-en">{disease.name}</span>}
                {disease.description && <p className="gd-desc">{disease.description}</p>}
            </header>

            {/* Table of Contents */}
            {guidelines.length > 0 && (
                <nav className="gd-toc">
                    <h2 className="gd-toc-title">Mục lục</h2>
                    <ol className="gd-toc-list">
                        {guidelines.map((g, idx) => {
                            const sec = sectionLabels[g.section_type] || sectionLabels.overview;
                            return (
                                <li key={g.id}>
                                    <a href={`#section-${g.id}`} className="gd-toc-link">
                                        <span className="gd-toc-num">{idx + 1}</span>
                                        <span>{g.title}</span>
                                        {g.source_name && <span className="gd-toc-source">{g.source_name}</span>}
                                    </a>
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            )}

            {/* Sections */}
            <div className="gd-sections">
                {guidelines.map((g, idx) => {
                    const sec = sectionLabels[g.section_type] || sectionLabels.overview;
                    const linkedArticles = g.guideline_articles?.map(ga => ga.articles).filter(Boolean) || [];

                    return (
                        <section key={g.id} id={`section-${g.id}`} className="gd-section">
                            <div className="gd-section-header">
                                <div className="gd-section-badge" style={{ backgroundColor: sec.color + '12', color: sec.color, borderColor: sec.color + '30' }}>
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

                            {/* NỘI DUNG: dùng cleanHtml() để xóa &nbsp; trước khi render */}
                            {g.content && (
                                <div className="nd-body" dangerouslySetInnerHTML={{ __html: cleanHtml(g.content) }} />
                            )}

                            {g.external_url && (
                                <a href={g.external_url} target="_blank" rel="noopener noreferrer" className="gd-external-link">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Xem tài liệu gốc
                                </a>
                            )}

                            {linkedArticles.length > 0 && (
                                <div className="gd-linked">
                                    <h4 className="gd-linked-title">Bài viết liên quan trên <span className="brand-font" style={{ fontSize: '0.9em' }}>THE EPIDEMIC HOUSE</span></h4>
                                    {linkedArticles.map(a => (
                                        <Link href={`/news/${createSlugWithId(a.title, a.id)}`} key={a.id} className="gd-linked-card">
                                            <span className="gd-linked-name">{a.title}</span>
                                            <span className="gd-linked-meta">{a.institution} · {new Date(a.date).toLocaleDateString('vi-VN')}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>

            {/* Related */}
            {relatedArticles.length > 0 && (
                <div className="gd-related">
                    <h3 className="gd-related-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        Bài viết liên quan
                    </h3>
                    <div className="gd-related-list">
                        {relatedArticles.map(a => (
                            <Link href={`/news/${createSlugWithId(a.title, a.id)}`} key={a.id} className="gd-related-card">
                                <h4 className="gd-related-card-title">{a.title}</h4>
                                {a.description && <p className="gd-related-card-desc">{a.description}</p>}
                                <div className="gd-related-card-meta">
                                    <span>{a.institution}</span>
                                    <span>·</span>
                                    <span>{new Date(a.date).toLocaleDateString('vi-VN')}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="gd-back">
                <Link href="/guidelines" className="nd-back-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại danh sách hướng dẫn
                </Link>
            </div>
        </div>
    );
}