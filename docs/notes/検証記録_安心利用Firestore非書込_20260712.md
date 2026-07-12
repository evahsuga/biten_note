# 検証記録：安心利用（ゲスト）は Firestore へ書き込まない（BACKLOG #8）

**実施日**: 2026-07-12
**対象**: 美点発見note（`biten_note`）
**目的**: 「安心利用＝本人以外は運営者を含め誰も内容を見られない」という公開時の説明の前提——**安心利用（ゲスト）状態のデータが Firestore へ一切書き込まれないこと**——を検証する（今回2週間スプリントの最優先 P0）。

---

## 結論

**漏れ経路なし。** 安心利用（ゲスト・未ログイン）状態から Firestore へユーザーデータが書き込まれる経路は存在しない。静的コード監査（2エージェントによる全数調査＋要所の実読）で確認した。

検証方法は**静的監査**。実機/Firebase Console でのゼロ書込実測は、3層防御がコードで確認できたため方針により省略した（spec§8 が挙げる「Console確認」は今回は残さない）。

---

## 担保している3層防御

| 層 | 内容 | 根拠（ファイル:行） |
|---|---|---|
| 1. ルーティング層 | 全データ操作は `App.getDB()` を通り、`Auth.isGuestMode()` が真の間は必ず `LocalDB`(IndexedDB) を返す。`DB`(Firestore) 直書き経路なし | `js/app.js:46`（`getDB()`）／消費側 app.js:282,430,525,911,1106,1136,1345,2187,2216,2286 |
| 2. DBオブジェクト層 | `DB` の全書込メソッドは冒頭で `DB.getCurrentUserId()` を呼び、未ログイン時 `throw new Error('ログインしてください')` | `js/db.js:140-146`。全書込 addPerson/updatePerson/addBiten/deleteBiten 等が該当 |
| 3. サーバ規則層 | `firestore.rules` が `request.auth != null && request.auth.uid == userId` を要求。ゲストは未認証で全書込拒否 | `firestore.rules:6` |

補足：
- **匿名認証（signInAnonymously）は未使用**（`js/`・`functions/`・`firestore.rules` 全体で0件）。よって「匿名ユーザーによる書込」も無い。
- ゲスト判定は localStorage フラグ `bitenNote_guestMode`（`js/auth.js:7,14-16`）。ゲストの実データは IndexedDB（`js/db-local.js`）のみ。人物・美点を localStorage/sessionStorage に保存する箇所は無し（CLAUDE.md ルール順守）。

## 唯一のゲスト由来 Firestore 書込＝ログイン移行（正規・同意付き）

`Auth.handleGuestDataOnLogin`（`js/auth.js:118-140`）→ `LocalDB.migrateToFirestore`（`js/db-local.js:406-434`）→ `DB.addPerson/addBiten`。

- トリガーは **明示的な認証操作3経路のみ**（`signUpWithEmail:181` / `signInWithEmail:207` / `signInWithGoogle:276`）。
- 発火の必要十分条件は「上記操作が成功 かつ `isGuestMode()===true` かつ `LocalDB.hasData()===true` かつ `confirm()` でユーザーがOK」。自動発火経路なし。
- すなわち「安心利用のまま」では1件も書かれない。書かれるのは**ログイン確定後・本人同意付き**のときだけ。

---

## 第4層ガードを見送った理由（2026-07-12 判断）

当初、防御の第4層として `DB.getCurrentUserId()` に `if (Auth.isGuestMode()) throw` を追加する案を検討した。しかし：

- **現行コードでは一度も発火しない**（3層で既に到達不能）。実質的な保護の上積みは「将来の退行検知」のみ。
- 追加すると、唯一の正規書込である移行処理（書込時に `isGuestMode()` がまだ真）を通すために**移行フローの並べ替えが必須**になり、繊細な経路への結合・保守コストが生じる。
- リスクの実体は「将来のコード変更で `getDB()` 経由を外す」ことなので、**その変更をする人が読む CLAUDE.md に不変条件・注意事項として明記**する方が直接的。

→ **コードは変更せず、`biten_note/CLAUDE.md` に「Critical Invariant: 安心利用は Firestore へ書き込まない」を明記**した。あわせて、**このコードベースが原作者の管理を離れて第三者に保守される段階では強制ガードの導入を検討する**旨も CLAUDE.md に残した。

---

## 監査中に発見した別軸の課題（#8とは別問題・今回は記録のみ）

BACKLOG に別項目として登録：
- `functions/index.js:557` `registerFcmToken` が `invoker:"public"`・認証トークン未検証で、任意 `userId` の `settings/notifications` に fcmToken を書ける可能性（サーバ側の別セキュリティ論点）。
- `Auth.handleRedirectResult()`（`js/auth.js:68`）が `handleGuestDataOnLogin`/`exitGuestMode` を呼ばない（将来 `signInWithRedirect` 有効化時の stale flag リスク。現状 `signInWithRedirect` 未使用のため無害）。

---

## 参照
- `biten_note/CLAUDE.md` … 不変条件セクション
- `docs/BACKLOG.md` … #8（本記録で完了）／別軸課題
- `docs/specs/安心利用_協力利用_ログイン設計仕様書.md` … §8チェックリスト
