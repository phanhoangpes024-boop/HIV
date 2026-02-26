import { createClient } from '../../utils/supabase/server';
import ForumClient from './ForumClient';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Diễn đàn | THE EPIDEMIC HOUSE',
    description: 'Diễn đàn cộng đồng y tế - Đặt câu hỏi, chia sẻ kinh nghiệm về bệnh truyền nhiễm',
};

async function getInitialPosts() {
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from('forum_posts')
            .select('*, user_profiles (display_name, avatar_url)')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(0, 9);
        return data || [];
    } catch {
        return [];
    }
}

export default async function ForumPage() {
    // Tạm ẩn phần diễn đàn
    redirect('/');

    /*
    const initialPosts = await getInitialPosts();
    return <ForumClient initialPosts={initialPosts} />;
    */
}