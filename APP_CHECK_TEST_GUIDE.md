# App Check 動作確認ガイド

## テスト実施タイミング
Firebase Console で「適用済み」設定後、**15-20分経過してから**実施してください。

---

## テスト手順

### 1. ブラウザキャッシュをクリア

**Chrome:**
```
1. Ctrl + Shift + Delete (Windows) / Cmd + Shift + Delete (Mac)
2. 「キャッシュされた画像とファイル」をチェック
3. 「データを削除」をクリック
```

**Safari:**
```
1. 開発メニュー → キャッシュを空にする
2. または Cmd + Option + E
```

---

### 2. ローカルサーバー起動

```bash
cd /Users/sugawarakatsuyuki/Desktop/workspace/cc/biten_note
python3 -m http.server 8000
```

ブラウザで開く: http://localhost:8000

---

### 3. Dev Tools でエラーチェック

1. F12 キーを押す（Dev Tools 起動）
2. Console タブを開く
3. ページをリロード（Ctrl/Cmd + R）

**✅ 成功パターン:**
```
✅ App Check 有効化完了
[美点ノート] Firebase初期化完了
[美点ノート] 認証状態確認化
```

**❌ まだエラーが出る場合:**
```
❌ @firebase/app-check: AppCheck: Requests throttled due to 400 error
❌ Error while retrieving App Check token
```
→ もう5-10分待つか、下記「トラブルシューティング」を確認

---

### 4. 機能テスト

#### ① ログイン速度測定
```
1. ログアウト状態にする
2. Dev Tools の Console で以下を実行:
   console.time('login')
3. メールアドレス/パスワードでログイン
4. ログイン完了後、Console で:
   console.timeEnd('login')
```

**期待値:** 2-3秒以内

---

#### ② 美点入力速度測定
```
1. 人物を選択
2. Dev Tools の Console で:
   console.time('biten')
3. 美点を1つ入力して送信
4. 画面に反映されたら:
   console.timeEnd('biten')
```

**期待値:** 1-2秒以内

---

#### ③ エラーの確認
Console タブで以下のエラーが**出ないこと**を確認:
- ❌ 400 (Bad Request)
- ❌ AppCheck: Requests throttled
- ❌ Error while retrieving App Check token

---

## トラブルシューティング

### エラー1: 400エラーが継続

**原因候補:**
1. reCAPTCHAに `localhost` と `127.0.0.1` が登録されていない
2. Firebase Console の「適用済み」がまだ反映されていない
3. ブラウザキャッシュが残っている

**対処:**
1. reCAPTCHA管理画面でドメイン確認
2. さらに10分待つ
3. ブラウザを完全に再起動
4. シークレットモード/プライベートブラウズで試す

---

### エラー2: CORS エラー

**Console に以下が表示される:**
```
Cross-Origin-Opener-Policy policy would block the window.closed call
```

**対処:** これは Google OAuth 関連の警告で、App Check とは無関係です。無視してOK。

---

### エラー3: Domain not allowed

**原因:** reCAPTCHAにドメインが登録されていない

**対処:**
```
1. https://www.google.com/recaptcha/admin
2. 設定を開く
3. ドメインに以下を追加:
   - localhost
   - 127.0.0.1
   - evahsuga.github.io
4. 保存
```

---

## 成功確認チェックリスト

実施日時: _______________

### 設定確認
- [ ] Firebase Console: Cloud Firestore に「適用済み」
- [ ] Firebase Console: Authentication に「適用済み」
- [ ] reCAPTCHA: localhost 登録済み
- [ ] reCAPTCHA: 127.0.0.1 登録済み
- [ ] reCAPTCHA: evahsuga.github.io 登録済み

### エラーチェック
- [ ] Console に 400 エラーが出ない
- [ ] Console に App Check エラーが出ない
- [ ] 「✅ App Check 有効化完了」が表示される

### パフォーマンス
- [ ] ログイン速度: ___秒 (期待: 2-3秒)
- [ ] 美点入力速度: ___秒 (期待: 1-2秒)

### 機能動作
- [ ] ログイン成功
- [ ] 美点入力成功
- [ ] データがリアルタイムで反映される

---

## 次のステップ

ローカル環境で成功したら:

1. **GitHub Pages での確認**
   ```bash
   git add .
   git commit -m "Verify App Check configuration"
   git push origin main
   ```

2. **本番環境テスト**
   - https://evahsuga.github.io/biten_note/ を開く
   - 同じテストを実施

3. **プロデューサーに報告**
   - このチェックリストを使って完了報告

---

## 参考情報

- Firebase App Check ドキュメント: https://firebase.google.com/docs/app-check
- reCAPTCHA v3 ドキュメント: https://developers.google.com/recaptcha/docs/v3
- トラブルシューティング: CLAUDE.md の「Testing Checklist」セクション
