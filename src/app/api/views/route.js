import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Thời gian tối thiểu giữa 2 lượt xem từ cùng 1 IP (phút)
const COOLDOWN_MINUTES = 30;

export async function POST(request) {
    try {
        const { articleId } = await request.json();
        if (!articleId) {
            return NextResponse.json({ error: 'Missing articleId' }, { status: 400 });
        }

        // Lấy IP từ headers
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

        // Kiểm tra xem IP này đã xem bài này trong COOLDOWN_MINUTES phút gần đây chưa
        const cooldownTime = new Date();
        cooldownTime.setMinutes(cooldownTime.getMinutes() - COOLDOWN_MINUTES);

        const { data: recentView } = await supabase
            .from('article_views')
            .select('id')
            .eq('article_id', articleId)
            .eq('viewer_ip', ip)
            .gte('viewed_at', cooldownTime.toISOString())
            .limit(1);

        // Nếu đã xem gần đây → bỏ qua, không tăng view
        if (recentView && recentView.length > 0) {
            return NextResponse.json({ counted: false, message: 'View already counted recently' });
        }

        // Ghi nhận lượt xem mới
        await supabase
            .from('article_views')
            .insert({ article_id: articleId, viewer_ip: ip });

        // Tăng views trong bảng articles
        const { data: article } = await supabase
            .from('articles')
            .select('views')
            .eq('id', articleId)
            .single();

        if (article) {
            await supabase
                .from('articles')
                .update({ views: (article.views || 0) + 1 })
                .eq('id', articleId);
        }

        return NextResponse.json({ counted: true });
    } catch (error) {
        console.error('Error tracking view:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}