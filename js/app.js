// ================================
// 美点ノート Phase 1.5 - アプリケーション起動・ルーティング
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
                    // 未ログイン: ログイン画面表示
                    this.renderLogin();
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

                    <!-- ログアウトボタン -->
                    <div class="card" style="margin-top: 16px;">
                        <div class="card-body">
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
            bitens.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
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
            // 古い順にソートして番号を割り当て（記入順の番号）
            const bitensOldest = [...bitens].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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

            // 新しい順（降順）にソート - 新しい記入が上に表示される
            bitens.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
                        <p class="page-subtitle">100個書き出してみよう！ (${bitens.length}/100)</p>
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
                                ${bitensByDate[date].map((biten) => {
                                    // 記入順の番号を取得（最新が最大番号）
                                    const bitenNumber = bitenNumberMap[biten.id];
                                    return `
                                    <div class="chat-message" onclick="event.stopPropagation(); Biten.startEditBiten('${biten.id}', '${personId}').catch(err => console.error(err))" style="cursor: pointer;" title="クリックして編集">
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

            // チャット最上部へスクロール（新しいメッセージが上にあるため）
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
                    <h1 class="page-title">📖 美点ノートの使い方</h1>
                    <p class="page-subtitle">大切な人の良いところを記録しよう</p>
                </div>

                <!-- はじめに -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">📱 はじめに</h2>
                    </div>
                    <div class="card-body">
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                            美点ノートは、大切な人の良いところを記録するアプリです。
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
                        <ul style="padding-left: 20px;">
                            <li style="margin-bottom: 8px; line-height: 1.8;">小さなことでもOK</li>
                            <li style="margin-bottom: 8px; line-height: 1.8;">感じたままに</li>
                            <li style="line-height: 1.8;">毎日1つずつ</li>
                        </ul>
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
                                もっと本格的に学びたい方は、「究極の美点発見プログラム」をご検討ください。
                            </p>
                            <a href="https://bitenhakken.jp/"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="btn btn-outline btn-block"
                               style="text-decoration: none;">
                                🌟 究極の美点発見プログラム
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

                <!-- 美点ノートの活用例 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">🎁 美点ノートの活用例</h2>
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
                            えばぁプロデュース合同会社
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
    }
};

// DOMContentLoaded後にアプリ起動
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// グローバルに公開
window.App = App;