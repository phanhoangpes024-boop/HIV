import { createClient } from '../../utils/supabase/server';
import { createSlugWithId } from '../../lib/slugify';
import NewsListClient from './NewsListClient';

async function fetchInitialData() {
    const supabase = await createClient();

    // Fetch articles (page 1, sort latest) - server side for SEO
    const { data: articles, error } = await supabase
        .from('articles')
        .select(`
            *,
            article_authors ( authors ( name ) ),
            article_tags ( tags ( name ) )
        `)
        .order('date', { ascending: false });

    if (error) {
        console.error('NewsListServer fetch error:', error);
        return { articles: [], allTags: [], allInstitutions: [] };
    }

    // Map articles
    const mapped = (articles || []).map(a => ({
        ...a,
        authors: a.article_authors?.map(x => x.authors?.name).filter(Boolean) || [],
        tags: a.article_tags?.map(x => x.tags?.name).filter(Boolean) || [],
        dateFormatted: new Date(a.date).toLocaleDateString('vi-VN'),
        dateRaw: a.date,
        // Remove nested joins to keep data clean
        article_authors: undefined,
        article_tags: undefined,
    }));

    // Fetch tags
    const { data: tagsData } = await supabase
        .from('tags')
        .select('name')
        .order('name');
    const allTags = (tagsData || []).map(t => t.name);

    // Derive unique institutions
    const allInstitutions = [...new Set(
        mapped.map(a => a.institution).filter(Boolean)
    )].sort();

    return { articles: mapped, allTags, allInstitutions };
}

export default async function NewsListServer() {
    const { articles, allTags, allInstitutions } = await fetchInitialData();

    return (
        <>
            <NewsListClient
                initialArticles={articles}
                allTags={allTags}
                allInstitutions={allInstitutions}
            />
        </>
    );
}
