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
    // リダイレクト結果の処理（モバイル用）
    // ===========================

    // リダイレクト後の認証結果を取得
    async handleRedirectResult() {
        try {
            Utils.log('リダイレクト結果を確認中...', {
                currentURL: window.location.href,
                hash: window.location.hash,
                userAgent: navigator.userAgent.substring(0, 50)
            });

            const result = await auth.getRedirectResult();

            if (result && result.user) {
                const user = result.user;
                Utils.log('✅ リダイレクトログイン成功', {
                    email: user.email,
                    uid: user.uid,
                    displayName: user.displayName
                });

                // Firestoreにユーザードキュメントを作成（存在しない場合）
                await this.createUserDocument(user.uid, {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // モバイル: リダイレクト後、ホーム画面に確実に遷移
                Utils.log('モバイルログイン完了、ホーム画面へリダイレクト');
                window.location.hash = '#/';

                return user;
            } else {
                Utils.log('リダイレクト結果なし（通常のページ読み込み）');
                return null;
            }
        } catch (error) {
            Utils.error('❌ リダイレクト結果取得エラー', error);
            console.error('詳細:', error.code, error.message);
            throw this.handleAuthError(error);
        }
    },

    // ===========================
    // Email/Password認証
    // ===========================

    // サインアップ（新規登録）
    async signUpWithEmail(email, password) {
        try {
            // メールアドレスを正規化（小文字化、前後の空白削除）
            email = email.trim().toLowerCase();

            Utils.log('サインアップ開始', email);

            if (!email || !password) {
                throw new Error('メールアドレスとパスワードを入力してください');
            }

            if (password.length < 6) {
                throw new Error('パスワードは6文字以上で入力してください');
            }

            // 既存ユーザーチェック（Firebaseの重複チェックに加えて）
            const signInMethods = await auth.fetchSignInMethodsForEmail(email);
            if (signInMethods && signInMethods.length > 0) {
                throw new Error('このメールアドレスは既に登録されています。ログインしてください。');
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
            // メールアドレスを正規化（小文字化、前後の空白削除）
            email = email.trim().toLowerCase();

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
            // メールアドレスを正規化（小文字化、前後の空白削除）
            email = email.trim().toLowerCase();

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

    // Googleログイン（モバイル対応：リダイレクト方式）
    async signInWithGoogle() {
        try {
            Utils.log('Googleログイン開始');

            // モバイル環境ではリダイレクト方式を使用
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                // リダイレクト方式（モバイル推奨）
                Utils.log('モバイル環境検出 - リダイレクト方式を使用');
                await auth.signInWithRedirect(googleProvider);
                // リダイレクト後は自動的に戻ってくるので、ここでは何もしない
                return null;
            } else {
                // ポップアップ方式（デスクトップ）
                Utils.log('デスクトップ環境検出 - ポップアップ方式を使用');
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
            }
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
                message = 'このメールアドレスは既に登録されています。ログイン画面からログインしてください。';
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
            case 'auth/invalid-login-credentials':
                message = 'メールアドレスまたはパスワードが間違っています';
                break;
            case 'auth/invalid-credential':
                message = 'ログイン情報が正しくありません';
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
