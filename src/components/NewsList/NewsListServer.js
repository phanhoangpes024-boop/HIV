import { createClient } from '../../utils/supabase/server';
import NewsListClient from './NewsListClient';

async function fetchFilterData() {
    const supabase = await createClient();

    // Only fetch lightweight filter data server-side (tags + institutions)
    // Articles will be fetched client-side to avoid blocking page render
    const [tagsResult, institutionsResult] = await Promise.all([
        supabase.from('tags').select('name').order('name'),
        supabase.from('articles').select('institution'),
    ]);

    const allTags = (tagsResult.data || []).map(t => t.name);
    const allInstitutions = [...new Set(
        (institutionsResult.data || []).map(a => a.institution).filter(Boolean)
    )].sort();

    return { allTags, allInstitutions };
}

export default async function NewsListServer() {
    const { allTags, allInstitutions } = await fetchFilterData();

    return (
        <NewsListClient
            allTags={allTags}
            allInstitutions={allInstitutions}
        />
    );
}
