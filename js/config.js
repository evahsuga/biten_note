// ================================
// 美点ノート Phase 1 - 設定・定数
// ================================

const CONFIG = {
    // アプリ基本情報
    APP_NAME: '美点ノート',
    VERSION: '1.0.0',
    PHASE: 'Phase 1',

    // デバッグモード（本番環境では false に設定）
    DEBUG: false,  // true: デバッグパネル表示、false: 非表示

    // データベース設定
    DB_NAME: 'BitenNoteDB',
    DB_VERSION: 1,
    
    // ObjectStore名
    STORE: {
        PERSONS: 'persons',
        BITENS: 'bitens',
        SETTINGS: 'appSettings'
    },
    
    // 制限値
    LIMITS: {
        MAX_BITEN_LENGTH: 15,       // 美点の最大文字数
        MIN_BITEN_LENGTH: 1,        // 美点の最小文字数
        MAX_NAME_LENGTH: 50,        // 名前の最大文字数
        MIN_NAME_LENGTH: 1,         // 名前の最小文字数
        MAX_RELATIONSHIP_LENGTH: 20, // 関係性の最大文字数
        TARGET_BITEN_COUNT: 100,    // 目標美点数
        MAX_BITENS_PER_PERSON: 100, // 1人あたりの美点上限（PDF印刷の関係）
        MAX_PHOTO_SIZE_KB: 150,     // 写真の最大サイズ (KB)
        PHOTO_SIZE_PX: 400,         // 写真のリサイズサイズ (px)
        // 背景画像設定
        BACKGROUND_IMAGE: {
            MAX_WIDTH: 1280,        // 背景画像の最大幅 (px)
            MAX_HEIGHT: 1280,       // 背景画像の最大高さ (px)
            QUALITY: 0.75,          // JPEG圧縮品質 (0.0-1.0)
            MAX_SIZE_KB: 300        // 背景画像の最大サイズ (KB)
        }
    },
    
    // カラーパレット
    COLORS: {
        PRIMARY: '#667eea',
        PRIMARY_DARK: '#764ba2',
        SECONDARY: '#f093fb',
        SECONDARY_DARK: '#f5576c',
        WHITE: '#ffffff',
        GRAY_100: '#f5f5f5',
        GRAY_200: '#eeeeee',
        GRAY_300: '#e0e0e0',
        GRAY_500: '#9e9e9e',
        GRAY_700: '#616161',
        GRAY_900: '#212121',
        SUCCESS: '#4caf50',
        ERROR: '#f44336',
        WARNING: '#ff9800',
        INFO: '#2196f3'
    },
    
    // グラデーション
    GRADIENTS: {
        PRIMARY: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        SECONDARY: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        WARM: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        COOL: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)'
    },
    
    // アニメーション設定
    ANIMATION: {
        DURATION: '0.3s',
        EASING: 'ease',
        DELAY: '0.1s'
    },
    
    // タップエリア最小サイズ
    MIN_TAP_AREA: 44, // px
    
    // ルート定義
    ROUTES: {
        HOME: '#/',
        PERSONS: '#/persons',
        PERSON_DETAIL: '#/person/:id',
        PERSON_NEW: '#/person/new',
        BITEN_NEW: '#/biten/new',
        GUIDE: '#/guide'
    },
    
    // デフォルト値
    DEFAULTS: {
        RELATIONSHIP: '知人',
        SORT_ORDER: 'asc', // あいうえお順（昇順）
        USER_PLAN: 'free'  // Phase 1は全員free
    },
    
    // メッセージ
    MESSAGES: {
        SUCCESS: {
            PERSON_ADDED: '人物を追加しました',
            PERSON_UPDATED: '人物情報を更新しました',
            PERSON_DELETED: '人物を削除しました',
            BITEN_ADDED: '美点を記録しました',
            PDF_GENERATED: 'PDFを生成しました'
        },
        ERROR: {
            DB_ERROR: 'データベースエラーが発生しました',
            PERSON_NOT_FOUND: '人物が見つかりません',
            INVALID_NAME: '名前を正しく入力してください',
            INVALID_BITEN: '美点は1〜15文字で入力してください',
            PHOTO_TOO_LARGE: '写真のサイズが大きすぎます（150KB以下）',
            NO_PERSON_SELECTED: '人物を選択してください',
            NETWORK_ERROR: 'ネットワークエラーが発生しました'
        },
        CONFIRM: {
            DELETE_PERSON: 'この人物と全ての美点を削除しますか？',
            DELETE_BITEN: 'この美点を削除しますか？'
        },
        INFO: {
            NO_PERSONS: 'まだ人物が登録されていません',
            NO_BITENS: 'まだ美点が記録されていません',
            EMPTY_PHOTO: '写真は任意です'
        }
    },
    
    // バリデーション用正規表現
    REGEX: {
        HIRAGANA: /[\u3040-\u309F]/,
        KATAKANA: /[\u30A0-\u30FF]/,
        KANJI: /[\u4E00-\u9FAF]/,
        ALPHANUMERIC: /^[a-zA-Z0-9]+$/
    },
    
    // 日付フォーマット
    DATE_FORMAT: {
        DISPLAY: 'YYYY年MM月DD日',
        ISO: 'YYYY-MM-DD',
        JAPANESE: 'M月D日'
    },
    
    // PDF設定
    PDF: {
        PAGE_SIZE: 'a4',
        FONT_SIZE: {
            TITLE: 24,
            HEADING: 18,
            BODY: 12,
            SMALL: 10
        },
        MARGIN: {
            TOP: 20,
            RIGHT: 20,
            BOTTOM: 20,
            LEFT: 20
        }
    },
    
    // Cropper.js設定
    CROPPER: {
        ASPECT_RATIO: 1, // 正方形
        VIEW_MODE: 1,
        RESPONSIVE: true,
        RESTORE: true,
        GUIDES: true,
        CENTER: true,
        HIGHLIGHT: true,
        CROP_BOX_MOVABLE: true,
        CROP_BOX_RESIZABLE: true,
        TOGGLE_DRAG_MODE_ON_DBLCLICK: true
    },
    
    // デバッグモード
    DEBUG: true
};

// 読み取り専用にする
Object.freeze(CONFIG);

// ユーティリティ関数
const Utils = {
    // UUID生成
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    // 現在日時取得（ISO形式）
    getCurrentDateTime() {
        return new Date().toISOString();
    },
    
    // 現在日付取得（YYYY-MM-DD）
    getCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    // 日付フォーマット（表示用）
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}年${month}月${day}日`;
    },
    
    // 日付フォーマット（簡易版）
    formatDateSimple(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}月${day}日`;
    },
    
    // 文字数カウント
    countChars(str) {
        return str ? str.length : 0;
    },
    
    // バリデーション: 名前
    validateName(name) {
        if (!name || name.trim().length === 0) {
            return { valid: false, message: CONFIG.MESSAGES.ERROR.INVALID_NAME };
        }
        if (name.length > CONFIG.LIMITS.MAX_NAME_LENGTH) {
            return { valid: false, message: `名前は${CONFIG.LIMITS.MAX_NAME_LENGTH}文字以内で入力してください` };
        }
        return { valid: true };
    },
    
    // バリデーション: 美点
    validateBiten(content) {
        if (!content || content.trim().length === 0) {
            return { valid: false, message: CONFIG.MESSAGES.ERROR.INVALID_BITEN };
        }
        if (content.length < CONFIG.LIMITS.MIN_BITEN_LENGTH || content.length > CONFIG.LIMITS.MAX_BITEN_LENGTH) {
            return { valid: false, message: CONFIG.MESSAGES.ERROR.INVALID_BITEN };
        }
        return { valid: true };
    },
    
    // デバッグログ
    log(message, data = null) {
        if (CONFIG.DEBUG) {
            console.log(`[美点ノート] ${message}`, data || '');
        }
    },
    
    // エラーログ
    error(message, error = null) {
        console.error(`[美点ノート ERROR] ${message}`, error || '');
    }
};

// 読み取り専用にする
Object.freeze(Utils);

// グローバルに公開
window.CONFIG = CONFIG;
window.Utils = Utils;