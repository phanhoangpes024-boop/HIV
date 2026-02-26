
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function getEnv(key) {
    const env = fs.readFileSync('.env', 'utf8');
    const match = env.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
}

const supabase = createClient(
    getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
);

async function checkCols() {
    console.log('--- Articles ---');
    try {
        const { data: article, error } = await supabase.from('articles').select('*').limit(1).single();
        if (error) console.error('Articles error:', error);
        if (article) console.log(Object.keys(article));
    } catch (e) {
        console.error('Articles catch:', e);
    }

    console.log('\n--- Diseases ---');
    try {
        const { data: disease, error } = await supabase.from('diseases').select('*').limit(1).single();
        if (error) console.error('Diseases error:', error);
        if (disease) console.log(Object.keys(disease));
    } catch (e) {
        console.error('Diseases catch:', e);
    }
}

checkCols();
