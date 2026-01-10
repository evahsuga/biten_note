# デプロイメントガイド

美点発見noteの開発・本番環境デプロイメント手順

## 環境構成

### 開発環境（GitHub Pages）
- **ブランチ**: `main`
- **URL**: https://evahpro.github.io/biten_note/
- **用途**: 開発・テスト環境
- **自動デプロイ**: mainブランチへのpushで自動デプロイ

### 本番環境（Netlify）
- **ブランチ**: `production`
- **URL**: https://biten-note.netlify.app
- **用途**: 本番環境
- **自動デプロイ**: productionブランチへのpushで自動デプロイ

## デプロイワークフロー

### 1. 開発・テスト（main → GitHub Pages）

```bash
# ローカルで開発
# VSCodeで編集...

# mainブランチにコミット・プッシュ
git add .
git commit -m "機能追加: XXX"
git push origin main
```

→ **GitHub Pagesで自動デプロイ**
→ https://evahpro.github.io/biten_note/ でテスト

### 2. 本番リリース（main → production → Netlify）

テストが完了したら、本番環境にデプロイ：

```bash
# productionブランチに切り替え
git checkout production

# mainブランチの変更をマージ
git merge main

# コンフリクトがあれば解決
# (通常は発生しません - productionはmainの安定版のため)

# productionブランチにプッシュ
git push origin production

# mainブランチに戻る
git checkout main
```

→ **Netlifyで自動デプロイ**
→ https://biten-note.netlify.app で本番公開

## Netlify設定

### 初回設定（Netlifyダッシュボード）

1. **サイト作成**
   - GitHubリポジトリ連携: `evahsuga/biten_note`

2. **ビルド設定**
   - Build command: (空欄)
   - Publish directory: `.` (ルート)
   - Production branch: `production` ⚠️ 重要

3. **デプロイ設定**
   - Branch deploys: `production`のみ
   - Deploy previews: 無効

4. **環境変数**
   - (不要 - 静的サイト)

### ブランチ設定確認

Netlifyダッシュボード → Site settings → Build & deploy → Deploy contexts

- **Production branch**: `production`
- **Branch deploys**: `production`のみ
- **Deploy previews**: None

## GitHub Pages設定

### 初回設定（GitHubリポジトリ設定）

1. リポジトリページ → Settings → Pages
2. **Source**: Deploy from a branch
3. **Branch**: `main` / (root)
4. Save

→ https://evahpro.github.io/biten_note/ で公開

## トラブルシューティング

### GitHub Pagesがデプロイされない

1. リポジトリ設定でPagesが有効か確認
2. mainブランチに最新のコミットがあるか確認
3. Actions タブでビルドログを確認

### Netlifyがデプロイされない

1. Netlifyダッシュボードでビルドログを確認
2. Production branchが`production`に設定されているか確認
3. productionブランチに最新のコミットがあるか確認

### マージ時のコンフリクト

```bash
# productionブランチでmainをマージ中にコンフリクト発生
git checkout production
git merge main
# Auto-merging xxx
# CONFLICT (content): Merge conflict in xxx

# コンフリクトを手動で解決
# VSCodeでコンフリクトマーカーを編集

# 解決後
git add .
git commit -m "Merge main into production"
git push origin production
```

## ベストプラクティス

### 開発フロー

1. **常にmainブランチで開発**
   ```bash
   git checkout main
   ```

2. **こまめにコミット・プッシュ**
   ```bash
   git add .
   git commit -m "詳細な変更内容"
   git push origin main
   ```

3. **GitHub Pagesでテスト**
   - 実際のブラウザで動作確認
   - モバイルデバイスでも確認

4. **テスト完了後に本番デプロイ**
   ```bash
   git checkout production
   git merge main
   git push origin production
   git checkout main  # 必ずmainに戻る
   ```

### 注意事項

⚠️ **productionブランチで直接開発しない**
- productionは本番環境専用
- 開発は必ずmainブランチで行う

⚠️ **本番デプロイ前に必ずテスト**
- GitHub Pagesで動作確認
- 主要機能のテスト
- モバイル対応確認

⚠️ **緊急時のロールバック**
```bash
# 前のバージョンに戻す場合
git checkout production
git reset --hard HEAD~1  # 1つ前のコミットに戻る
git push origin production --force  # 強制プッシュ
```

## まとめ

| 環境 | ブランチ | URL | 用途 |
|------|----------|-----|------|
| 開発 | main | https://evahpro.github.io/biten_note/ | テスト |
| 本番 | production | https://biten-note.netlify.app | 公開 |

**推奨フロー**: VSCode → main → GitHub Pages (テスト) → production → Netlify (本番)
