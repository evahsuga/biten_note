// ================================
// 美点発見note Service Worker
// v2.0 - リマインダー機能対応
// ================================

const CACHE_NAME = 'biten-note-v2.0.1';

// 相対パスで指定（GitHub Pagesサブディレクトリ対応）
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './css/responsive.css',
    './css/notifications.css',
    './js/config.js',
    './js/firebase-config.js',
    './js/auth.js',
    './js/db.js',
    './js/db-local.js',
    './js/app.js',
    './js/person.js',
    './js/biten.js',
    './js/photo.js',
    './js/pdf.js',
    './js/notifications.js',
    './js/notification-messages.js'
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
                // 個別にキャッシュして失敗を許容
                return Promise.allSettled(
                    STATIC_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn('[SW] Failed to cache:', url, err.message);
                        })
                    )
                );
            })
            .catch((error) => {
                console.error('[SW] Cache open failed:', error);
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
    const url = event.request.url;

    // http/https以外のスキームはスキップ（chrome-extension等）
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return;
    }

    // Firebase関連のリクエストはキャッシュしない
    if (url.includes('firebase') ||
        url.includes('googleapis') ||
        url.includes('firestore') ||
        url.includes('gstatic')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 成功したらキャッシュを更新（GETリクエストのみ）
                if (response.status === 200 && event.request.method === 'GET') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseClone).catch(() => {
                                // キャッシュ保存失敗は無視
                            });
                        })
                        .catch(() => {
                            // キャッシュオープン失敗は無視
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
        icon: './icons/icon-192.png',
        badge: './icons/icon-72.png',
        tag: 'biten-reminder',
        data: {
            url: './'
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
    const urlToOpen = event.notification.data?.url || './';

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
