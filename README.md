# 美点発見note

大切な人の良いところを記録するアプリ

## 概要

美点発見®メソッドをベースに開発された、人間関係を改善するためのWebアプリケーションです。

## デプロイメント

### 環境構成

- **本番環境**: Netlify（https://biten-note.netlify.app）
  - ブランチ: `production`
  - 自動デプロイ: productionブランチへのpush

- **開発環境**: GitHub Pages（https://evahpro.github.io/biten_note/）
  - ブランチ: `main`
  - 自動デプロイ: mainブランチへのpush

### デプロイフロー

```
開発 → テスト → 本番
main → GitHub Pages → production → Netlify
```

詳細は [DEPLOY.md](DEPLOY.md) を参照してください。

## 開発状況

- **バージョン 1.8**（現在）：本番運用中

### バージョン履歴

- **1.8**（2025年1月）：背景画像カスタマイズ機能、トリミング機能、設定ページ改善、Netlify公開開始
- **1.7**（2025年1月）：UI/UX改善、写真表示機能、モバイル最適化
- **1.5**（2024年12月）：Firebase連携、クラウド同期、無制限登録
- **1.0**（2024年11月）：初回リリース、IndexedDB版

## 技術スタック

- HTML/CSS/JavaScript
- Firebase Authentication
- Firebase Firestore
- Firebase App Check (reCAPTCHA v3)

## 提供元

あなたと一緒に「美点発見」！

## 開発協力

Evahpro LLC

## ライセンス

© 2025 あなたと一緒に「美点発見」！
