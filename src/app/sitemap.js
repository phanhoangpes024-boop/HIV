import { createClient } from '@supabase/supabase-js';
import { createSlugWithId } from '../lib/slugify';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function sitemap() {
    const baseUrl = "https://theepidemichouse.com";

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

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/forum`,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        ...articleEntries,
        ...guidelineEntries,
    ];
}
