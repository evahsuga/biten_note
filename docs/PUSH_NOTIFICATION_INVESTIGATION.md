# プッシュ通知 調査記録

**調査日**: 2026-03-01
**ステータス**: 未解決（一時中断）

## 概要

Firebase Cloud Messaging (FCM) を使用したプッシュ通知機能を実装したが、デバイスへの通知表示ができない状態。

## 現状

### 動作している部分
- ✅ FCMトークンの取得・保存
- ✅ Cloud Functions によるスケジュール実行（毎時0分）
- ✅ FCM への送信（成功レスポンス取得）
- ✅ メール通知（正常動作）

### 動作していない部分
- ❌ デバイスへの通知表示（Android/iPhone 両方）

## 調査結果

### FCM送信ログ
```
Push notification sent successfully
レスポンス: projects/biten-note-app/messages/xxxxx
```
FCMは正常にメッセージを受け付けている。

### 確認済み項目
1. FCMトークンは有効（送信成功）
2. Service Worker ファイル存在（firebase-messaging-sw.js）
3. PWAアイコン作成済み（8サイズ）
4. ブラウザ通知設定は「許可」

### 考えられる原因
1. Service Worker がデバイスで正しく登録されていない
2. iOS Safari の PWA 制限（ホーム画面追加必須、iOS 16.4+必須）
3. ブラウザがバックグラウンドで停止している
4. OS レベルの通知設定

## 技術構成

### ファイル構成
```
firebase-messaging-sw.js  # FCM Service Worker
js/notifications.js       # 通知設定UI・FCMトークン登録
functions/index.js        # Cloud Functions（スケジュール通知）
icons/                    # PWAアイコン（8サイズ）
```

### FCMトークン保存場所
```
Firestore: users/{userId}/settings/notifications
  - fcmToken: string
  - enabled: boolean
  - method: 'push' | 'email' | 'both'
  - customTime: 'HH:MM'
  - frequency: 'daily' | 'weekdays' | 'custom'
```

### Cloud Functions
- `sendScheduledNotifications`: 毎時0分に実行、設定時刻のユーザーに通知送信
- `registerFcmToken`: FCMトークン登録エンドポイント
- `testNotification`: 開発用テストエンドポイント

## 今後の対応案

### 短期（推奨）
- **メール通知をメインとして推奨**（100%到達）
- プッシュ通知は「おまけ機能」として位置づけ

### 中長期
1. Service Worker のデバッグログ追加
2. FCM 配信レポートの確認（Firebase Console）
3. PWA インストール手順のユーザーガイド作成
4. iOS/Android 別の通知設定ガイド作成

## 参考情報

### iOS PWA プッシュ通知の制限
- iOS 16.4 以上が必須
- Safari でホーム画面に追加が必須
- 通常のブラウザタブでは動作しない

### Web Push の仕組み
```
1. ユーザーが通知を許可
2. ブラウザがFCMトークンを発行
3. トークンをサーバーに保存
4. サーバーからFCMに送信依頼
5. FCMがデバイスに配信
6. Service Worker が受信して通知表示
```

問題は手順5→6の間で発生している可能性が高い。
