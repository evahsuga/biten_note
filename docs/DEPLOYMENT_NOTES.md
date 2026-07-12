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

---

## 正しいデプロイ手順（まとめ）

```bash
# 1. 開発へ（feature を使った場合は先に main へマージ）
git checkout main && git push origin main    # GitHub Pages（開発）で実機確認

# 2. 検証OK後、本番へ昇格
git checkout production && git merge main && git push origin production && git checkout main
# Netlify（本番 bitennote.netlify.app）が自動デプロイ
```
