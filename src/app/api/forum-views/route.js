import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Cooldown 30 phút — cùng IP + cùng bài thì không đếm
const COOLDOWN_MINUTES = 30;

export async function POST(request) {
    try {
        const { postId } = await request.json();
        if (!postId) {
            return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
        }

        // Lấy IP
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

        // Check cooldown
        const cooldownTime = new Date();
        cooldownTime.setMinutes(cooldownTime.getMinutes() - COOLDOWN_MINUTES);

        const { data: recentView } = await supabase
            .from('forum_post_views')
            .select('id')
            .eq('post_id', postId)
            .eq('viewer_ip', ip)
            .gte('viewed_at', cooldownTime.toISOString())
            .limit(1);

        // Đã xem gần đây → bỏ qua
        if (recentView && recentView.length > 0) {
            return NextResponse.json({ counted: false, message: 'Đã đếm gần đây' });
        }

        // Ghi nhận lượt xem mới
        await supabase
            .from('forum_post_views')
            .insert({ post_id: postId, viewer_ip: ip });

        // Tăng views_count trong forum_posts
        const { data: post } = await supabase
            .from('forum_posts')
            .select('views_count')
            .eq('id', postId)
            .single();

        if (post) {
            await supabase
                .from('forum_posts')
                .update({ views_count: (post.views_count || 0) + 1 })
                .eq('id', postId);
        }

        return NextResponse.json({ counted: true });
    } catch (error) {
        console.error('Error tracking forum view:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}