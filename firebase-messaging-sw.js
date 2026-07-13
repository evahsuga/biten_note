// ================================
// Firebase Cloud Messaging Service Worker
// 美点発見note v2.0
// ================================

// Firebase SDK をインポート
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase設定（firebase-config.jsの本番設定と一致させる）
firebase.initializeApp({
    apiKey: "AIzaSyCXTjvd__i_8MYDbjGVK9o6nyi5eFFmCyk",
    authDomain: "biten-note-app.firebaseapp.com",
    projectId: "biten-note-app",
    storageBucket: "biten-note-app.firebasestorage.app",
    messagingSenderId: "862949639595",
    appId: "1:862949639595:web:b18a86e318b8ed8091feee"
});

// Firebase Messagingインスタンスを取得
const messaging = firebase.messaging();

// バックグラウンドメッセージの処理
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] バックグラウンドメッセージ受信:', payload);

    const notificationTitle = payload.notification?.title || '美点発見note';
    const notificationOptions = {
        body: payload.notification?.body || '新しいメッセージがあります',
        icon: './icons/icon-192.png',
        badge: './icons/icon-72.png',
        tag: 'biten-reminder',
        vibrate: [100, 50, 100],
        data: {
            url: payload.fcmOptions?.link || './'
        },
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

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] 通知クリック');

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const urlToOpen = event.notification.data?.url || './';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

console.log('[firebase-messaging-sw.js] FCM Service Worker 読み込み完了');
