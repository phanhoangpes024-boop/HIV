import { createClient } from '../../utils/supabase/server';
import NewsListClient from './NewsListClient';

async function fetchInitialData() {
    const supabase = await createClient();

    // Run all queries in parallel for faster server response
    const [articlesResult, tagsResult, countResult] = await Promise.all([
        // Fetch only first page (10 articles) for fast initial render
        supabase
            .from('articles')
            .select(`
                *,
                article_authors ( authors ( name ) ),
                article_tags ( tags ( name ) )
            `)
            .order('date', { ascending: false })
            .limit(10),

        // Fetch tags
        supabase
            .from('tags')
            .select('name')
            .order('name'),

        // Fetch total count
        supabase
            .from('articles')
            .select('*', { count: 'exact', head: true }),
    ]);

    if (articlesResult.error) {
        console.error('NewsListServer fetch error:', articlesResult.error);
        return { articles: [], allTags: [], allInstitutions: [], totalCount: 0 };
    }

    // Map articles
    const mapped = (articlesResult.data || []).map(a => ({
        ...a,
        authors: a.article_authors?.map(x => x.authors?.name).filter(Boolean) || [],
        tags: a.article_tags?.map(x => x.tags?.name).filter(Boolean) || [],
        dateFormatted: new Date(a.date).toLocaleDateString('vi-VN'),
        dateRaw: a.date,
        article_authors: undefined,
        article_tags: undefined,
    }));

    const allTags = (tagsResult.data || []).map(t => t.name);

    // Derive institutions from initial batch
    const allInstitutions = [...new Set(
        mapped.map(a => a.institution).filter(Boolean)
    )].sort();

    return {
        articles: mapped,
        allTags,
        allInstitutions,
        totalCount: countResult.count || mapped.length,
    };
}

export default async function NewsListServer() {
    const { articles, allTags, allInstitutions, totalCount } = await fetchInitialData();

    return (
        <>
            <NewsListClient
                initialArticles={articles}
                allTags={allTags}
                allInstitutions={allInstitutions}
                initialTotalCount={totalCount}
            />
        </>
    );
}
