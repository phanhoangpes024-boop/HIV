import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Breadcrumb from '../../../components/Breadcrumb/Breadcrumb';
import { getIdFromSlug, createSlugWithId } from '../../../lib/slugify';
import GuidelineSections from './GuidelineSections';
import '../Guidelines.css';
import '../../news/[slug]/NewsDetail.css';

// ── ISR: cache trang 1 giờ, tự revalidate sau đó ──────────────────────────
export const revalidate = 3600;

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

// ── Xử lý &nbsp; từ Quill ────────────────────────────────────────────────
function cleanHtml(html) {
    if (!html) return '';
    return html
        .replace(/&nbsp;/g, ' ')
        .replace(/\u00A0/g, ' ');
}

// ── DB queries ────────────────────────────────────────────────────────────

async function getDisease(id) {
    const { data, error } = await supabase
        .from('diseases').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data;
}

// Chỉ lấy metadata (không lấy content nặng) → trang load nhanh
async function getGuidelinesMetadata(diseaseId) {
    const { data } = await supabase
        .from('guidelines')
        .select('id, title, section_type, source_name, external_url, sort_order')
        .eq('disease_id', diseaseId)
        .order('sort_order');
    return data || [];
}

// FIX: lọc hoàn toàn trên server, không tải bulk về rồi filter ở JS
async function getRelatedArticles(diseaseName) {
    const keywords = (diseaseName || '')
        .toLowerCase()
        .split(/[\s/]+/)
        .filter(kw => kw.length > 2)
        .slice(0, 3); // chỉ dùng tối đa 3 keyword

    if (keywords.length === 0) return [];

    // Xây filter OR: title hoặc description chứa keyword
    const filterStr = keywords
        .flatMap(kw => [`title.ilike.%${kw}%`, `description.ilike.%${kw}%`])
        .join(',');

    const { data } = await supabase
        .from('articles')
        .select('id, title, description, date, institution')
        .or(filterStr)
        .order('date', { ascending: false })
        .limit(6); // chỉ lấy đúng 6 cần dùng

    return data || [];
}

// ── Metadata ──────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────

export default async function DiseasePage({ params }) {
    const { slug } = await params;
    const id = getIdFromSlug(slug);

    // Chạy song song: lấy disease + metadata sections (không có content)
    const [disease, guidelines] = await Promise.all([
        getDisease(id),
        getGuidelinesMetadata(id),
    ]);

    if (!disease) notFound();

    // Chỉ fetch related sau khi có disease (cần tên), nhưng không block render chính
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
        publisher: {
            '@type': 'Organization',
            name: 'EpiHouse',
            logo: {
                '@type': 'ImageObject',
                url: 'https://epihouse.org/Logo.png',
            }
        },
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

            {/* Table of Contents — đã bỏ để giao diện gọn hơn */}

            {/* FIX: Sections giờ lazy-render qua client component */}
            <GuidelineSections sections={guidelines} />

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