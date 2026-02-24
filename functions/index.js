/**
 * 美点発見note v2.0 - Cloud Functions
 * リマインダー通知のスケジュール送信
 */

const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Firebase Admin初期化
admin.initializeApp();

// グローバル設定
setGlobalOptions({
    maxInstances: 10,
    region: "asia-northeast1" // 東京リージョン
});

// Firestoreインスタンス
const db = getFirestore();

// ================================
// メッセージテンプレート
// ================================
const MESSAGES = {
    triggers: {
        friend: {
            morning: [
                'おはよう！今日も誰かの美点、見つけてみない？☀️',
                '朝からいい気分になれること、一つ記録してみよう！',
                'おはよう〜！今日はどんな美点に出会えるかな？',
                '新しい一日のスタート！美点発見もスタートしよう😊',
                '朝の美点発見で、一日をポジティブに始めよう！'
            ],
            afternoon: [
                'ちょっと休憩がてら、美点発見はどう？',
                'ねえ、今日も美点見つけた？😊',
                'お昼休み、美点を一つ記録してみない？',
                '午後も元気に！美点発見でリフレッシュ✨',
                'ちょっと一息、美点ノートを開いてみて'
            ],
            evening: [
                '今日一日、誰かの良いとこ気づいた？夜に記録しよう！',
                '一日の終わりに、ちょっとだけ美点ノート開いてみて✨',
                'おつかれさま！今日の美点、記録した？',
                '夜のリラックスタイムに美点発見😊',
                '今日あった良いこと、美点ノートに残そう'
            ]
        },
        coaching: {
            morning: [
                '今日も一つ、誰かの良いところを記録してみましょう',
                '朝の美点発見が、一日を豊かにします',
                '新しい一日、新しい発見のチャンスです',
                '朝の習慣として、美点発見を始めてみませんか',
                '今日という日に、誰かの良さを見つけましょう'
            ],
            afternoon: [
                '今日の美点を記録する時間です',
                '誰かの素敵なところを、言葉にしてみましょう',
                '午後のひととき、美点発見で心をリフレッシュ',
                '今日出会った人の良いところ、思い出してみてください',
                '美点を記録することで、見る目が養われます'
            ],
            evening: [
                '今日一日を振り返り、美点を記録してみてください',
                '一日の終わりに、感謝の気持ちを言葉にしましょう',
                '今日の美点発見を、明日への糧に',
                '振り返りの時間に、誰かの良いところを思い出してみましょう',
                '今日あった素敵な出来事を、美点として記録してみてください'
            ]
        },
        festival: {
            morning: [
                '今日も美点発見スタート！いってらっしゃい🎉',
                'おはよう！今日もいい発見があるよ！絶対！🌟',
                '朝から元気に美点発見！！☀️',
                '今日も最高の一日にしよう！美点発見でGO！🚀',
                'おっはよー！美点発見で朝からハッピー🎊'
            ],
            afternoon: [
                '美点発見タイム！今日も盛り上がっていこう！🎊',
                'ちょっと一息！美点ノートを開こう！🚀',
                '午後も元気に美点発見！！✨',
                'さあ、美点発見の時間だよ！🎉',
                '今日の美点、もう見つけた？早く記録しよう！'
            ],
            evening: [
                '今日も美点発見で締めくくろう！！🎆',
                '一日お疲れ様！美点を記録して最高の一日に！✨',
                '夜だ！美点発見タイムだ！！🌙',
                '今日の美点、全部記録した？最後までいくよ！🎉',
                'おつかれ〜！美点発見で一日をハッピーエンドに！'
            ]
        }
    },
    recordCount: [
        '${count}件の美点発見、達成中！素晴らしい継続力です✨',
        'あなたの美点ノートに${count}個の輝きが集まっています🌟',
        'これまでに${count}件の美点を発見！あなたの観察眼は宝物です',
        '${count}個の美点を記録したあなた、人の良さを見つける達人です！',
        '${count}件達成！コツコツ続けることが大切ですね✨'
    ],
    milestone: {
        7: '7日間継続！素晴らしいスタートです🎉',
        14: '2週間達成！習慣化への道を歩んでいます✨',
        21: '21日間達成！習慣化まであと少しです🌟',
        30: '30日達成！美点発見が習慣になってきましたね！',
        50: '50日達成！あなたは美点発見の達人です🏆',
        100: '100日達成！継続する力が人生を変えます✨',
        365: '1年間達成！おめでとうございます！🎊🎊🎊'
    }
};

// ================================
// ユーティリティ関数
// ================================

/**
 * 時間帯を判定
 */
function getTimeSlot(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    return 'evening';
}

/**
 * 通知時間を取得（時間のみ）
 */
function getNotificationHour(settings) {
    const timeSlotHours = {
        morning: 8,
        afternoon: 12,
        evening: 20
    };

    if (settings.timeSlot === 'custom' && settings.customTime) {
        const [hour] = settings.customTime.split(':').map(Number);
        return hour;
    }

    return timeSlotHours[settings.timeSlot] || 20;
}

/**
 * 今日が通知日かチェック
 */
function isNotificationDay(settings) {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=日曜, 1=月曜...

    switch (settings.frequency) {
        case 'daily':
            return true;
        case 'weekly3':
            // 月水金 = 1, 3, 5
            return [1, 3, 5].includes(dayOfWeek);
        case 'weekly1':
            // 月曜のみ
            return dayOfWeek === 1;
        case 'custom':
            return settings.customDays?.includes(dayOfWeek) || false;
        default:
            return false;
    }
}

/**
 * 本日すでに送信済みかチェック
 */
function isAlreadySentToday(lastSentAt) {
    if (!lastSentAt) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastSent = lastSentAt.toDate ? lastSentAt.toDate() : new Date(lastSentAt);
    lastSent.setHours(0, 0, 0, 0);

    return lastSent.getTime() === today.getTime();
}

/**
 * メッセージを生成
 */
function generateMessage(settings, userData) {
    const { style = 'friend' } = settings;
    const { recordCount = 0, continueDays = 0, lastMessages = [] } = userData;

    // マイルストーンチェック
    if (MESSAGES.milestone[continueDays]) {
        return {
            type: 'milestone',
            message: MESSAGES.milestone[continueDays]
        };
    }

    // 時間帯を取得
    const hour = new Date().getHours();
    const timeSlot = getTimeSlot(hour);

    // メッセージタイプを決定
    const rand = Math.random();
    let candidates;
    let messageType;

    if (recordCount > 0 && rand < 0.2) {
        // 20%の確率で記録数メッセージ
        messageType = 'recordCount';
        candidates = MESSAGES.recordCount.map(m =>
            m.replace('${count}', recordCount.toString())
        );
    } else {
        // 通常のきっかけメッセージ
        messageType = 'trigger';
        candidates = MESSAGES.triggers[style]?.[timeSlot] ||
            MESSAGES.triggers.friend.evening;
    }

    // 直近3回を除外
    const filtered = candidates.filter(m => !lastMessages.includes(m));
    const finalCandidates = filtered.length > 0 ? filtered : candidates;

    // ランダム選択
    const message = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];

    return { type: messageType, message };
}

/**
 * ユーザーの統計情報を取得
 */
async function getUserStats(userId) {
    try {
        // 美点の総数を取得
        const bitensSnapshot = await db.collection('users').doc(userId)
            .collection('bitens').count().get();
        const recordCount = bitensSnapshot.data().count;

        // 通知履歴から直近3件のメッセージを取得
        const historySnapshot = await db.collection('users').doc(userId)
            .collection('notificationHistory')
            .orderBy('sentAt', 'desc')
            .limit(3)
            .get();

        const lastMessages = historySnapshot.docs.map(doc => doc.data().message);

        // 継続日数（簡易実装：最初の美点からの日数）
        const firstBitenSnapshot = await db.collection('users').doc(userId)
            .collection('bitens')
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();

        let continueDays = 0;
        if (!firstBitenSnapshot.empty) {
            const firstBiten = firstBitenSnapshot.docs[0].data();
            const firstDate = firstBiten.createdAt?.toDate?.() || new Date(firstBiten.createdAt);
            const today = new Date();
            continueDays = Math.floor((today - firstDate) / (1000 * 60 * 60 * 24));
        }

        return { recordCount, continueDays, lastMessages };
    } catch (error) {
        logger.error('getUserStats error:', error);
        return { recordCount: 0, continueDays: 0, lastMessages: [] };
    }
}

/**
 * FCMプッシュ通知を送信
 */
async function sendPushNotification(fcmToken, title, body) {
    if (!fcmToken) {
        logger.warn('FCM token is missing');
        return false;
    }

    try {
        const message = {
            token: fcmToken,
            notification: {
                title,
                body
            },
            webpush: {
                notification: {
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-72.png',
                    tag: 'biten-reminder',
                    requireInteraction: false
                },
                fcmOptions: {
                    link: '/'
                }
            }
        };

        await getMessaging().send(message);
        logger.info('Push notification sent successfully');
        return true;
    } catch (error) {
        logger.error('Push notification error:', error);
        return false;
    }
}

/**
 * 通知履歴を保存
 */
async function saveNotificationHistory(userId, messageData) {
    try {
        const historyRef = db.collection('users').doc(userId)
            .collection('notificationHistory').doc();

        await historyRef.set({
            ...messageData,
            sentAt: FieldValue.serverTimestamp(),
            opened: false
        });

        // 最終送信日時を更新
        await db.collection('users').doc(userId)
            .collection('settings').doc('notifications')
            .update({
                lastSentAt: FieldValue.serverTimestamp()
            });

        return true;
    } catch (error) {
        logger.error('saveNotificationHistory error:', error);
        return false;
    }
}

// ================================
// スケジュール関数: 毎時0分に実行
// ================================
exports.sendScheduledNotifications = onSchedule({
    schedule: "0 * * * *", // 毎時0分
    timeZone: "Asia/Tokyo",
    retryCount: 3
}, async (event) => {
    logger.info("sendScheduledNotifications started");

    const currentHour = new Date().getHours();
    const processedUsers = [];
    const errors = [];

    try {
        // 全ユーザーを取得
        const usersSnapshot = await db.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;

            try {
                // 通知設定を取得
                const settingsDoc = await db.collection('users').doc(userId)
                    .collection('settings').doc('notifications').get();

                if (!settingsDoc.exists) continue;

                const settings = settingsDoc.data();

                // 通知が無効ならスキップ
                if (!settings.enabled) continue;

                // 今日が通知日かチェック
                if (!isNotificationDay(settings)) continue;

                // 設定時刻と一致するかチェック
                const notificationHour = getNotificationHour(settings);
                if (currentHour !== notificationHour) continue;

                // 本日すでに送信済みかチェック
                if (isAlreadySentToday(settings.lastSentAt)) continue;

                // ユーザー統計を取得
                const userStats = await getUserStats(userId);

                // メッセージを生成
                const { type, message } = generateMessage(settings, userStats);

                // 通知を送信
                let sent = false;

                if (settings.method === 'push' || settings.method === 'both') {
                    sent = await sendPushNotification(
                        settings.fcmToken,
                        '美点発見note',
                        message
                    );
                }

                // メール通知（将来実装）
                if (settings.method === 'email' || settings.method === 'both') {
                    // TODO: メール送信実装
                    logger.info('Email notification not implemented yet');
                }

                // 履歴を保存
                if (sent || settings.method === 'email') {
                    await saveNotificationHistory(userId, {
                        type,
                        message,
                        method: settings.method
                    });
                    processedUsers.push(userId);
                }

            } catch (userError) {
                logger.error(`Error processing user ${userId}:`, userError);
                errors.push({ userId, error: userError.message });
            }
        }

        logger.info("sendScheduledNotifications completed", {
            processedCount: processedUsers.length,
            errorCount: errors.length
        });

    } catch (error) {
        logger.error("sendScheduledNotifications failed:", error);
        throw error;
    }
});

// ================================
// テスト用エンドポイント（開発時のみ使用）
// ================================
exports.testNotification = onRequest({
    cors: true,
    invoker: "public"
}, async (req, res) => {
    // 開発環境チェック
    const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
    if (!projectId?.includes('dev')) {
        res.status(403).json({ error: 'Test endpoint is only available in development' });
        return;
    }

    const { userId, fcmToken } = req.body;

    if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
    }

    try {
        // ユーザー統計を取得
        const userStats = await getUserStats(userId);

        // メッセージを生成
        const settings = { style: 'friend' };
        const { type, message } = generateMessage(settings, userStats);

        // FCMトークンがあればプッシュ通知も送信
        if (fcmToken) {
            await sendPushNotification(fcmToken, '美点発見note', message);
        }

        res.json({
            success: true,
            type,
            message,
            userStats
        });
    } catch (error) {
        logger.error('testNotification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================================
// FCMトークン登録用エンドポイント
// ================================
exports.registerFcmToken = onRequest({
    cors: true,
    invoker: "public"
}, async (req, res) => {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
        res.status(400).json({ error: 'userId and fcmToken are required' });
        return;
    }

    try {
        await db.collection('users').doc(userId)
            .collection('settings').doc('notifications')
            .set({
                fcmToken,
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });

        res.json({ success: true });
    } catch (error) {
        logger.error('registerFcmToken error:', error);
        res.status(500).json({ error: error.message });
    }
});
