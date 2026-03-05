// ═══════════════════════════════════════════
// Service Worker - كرتون ميكر PWA
// ═══════════════════════════════════════════

const CACHE_NAME = 'cartoon-maker-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './config/app-theme.css',
    './config/app-strings.js',
    './config/theme-controller.js',
    './screens/home-screen.js',
    './screens/cartoon-screen.js',
    './screens/enhance-screen.js',
    './services/cartoon-service.js',
    './services/enhance-service.js',
    './services/image-service.js',
    './widgets/image-picker-button.js',
    './widgets/before-after-view.js',
    './widgets/action-buttons.js',
    './widgets/loading-overlay.js',
    './utils/image-utils.js',
];

// ─── التثبيت: تخزين الملفات الثابتة ───
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ─── التفعيل: حذف الكاش القديم ───
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// ─── الاعتراض: استراتيجية التخزين المؤقت ───
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API requests → Network First
    if (url.hostname.includes('workers.dev') || url.hostname.includes('replicate.com')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Static assets → Cache First
    event.respondWith(cacheFirst(request));
});

// ─── Cache First (للملفات الثابتة) ───
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // إذا كان أوفلاين وليس في الكاش
        return new Response('غير متصل بالإنترنت', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

// ─── Network First (لطلبات API) ───
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;

        return new Response(JSON.stringify({
            error: 'لا يوجد اتصال بالإنترنت. يرجى المحاولة لاحقاً.'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}
