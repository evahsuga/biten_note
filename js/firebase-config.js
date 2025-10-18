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

// App Check を有効化
const appCheck = firebase.appCheck();
appCheck.activate(
  '6LfCJaAqAAAAAIYzgPPU_n4-DRN2lT6R5mG7bnj0', // reCAPTCHA v3 サイトキー
  true // 自動更新を有効化
);

console.log('✅ App Check 有効化完了');

// グローバルに公開
window.auth = auth;
window.db = db;
window.googleProvider = googleProvider;
