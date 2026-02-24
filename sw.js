// ================================
// 美点発見note Service Worker
// v2.0 - リマインダー機能対応
// ================================

const CACHE_NAME = 'biten-note-v2.0';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/responsive.css',
    '/js/config.js',
    '/js/app.js',
    '/js/db.js',
    '/js/auth.js',
    '/js/person.js',
    '/js/biten.js',
    '/js/photo.js',
    '/js/pdf.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// ================================
// インストール時のキャッシュ
// ================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((error) => {
                console.error('[SW] Cache addAll failed:', error);
            })
    );
    // 即座にアクティブ化
    self.skipWaiting();
});

// ================================
// アクティベート時の古いキャッシュ削除
// ================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // 即座にクライアントを制御
    self.clients.claim();
});

// ================================
// フェッチ時のキャッシュ戦略
// Network First with Cache Fallback
// ================================
self.addEventListener('fetch', (event) => {
    // Firebase関連のリクエストはキャッシュしない
    if (event.request.url.includes('firebase') ||
        event.request.url.includes('googleapis') ||
        event.request.url.includes('firestore')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 成功したらキャッシュを更新
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // オフライン時はキャッシュから返す
                return caches.match(event.request);
            })
    );
});

// ================================
// プッシュ通知の受信
// ================================
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    let data = {
        title: '美点発見note',
        body: '今日も美点を発見しましょう！',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: 'biten-reminder',
        data: {
            url: '/'
        }
    };

    // プッシュデータがある場合はパース
    if (event.data) {
        try {
            const pushData = event.data.json();
            data = {
                ...data,
                ...pushData
            };
        } catch (e) {
            console.error('[SW] Push data parse error:', e);
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        vibrate: [100, 50, 100],
        data: data.data,
        actions: [
            {
                action: 'open',
                title: '開く'
            },
            {
                action: 'close',
                title: '閉じる'
            }
        ],
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ================================
// 通知クリック時の処理
// ================================
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');

    event.notification.close();

    // 閉じるアクションの場合は何もしない
    if (event.action === 'close') {
        return;
    }

    // ホーム画面を開く
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 既に開いているタブがあればフォーカス
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // 新しいウィンドウを開く
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// ================================
// 通知を閉じた時の処理
// ================================
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed');
    // 必要に応じて分析データを送信
});

// ================================
// バックグラウンド同期（将来の拡張用）
// ================================
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    if (event.tag === 'sync-bitens') {
        // オフラインで追加した美点をサーバーに同期
        event.waitUntil(syncOfflineData());
    }
});

async function syncOfflineData() {
    // 将来の実装用プレースホルダー
    console.log('[SW] Syncing offline data...');
}
