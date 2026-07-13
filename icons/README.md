# PWAアイコン

以下のサイズのアイコン画像（PNG形式）が必要です。

## 必須アイコン

| ファイル名 | サイズ | 用途 |
|-----------|--------|------|
| icon-72.png | 72x72 | Android通知バッジ |
| icon-96.png | 96x96 | Android |
| icon-128.png | 128x128 | Chrome Web Store |
| icon-144.png | 144x144 | iOS/Android |
| icon-152.png | 152x152 | iOS |
| icon-192.png | 192x192 | Android/iOS（主要アイコン） |
| icon-384.png | 384x384 | Android |
| icon-512.png | 512x512 | Android スプラッシュ |

## アイコン作成の推奨事項

- **背景色**: #6B73FF（アプリのテーマカラー）
- **マージン**: アイコン領域の10-15%を余白に
- **形状**: 正方形（maskable対応のため角を丸くしない）
- **フォーマット**: PNG（透過背景可）

## 作成ツール

以下のツールでまとめて生成できます：
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator
- Figma / Canva などのデザインツール

## 512x512の元画像から一括生成

```bash
# ImageMagickを使用した例
convert icon-512.png -resize 192x192 icon-192.png
convert icon-512.png -resize 144x144 icon-144.png
# ... 以下同様
```
