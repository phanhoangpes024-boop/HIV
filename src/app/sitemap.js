import { createClient } from '@supabase/supabase-js';
import { createSlugWithId } from '../lib/slugify';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function sitemap() {
    const baseUrl = "https://epihouse.org";

    // Fetch articles
    const { data: articles } = await supabase.from('articles').select('id, title, date');
    const articleEntries = (articles || []).map((article) => ({
        url: `${baseUrl}/news/${createSlugWithId(article.title, article.id)}`,
        lastModified: new Date(article.date),
        changeFrequency: 'weekly',
        priority: 0.7,
    }));

    // Fetch guidelines (diseases)
    const { data: diseases } = await supabase.from('diseases').select('id, name_vi, updated_at');
    const guidelineEntries = (diseases || []).map((d) => ({
        url: `${baseUrl}/guidelines/${createSlugWithId(d.name_vi, d.id)}`,
        lastModified: new Date(d.updated_at || new Date()),
        changeFrequency: 'monthly',
        priority: 0.8,
    }));

    // Fetch library images (non-sensitive only for indexing)
    const { data: symptomImages } = await supabase
        .from('symptom_images')
        .select('name, description, image_url, is_sensitive, created_at')
        .eq('is_sensitive', false)
        .order('created_at', { ascending: false });

    const libraryImages = (symptomImages || [])
        .filter((img) => img.image_url)
        .map((img) => img.image_url);

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/guidelines`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/library`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
            images: libraryImages,
        },
        ...articleEntries,
        ...guidelineEntries,
    ];
}
