// ================================
// 美点ノート - Firebase設定
// ================================

// Firebase設定（本番環境: biten-note-app）
const firebaseConfig = {
  apiKey: "AIzaSyCXTjvd__i_8MYDbjGVK9o6nyi5eFFmCyk",
  authDomain: "biten-note-app.firebaseapp.com",
  projectId: "biten-note-app",
  storageBucket: "biten-note-app.firebasestorage.app",
  messagingSenderId: "862949639595",
  appId: "1:862949639595:web:b18a86e318b8ed8091feee"
};

console.log('🚀 Firebase: biten-note-app');

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Firebase サービスの初期化
const auth = firebase.auth();
const db = firebase.firestore();

// Firebase Auth の言語設定を日本語に変更
auth.languageCode = 'ja';

// 【開発用】手元（localhost）で URL に ?emu=1 を付けたときだけ、Firebase Emulator Suite につなぐ。
// 開発版・安定版では何も変わらない。オフライン永続化より前に呼ぶ必要がある。
if ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
    new URLSearchParams(location.search).get('emu') === '1') {
    auth.useEmulator('http://127.0.0.1:9099');
    db.useEmulator('127.0.0.1', 8080);
    console.log('🧪 Firebase Emulator に接続（auth:9099 / firestore:8080）');
}

// Firestore オフライン永続化を有効化
db.enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      Utils.log('Firestore永続化: 複数のタブが開いています');
    } else if (err.code === 'unimplemented') {
      Utils.log('Firestore永続化: ブラウザが非対応です');
    }
  });

// Google認証プロバイダー
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

Utils.log('Firebase初期化完了', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// App Check の設定は内部資料で管理

// グローバルに公開
window.auth = auth;
window.db = db;
window.googleProvider = googleProvider;
