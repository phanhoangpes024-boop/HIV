import { createClient } from '@supabase/supabase-js';
import LibraryClient from './LibraryClient';
import './Library.css';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const revalidate = 0;

export async function generateMetadata() {
    return {
        title: 'Thư viện triệu chứng — THE EPIDEMIC HOUSE',
        description: 'Bộ sưu tập hình ảnh minh họa và lâm sàng các triệu chứng bệnh truyền nhiễm, phục vụ nghiên cứu và học tập y khoa tại Việt Nam.',
        keywords: ['triệu chứng', 'bệnh truyền nhiễm', 'hình ảnh y khoa', 'minh họa lâm sàng', 'EpiHouse', 'thư viện y khoa'],
        openGraph: {
            title: 'Thư viện triệu chứng — THE EPIDEMIC HOUSE',
            description: 'Bộ sưu tập hình ảnh minh họa và lâm sàng các triệu chứng bệnh truyền nhiễm, phục vụ nghiên cứu y khoa.',
            url: 'https://epihouse.org/library',
            siteName: 'EpiHouse',
            locale: 'vi_VN',
            type: 'website',
            images: [
                {
                    url: 'https://epihouse.org/og-default.png',
                    width: 1200,
                    height: 630,
                    alt: 'EpiHouse — Thư viện triệu chứng bệnh truyền nhiễm',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Thư viện triệu chứng — THE EPIDEMIC HOUSE',
            description: 'Bộ sưu tập hình ảnh minh họa và lâm sàng các triệu chứng bệnh truyền nhiễm.',
            images: ['https://epihouse.org/og-default.png'],
        },
    };
}

async function getImages() {
    const { data, error } = await supabase
        .from('symptom_images')
        .select('id, name, description, image_url, source_url, tags, type, created_at, disease_id, is_sensitive')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error('Error fetching symptom images:', error);
        return [];
    }

    return data || [];
}

async function getDiseases() {
    const { data, error } = await supabase
        .from('diseases')
        .select('id, name_vi, sort_order')
        .order('sort_order');

    if (error) {
        console.error('Error fetching diseases:', error);
        return [];
    }
    return data || [];
}

export default async function LibraryPage() {
    const [images, diseases] = await Promise.all([
        getImages(),
        getDiseases(),
    ]);

    const indexableCount = images.filter(img => !img.is_sensitive).length;
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Thư viện triệu chứng bệnh truyền nhiễm',
        description: 'Bộ sưu tập hình ảnh minh họa các triệu chứng bệnh truyền nhiễm phục vụ nghiên cứu y khoa.',
        url: 'https://epihouse.org/library',
        publisher: {
            '@type': 'Organization',
            name: 'EpiHouse',
        },
        mainEntity: {
            '@type': 'ImageGallery',
            name: 'Hình ảnh triệu chứng y khoa',
            numberOfItems: indexableCount,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            <LibraryClient
                images={images}
                diseases={diseases}
            />
        </>
    );
}
