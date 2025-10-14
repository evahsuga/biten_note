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
                        <h1 class="page-title">美点ノート</h1>
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
                            <span class="stat-label">美点の数</span>
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
                        
                        <div class="form-group">
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
                            placeholder="美点を入力（最大15文字）"
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
    
    // 使い方画面
    async renderGuide() {
        const html = `
            <div class="page">
                <div class="page-header">
                    <h1 class="page-title">📖 使い方</h1>
                    <p class="page-subtitle">美点ノートの使い方</p>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">美点発見とは？</h2>
                    </div>
                    <div class="card-body">
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                            美点発見は、相手の良いところを見つけて記録する習慣です。
                        </p>
                        <p style="line-height: 1.8; color: var(--gray-700); margin-bottom: 16px;">
                            ANA全社員43,000人が実践し、松山空港の従業員満足度を日本一にした実証済みのメソッドです。
                        </p>
                        <p style="line-height: 1.8; color: var(--gray-700);">
                            毎日少しずつ続けることで、人間関係が劇的に好転します。
                        </p>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">基本的な使い方</h2>
                    </div>
                    <div class="card-body">
                        <ol style="padding-left: 20px;">
                            <li style="margin-bottom: 16px; line-height: 1.8;">
                                <strong>人物を追加</strong><br>
                                身近な人を3人まで登録できます
                            </li>
                            <li style="margin-bottom: 16px; line-height: 1.8;">
                                <strong>美点を記録</strong><br>
                                相手の良いところを20文字以内で記録します
                            </li>
                            <li style="margin-bottom: 16px; line-height: 1.8;">
                                <strong>毎日続ける</strong><br>
                                1人につき100個を目標に続けましょう
                            </li>
                            <li style="line-height: 1.8;">
                                <strong>振り返る</strong><br>
                                記録した美点を定期的に見返しましょう
                            </li>
                        </ol>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">美点の書き方のコツ</h2>
                    </div>
                    <div class="card-body">
                        <ul style="padding-left: 20px;">
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                具体的な行動を書く
                            </li>
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                小さなことでもOK
                            </li>
                            <li style="margin-bottom: 12px; line-height: 1.8;">
                                その日に気づいたことを記録
                            </li>
                            <li style="line-height: 1.8;">
                                ポジティブな表現を使う
                            </li>
                        </ul>
                    </div>
                </div>
                
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
                        <h1 class="auth-title">美点ノート</h1>
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