'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import nProgress from 'nprogress';

// Cấu hình NProgress
nProgress.configure({
    showSpinner: false,
    speed: 400,
    minimum: 0.2,
    easing: 'ease',
});

export default function ProgressBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Khi pathname hoặc searchParams thay đổi -> Hoàn tất progress bar
        nProgress.done();
    }, [pathname, searchParams]);

    useEffect(() => {
        const handleAnchorClick = (event) => {
            const target = event.target.closest('a');

            // Chỉ bắt các link nội bộ (internal links)
            if (target && target.href && target.href.startsWith(window.location.origin)) {
                const currentUrl = window.location.href;
                const targetUrl = target.href;

                // Nếu click vào link khác trang hiện tại thì mới chạy bar
                if (currentUrl !== targetUrl) {
                    nProgress.start();
                }
            }
        };

        // Lắng nghe sự kiện click toàn cục
        document.addEventListener('click', handleAnchorClick);

        return () => {
            document.removeEventListener('click', handleAnchorClick);
        };
    }, []);

    return null;
}
