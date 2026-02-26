import { createClient } from '@supabase/supabase-js';
import PostDetail from '../components/PostDetail';
import '../Forum.css';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function generateMetadata({ params }) {
    const { id } = await params;
    const { data: post } = await supabase
        .from('forum_posts')
        .select('title, content')
        .eq('id', id)
        .single();

    if (!post) return { title: 'Không tìm thấy | Diễn đàn' };

    return {
        title: `${post.title} | Diễn đàn THE EPIDEMIC HOUSE`,
        description: post.content?.substring(0, 160),
    };
}

export default async function ForumPostPage({ params }) {
    const { id } = await params;
    return <PostDetail postId={Number(id)} />;
}