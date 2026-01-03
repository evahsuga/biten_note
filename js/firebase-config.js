// ================================
// 美点ノート Phase 1.5 - Firebase設定
// ================================

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCXTjvd__i_8MYDbjGVK9o6nyi5eFFmCyk",
  authDomain: "biten-note-app.firebaseapp.com",
  projectId: "biten-note-app",
  storageBucket: "biten-note-app.firebasestorage.app",
  messagingSenderId: "862949639595",
  appId: "1:862949639595:web:b18a86e318b8ed8091feee"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Firebase サービスの初期化
const auth = firebase.auth();
const db = firebase.firestore();

// Firebase Auth の言語設定を日本語に変更
auth.languageCode = 'ja';

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

// App Check を無効化（パフォーマンス改善のため一時的に無効化）
// ⚠️ セキュリティレベル: 低
// const appCheck = firebase.appCheck();
// appCheck.activate(
//   '6LfTfu4rAAAAABwjORddcTN5EK8FBK1VEOIbiTev', // reCAPTCHA v3 サイトキー
//   true // 自動更新を有効化
// );
// console.log('✅ App Check 有効化完了');

console.log('⚠️ App Check は無効化されています（パフォーマンス優先）');

// グローバルに公開
window.auth = auth;
window.db = db;
window.googleProvider = googleProvider;
