// ================================
// 美点発見note Phase 1.5 - アプリケーション起動・ルーティング
// ================================

const App = {
    currentRoute: null,
    authUnsubscribe: null,

    // アプリケーション初期化
    async init() {
        try {
            Utils.log('アプリケーション初期化開始');
            showLoading();

            // Firestore初期化
            await DB.init();
            Utils.log('データベース初期化完了');

            // 認証状態の監視開始
            this.authUnsubscribe = Auth.onAuthStateChanged((user) => {
                Utils.log('認証状態変化検出', user ? user.email : 'ログアウト');

                if (user) {
                    // ログイン済み: メイン画面へ
                    this.setupRouting();
                    this.handleRoute();
                } else {
                    // 未ログイン: ログイン不要ページかチェック
                    const hash = window.location.hash || '#/';
                    if (hash === '#/privacy' || hash === '#/terms') {
                        // プライバシーポリシー・利用規約はログイン不要
                        this.setupRouting();
                        this.handleRoute();
                    } else {
                        // その他はログイン画面表示
                        this.renderLogin();
                    }
                }

                hideLoading();
            });

            Utils.log('アプリケーション初期化完了');
        } catch (error) {
            Utils.error('アプリケーション初期化エラー', error);
            hideLoading();
            showToast('エラーが発生しました', 'error');
        }
    },
    
    // ルーティング設定
    setupRouting() {
        // ハッシュ変更イベント
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });
        
        // 戻るボタン対応
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
    },
    
    // ルート処理
    async handleRoute() {
        const hash = window.location.hash || '#/';
        this.currentRoute = hash;

        Utils.log('ルート変更', hash);

        // ログイン不要ページのチェック
        const publicPages = ['#/privacy', '#/terms'];
        const isPublicPage = publicPages.includes(hash);

        // ログイン不要ページの場合
        if (isPublicPage) {
            if (hash === '#/privacy') {
                await this.renderPrivacy();
            } else if (hash === '#/terms') {
                await this.renderTerms();
            }
            window.scrollTo(0, 0);
            return;
        }

        // 以下は認証が必要なページ
        // ルートに応じた画面表示
        if (hash === '#/' || hash === '') {
            await this.renderHome();
        } else if (hash === '#/persons') {
            await this.renderPersons();
        } else if (hash.startsWith('#/person/new')) {
            await this.renderPersonNew();
        } else if (hash.startsWith('#/person/')) {
            const personId = hash.split('/')[2];
            await this.renderPersonDetail(personId);
        } else if (hash.startsWith('#/biten/new')) {
            const params = new URLSearchParams(hash.split('?')[1]);
            const personId = params.get('personId');
            await this.renderBitenNew(personId);
        } else if (hash === '#/guide') {
            await this.renderGuide();
            // 使い方ページは確実に最上部へスクロール
            window.scrollTo(0, 0);
            return;
        } else if (hash === '#/settings') {
            await this.renderSettings();
        } else {
            // 不明なルートはホームへ
            this.navigate('#/');
        }

        // 画面トップへスクロール
        window.scrollTo(0, 0);
    },
    
    // ナビゲーション
    navigate(hash) {
        window.location.hash = hash;
    },
    
    // ===========================
    // 画面レンダリング
    // ===========================
    
    // ホーム画面
    async renderHome() {
        try {
            const stats = await DB.getStats();
            const persons = await DB.getAllPersons();
            
            const html = `
                <div class="page">
                    <div class="page-header">
                        <h1 class="page-title">美点発見note</h1>
                        <p class="page-subtitle">大切な人の美点を記録しよう</p>
                    </div>
                    
                    <!-- 統計情報 -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <span class="stat-value">${stats.totalPersons}</span>
                            <span class="stat-label">登録人数</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${stats.totalBitens}</span>
                            <span class="stat-label">美点発見総数</span>
                        </div>
                    </div>
                    
                    <!-- メインアクション -->
                    <div class="card">
                        <div class="card-body">
                            <button class="btn btn-primary btn-block mb-md" onclick="App.navigate('#/person/new')">
                                ✨ 新しい人を追加
                            </button>
                            <button class="btn btn-secondary btn-block mb-md" onclick="App.navigate('#/persons')">
                                👥 人物一覧を見る
                            </button>
                            ${persons.length > 0 ? `
                                <button class="btn btn-outline btn-block mb-md" onclick="PDF.generatePDF()">
                                    📄 PDFで出力
                                </button>
                            ` : ''}
                            <button class="btn btn-outline btn-block" onclick="App.navigate('#/guide')">
                                📖 使い方
                            </button>
                        </div>
                    </div>

                    <!-- フィードバックリンク -->
                    <div class="card" style="margin-top: 16px;">
                        <div class="card-body">
                            <a href="https://docs.google.com/forms/d/e/1FAIpQLScPTrRUlyQ5O5xAWK4nwuGktK4XcfhHYe-aSQZI6yPGbSEsZQ/viewform"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="btn btn-outline btn-block"
                               style="text-decoration: none;">
                                💬 ご意見・ご感想をお聞かせください
                            </a>
                        </div>
                    </div>

                    <!-- 設定・ログアウトボタン -->
                    <div class="card" style="margin-top: 16px;">
                        <div class="card-body">
                            <button class="btn btn-outline btn-block mb-md" onclick="App.navigate('#/settings')">
                                ⚙️ 設定
                            </button>
                            <button class="btn btn-outline btn-block" onclick="App.handleLogout()" style="color: var(--error);">
                                🚪 ログアウト
                            </button>
                        </div>
                    </div>

                    <!-- 最近の活動 -->
                    ${stats.personStats.length > 0 ? `
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title">進捗状況</h2>
                            </div>
                            <div class="card-body">
                                ${stats.personStats.map(person => `
                                    <div class="progress-container">
                                        <div class="progress-header">
                                            <span class="progress-label">${person.name}</span>
                                            <span class="progress-value">${person.bitenCount}/100</span>
                                        </div>
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${Math.min(person.progress, 100)}%"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : `
                        <div class="card">
                            <div class="empty-state">
                                <div class="empty-state-icon">✨</div>
                                <h3 class="empty-state-title">まだ誰も登録されていません</h3>
                                <p class="empty-state-description">最初の一人を追加して、美点発見を始めましょう！</p>
                            </div>
                        </div>
                    `}
                </div>
            `;
            
            document.getElementById('app').innerHTML = html;
        } catch (error) {
            Utils.error('ホーム画面レンダリングエラー', error);
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },
    
    // 人物一覧画面
    async renderPersons() {
        try {
            const persons = await DB.getAllPersons();
            
            // あいうえお順にソート
            persons.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
            
            const html = `
                <div class="page">
                    <div class="page-header">
                        <h1 class="page-title">人物一覧</h1>
                        <p class="page-subtitle">${persons.length}人が登録されています</p>
                    </div>
                    
                    <div class="card">
                        <button class="btn btn-primary btn-block mb-lg" onclick="App.navigate('#/person/new')">
                            ✨ 新しい人を追加
                        </button>
                        
                        ${persons.length > 0 ? `
                            <ul class="list">
                                ${persons.map(person => `
                                    <li class="list-item" onclick="App.navigate('#/person/${person.id}')">
                                        <div class="list-item-content">
                                            <div class="list-item-title">${person.name}</div>
                                            <div class="list-item-subtitle">${person.relationship}</div>
                                        </div>
                                        <span class="list-item-badge">→</span>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : `
                            <div class="empty-state">
                                <div class="empty-state-icon">👥</div>
                                <h3 class="empty-state-title">まだ誰も登録されていません</h3>
                                <p class="empty-state-description">最初の一人を追加しましょう</p>
                            </div>
                        `}
                    </div>
                    
                    <button class="btn btn-ghost btn-block" onclick="App.navigate('#/')">
                        ← ホームに戻る
                    </button>
                </div>
            `;
            
            document.getElementById('app').innerHTML = html;
        } catch (error) {
            Utils.error('人物一覧レンダリングエラー', error);
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },
    
    // 人物追加画面
    async renderPersonNew() {
        const html = `
            <div class="page">
                <div class="page-header">
                    <h1 class="page-title">新しい人を追加</h1>
                </div>
                
                <div class="card">
                    <form id="personForm" onsubmit="Person.handleSubmit(event)">
                        <div class="form-group">
                            <label class="form-label">名前 *</label>
                            <input 
                                type="text" 
                                class="form-input" 
                                id="personName" 
                                maxlength="${CONFIG.LIMITS.MAX_NAME_LENGTH}" 
                                required
                                placeholder="例: 山田太郎"
                            >
                            <span class="form-hint">1〜${CONFIG.LIMITS.MAX_NAME_LENGTH}文字</span>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">関係性</label>
                            <input
                                type="text"
                                class="form-input"
                                id="personRelationship"
                                maxlength="${CONFIG.LIMITS.MAX_RELATIONSHIP_LENGTH}"
                                placeholder="例: 同僚、友人、家族"
                            >
                        </div>

                        <!-- 出会った日（非表示） -->
                        <div class="form-group" style="display: none;">
                            <label class="form-label">出会った日</label>
                            <input
                                type="date"
                                class="form-input"
                                id="personMetDate"
                                value="${Utils.getCurrentDate()}"
                                max="${Utils.getCurrentDate()}"
                            >
                            <span class="form-hint">未来の日付は選択できません（年の部分をタップすると年選択ができます）</span>
                        </div>

                        <div class="form-group">
                            <label class="form-label">写真（任意）</label>
                            <input 
                                type="file" 
                                class="form-input" 
                                id="personPhoto" 
                                accept="image/*"
                                onchange="Photo.handlePhotoSelect(event)"
                            >
                            <span class="form-hint">正方形にトリミングされます（最大150KB）</span>
                        </div>
                        
                        <!-- 写真プレビュー・トリミングエリア -->
                        <div id="photoPreviewArea" class="hidden">
                            <div class="form-group">
                                <label class="form-label">写真をトリミング</label>
                                <div id="cropperContainer" style="max-height: 400px;"></div>
                                <div style="margin-top: 16px; display: flex; gap: 8px;">
                                    <button type="button" class="btn btn-outline" onclick="Photo.resetCropper()">
                                        リセット
                                    </button>
                                    <button type="button" class="btn btn-primary" onclick="Photo.cropAndSave()">
                                        トリミング確定
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div id="croppedPhotoPreview" class="hidden">
                            <div class="form-group">
                                <label class="form-label">トリミング済み写真</label>
                                <img id="croppedImage" style="width: 200px; height: 200px; border-radius: 12px; object-fit: cover;">
                                <button type="button" class="btn btn-outline btn-block mt-sm" onclick="Photo.removeCroppedPhoto()">
                                    写真を削除
                                </button>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary btn-block">
                                ✨ 追加する
                            </button>
                            <button type="button" class="btn btn-outline btn-block mt-sm" onclick="App.navigate('#/persons')">
                                キャンセル
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.getElementById('app').innerHTML = html;
    },
    
    // 人物詳細画面
    async renderPersonDetail(personId) {
        try {
            const person = await DB.getPersonById(personId);
            if (!person) {
                showToast(CONFIG.MESSAGES.ERROR.PERSON_NOT_FOUND, 'error');
                this.navigate('#/persons');
                return;
            }
            
            const bitens = await DB.getBitensByPersonId(personId);

            // Firestoreタイムスタンプを数値に変換する関数
            const getTimestamp = (biten) => {
                if (biten.createdAt && biten.createdAt.seconds) {
                    return biten.createdAt.seconds; // Firestoreタイムスタンプ
                } else if (biten.createdAt) {
                    return new Date(biten.createdAt).getTime() / 1000; // 文字列の場合
                }
                return 0;
            };

            // 記入順の番号を計算（古い順にソートして番号付け）
            const bitensOldest = [...bitens].sort((a, b) => getTimestamp(a) - getTimestamp(b));
            const bitenNumberMap = {};
            bitensOldest.forEach((biten, index) => {
                bitenNumberMap[biten.id] = index + 1;
            });

            // 表示は新しい順（最後に書いたものが上）
            bitens.sort((a, b) => getTimestamp(b) - getTimestamp(a));

            console.log('=== 個人ページ 美点表示順序 ===');
            bitens.forEach((biten, index) => {
                console.log(`表示順${index + 1}: [${bitenNumberMap[biten.id]}] ${biten.content} (${biten.createdAt})`);
            });

            const html = `
                <div class="page">
                    <div class="page-header">
                        <h1 class="page-title" onclick="Person.startEditName('${personId}')" style="cursor: pointer;" title="クリックして名前を編集">
                            ${person.name}
                        </h1>
                        <p class="page-subtitle" onclick="Person.startEditRelationship('${personId}')" style="cursor: pointer;" title="クリックして関係性を編集">
                            ${person.relationship}
                        </p>
                    </div>

                    <!-- 写真表示 -->
                    <div class="card text-center">
                        ${person.photo ? `
                            <img src="${person.photo}" alt="${person.name}" style="width: 200px; height: 200px; border-radius: 12px; object-fit: cover; margin: 0 auto; display: block;">
                            <button class="btn btn-outline btn-block mt-md" onclick="Person.openPhotoEditor('${personId}')">
                                📷 写真を変更
                            </button>
                        ` : `
                            <div class="empty-state">
                                <div class="empty-state-icon">📷</div>
                                <h3 class="empty-state-title">写真が未登録です</h3>
                            </div>
                            <button class="btn btn-primary btn-block mt-md" onclick="Person.openPhotoEditor('${personId}')">
                                📷 写真を追加
                            </button>
                        `}
                    </div>

                    <!-- 統計 -->
                    <div class="card">
                        <div class="progress-container">
                            <div class="progress-header">
                                <span class="progress-label">美点の数</span>
                                <span class="progress-value">${bitens.length}/100</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((bitens.length / 100) * 100, 100)}%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- アクション -->
                    <div class="card">
                        <button class="btn btn-primary btn-block mb-md" onclick="App.navigate('#/biten/new?personId=${personId}')">
                            ✏️ 美点を追加
                        </button>
                        <button class="btn btn-outline btn-block mb-md" onclick="App.navigate('#/persons')">
                            ← 人物一覧に戻る
                        </button>
                        <button class="btn btn-outline btn-block" onclick="Person.deletePerson('${personId}')">
                            🗑 この人を削除
                        </button>
                    </div>

                    <!-- 美点一覧 -->
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">美点一覧（${bitens.length}個）</h2>
                        </div>
                        ${bitens.length > 0 ? `
                            <div class="card-body">
                                <ul class="list">
                                    ${bitens.map(biten => `
                                        <li class="list-item">
                                            <div class="list-item-content">
                                                <div class="list-item-title">${biten.content}</div>
                                            </div>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : `
                            <div class="empty-state">
                                <div class="empty-state-icon">✨</div>
                                <h3 class="empty-state-title">まだ美点が記録されていません</h3>
                                <p class="empty-state-description">最初の美点を見つけましょう</p>
                            </div>
                        `}
                    </div>
                </div>
            `;
            
            document.getElementById('app').innerHTML = html;
        } catch (error) {
            Utils.error('人物詳細レンダリングエラー', error);
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },
    
    // 美点追加画面
    async renderBitenNew(personId) {
        if (!personId) {
            showToast(CONFIG.MESSAGES.ERROR.NO_PERSON_SELECTED, 'error');
            this.navigate('#/persons');
            return;
        }
        
        try {
            const person = await DB.getPersonById(personId);
            if (!person) {
                showToast(CONFIG.MESSAGES.ERROR.PERSON_NOT_FOUND, 'error');
                this.navigate('#/persons');
                return;
            }
            
            const bitens = await DB.getBitensByPersonId(personId);

            // Firestoreタイムスタンプを数値に変換する関数
            const getTimestamp = (biten) => {
                if (biten.createdAt && biten.createdAt.seconds) {
                    return biten.createdAt.seconds; // Firestoreタイムスタンプ
                } else if (biten.createdAt) {
                    return new Date(biten.createdAt).getTime() / 1000; // 文字列の場合
                }
                return 0;
            };

            // 古い順にソートして番号を割り当て（記入順の番号）
            const bitensOldest = [...bitens].sort((a, b) => getTimestamp(a) - getTimestamp(b));
            const bitenNumberMap = {};
            bitensOldest.forEach((biten, index) => {
                bitenNumberMap[biten.id] = index + 1; // 記入順の番号（1から始まる）
            });

            // デバッグ情報
            console.log('=== 美点番号デバッグ ===');
            console.log('総数:', bitens.length);
            bitensOldest.forEach((biten, index) => {
                console.log(`${index + 1}番: ${biten.content} (作成日時: ${biten.createdAt})`);
            });

            // 新しい順（降順）にソート - 最後に書いたものが上に表示される
            bitens.sort((a, b) => getTimestamp(b) - getTimestamp(a));

            // 日付ごとにグループ化
            const bitensByDate = {};
            bitens.forEach(biten => {
                const date = biten.date;
                if (!bitensByDate[date]) {
                    bitensByDate[date] = [];
                }
                bitensByDate[date].push(biten);
            });
            
            const html = `
                <div class="page" style="padding-bottom: 100px;">
                    <div class="page-header">
                        <h1 class="page-title">${person.name}さんの美点</h1>
                        <p class="page-subtitle">100個書き出してみよう！ (<span id="bitenCount">${bitens.length}</span>/100)</p>
                    </div>
                    
                    <!-- チャット表示エリア -->
                    <div class="chat-container" id="chatContainer">
                        ${bitens.length === 0 ? `
                            <div class="empty-state">
                                <div class="empty-state-icon">💬</div>
                                <h3 class="empty-state-title">まだ美点がありません</h3>
                                <p class="empty-state-description">下の入力欄から最初の美点を追加しましょう</p>
                            </div>
                        ` : `
                            ${Object.keys(bitensByDate).sort((a, b) => new Date(b) - new Date(a)).map(date => `
                                <div class="chat-date-separator">
                                    <span class="chat-date-text">${Utils.formatDate(date)}</span>
                                </div>
                                ${bitensByDate[date]
                                    .sort((a, b) => getTimestamp(b) - getTimestamp(a))
                                    .map((biten) => {
                                    // 記入順の番号を取得（最新が最大番号）
                                    const bitenNumber = bitenNumberMap[biten.id];
                                    return `
                                    <div class="chat-message"
                                         data-biten-id="${biten.id}"
                                         data-person-id="${personId}"
                                         style="cursor: default;">
                                        <div class="chat-bubble">
                                            <div class="chat-bubble-number">${bitenNumber}</div>
                                            <div class="chat-bubble-content">${biten.content}</div>
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            `).join('')}
                        `}
                    </div>
                </div>
                
                <!-- 固定入力欄 -->
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <input
                            type="text"
                            class="chat-input"
                            id="bitenInput"
                            placeholder="例）笑顔がすてき（15文字以内）"
                            maxlength="${CONFIG.LIMITS.MAX_BITEN_LENGTH}"
                            onkeypress="if(event.key === 'Enter') Biten.handleSubmit('${personId}')"
                        >
                        <button class="chat-send-btn" onclick="Biten.handleSubmit('${personId}')">
                            ✏️
                        </button>
                    </div>
                    <button class="btn btn-outline btn-block mt-sm" onclick="App.navigate('#/person/${personId}')">
                        ← ${person.name}さんのページに戻る
                    </button>
                </div>
            `;
            
            document.getElementById('app').innerHTML = html;

            // 100個達成済みの場合、入力欄を無効化
            if (bitens.length >= CONFIG.LIMITS.MAX_BITENS_PER_PERSON) {
                const input = document.getElementById('bitenInput');
                const sendBtn = document.querySelector('.chat-send-btn');

                if (input) {
                    input.disabled = true;
                    input.placeholder = '100個達成しました！';
                }

                if (sendBtn) {
                    sendBtn.disabled = true;
                    sendBtn.style.opacity = '0.5';
                    sendBtn.style.cursor = 'not-allowed';
                }
            }

            // 長押しで編集機能を設定
            this.setupLongPressEdit();

            // チャット最上部へスクロール（最新のメッセージが上にあるため）
            setTimeout(() => {
                const chatContainer = document.getElementById('chatContainer');
                if (chatContainer) {
                    chatContainer.scrollTop = 0;
                }
            }, 100);
        } catch (error) {
            Utils.error('美点追加画面レンダリングエラー', error);
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },
    
    // 使い方画面 (Phase 1.5対応版)
    async renderGuide() {
        const html = `
            <div class="page">
                <div class="page-header">
                    <h1 class="page-title">📖 美点発見noteの使い方</h1>
                    <p class="page-subtitle">大切な人の良いところを記録しよう</p>
                </div>

                <!-- はじめに -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">📱 はじめに</h2>
                    </div>
                    <div class="card-body">
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                            「美点発見note」は、大切な人の良いところを記録するアプリです。
                        </p>
                        <p style="line-height: 1.8; color: var(--gray-700);">
                            複数のデバイスで使え、データは安全にクラウドに保存されます。
                        </p>
                    </div>
                </div>

                <!-- ステップ0: ログイン -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">🔐 ステップ0: アカウント作成・ログイン</h2>
                    </div>
                    <div class="card-body">
                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">初めての方</h3>
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px; line-height: 1.8;">「新規登録」タブをクリック</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">メールアドレスとパスワードを入力</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">「新規登録」をクリック</li>
                        </ol>

                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px; text-align: center;">
                            <strong>または</strong>
                        </p>

                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 20px;">
                            「Googleでログイン」でより簡単に始められます。
                        </p>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">2回目以降</h3>
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                            登録したメールアドレスとパスワードでログインしてください。
                        </p>

                        <div style="background-color: var(--primary-light); padding: 12px; border-radius: 8px; margin-top: 16px;">
                            <p style="margin: 0; line-height: 1.8; color: var(--primary);">
                                💡 <strong>パスワードを忘れた場合</strong><br>
                                ログイン画面の「パスワードをお忘れですか？」からリセットできます。
                            </p>
                        </div>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px; margin-top: 24px;">🗑️ アカウントの削除</h3>
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 12px;">
                            アカウントを削除したい場合は、以下の手順で行えます：
                        </p>
                        <ol style="padding-left: 20px; margin-bottom: 16px;">
                            <li style="margin-bottom: 8px; line-height: 1.8;">ホーム画面で「⚙️ 設定」をクリック</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">一番下の「危険な操作」セクションの「🗑️ アカウントを削除」をクリック</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">確認メッセージを読み、削除内容を確認</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">「削除する」と入力して実行</li>
                        </ol>
                        <div style="background-color: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 8px;">
                            <p style="margin: 0; line-height: 1.8; color: var(--error); font-weight: 500;">
                                ⚠️ アカウントを削除すると、すべてのデータ（人物情報、美点、写真）が完全に削除され、復元できません。
                            </p>
                        </div>
                    </div>
                </div>

                <!-- ステップ1: 人物登録 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">👤 ステップ1: 人物を登録する</h2>
                    </div>
                    <div class="card-body">
                        <ol style="padding-left: 20px;">
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                ホーム画面で「✨ 新しい人を追加」をタップ
                            </li>
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                名前を入力（例: たろうくん）
                            </li>
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                写真を選択（任意）
                            </li>
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                関係性を入力（例: 友達）
                            </li>
                            <li style="line-height: 1.8;">
                                「✨ 追加する」をタップ
                            </li>
                        </ol>

                        <div style="background-color: var(--success-light); padding: 12px; border-radius: 8px; margin-top: 16px;">
                            <p style="margin: 0; line-height: 1.8; color: var(--success);">
                                ✨ <strong>Phase 1.5の新機能</strong><br>
                                人数制限なし！何人でも登録できます。
                            </p>
                        </div>
                    </div>
                </div>

                <!-- ステップ2: 美点記録 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">✍️ ステップ2: 美点を記録する</h2>
                    </div>
                    <div class="card-body">
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                人物一覧から記録したい人をタップ
                            </li>
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                「✏️ 美点を追加」をタップ
                            </li>
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                良いところを入力（15文字以内）
                            </li>
                            <li style="line-height: 1.8;">
                                送信ボタン（✏️）をタップ
                            </li>
                        </ol>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">💭 記録のコツ</h3>
                        <ul style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px; line-height: 1.8;">小さなことでもOK</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">感じたままに</li>
                            <li style="line-height: 1.8;">毎日1つずつ</li>
                        </ul>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">✏️ 美点の編集・削除</h3>
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 12px;">
                            記録した美点を修正したい時は、<strong>美点の吹き出しを長押し</strong>してください。
                        </p>
                        <ul style="padding-left: 20px;">
                            <li style="margin-bottom: 8px; line-height: 1.8;">美点の文字を約0.5秒長押し</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">編集画面が表示されます</li>
                            <li style="line-height: 1.8;">編集または削除ができます</li>
                        </ul>

                        <div style="background-color: rgba(33, 150, 243, 0.1); padding: 12px; border-radius: 8px; margin-top: 16px;">
                            <p style="margin: 0; line-height: 1.8; color: #2196f3; font-size: 14px;">
                                💡 <strong>ヒント:</strong> 長押し中は吹き出しが青く光ります。スクロール中の誤タップを防ぐため、通常のタップでは何も起こりません。
                            </p>
                        </div>
                    </div>
                </div>

                <!-- ステップ3: 振り返る -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">📖 ステップ3: 振り返る</h2>
                    </div>
                    <div class="card-body">
                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">人物詳細画面で</h3>
                        <ul style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px; line-height: 1.8;">これまでの美点が一覧で表示されます</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">チャット形式で見やすい</li>
                            <li style="line-height: 1.8;">日付順に並んでいます</li>
                        </ul>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">PDF出力</h3>
                        <p style="line-height: 1.8; color: var(--gray-700);">
                            記録した美点をPDFとして保存できます。<br>
                            プレゼントや記念にどうぞ！
                        </p>
                    </div>
                </div>

                <!-- ステップ4: クラウド同期 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">☁️ ステップ4: 複数デバイスで使う（Phase 1.5の新機能！）</h2>
                    </div>
                    <div class="card-body">
                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">自動同期</h3>
                        <ul style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px; line-height: 1.8;">スマホで記録 → PCで確認</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">PCで記録 → スマホで確認</li>
                            <li style="line-height: 1.8;">自動で同期されます</li>
                        </ul>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">オフラインでも使える</h3>
                        <ul style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px; line-height: 1.8;">圏外でも記録可能</li>
                            <li style="line-height: 1.8;">オンラインに戻ると自動同期</li>
                        </ul>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">複数端末でログイン</h3>
                        <p style="line-height: 1.8; color: var(--gray-700);">
                            同じアカウントでログインすれば、<br>
                            どの端末でも同じデータにアクセスできます。
                        </p>
                    </div>
                </div>

                <!-- 美点発見とは -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">🌟 美点発見®とは？</h2>
                    </div>
                    <div class="card-body">
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                            「美点発見®」とは、相手や自分の「素晴らしいところ」を発見し、それを伝え合うことで自尊心を引き出し、最高の人間関係を構築する方法です。
                        </p>
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                            実際に一部の学校で実践したところ、不登校やいじめがなくなったという報告が続発しています。「美点発見®」は、学校だけでなく、ANA(全日空)で社員43,000人を対象とした公募型研修として採用されるなど、職場環境の改善にもつながっています。
                        </p>
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 20px;">
                            仕事や家庭の人間関係の悩みまで、「美点発見®」は、思い悩みでくもった心を晴らし、すべて解決することができる方法です。
                        </p>

                        <div style="background-color: var(--primary-light); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="margin: 0 0 12px 0; line-height: 1.8; color: var(--gray-800); font-weight: bold;">
                                💡 「美点発見」を続けていくと...
                            </p>
                            <p style="margin: 0; line-height: 1.8; color: var(--gray-700);">
                                自分の心のメガネが『相手の美点が見えるメガネ』にかけ変わります。それと同時に、自分自身の美点もどんどん見えるようになり、自然と自己肯定感が上がっていきます。
                            </p>
                        </div>

                        <div style="border-top: 1px solid var(--gray-200); padding-top: 16px; margin-top: 20px;">
                            <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 12px;">
                                もっと本格的に学びたい方は、「究極の美点発見®プログラム」をご検討ください。<br>
                                <span style="font-size: 14px; color: var(--gray-600);">※ 美点発見®の開発者提供の教材となります。</span>
                            </p>
                            <a href="https://bitenhakken.jp/"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="btn btn-outline btn-block"
                               style="text-decoration: none;">
                                🌟 究極の美点発見®プログラム
                            </a>
                        </div>
                    </div>
                </div>

                <!-- 美点の書き方のコツ -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">💡 美点の書き方のコツ</h2>
                    </div>
                    <div class="card-body">
                        <ul style="padding-left: 20px;">
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                <strong>具体的な行動を書く</strong><br>
                                <span style="color: var(--gray-600); font-size: 14px;">例: 「優しい」→「困っている人に声をかけていた」</span>
                            </li>
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                <strong>小さなことでもOK</strong><br>
                                <span style="color: var(--gray-600); font-size: 14px;">例: 「笑顔で挨拶してくれた」</span>
                            </li>
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                <strong>その日に気づいたことを記録</strong><br>
                                <span style="color: var(--gray-600); font-size: 14px;">新鮮な気持ちで書くのがポイント</span>
                            </li>
                            <li style="line-height: 1.8;">
                                <strong>ポジティブな表現を使う</strong><br>
                                <span style="color: var(--gray-600); font-size: 14px;">相手の良さが伝わる言葉で</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- よくある質問 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">❓ よくある質問</h2>
                    </div>
                    <div class="card-body">
                        <div style="margin-bottom: 20px;">
                            <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 8px;">Q: データは安全ですか？</h3>
                            <p style="line-height: 1.8; color: var(--gray-700); padding-left: 20px;">
                                A: はい。データは暗号化されてGoogle Firebase（世界最大級のクラウド）に保存されます。本人以外はアクセスできません。
                            </p>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 8px;">Q: 何人まで登録できますか？</h3>
                            <p style="line-height: 1.8; color: var(--gray-700); padding-left: 20px;">
                                A: Phase 1.5では無制限です！何人でも登録できます。
                            </p>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 8px;">Q: 料金はかかりますか？</h3>
                            <p style="line-height: 1.8; color: var(--gray-700); padding-left: 20px;">
                                A: Phase 1.5は完全無料です。
                            </p>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 8px;">Q: パスワードを忘れました</h3>
                            <p style="line-height: 1.8; color: var(--gray-700); padding-left: 20px;">
                                A: ログイン画面の「パスワードをお忘れですか？」から、メールでリセットできます。
                            </p>
                        </div>

                        <div>
                            <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 8px;">Q: スマホとPCで同じデータを見たい</h3>
                            <p style="line-height: 1.8; color: var(--gray-700); padding-left: 20px;">
                                A: 同じメールアドレスとパスワードでログインすれば、自動で同期されます。
                            </p>
                        </div>
                    </div>
                </div>

                <!-- 美点発見noteの活用例 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">🎁 美点発見noteの活用例</h2>
                    </div>
                    <div class="card-body">
                        <ul style="padding-left: 20px;">
                            <li style="margin-bottom: 8px; line-height: 1.8;">家族の良いところを記録</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">友達との思い出を残す</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">パートナーへのサプライズに</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">子どもの成長記録として</li>
                            <li style="line-height: 1.8;">感謝の気持ちを形に</li>
                        </ul>
                    </div>
                </div>

                <!-- 書籍紹介 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">📚 美点発見をもっと深く学ぶ</h2>
                    </div>
                    <div class="card-body">
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                            美点発見メソッド開発者・佐藤康行氏の書籍で、より深く美点発見について学べます。
                        </p>
                        <div style="background-color: var(--gray-50); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 8px;">
                                📖 しんどい月曜の朝がラクになる本
                            </h3>
                            <p style="line-height: 1.8; color: var(--gray-600); font-size: 14px; margin-bottom: 12px;">
                                著者: 佐藤康行
                            </p>
                            <a href="https://www.amazon.co.jp/dp/4763141090"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="btn btn-outline btn-block"
                               style="text-decoration: none;">
                                📚 Amazonで見る
                            </a>
                        </div>

                        <div style="background-color: var(--gray-50); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 8px;">
                                📖 一瞬で悩みが消えてなくなる満月の法則
                            </h3>
                            <p style="line-height: 1.8; color: var(--gray-600); font-size: 14px; margin-bottom: 12px;">
                                著者: 佐藤康行
                            </p>
                            <a href="https://www.amazon.co.jp/dp/4763161237"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="btn btn-outline btn-block"
                               style="text-decoration: none;">
                                📚 Amazonで見る
                            </a>
                        </div>
                    </div>
                </div>

                <!-- 美点発見メソッド開発者 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">👤 美点発見®メソッド開発者</h2>
                    </div>
                    <div class="card-body">
                        <!-- プロフィール -->
                        <div style="display: flex; gap: 24px; margin-bottom: 32px; flex-wrap: wrap;">
                            <!-- 写真 -->
                            <div style="flex-shrink: 0; display: flex; justify-content: center; width: 100%;">
                                <div style="width: 150px; height: 150px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold; border: 4px solid var(--primary);">
                                    写真
                                </div>
                            </div>

                            <!-- プロフィール情報 -->
                            <div style="flex: 1; min-width: 280px;">
                                <h3 style="font-size: 24px; margin-bottom: 8px; color: var(--gray-900); text-align: center;">
                                    佐藤康行（さとう・やすゆき）
                                </h3>
                                <p style="color: var(--gray-600); font-size: 14px; margin-bottom: 20px; text-align: center;">
                                    1951年、北海道美唄市生まれ
                                </p>

                                <div style="line-height: 1.8; color: var(--gray-700); font-size: 15px;">
                                    <p style="margin-bottom: 16px;">
                                        心の学校グループ創始者。1980年、「ステーキのくいしんぼ」を創業。「世界初の立ち食いステーキ」を考案し、８年で年商50億円（70店舗）を達成した。その後、経営権を譲渡、1991年に「心の学校」を創立。
                                    </p>
                                    <p style="margin-bottom: 16px;">
                                        約30年にわたり「本当の自分＝真我」に目覚めることを伝え続け、これまでグループ全体で<strong style="color: var(--primary); font-weight: bold;">52万人以上</strong>の人生を劇的に好転させてきた。2014年、JR東京駅前に「YSこころのクリニック」を開院、うつ病治療では<strong style="color: var(--primary); font-weight: bold;">90日以内の寛解率が90％以上</strong>という成果を上げている（現在は門前仲町に移転）。
                                    </p>
                                    <p style="margin-bottom: 16px;">
                                        研修指導はノーベル賞候補となった科学者や有名な医師、大企業の経営者、社員教育など幅広く、ANA（全日空）ではグループ全社員43,000人を対象に研修が行われている。国会議員など政治家からの信頼も厚く、文部科学大臣を輩出。政府からの依頼を受け、ひきこもり問題解消で大きな成果を上げた。また公立小学校のいじめ・不登校児問題も、多くの事例を解決に導いた。
                                    </p>
                                    <p style="margin-bottom: 0;">
                                        著書は『満月の法則』（サンマーク出版）、『仕事で心が折れそうになったら読む本』（PHP研究所）、『太陽の法則』（KADOKAWA）など多数あり、<strong style="color: var(--primary); font-weight: bold;">累計発行部数は250万部</strong>に及ぶ。
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- YouTube動画 -->
                        <div style="background-color: var(--gray-50); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                            <h3 style="font-size: 20px; margin-bottom: 16px; text-align: center; color: var(--gray-900);">
                                📺 美点発見®メソッドの解説動画
                            </h3>
                            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                                <iframe
                                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
                                    src="https://www.youtube.com/embed/p1XPVivwtDI"
                                    title="美点発見メソッド解説"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    referrerpolicy="strict-origin-when-cross-origin"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>

                        <!-- 心の学校へのリンク -->
                        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 20px; border-radius: 12px; text-align: center;">
                            <h3 style="font-size: 18px; margin-bottom: 12px; color: var(--gray-900);">
                                もっと詳しく学びたい方へ
                            </h3>
                            <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                                美点発見®メソッドをより深く学びたい方は
                            </p>
                            <a href="https://kokoronogakkou.com/?page_id=33"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="btn btn-primary btn-block"
                               style="text-decoration: none;">
                                🏫 心の学校 公式サイトへ
                            </a>
                        </div>
                    </div>
                </div>

                <!-- お問い合わせ -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">📧 お問い合わせ</h2>
                    </div>
                    <div class="card-body">
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                            不具合やご要望は、Googleフォームからお送りください。
                        </p>
                        <a href="https://docs.google.com/forms/d/e/1FAIpQLScPTrRUlyQ5O5xAWK4nwuGktK4XcfhHYe-aSQZI6yPGbSEsZQ/viewform?pli=1"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="btn btn-outline btn-block"
                           style="text-decoration: none;">
                            💬 フィードバックを送る
                        </a>
                    </div>
                </div>

                <!-- アプリ情報 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">📋 アプリについて</h2>
                    </div>
                    <div class="card-body">
                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">本アプリについて</h3>
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 20px;">
                            「美点発見note」は、佐藤康行氏が開発した美点発見メソッドをベースに開発された記録アプリです。
                        </p>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">美点発見メソッドの実績</h3>
                        <ul style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px; line-height: 1.8;">ANA全社員43,000人へ公募型研修導入</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">多くの教育現場で導入実績あり</li>
                            <li style="line-height: 1.8;">いじめ、不登校、引きこもりの問題が解決するだけでなく、子どもの才能が開花、子どもの教育、子育ての悩み、人間関係の改善、仕事のストレスの解消</li>
                        </ul>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">提供元</h3>
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 20px;">
                            美点発見プロジェクト普及実行委員会
                        </p>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">開発協力</h3>
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 20px;">
                            Evahpro LLC
                        </p>

                        <h3 style="font-size: 16px; font-weight: bold; color: var(--gray-800); margin-bottom: 12px;">現在のバージョン</h3>
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 20px;">
                            Phase 1.5（クラウド同期対応版）
                        </p>

                        <div style="border-top: 1px solid var(--gray-200); padding-top: 16px; margin-top: 20px;">
                            <p style="line-height: 1.8; color: var(--gray-600); font-size: 14px; margin-bottom: 8px;">
                                ※本アプリは現在開発中です。今後、小中学校向けの機能拡張を予定しています。
                            </p>
                            <p style="line-height: 1.8; color: var(--gray-600); font-size: 14px;">
                                © 2025 美点発見プロジェクト普及実行委員会
                            </p>
                        </div>
                    </div>
                </div>

                <!-- ホームに戻るボタン -->
                <button class="btn btn-primary btn-block" onclick="App.navigate('#/')">
                    ホームに戻る
                </button>
            </div>
        `;

        document.getElementById('app').innerHTML = html;
    },

    // 設定画面
    async renderSettings() {
        try {
            const user = Auth.getCurrentUser();

            if (!user) {
                this.navigate('#/');
                return;
            }

            // ログイン方法の判定
            const providerData = user.providerData[0];
            const loginMethod = providerData.providerId === 'google.com'
                ? 'Google ログイン'
                : 'メールアドレス';

            const html = `
                <div class="page">
                    <div class="page-header">
                        <h1 class="page-title">⚙️ 設定</h1>
                        <p class="page-subtitle">アカウント情報と設定</p>
                    </div>

                    <!-- アカウント情報 -->
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">アカウント情報</h2>
                        </div>
                        <div class="card-body">
                            <div style="margin-bottom: 16px;">
                                <div style="font-size: 14px; color: var(--gray-600); margin-bottom: 4px;">メールアドレス</div>
                                <div style="font-size: 16px; font-weight: 500; color: var(--gray-800);">${user.email}</div>
                            </div>
                            <div style="margin-bottom: 16px;">
                                <div style="font-size: 14px; color: var(--gray-600); margin-bottom: 4px;">ログイン方法</div>
                                <div style="font-size: 16px; font-weight: 500; color: var(--gray-800);">${loginMethod}</div>
                            </div>
                            <div>
                                <div style="font-size: 14px; color: var(--gray-600); margin-bottom: 4px;">アカウント作成日</div>
                                <div style="font-size: 16px; font-weight: 500; color: var(--gray-800);">${new Date(user.metadata.creationTime).toLocaleDateString('ja-JP')}</div>
                            </div>
                        </div>
                    </div>

                    <!-- バージョン情報 -->
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">アプリ情報</h2>
                        </div>
                        <div class="card-body">
                            <div style="margin-bottom: 12px;">
                                <div style="font-size: 14px; color: var(--gray-600); margin-bottom: 4px;">バージョン</div>
                                <div style="font-size: 16px; font-weight: 500; color: var(--gray-800);">Phase 1.5（クラウド同期対応版）</div>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <div style="font-size: 14px; color: var(--gray-600); margin-bottom: 4px;">提供元</div>
                                <div style="font-size: 16px; font-weight: 500; color: var(--gray-800);">美点発見プロジェクト普及実行委員会</div>
                            </div>
                            <div>
                                <div style="font-size: 14px; color: var(--gray-600); margin-bottom: 4px;">開発協力</div>
                                <div style="font-size: 16px; font-weight: 500; color: var(--gray-800);">Evahpro LLC</div>
                            </div>
                        </div>
                    </div>

                    <!-- リンク -->
                    <div class="card">
                        <div class="card-body">
                            <button class="btn btn-outline btn-block mb-md" onclick="App.navigate('#/privacy')">
                                📄 プライバシーポリシー
                            </button>
                            <button class="btn btn-outline btn-block mb-md" onclick="App.navigate('#/terms')">
                                📄 利用規約
                            </button>
                            <a href="https://docs.google.com/forms/d/e/1FAIpQLScPTrRUlyQ5O5xAWK4nwuGktK4XcfhHYe-aSQZI6yPGbSEsZQ/viewform?pli=1"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="btn btn-outline btn-block"
                               style="text-decoration: none;">
                                💬 フィードバックを送る
                            </a>
                        </div>
                    </div>

                    <!-- 危険な操作 -->
                    <div class="card" style="border: 2px solid var(--error);">
                        <div class="card-header" style="background-color: rgba(239, 68, 68, 0.1);">
                            <h2 class="card-title" style="color: var(--error);">⚠️ 危険な操作</h2>
                        </div>
                        <div class="card-body">
                            <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                                アカウントを削除すると、以下のデータがすべて<strong>完全に削除</strong>されます：
                            </p>
                            <ul style="padding-left: 20px; margin-bottom: 20px; color: var(--gray-700);">
                                <li style="margin-bottom: 8px;">登録したすべての人物情報</li>
                                <li style="margin-bottom: 8px;">記録したすべての美点</li>
                                <li style="margin-bottom: 8px;">アップロードした写真</li>
                                <li style="margin-bottom: 8px;">アカウント情報</li>
                            </ul>
                            <div style="background-color: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 20px;">
                                <p style="margin: 0; color: var(--error); font-weight: bold; line-height: 1.6;">
                                    ⚠️ この操作は取り消すことができません
                                </p>
                            </div>
                            <button class="btn btn-block"
                                    onclick="App.confirmDeleteAccount()"
                                    style="background-color: var(--error); color: white; border: none;">
                                🗑️ アカウントを削除
                            </button>
                        </div>
                    </div>

                    <!-- 戻るボタン -->
                    <button class="btn btn-outline btn-block" onclick="App.navigate('#/')">
                        ← ホームに戻る
                    </button>
                </div>
            `;

            document.getElementById('app').innerHTML = html;
        } catch (error) {
            Utils.error('設定画面レンダリングエラー', error);
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },

    // プライバシーポリシー画面
    async renderPrivacy() {
        const html = `
            <div class="page">
                <div class="page-header">
                    <h1 class="page-title">🔒 プライバシーポリシー</h1>
                    <p class="page-subtitle">個人情報の取り扱いについて</p>
                </div>

                <div class="card">
                    <div class="card-body" style="line-height: 1.8;">
                        <p style="margin-bottom: 20px;">
                            美点発見プロジェクト普及実行委員会（以下「当委員会」）は、本アプリケーション「美点発見note」（以下「本サービス」）におけるプライバシー情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。
                        </p>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">1. 取得する情報</h2>
                        <p style="margin-bottom: 16px;">当委員会は、本サービスの提供にあたり、以下の情報を取得します。</p>
                        <ul style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px;">メールアドレス（アカウント登録時）</li>
                            <li style="margin-bottom: 8px;">パスワード（暗号化して保存）</li>
                            <li style="margin-bottom: 8px;">登録した人物情報（名前、写真、関係性）</li>
                            <li style="margin-bottom: 8px;">記録した美点の内容</li>
                            <li>利用状況に関する情報（アクセスログなど）</li>
                        </ul>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">2. 利用目的</h2>
                        <p style="margin-bottom: 16px;">取得した情報は、以下の目的で利用します。</p>
                        <ul style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px;">本サービスの提供・運営</li>
                            <li style="margin-bottom: 8px;">ユーザー認証</li>
                            <li style="margin-bottom: 8px;">データのクラウド同期</li>
                            <li style="margin-bottom: 8px;">サービスの改善・開発</li>
                            <li style="margin-bottom: 8px;">お問い合わせ対応</li>
                            <li>利用規約違反への対応</li>
                        </ul>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">3. 第三者提供</h2>
                        <p style="margin-bottom: 20px;">
                            当委員会は、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
                        </p>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">4. 安全管理措置</h2>
                        <p style="margin-bottom: 16px;">当委員会は、個人情報の漏えい、滅失、毀損の防止その他の安全管理のため、以下の措置を講じます。</p>
                        <ul style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px;">Firebase Authentication による安全な認証</li>
                            <li style="margin-bottom: 8px;">データの暗号化保存</li>
                            <li style="margin-bottom: 8px;">Firebase App Check によるボット攻撃の防止</li>
                            <li>アクセス制限による不正アクセスの防止</li>
                        </ul>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">5. データの保存場所</h2>
                        <p style="margin-bottom: 20px;">
                            本サービスは、Google Firebase（Google Cloud Platform）を利用してデータを保存します。データは米国または日本のデータセンターに保存される場合があります。
                        </p>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">6. ユーザーの権利</h2>
                        <p style="margin-bottom: 16px;">ユーザーは、以下の権利を有します。</p>
                        <ul style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px;">登録情報の閲覧・訂正・削除を求める権利</li>
                            <li style="margin-bottom: 8px;">アカウントの削除を求める権利</li>
                            <li>個人情報の利用停止を求める権利</li>
                        </ul>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">7. Cookie等の利用</h2>
                        <p style="margin-bottom: 20px;">
                            本サービスは、ユーザー認証およびセッション管理のためにCookieおよびローカルストレージを使用します。
                        </p>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">8. お問い合わせ</h2>
                        <p style="margin-bottom: 16px;">
                            本ポリシーに関するお問い合わせは、こちらからご連絡ください。
                        </p>
                        <p style="padding-left: 20px; margin-bottom: 20px;">
                            美点発見プロジェクト普及実行委員会<br>
                            開発協力: Evahpro LLC<br>
                            <a href="https://docs.google.com/forms/d/e/1FAIpQLScPTrRUlyQ5O5xAWK4nwuGktK4XcfhHYe-aSQZI6yPGbSEsZQ/viewform" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline;">📝 お問い合わせはこちらから</a>
                        </p>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">9. 改定</h2>
                        <p style="margin-bottom: 20px;">
                            当委員会は、本ポリシーを改定することがあります。改定後のプライバシーポリシーは、本サービス上に掲載した時点で効力を生じるものとします。
                        </p>

                        <p style="text-align: right; color: var(--gray-600); margin-top: 32px;">
                            制定日: 2025年10月18日<br>
                            最終更新日: 2025年10月18日
                        </p>
                    </div>
                </div>

                <button class="btn btn-secondary btn-block" onclick="App.renderLogin(); setTimeout(() => App.switchAuthTab('signup'), 0);">
                    ← 戻る
                </button>
            </div>
        `;

        document.getElementById('app').innerHTML = html;
    },

    // 利用規約画面
    async renderTerms() {
        const html = `
            <div class="page">
                <div class="page-header">
                    <h1 class="page-title">📋 利用規約</h1>
                    <p class="page-subtitle">ご利用前に必ずお読みください</p>
                </div>

                <div class="card">
                    <div class="card-body" style="line-height: 1.8;">
                        <p style="margin-bottom: 20px;">
                            この利用規約（以下「本規約」）は、美点発見プロジェクト普及実行委員会（以下「当委員会」）が提供する「美点発見note」（以下「本サービス」）の利用条件を定めるものです。ユーザーの皆様には、本規約に従って本サービスをご利用いただきます。
                        </p>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">第1条（適用）</h2>
                        <p style="margin-bottom: 20px;">
                            本規約は、本サービスの提供条件及び本サービスの利用に関する当委員会とユーザーとの間の権利義務関係を定めることを目的とし、ユーザーと当委員会との間の本サービスの利用に関わる一切の関係に適用されます。
                        </p>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">第2条（定義）</h2>
                        <p style="margin-bottom: 8px;">本規約において使用する用語の定義は、以下の通りとします。</p>
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px;">「本サービス」とは、当委員会が提供する「美点発見note」という名称のサービスを意味します。</li>
                            <li style="margin-bottom: 8px;">「ユーザー」とは、本サービスを利用する全ての個人を意味します。</li>
                            <li>「登録情報」とは、ユーザーが本サービスに登録した情報を意味します。</li>
                        </ol>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">第3条（アカウント登録）</h2>
                        <p style="padding-left: 20px; margin-bottom: 20px;">
                            ユーザーは、本規約に同意の上、本サービスのアカウント登録を行うものとします。
                        </p>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">第4条（パスワード及びユーザーIDの管理）</h2>
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px;">ユーザーは、自己の責任において、パスワード及びユーザーIDを適切に管理及び保管するものとします。</li>
                            <li style="margin-bottom: 8px;">ユーザーは、パスワード又はユーザーIDを第三者に利用させてはなりません。</li>
                            <li>パスワード又はユーザーIDの管理不十分による損害の責任はユーザーが負うものとします。</li>
                        </ol>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">第5条（禁止事項）</h2>
                        <p style="margin-bottom: 8px;">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px;">法令または公序良俗に違反する行為</li>
                            <li style="margin-bottom: 8px;">犯罪行為に関連する行為</li>
                            <li style="margin-bottom: 8px;">当委員会、本サービスの他のユーザー、または第三者の権利を侵害する行為</li>
                            <li style="margin-bottom: 8px;">他のユーザーのアカウントを不正に使用する行為</li>
                            <li style="margin-bottom: 8px;">本サービスのネットワークまたはシステムに過度な負荷をかける行為</li>
                            <li style="margin-bottom: 8px;">本サービスの運営を妨害する行為</li>
                            <li style="margin-bottom: 8px;">不正アクセス行為</li>
                            <li style="margin-bottom: 8px;">虚偽の情報を登録する行為</li>
                            <li>その他、当委員会が不適切と判断する行為</li>
                        </ol>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">第6条（本サービスの停止等）</h2>
                        <p style="margin-bottom: 20px;">
                            当委員会は、以下のいずれかに該当する場合には、ユーザーに事前に通知することなく、本サービスの全部または一部の提供を停止または中断することができるものとします。
                        </p>
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px;">本サービスに係るシステムの定期保守または緊急保守を行う場合</li>
                            <li style="margin-bottom: 8px;">火災、停電、天災などの不可抗力により本サービスの運営ができなくなった場合</li>
                            <li>その他、当委員会が停止または中断を必要と判断した場合</li>
                        </ol>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">第7条（免責事項）</h2>
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px;">当委員会は、本サービスがユーザーの特定の目的に適合すること、期待する機能・正確性を有すること、ユーザーによる本サービスの利用がユーザーに適用のある法令に適合することを保証するものではありません。</li>
                            <li style="margin-bottom: 8px;">当委員会は、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。</li>
                            <li>本サービスは現状有姿で提供されるものであり、当委員会は本サービスについて何らの保証も行いません。</li>
                        </ol>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">第8条（利用規約の変更）</h2>
                        <p style="margin-bottom: 20px;">
                            当委員会は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の本規約は、本サービス上に表示した時点より効力を生じるものとします。
                        </p>

                        <h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: var(--gray-800);">第9条（準拠法・管轄裁判所）</h2>
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li style="margin-bottom: 8px;">本規約の解釈にあたっては、日本法を準拠法とします。</li>
                            <li>本サービスに関して紛争が生じた場合には、当委員会の所在地を管轄する裁判所を専属的合意管轄とします。</li>
                        </ol>

                        <p style="text-align: right; color: var(--gray-600); margin-top: 32px;">
                            制定日: 2025年10月18日<br>
                            最終更新日: 2025年10月18日
                        </p>
                    </div>
                </div>

                <button class="btn btn-secondary btn-block" onclick="App.renderLogin(); setTimeout(() => App.switchAuthTab('signup'), 0);">
                    ← 戻る
                </button>
            </div>
        `;

        document.getElementById('app').innerHTML = html;
    },

    // ===========================
    // ログイン・認証画面
    // ===========================

    // ログイン画面
    renderLogin() {
        const html = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1 class="auth-title">美点発見note</h1>
                        <p class="auth-subtitle">大切な人の美点を記録しよう</p>
                    </div>

                    <!-- タブ切り替え -->
                    <div class="auth-tabs">
                        <button class="auth-tab active" id="loginTab" onclick="App.switchAuthTab('login')">
                            ログイン
                        </button>
                        <button class="auth-tab" id="signupTab" onclick="App.switchAuthTab('signup')">
                            新規登録
                        </button>
                    </div>

                    <!-- ログインフォーム -->
                    <form id="loginForm" class="auth-form" onsubmit="App.handleLogin(event)">
                        <div class="form-group">
                            <label class="form-label">メールアドレス</label>
                            <input
                                type="email"
                                class="form-input"
                                id="loginEmail"
                                required
                                placeholder="example@email.com"
                            >
                        </div>
                        <div class="form-group">
                            <label class="form-label">パスワード</label>
                            <input
                                type="password"
                                class="form-input"
                                id="loginPassword"
                                required
                                placeholder="6文字以上"
                                minlength="6"
                            >
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">
                            ログイン
                        </button>
                        <button type="button" class="btn btn-link btn-block" onclick="App.showPasswordReset()">
                            パスワードをお忘れですか？
                        </button>
                    </form>

                    <!-- サインアップフォーム -->
                    <form id="signupForm" class="auth-form hidden" onsubmit="App.handleSignup(event)">
                        <div class="form-group">
                            <label class="form-label">メールアドレス</label>
                            <input
                                type="email"
                                class="form-input"
                                id="signupEmail"
                                required
                                placeholder="example@email.com"
                            >
                        </div>
                        <div class="form-group">
                            <label class="form-label">パスワード</label>
                            <input
                                type="password"
                                class="form-input"
                                id="signupPassword"
                                required
                                placeholder="6文字以上"
                                minlength="6"
                            >
                        </div>
                        <div class="form-group">
                            <label class="form-label">パスワード（確認）</label>
                            <input
                                type="password"
                                class="form-input"
                                id="signupPasswordConfirm"
                                required
                                placeholder="もう一度入力してください"
                                minlength="6"
                            >
                        </div>

                        <!-- 同意チェックボックス -->
                        <div class="form-group" style="margin-top: 20px;">
                            <label style="display: flex; align-items: flex-start; cursor: pointer; line-height: 1.6;">
                                <input type="checkbox" id="agreeTerms" required style="margin-right: 8px; margin-top: 4px; cursor: pointer;">
                                <span style="font-size: 14px; color: var(--gray-700);">
                                    <a href="#/privacy" target="_blank" style="color: var(--primary); text-decoration: underline;">プライバシーポリシー</a>
                                    および
                                    <a href="#/terms" target="_blank" style="color: var(--primary); text-decoration: underline;">利用規約</a>
                                    に同意します
                                </span>
                            </label>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block">
                            新規登録
                        </button>
                    </form>

                    <!-- または区切り線 -->
                    <div class="auth-divider">
                        <span>または</span>
                    </div>

                    <!-- Googleログインボタン -->
                    <button class="btn btn-google btn-block" onclick="App.handleGoogleLogin()">
                        <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.707V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.335z"/>
                            <path fill="#EA4335" d="M9 3.582c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.582 9 3.582z"/>
                        </svg>
                        Googleでログイン
                    </button>
                </div>
            </div>
        `;

        document.getElementById('app').innerHTML = html;
    },

    // タブ切り替え
    switchAuthTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const signupTab = document.getElementById('signupTab');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (tab === 'login') {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            loginTab.classList.remove('active');
            signupTab.classList.add('active');
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        }
    },

    // 長押しで編集機能を設定
    setupLongPressEdit() {
        const messages = document.querySelectorAll('.chat-message[data-biten-id]');

        messages.forEach(message => {
            let pressTimer = null;
            let isLongPress = false;

            // タッチスタート（スマホ）
            message.addEventListener('touchstart', (e) => {
                isLongPress = false;

                // 長押しフィードバック用のクラスを追加
                pressTimer = setTimeout(() => {
                    isLongPress = true;
                    message.classList.add('long-press-active');

                    // バイブレーション（対応デバイスのみ）
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }

                    // 編集モーダルを開く
                    const bitenId = message.dataset.bitenId;
                    const personId = message.dataset.personId;
                    Biten.startEditBiten(bitenId, personId).catch(err => console.error(err));
                }, 500); // 500ms長押し
            });

            // タッチエンド
            message.addEventListener('touchend', (e) => {
                clearTimeout(pressTimer);
                message.classList.remove('long-press-active');

                // 長押しの場合はデフォルト動作をキャンセル
                if (isLongPress) {
                    e.preventDefault();
                }
            });

            // タッチキャンセル（スクロールなど）
            message.addEventListener('touchmove', (e) => {
                clearTimeout(pressTimer);
                message.classList.remove('long-press-active');
            });

            message.addEventListener('touchcancel', (e) => {
                clearTimeout(pressTimer);
                message.classList.remove('long-press-active');
            });

            // マウスイベント（PC用）
            message.addEventListener('mousedown', (e) => {
                isLongPress = false;

                pressTimer = setTimeout(() => {
                    isLongPress = true;
                    message.classList.add('long-press-active');

                    const bitenId = message.dataset.bitenId;
                    const personId = message.dataset.personId;
                    Biten.startEditBiten(bitenId, personId).catch(err => console.error(err));
                }, 500);
            });

            message.addEventListener('mouseup', (e) => {
                clearTimeout(pressTimer);
                message.classList.remove('long-press-active');
            });

            message.addEventListener('mouseleave', (e) => {
                clearTimeout(pressTimer);
                message.classList.remove('long-press-active');
            });
        });
    },

    // ログイン処理
    async handleLogin(event) {
        event.preventDefault();

        try {
            showLoading();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            await Auth.signInWithEmail(email, password);

            // 認証状態変化で自動的にメイン画面へ遷移
        } catch (error) {
            hideLoading();
            showToast(error.message, 'error');
        }
    },

    // サインアップ処理
    async handleSignup(event) {
        event.preventDefault();

        try {
            showLoading();

            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;

            // 同意チェックの確認
            if (!agreeTerms) {
                hideLoading();
                showToast('プライバシーポリシーと利用規約に同意してください', 'error');
                return;
            }

            // パスワード一致チェック
            if (password !== passwordConfirm) {
                hideLoading();
                showToast('パスワードが一致しません', 'error');
                return;
            }

            await Auth.signUpWithEmail(email, password);

            showToast('アカウントを作成しました', 'success');

            // 認証状態変化で自動的にメイン画面へ遷移
        } catch (error) {
            hideLoading();
            showToast(error.message, 'error');
        }
    },

    // Googleログイン処理
    async handleGoogleLogin() {
        try {
            showLoading();

            await Auth.signInWithGoogle();

            // 認証状態変化で自動的にメイン画面へ遷移
        } catch (error) {
            hideLoading();
            if (error) {
                showToast(error.message, 'error');
            }
        }
    },

    // パスワードリセット表示
    showPasswordReset() {
        const email = prompt('パスワードリセット用のメールアドレスを入力してください');

        if (!email) {
            return;
        }

        this.handlePasswordReset(email);
    },

    // パスワードリセット処理
    async handlePasswordReset(email) {
        try {
            showLoading();

            await Auth.sendPasswordResetEmail(email);

            hideLoading();
            showToast('パスワードリセットメールを送信しました', 'success');
        } catch (error) {
            hideLoading();
            showToast(error.message, 'error');
        }
    },

    // ログアウト処理
    async handleLogout() {
        if (!confirm('ログアウトしますか？')) {
            return;
        }

        try {
            showLoading();

            await Auth.signOut();

            showToast('ログアウトしました', 'success');

            // 認証状態変化で自動的にログイン画面へ遷移
        } catch (error) {
            hideLoading();
            showToast(error.message, 'error');
        }
    },

    // アカウント削除の確認
    confirmDeleteAccount() {
        const confirmMessage =
            'アカウントを削除しますか？\n\n' +
            '【削除されるデータ】\n' +
            '・登録したすべての人物情報\n' +
            '・記録したすべての美点\n' +
            '・アップロードした写真\n' +
            '・アカウント情報\n\n' +
            '⚠️ この操作は取り消すことができません。\n\n' +
            '削除する場合は「OK」をクリックしてください。';

        if (confirm(confirmMessage)) {
            // 二重確認
            const doubleConfirm = prompt(
                '本当に削除してもよろしいですか？\n\n' +
                '確認のため「削除する」と入力してください。'
            );

            if (doubleConfirm === '削除する') {
                this.handleDeleteAccount();
            } else if (doubleConfirm !== null) {
                showToast('入力が正しくありません', 'error');
            }
        }
    },

    // アカウント削除処理
    async handleDeleteAccount() {
        try {
            showLoading();

            const user = Auth.getCurrentUser();
            if (!user) {
                hideLoading();
                showToast('ログインしていません', 'error');
                return;
            }

            Utils.log('アカウント削除開始', user.uid);

            // 1. Firestoreのユーザーデータを削除
            Utils.log('Firestoreデータ削除開始');

            // 1-1. persons コレクションのデータを削除
            const personsSnapshot = await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('persons')
                .get();

            const deletePersonsPromises = personsSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deletePersonsPromises);
            Utils.log(`${personsSnapshot.docs.length}件の人物データを削除`);

            // 1-2. bitens コレクションのデータを削除
            const bitensSnapshot = await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('bitens')
                .get();

            const deleteBitensPromises = bitensSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deleteBitensPromises);
            Utils.log(`${bitensSnapshot.docs.length}件の美点データを削除`);

            // 1-3. users ドキュメントを削除
            await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .delete();
            Utils.log('ユーザードキュメントを削除');

            // 2. Firebase Authentication のアカウントを削除
            Utils.log('Firebase Authentication アカウント削除開始');
            await user.delete();
            Utils.log('Firebase Authentication アカウント削除完了');

            hideLoading();

            // 3. 完了メッセージを表示してログイン画面へ
            alert('アカウントを削除しました。\n\nご利用ありがとうございました。');

            // ログイン画面へ遷移（認証状態変化で自動的に遷移）
            this.navigate('#/');

        } catch (error) {
            hideLoading();
            Utils.error('アカウント削除エラー', error);

            // エラーの種類に応じたメッセージ
            if (error.code === 'auth/requires-recent-login') {
                showToast(
                    'セキュリティのため、再度ログインしてから削除してください',
                    'error'
                );
                // ログアウトして再ログインを促す
                await Auth.signOut();
            } else {
                showToast(
                    'アカウント削除に失敗しました。時間をおいて再度お試しください。',
                    'error'
                );
            }
        }
    }
};

// DOMContentLoaded後にアプリ起動
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// グローバルに公開
window.App = App;