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
        frequency: 'daily',        // daily, weekly3, weekly1, custom
        customDays: [],            // [0,1,2,3,4,5,6] 日曜=0
        timeSlot: 'evening',       // morning, afternoon, evening, custom
        customTime: '20:00',
        method: 'push',            // push, email, both
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

            // FCMトークンの取得（Firebase Cloud Messagingが設定されている場合）
            // 注: FCMの完全な設定にはCloud Functionsとの連携が必要
            Utils.log('通知許可取得成功');
            return true;
        } catch (error) {
            Utils.error('通知許可エラー', error);
            showToast('通知の設定中にエラーが発生しました', 'error');
            return null;
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

                <!-- iOSユーザー向け案内 -->
                ${this.renderIOSGuide()}

                <button class="btn btn-outline btn-block" onclick="App.navigate('#/settings')">
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
            daily: '毎日',
            weekly3: '週3回（月・水・金）',
            weekly1: '週1回',
            custom: 'カスタム'
        };
        const timeLabels = {
            morning: '朝（8:00）',
            afternoon: '昼（12:00）',
            evening: '夜（20:00）',
            custom: settings.customTime
        };
        const methodLabels = {
            push: '📱 プッシュ通知',
            email: '📧 メール通知',
            both: '📱+📧 両方'
        };

        return `
            <div class="notification-status enabled">
                <div class="status-item">
                    <span class="status-icon">✅</span>
                    <span class="status-text">${frequencyLabels[settings.frequency]} ${timeLabels[settings.timeSlot]}</span>
                </div>
                <div class="status-item">
                    <span class="status-icon">${methodLabels[settings.method].split(' ')[0]}</span>
                    <span class="status-text">${methodLabels[settings.method].split(' ').slice(1).join(' ')}</span>
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

            <!-- 通知頻度 -->
            <div class="form-section">
                <label class="form-label">通知する頻度</label>
                <div class="radio-group">
                    <label class="radio-option">
                        <input type="radio" name="notificationFrequency" value="daily" ${settings.frequency === 'daily' ? 'checked' : ''}>
                        <span>毎日</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="notificationFrequency" value="weekly3" ${settings.frequency === 'weekly3' ? 'checked' : ''}>
                        <span>週3回（月・水・金）</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="notificationFrequency" value="weekly1" ${settings.frequency === 'weekly1' ? 'checked' : ''}>
                        <span>週1回</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="notificationFrequency" value="custom" ${settings.frequency === 'custom' ? 'checked' : ''}>
                        <span>自分で曜日を選ぶ</span>
                    </label>
                </div>
                <div id="customDaysContainer" class="custom-days ${settings.frequency === 'custom' ? '' : 'hidden'}">
                    <div class="day-checkboxes">
                        ${['日', '月', '火', '水', '木', '金', '土'].map((day, i) => `
                            <label class="day-checkbox">
                                <input type="checkbox" name="customDay" value="${i}" ${settings.customDays.includes(i) ? 'checked' : ''}>
                                <span>${day}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- 通知時間 -->
            <div class="form-section">
                <label class="form-label">通知する時間</label>
                <div class="radio-group">
                    <label class="radio-option">
                        <input type="radio" name="notificationTime" value="morning" ${settings.timeSlot === 'morning' ? 'checked' : ''}>
                        <span>朝（8:00）</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="notificationTime" value="afternoon" ${settings.timeSlot === 'afternoon' ? 'checked' : ''}>
                        <span>昼（12:00）</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="notificationTime" value="evening" ${settings.timeSlot === 'evening' ? 'checked' : ''}>
                        <span>夜（20:00）</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="notificationTime" value="custom" ${settings.timeSlot === 'custom' ? 'checked' : ''}>
                        <span>自分で時間を選ぶ</span>
                    </label>
                </div>
                <div id="customTimeContainer" class="custom-time ${settings.timeSlot === 'custom' ? '' : 'hidden'}">
                    <input type="time" id="customTimeInput" value="${settings.customTime}" class="form-input">
                </div>
            </div>

            <!-- 通知方法 -->
            <div class="form-section">
                <label class="form-label">通知の方法</label>
                <div class="radio-group">
                    <label class="radio-option">
                        <input type="radio" name="notificationMethod" value="push" ${settings.method === 'push' ? 'checked' : ''}>
                        <span>📱 プッシュ通知（画面に表示・すぐ気づける）</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="notificationMethod" value="email" ${settings.method === 'email' ? 'checked' : ''}>
                        <span>📧 メール通知（自分のペースで確認）</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="notificationMethod" value="both" ${settings.method === 'both' ? 'checked' : ''}>
                        <span>📱+📧 両方</span>
                    </label>
                </div>
            </div>
        `;
    },

    // iOS向けガイド
    renderIOSGuide() {
        // iOS判定
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (!isIOS) return '';

        return `
            <div class="card ios-guide">
                <div class="card-body">
                    <h3>📱 iPhoneでプッシュ通知を受け取るには</h3>
                    <p>Safariで開き、「共有」→「ホーム画面に追加」してください。</p>
                    <ol>
                        <li>Safariの「共有」ボタン（□に↑）をタップ</li>
                        <li>「ホーム画面に追加」を選択</li>
                        <li>「追加」をタップ</li>
                    </ol>
                </div>
            </div>
        `;
    },

    // イベントリスナーの設定
    attachEventListeners() {
        // 頻度のカスタム表示切り替え
        document.querySelectorAll('input[name="notificationFrequency"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const container = document.getElementById('customDaysContainer');
                if (e.target.value === 'custom') {
                    container.classList.remove('hidden');
                } else {
                    container.classList.add('hidden');
                }
            });
        });

        // 時間のカスタム表示切り替え
        document.querySelectorAll('input[name="notificationTime"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const container = document.getElementById('customTimeContainer');
                if (e.target.value === 'custom') {
                    container.classList.remove('hidden');
                } else {
                    container.classList.add('hidden');
                }
            });
        });

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
        // 通知許可を確認
        const style = document.querySelector('input[name="notificationStyle"]:checked');
        const frequency = document.querySelector('input[name="notificationFrequency"]:checked');
        const timeSlot = document.querySelector('input[name="notificationTime"]:checked');
        const method = document.querySelector('input[name="notificationMethod"]:checked');

        if (!style || !frequency || !timeSlot || !method) {
            showToast('全ての項目を選択してください', 'error');
            return;
        }

        // プッシュ通知の場合は許可を確認
        if (method.value === 'push' || method.value === 'both') {
            const permissionGranted = await this.requestNotificationPermission();
            if (!permissionGranted) return;
        }

        // カスタム曜日の取得
        const customDays = [];
        if (frequency.value === 'custom') {
            document.querySelectorAll('input[name="customDay"]:checked').forEach(cb => {
                customDays.push(parseInt(cb.value));
            });
            if (customDays.length === 0) {
                showToast('少なくとも1日は選択してください', 'error');
                return;
            }
        }

        // カスタム時間の取得
        let customTime = '20:00';
        if (timeSlot.value === 'custom') {
            const timeInput = document.getElementById('customTimeInput');
            customTime = timeInput.value || '20:00';
        }

        const settings = {
            enabled: true,
            style: style.value,
            frequency: frequency.value,
            customDays: customDays,
            timeSlot: timeSlot.value,
            customTime: customTime,
            method: method.value
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
