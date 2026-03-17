import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
    const { pathname } = useLocation();

    // useLayoutEffect runs synchronously BEFORE the browser paints,
    // so the user never sees the old scroll position — no flicker/jump.
    useLayoutEffect(() => {
        window.scrollTo(0, 0);
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.scrollTop = 0;
    }, [pathname]);

    return null;
}
