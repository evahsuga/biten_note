# デプロイ運用メモ（複数管理体制向け）

このファイルは、デプロイの**実態と経緯**を記録し、引き継ぎ時の誤解を防ぐためのものです。

**最終更新: 2026-07-12**

---

## 確定した配信モデル

| 環境 | ブランチ | ホスティング | URL | 更新トリガー |
|------|---------|------------|-----|------------|
| 開発 | `main` | GitHub Pages | https://evahsuga.github.io/biten_note/ | `main` へ push で自動 |
| 本番 | `production` | Netlify（サイト名: **bitennote**） | **https://bitennote.netlify.app**（ハイフン無し） | `main → production` マージ→push で自動 |

- **Netlify本番は `production` ブランチを配信**する（2026-07-12 調査で確定）。
- 開発・本番は**同じ Firebase プロジェクト `biten-note-app` を共有**する（Firestore・Auth・Cloud Functions すべて共通）。
  - → 開発サイトでのログイン・データ操作・通知設定変更は、**本番と同じDBに書き込まれる**。テストはテスト用アカウント／シークレットウィンドウで行い、後始末を徹底する。

---

## 経緯：なぜ本番が長く v1.9 だったか（2026-07 時点の学び）

- 2026-03-09 以降、本番（Netlify/production）は **v1.9 のまま**で、開発（main）は v2.0 まで進んでいた。
- これは**不具合ではなく意図的な保留**だった。v2.0（メールリマインダー）の**メール案内文面を実際に受信して雰囲気を確認してから昇格**する運用だったため、`main → production` の昇格を保留していた。
- 調査中に Netlify 表示の `main@d1ce87b` という参照が出たが、この `d1ce87b` はリポジトリ履歴に存在しない（表示上の古い参照/転記ブレ）。本質は「production = v1.9 = Mar 9」で一貫。

### 学び（重要）
1. **本番が古いバージョンで止まっていても、必ずしも不具合ではない**。「昇格を意図的に保留している」ケースがある。判断の前に経緯を確認する。
2. **配信ブランチの真実はリポジトリ内からは読めない**（netlify.toml 無し＝Netlify管理画面設定）。確認は Netlify → Site configuration → Build & deploy → Production branch。
3. **URLのハイフン有無**に注意：正は `bitennote.netlify.app`（ハイフン**無し**）。以前ドキュメントに `biten-note.netlify.app`（ハイフン有り）の誤記が5箇所あり、2026-07-12 に修正済み。

---

## v3.0 昇格時の注意（2026-07 時点）

- 本番は v1.9 のため、`main → production` 昇格で **v1.9 → v3.0 に一気に上がる**。
- このとき **v2.0（メール通知）も本番初投入**される。昇格前に、開発サイト（同一Firebase）で**メール文面の実地検証**を済ませること。
- `production` には独自コミット `6cbedaa`（getPerson修正）があるが、同等の修正が main にも入っているため、マージは概ねクリーンに通る見込み。

### 本番投入の範囲を限定する切り分けルール（2026-07-12 設計側と確定）

v3.0 昇格時、以下2点で本番への投入範囲を絞る：

1. **Cloud Functions（メール送信）は今回デプロイしない** … フロント昇格（`git merge`→Netlify）と `firebase deploy --only functions` は別作業。**後者を実行しないだけ**。既存テスト協力者は GitHub Pages（開発）でそのまま利用可能。
2. **通知設定UI（v3.0）は本番でのみ非表示** … 開発・本番は同一コード・同一Firebase・**ビルド分離不可**のため、`window.location.hostname === 'bitennote.netlify.app'` の**ドメイン判定で表示/非表示を切替**える実装が必要。GitHub Pages（開発）では表示を維持。対象は少なくとも `#/notification-settings` ルート・「🔔 リマインダー設定」ボタン・ホームお知らせカードの導線。**この切り分け漏れに注意。**

詳細な作業計画は `docs/notes/スプリント計画_20260712_2週間.md`。

---

## 正しいデプロイ手順（まとめ）

```bash
# 1. 開発へ（feature を使った場合は先に main へマージ）
git checkout main && git push origin main    # GitHub Pages（開発）で実機確認

# 2. 検証OK後、本番へ昇格
git checkout production && git merge main && git push origin production && git checkout main
# Netlify（本番 bitennote.netlify.app）が自動デプロイ
```

---

## ⚠️ リポジトリ構成の地雷：親ディレクトリ `cc/` の誤配線（2026-07-12 調査で判明）

ワークスペース親ディレクトリ `.../workspace/cc/` **自体が独立した `.git` を持つレガシーリポジトリ**で、その origin が**誤って `biten_note.git` を指している**（本来このURLは `cc/biten_note` サブフォルダ専用）。GitHub開発初期に成り行きで配線が固まったもので、放置されている。

**経緯**: `cc/` は元々 bitoku_pilot の開発リポジトリ（最古コミット `cba81a0` は bitoku_pilot repo と同一 root）。後に biten_note を実ファイルで抱え込み、一度 biten_note.git へ push した（reflog に `6cab527 update by push` の痕跡）。その後、別履歴の本物 biten_note リポジトリ（root `a10c08c`）が同URLへ force push で上書きし、`cc/` の `origin/main=6cab527` は GitHub 上に存在しない亡霊（stale）になった。`cc/` 内では biten_note/ は古い実ファイルのスナップショット、bitoku_pilot/ と lp01/ は `.gitmodules` 無しの半壊 gitlink。

**危険性**: 通常の `git push` は履歴が無関係なため non-fast-forward で**拒否され安全**。事故が起きるのは **`git push --force` や別名ブランチの push** のみ。これをやると**本物の biten_note.git（＝この本番）をワークスペースのゴミで上書き破壊**しうる。

**守るべき運用ルール**:
- ✅ git 操作は必ず**各サブフォルダの中**で行う（`cd cc/biten_note` してから）
- ❌ `cc/`（親ディレクトリ）ルートでは git コマンドを叩かない
- ❌ どこであれ `push --force` は原則使わない（唯一これが本番破壊につながる操作）

**正常な配線（ここで作業する）**: `cc/biten_note` → `biten_note.git` ／ `cc/bitoku_pilot` → `biten_ap_demo.git`(master) ／ `cc/lp01` → `lp01.git`(main)。

**恒久対策（2026-07-12 実施済み）**: `git -C .../workspace/cc remote remove origin` を実行し、親 `cc/` の誤 origin を削除。これにより `cc/` からの push は `fatal: No configured push destination.` で**物理的に不可能**になり、force push の footgun 自体を無効化した（ローカルのコミット・履歴は全保持＝可逆）。元の誤 origin URL は `https://github.com/evahsuga/biten_note.git` だった。サブ3リポジトリの配線は無傷。
