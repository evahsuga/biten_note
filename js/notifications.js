// ================================
// 美点発見note v2.0 - 通知設定
// ================================

const Notifications = {
    // 現在の設定
    currentSettings: null,

    // デフォルト設定
    defaultSettings: {
        enabled: false,
        style: 'friend',           // friend, coaching, festival
        frequency: 'daily',        // daily のみ
        customDays: [],            // 使用しない
        timeSlot: 'custom',        // custom のみ
        customTime: '20:00',
        method: 'email',           // email のみ
        email: null,               // メール通知用アドレス
        fcmToken: null,
        lastSentAt: null
    },

    // ================================
    // 初期化
    // ================================
    async init() {
        Utils.log('Notifications.init()');
        await this.loadSettings();
    },

    // ================================
    // 設定の読み込み
    // ================================
    async loadSettings() {
        try {
            const userId = Auth.getCurrentUserId();
            if (!userId) {
                this.currentSettings = { ...this.defaultSettings };
                return;
            }

            const doc = await db.collection('users').doc(userId)
                .collection('settings').doc('notifications').get();

            if (doc.exists) {
                this.currentSettings = { ...this.defaultSettings, ...doc.data() };
            } else {
                this.currentSettings = { ...this.defaultSettings };
            }

            Utils.log('通知設定読み込み完了', this.currentSettings);
        } catch (error) {
            Utils.error('通知設定読み込みエラー', error);
            this.currentSettings = { ...this.defaultSettings };
        }
    },

    // ================================
    // 設定の保存
    // ================================
    async saveSettings(settings) {
        try {
            const userId = Auth.getCurrentUserId();
            if (!userId) {
                showToast('ログインが必要です', 'error');
                return false;
            }

            const updatedSettings = {
                ...this.currentSettings,
                ...settings,
                updatedAt: new Date().toISOString()
            };

            await db.collection('users').doc(userId)
                .collection('settings').doc('notifications')
                .set(updatedSettings, { merge: true });

            this.currentSettings = updatedSettings;
            Utils.log('通知設定保存完了', updatedSettings);
            showToast('設定を保存しました', 'success');
            return true;
        } catch (error) {
            Utils.error('通知設定保存エラー', error);
            showToast('設定の保存に失敗しました', 'error');
            return false;
        }
    },

    // ================================
    // 通知をOFFにする
    // ================================
    async disableNotifications() {
        const confirmed = confirm('通知をOFFにしますか？\nいつでも再度ONにできます。');
        if (!confirmed) return;

        await this.saveSettings({ enabled: false });
        this.renderSettingsPage();
    },

    // ================================
    // FCMトークンの取得・登録
    // ================================
    async requestNotificationPermission() {
        try {
            // ブラウザ通知の許可を確認
            if (!('Notification' in window)) {
                showToast('このブラウザは通知に対応していません', 'error');
                return null;
            }

            let permission = Notification.permission;

            if (permission === 'denied') {
                showToast('通知がブロックされています。ブラウザの設定を確認してください', 'error');
                return null;
            }

            if (permission === 'default') {
                permission = await Notification.requestPermission();
            }

            if (permission !== 'granted') {
                showToast('通知の許可が必要です', 'error');
                return null;
            }

            Utils.log('通知許可取得成功');

            // FCMトークンの取得
            const fcmToken = await this.getFCMToken();
            if (fcmToken) {
                // Cloud Functionにトークンを登録
                await this.registerFCMToken(fcmToken);
            }

            return true;
        } catch (error) {
            Utils.error('通知許可エラー', error);
            showToast('通知の設定中にエラーが発生しました', 'error');
            return null;
        }
    },

    // FCMトークンを取得
    async getFCMToken() {
        try {
            // Firebase Messagingが利用可能か確認
            if (!firebase.messaging) {
                Utils.log('Firebase Messaging未対応');
                return null;
            }

            const messaging = firebase.messaging();

            // Service Workerの登録を確認
            const swRegistration = await navigator.serviceWorker.ready;
            Utils.log('Service Worker ready for FCM');

            // VAPIDキーは開発/本番で異なる場合があります
            // 現在は環境に応じて取得
            const vapidKey = this.getVAPIDKey();

            const token = await messaging.getToken({
                vapidKey: vapidKey,
                serviceWorkerRegistration: swRegistration
            });

            if (token) {
                Utils.log('FCMトークン取得成功', token.substring(0, 20) + '...');
                return token;
            } else {
                Utils.log('FCMトークン取得失敗: トークンなし');
                return null;
            }
        } catch (error) {
            Utils.error('FCMトークン取得エラー', error);
            // トークン取得失敗でも通知設定自体は続行
            return null;
        }
    },

    // VAPIDキーを取得（環境に応じて）
    getVAPIDKey() {
        // 本番用VAPIDキー（biten-note-app）
        // 開発環境でも本番キーを使用（FCMは同じプロジェクトで動作確認）
        return 'BJW71LS5rM79ss4IrZothktWC5S4fBdTecLSlEVuiE2UMDG-xcRiR2TuhxFMs0AYS2Rlp8iQqPY5mtYqyXVurGg';
    },

    // Cloud FunctionにFCMトークンを登録
    async registerFCMToken(fcmToken) {
        try {
            const userId = Auth.getCurrentUserId();
            if (!userId) {
                Utils.log('FCMトークン登録スキップ: 未ログイン');
                return false;
            }

            // 環境に応じたCloud Functions URL（v2形式）
            const isDev = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';

            const baseUrl = isDev
                ? 'https://registerfcmtoken-ijaeqvhvca-an.a.run.app'  // 開発用 (biten-note-dev)
                : 'https://registerfcmtoken-khpoqsgq7q-an.a.run.app';  // 本番用 (biten-note-app)

            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    fcmToken: fcmToken
                })
            });

            const result = await response.json();

            if (result.success) {
                Utils.log('FCMトークン登録成功');
                // ローカル設定にもトークンを保存
                this.currentSettings.fcmToken = fcmToken;
                return true;
            } else {
                Utils.error('FCMトークン登録失敗', result.error);
                return false;
            }
        } catch (error) {
            Utils.error('FCMトークン登録エラー', error);
            return false;
        }
    },

    // ================================
    // 設定画面のレンダリング
    // ================================
    renderSettingsPage() {
        const settings = this.currentSettings || this.defaultSettings;
        const isEnabled = settings.enabled;

        let html = `
            <div class="page notification-settings-page">
                <div class="page-header">
                    <h1 class="page-title">🔔 リマインダー設定</h1>
                    <p class="page-subtitle">美点発見のきっかけをお届けします</p>
                </div>

                <!-- 現在の設定状況 -->
                <div class="card notification-status-card">
                    <div class="card-header">
                        <h2 class="card-title">現在の設定</h2>
                    </div>
                    <div class="card-body">
                        ${isEnabled ? this.renderEnabledStatus(settings) : this.renderDisabledStatus()}
                    </div>
                </div>

                ${isEnabled ? this.renderEditForm(settings) : this.renderSetupForm()}

                <button class="btn btn-back" onclick="App.navigate('#/settings')">
                    ← 設定に戻る
                </button>
            </div>
        `;

        document.getElementById('app').innerHTML = html;
        this.attachEventListeners();
    },

    // 未設定時の表示
    renderDisabledStatus() {
        return `
            <div class="notification-status disabled">
                <p class="status-message">まだ設定されていません</p>
                <p class="status-description">
                    リマインダーを設定すると<br>
                    美点発見のきっかけをお届けします
                </p>
                <button class="btn btn-primary" onclick="Notifications.showSetupForm()">
                    設定してみる →
                </button>
            </div>
        `;
    },

    // 設定済み時の表示
    renderEnabledStatus(settings) {
        const styleLabels = {
            friend: '😊 友人スタイル',
            coaching: '🎯 コーチングスタイル',
            festival: '🎊 お祭りスタイル'
        };
        const frequencyLabels = {
            daily: '毎日'
        };
        const timeLabels = {
            custom: settings.customTime
        };
        const methodLabels = {
            email: '📧 メール通知'
        };

        return `
            <div class="notification-status enabled">
                <div class="status-item">
                    <span class="status-icon">⏰</span>
                    <span class="status-text">毎日 ${settings.customTime || timeLabels.custom} に配信</span>
                </div>
                <div class="status-item">
                    <span class="status-icon">📧</span>
                    <span class="status-text">メールで通知</span>
                </div>
                <div class="status-item">
                    <span class="status-icon">${styleLabels[settings.style].split(' ')[0]}</span>
                    <span class="status-text">${styleLabels[settings.style].split(' ').slice(1).join(' ')}</span>
                </div>
                <div class="status-actions">
                    <button class="btn btn-outline btn-sm" onclick="Notifications.showEditForm()">変更する</button>
                    <button class="btn btn-text btn-sm" onclick="Notifications.disableNotifications()">OFFにする</button>
                </div>
            </div>
        `;
    },

    // 初期設定フォーム
    renderSetupForm() {
        return `
            <div id="notificationSetupForm" class="card notification-form">
                <div class="card-header">
                    <h2 class="card-title">リマインダーを設定</h2>
                </div>
                <div class="card-body">
                    ${this.renderFormFields(this.defaultSettings)}

                    <div class="form-actions">
                        <button class="btn btn-primary btn-block" onclick="Notifications.saveFromForm()">
                            設定を保存
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // 編集フォーム
    renderEditForm(settings) {
        return `
            <div id="notificationEditForm" class="card notification-form">
                <div class="card-header">
                    <h2 class="card-title">設定を変更</h2>
                </div>
                <div class="card-body">
                    ${this.renderFormFields(settings)}

                    <div class="form-actions">
                        <button class="btn btn-primary btn-block" onclick="Notifications.saveFromForm()">
                            変更を保存
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // フォームフィールド
    renderFormFields(settings) {
        return `
            <!-- 通知スタイル -->
            <div class="form-section">
                <label class="form-label">通知スタイル</label>
                <div class="style-options">
                    <label class="style-option ${settings.style === 'friend' ? 'selected' : ''}">
                        <input type="radio" name="notificationStyle" value="friend" ${settings.style === 'friend' ? 'checked' : ''}>
                        <div class="style-content">
                            <span class="style-emoji">😊</span>
                            <span class="style-name">友人スタイル</span>
                            <span class="style-desc">親しみやすい・カジュアル</span>
                        </div>
                    </label>
                    <label class="style-option ${settings.style === 'coaching' ? 'selected' : ''}">
                        <input type="radio" name="notificationStyle" value="coaching" ${settings.style === 'coaching' ? 'checked' : ''}>
                        <div class="style-content">
                            <span class="style-emoji">🎯</span>
                            <span class="style-name">コーチングスタイル</span>
                            <span class="style-desc">やさしく・前向きに</span>
                        </div>
                    </label>
                    <label class="style-option ${settings.style === 'festival' ? 'selected' : ''}">
                        <input type="radio" name="notificationStyle" value="festival" ${settings.style === 'festival' ? 'checked' : ''}>
                        <div class="style-content">
                            <span class="style-emoji">🎊</span>
                            <span class="style-name">お祭りスタイル</span>
                            <span class="style-desc">元気・テンション高め</span>
                        </div>
                    </label>
                </div>
            </div>

            <!-- 通知頻度（毎日固定） -->
            <input type="hidden" name="notificationFrequency" value="daily">

            <!-- 通知時間（正時のみ選択可能） -->
            <div class="form-section">
                <label class="form-label">通知する時間</label>
                <input type="hidden" name="notificationTime" value="custom">
                <div class="time-select-container">
                    <select id="customTimeSelect" class="form-select time-select">
                        ${Array.from({length: 24}, (_, i) => {
                            const hour = String(i).padStart(2, '0');
                            const time = hour + ':00';
                            const selected = settings.customTime === time ? 'selected' : '';
                            return `<option value="${time}" ${selected}>${hour}:00</option>`;
                        }).join('')}
                    </select>
                </div>
            </div>

            <!-- 通知方法（メールのみ） -->
            <div class="form-section">
                <label class="form-label">通知の方法</label>
                <input type="hidden" name="notificationMethod" value="email">
                <div class="email-notification-info">
                    <div class="email-icon">📧</div>
                    <div class="email-text">
                        <p class="email-method">メール通知</p>
                        <p class="email-hint">アカウント登録のメールへ届きます</p>
                    </div>
                </div>
            </div>
        `;
    },

    // イベントリスナーの設定
    attachEventListeners() {
        // スタイル選択のハイライト
        document.querySelectorAll('.style-option input').forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.style-option').forEach(opt => opt.classList.remove('selected'));
                radio.closest('.style-option').classList.add('selected');
            });
        });
    },

    // フォームから設定を保存
    async saveFromForm() {
        const style = document.querySelector('input[name="notificationStyle"]:checked');
        const timeSelect = document.getElementById('customTimeSelect');

        if (!style) {
            showToast('通知スタイルを選択してください', 'error');
            return;
        }

        // メールアドレスの確認
        const user = Auth.getCurrentUser();
        if (!user || !user.email) {
            showToast('メール通知にはアカウント登録が必要です', 'error');
            return;
        }

        // 時間の取得（selectから）
        const customTime = timeSelect ? timeSelect.value : '20:00';

        const settings = {
            enabled: true,
            style: style.value,
            frequency: 'daily',
            customDays: [],
            timeSlot: 'custom',
            customTime: customTime,
            method: 'email',
            email: user.email
        };

        const success = await this.saveSettings(settings);
        if (success) {
            this.renderSettingsPage();
        }
    },

    // 設定フォームを表示
    showSetupForm() {
        const form = document.getElementById('notificationSetupForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth' });
        }
    },

    // 編集フォームを表示
    showEditForm() {
        const form = document.getElementById('notificationEditForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }
};

// グローバルに公開
window.Notifications = Notifications;
