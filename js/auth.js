// ================================
// 美点ノート Phase 1.5 - 認証処理
// ================================

const Auth = {
    currentUser: null,

    // ===========================
    // 認証状態の監視
    // ===========================

    // 認証状態変化を監視
    onAuthStateChanged(callback) {
        return auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            Utils.log('認証状態変化', user ? user.email : 'ログアウト');
            callback(user);
        });
    },

    // 現在のユーザーを取得
    getCurrentUser() {
        return this.currentUser;
    },

    // 現在のユーザーIDを取得
    getCurrentUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    },

    // ログイン状態を確認
    isLoggedIn() {
        return this.currentUser !== null;
    },

    // ===========================
    // Email/Password認証
    // ===========================

    // サインアップ（新規登録）
    async signUpWithEmail(email, password) {
        try {
            Utils.log('サインアップ開始', email);

            if (!email || !password) {
                throw new Error('メールアドレスとパスワードを入力してください');
            }

            if (password.length < 6) {
                throw new Error('パスワードは6文字以上で入力してください');
            }

            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            Utils.log('サインアップ成功', user.email);

            // Firestoreにユーザードキュメントを作成
            await this.createUserDocument(user.uid, {
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return user;
        } catch (error) {
            Utils.error('サインアップエラー', error);
            throw this.handleAuthError(error);
        }
    },

    // ログイン
    async signInWithEmail(email, password) {
        try {
            Utils.log('ログイン開始', email);

            if (!email || !password) {
                throw new Error('メールアドレスとパスワードを入力してください');
            }

            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            Utils.log('ログイン成功', user.email);
            return user;
        } catch (error) {
            Utils.error('ログインエラー', error);
            throw this.handleAuthError(error);
        }
    },

    // パスワードリセット
    async sendPasswordResetEmail(email) {
        try {
            Utils.log('パスワードリセットメール送信開始', email);

            if (!email) {
                throw new Error('メールアドレスを入力してください');
            }

            await auth.sendPasswordResetEmail(email);

            Utils.log('パスワードリセットメール送信成功', email);
            return true;
        } catch (error) {
            Utils.error('パスワードリセットメール送信エラー', error);
            throw this.handleAuthError(error);
        }
    },

    // ===========================
    // Google認証
    // ===========================

    // Googleログイン
    async signInWithGoogle() {
        try {
            Utils.log('Googleログイン開始');

            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;

            Utils.log('Googleログイン成功', user.email);

            // Firestoreにユーザードキュメントを作成（存在しない場合）
            await this.createUserDocument(user.uid, {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return user;
        } catch (error) {
            Utils.error('Googleログインエラー', error);

            // ポップアップが閉じられた場合はエラーを無視
            if (error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/cancelled-popup-request') {
                return null;
            }

            throw this.handleAuthError(error);
        }
    },

    // ===========================
    // ログアウト
    // ===========================

    // ログアウト
    async signOut() {
        try {
            Utils.log('ログアウト開始');

            await auth.signOut();
            this.currentUser = null;

            Utils.log('ログアウト成功');
            return true;
        } catch (error) {
            Utils.error('ログアウトエラー', error);
            throw this.handleAuthError(error);
        }
    },

    // ===========================
    // Firestoreユーザードキュメント管理
    // ===========================

    // ユーザードキュメントを作成
    async createUserDocument(userId, userData) {
        try {
            Utils.log('ユーザードキュメント作成開始', userId);

            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            // 既に存在する場合は作成しない
            if (userDoc.exists) {
                Utils.log('ユーザードキュメントは既に存在します', userId);
                return;
            }

            await userRef.set(userData);

            Utils.log('ユーザードキュメント作成成功', userId);
        } catch (error) {
            Utils.error('ユーザードキュメント作成エラー', error);
            throw error;
        }
    },

    // ユーザードキュメントを取得
    async getUserDocument(userId) {
        try {
            Utils.log('ユーザードキュメント取得開始', userId);

            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                Utils.log('ユーザードキュメントが見つかりません', userId);
                return null;
            }

            const userData = userDoc.data();
            Utils.log('ユーザードキュメント取得成功', userData);

            return userData;
        } catch (error) {
            Utils.error('ユーザードキュメント取得エラー', error);
            throw error;
        }
    },

    // ===========================
    // エラーハンドリング
    // ===========================

    // Firebaseエラーメッセージを日本語に変換
    handleAuthError(error) {
        let message = 'エラーが発生しました';

        switch (error.code) {
            // Email/Password認証エラー
            case 'auth/email-already-in-use':
                message = 'このメールアドレスは既に使用されています';
                break;
            case 'auth/invalid-email':
                message = 'メールアドレスの形式が正しくありません';
                break;
            case 'auth/operation-not-allowed':
                message = 'この認証方式は現在利用できません';
                break;
            case 'auth/weak-password':
                message = 'パスワードは6文字以上で入力してください';
                break;
            case 'auth/user-disabled':
                message = 'このアカウントは無効化されています';
                break;
            case 'auth/user-not-found':
                message = 'ユーザーが見つかりません';
                break;
            case 'auth/wrong-password':
                message = 'パスワードが間違っています';
                break;

            // Google認証エラー
            case 'auth/account-exists-with-different-credential':
                message = 'このメールアドレスは別の方法で登録されています';
                break;
            case 'auth/popup-blocked':
                message = 'ポップアップがブロックされました。ブラウザの設定を確認してください';
                break;
            case 'auth/popup-closed-by-user':
                message = 'ログインがキャンセルされました';
                break;

            // ネットワークエラー
            case 'auth/network-request-failed':
                message = 'ネットワークエラーが発生しました。接続を確認してください';
                break;

            // その他
            case 'auth/too-many-requests':
                message = 'リクエストが多すぎます。しばらくしてから再度お試しください';
                break;

            default:
                message = error.message || 'エラーが発生しました';
        }

        return new Error(message);
    }
};

// グローバルに公開
window.Auth = Auth;
