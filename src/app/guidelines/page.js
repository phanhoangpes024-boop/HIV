import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { createSlugWithId } from '../../lib/slugify';
import './Guidelines.css';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Icon mapping cho từng bệnh
const diseaseIcons = {
    'HIV/AIDS': (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
    'default': (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
    ),
};

async function getDiseases() {
    const { data, error } = await supabase
        .from('diseases')
        .select('*, guidelines(id)')
        .order('sort_order');

    if (error) { console.error(error); return []; }

    return (data || []).map(d => ({
        ...d,
        guidelineCount: d.guidelines?.length || 0,
    }));
}

export const metadata = {
    title: 'Hướng dẫn lâm sàng — THE EPIDEMIC HOUSE',
    description: 'Hướng dẫn chẩn đoán và điều trị các bệnh truyền nhiễm',
};

export default async function GuidelinesPage() {
    const diseases = await getDiseases();

    return (
        <div className="gl-container">
            {/* Hero */}
            <div className="gl-hero">
                <h1 className="gl-hero-title">Hướng dẫn lâm sàng</h1>
                <p className="gl-hero-desc">
                    Tổng hợp hướng dẫn chẩn đoán, điều trị và dự phòng các bệnh truyền nhiễm theo tiêu chuẩn WHO và Bộ Y tế Việt Nam
                </p>
            </div>

            {/* Info banner */}
            <div className="gl-info-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Nội dung được tổng hợp từ các nguồn uy tín: WHO, CDC, Bộ Y tế Việt Nam. Vui lòng tham khảo ý kiến bác sĩ trước khi áp dụng.</p>
            </div>

            {/* Disease Grid */}
            <div className="gl-grid">
                {diseases.map(disease => (
                    <Link href={`/guidelines/${createSlugWithId(disease.name_vi, disease.id)}`} key={disease.id} className="gl-card-link">
                        <div className="gl-card">
                            <div className="gl-card-body">
                                <h3 className="gl-card-name">{disease.name_vi}</h3>
                                {disease.name !== disease.name_vi && (
                                    <span className="gl-card-name-en">{disease.name}</span>
                                )}
                                <p className="gl-card-desc">{disease.description}</p>
                            </div>
                            <div className="gl-card-footer">
                                <span className="gl-card-count">{disease.guidelineCount} hướng dẫn</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {diseases.length === 0 && (
                <div className="gl-empty">
                    <p>Chưa có dữ liệu hướng dẫn. Đang cập nhật...</p>
                </div>
            )}
        </div>
    );
}