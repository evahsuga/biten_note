# PDF出力における日本語文字化け問題 - 技術相談資料

**作成日**: 2026年1月3日
**プロジェクト**: 美点発見note（Webアプリケーション）
**技術スタック**: HTML/CSS/JavaScript（Vanilla JS）、Firebase Firestore

---

## 1. プロジェクト概要

### アプリケーション概要
- **名称**: 美点発見note
- **機能**: 大切な人の美点を記録するWebアプリ
- **対象環境**: Android/iOS/PC（ブラウザベース）
- **URL**: https://evahpro.github.io/biten_note/
- **リポジトリ**: https://github.com/evahsuga/biten_note.git

### PDF出力の要件
- **構成**: 表紙、目次、人物ページ（写真+美点グリッド100項目）
- **用途**: 印刷して紙の記録として保管
- **対象ユーザー**: 一般ユーザー（技術知識なし）
- **重要性**: 高（コア機能の一つ）

---

## 2. 当初の問題

### 問題の発生
**日時**: 2026年1月3日
**報告内容**: Android携帯でPDF印刷時に「保存」ボタンが押せない

### 詳細
- **動作環境**: Android携帯（ブラウザ：Chrome想定）
- **現象**:
  - プリンター選択画面までは表示される
  - 「保存」ボタンが押せない（反応しない）
  - PCでは正常に動作
- **従来の実装**: `window.print()` による印刷ダイアログ表示
- **従来の状態**:
  - ✅ 日本語表示は完璧
  - ✅ レイアウトも完璧
  - ✅ PCでは問題なくPDF保存可能
  - ❌ Androidで保存ボタンが押せない

---

## 3. 試行した解決策と結果

### 方式1: jsPDF直接生成（1回目）

**実装日**: 2026年1月3日
**コミット**: `0b74ab2`

**アプローチ**:
```javascript
// jsPDFで直接PDF生成
const { jsPDF } = window.jspdf;
const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
});

// テキスト追加
doc.text('美点発見note', 105, 100);
doc.save('美点発見note.pdf');
```

**使用ライブラリ**:
- jsPDF v2.5.1（CDN: cdnjs.cloudflare.com）

**結果**:
- ✅ ダウンロード成功
- ❌ **日本語が完全に文字化け**
- ファイルサイズ: 約54KB

**文字化けの状態**:
```
期待: 美点発見note
実際: •Žp¹vz‰‹note
```

---

### 方式2: NotoSansJPフォント追加

**実装日**: 2026年1月3日
**コミット**: `4f89334`

**アプローチ**:
```javascript
// NotoSansJPフォント読み込み
<script src="https://cdn.jsdelivr.net/npm/jspdf-font-notosansjp@1.0.2/dist/NotoSansJP-Regular-normal.js"></script>

// フォント設定
doc.setFont('NotoSansJP-Regular', 'normal');
```

**結果**:
- ❌ **文字化けは改善せず**
- 携帯・PC両方で文字化け

---

### 方式3: IPAexGothicフォント変更

**実装日**: 2026年1月3日
**コミット**: `4992faf`

**アプローチ**:
```javascript
// IPAexGothicフォント（jsPDF定番フォント）
<script src="https://cdn.jsdelivr.net/npm/jspdf-font-ipaexg@1.0.1/dist/IPAexGothic-normal.js"></script>

doc.setFont('IPAexGothic', 'normal');
```

**結果**:
- ❌ **文字化けは改善せず**
- 携帯・PC両方で文字化け

---

### 方式4: html2pdf.js（HTML→PDF変換）

**実装日**: 2026年1月3日
**コミット**: `29d428d`

**アプローチ**:
```javascript
// html2pdf.jsでHTML→PDF変換
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

const opt = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true
    },
    jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
    }
};

await html2pdf().set(opt).from(tempContainer).save();
```

**結果**:
- ❌ **文字化けは改善せず**
- 携帯・PC両方で文字化け
- **ファイルサイズ: 10KB以下（明らかに異常）**

**正常な場合の期待値**: 画像化されるため数MB以上

---

## 4. 現在の状況

### 症状の詳細

**PCでの状況**:
- ダウンロード成功
- 日本語が文字化け
- ファイルサイズ: 10KB以下
- 写真も表示されない

**Android携帯での状況**:
- ダウンロード成功
- 日本語が文字化け
- ファイルサイズ: 10KB以下

### 異常な点

1. **ファイルサイズが異常に小さい**
   - 正常: 数MB（html2canvas使用時）
   - 現在: 10KB以下
   - **HTMLが画像化されていない可能性**

2. **すべての日本語フォントで失敗**
   - NotoSansJP: 失敗
   - IPAexGothic: 失敗
   - html2pdf.js: 失敗

3. **html2canvas方式でも失敗**
   - 通常は画像化されるため文字化けしないはず
   - ファイルサイズから判断して**画像化自体が失敗している**

---

## 5. 技術的詳細

### 動作環境

**クライアント環境**:
- Android携帯（Chrome）
- PC（ブラウザ不明、おそらくChrome/Safari）

**ホスティング**:
- GitHub Pages（https://evahpro.github.io/biten_note/）
- 静的サイトホスティング

**外部ライブラリ（CDN経由）**:
- Firebase SDK v8.x
- Cropper.js v1.6.1
- html2pdf.js v0.10.1（現在）
- jsPDF v2.5.1（過去に使用）

### 既存のHTML生成ロジック

```javascript
// window.print()用に既に実装済み
generatePrintHTML(personsWithBitens) {
    // 完全なHTMLドキュメントを生成
    // - 表紙ページ
    // - 目次ページ
    // - 各人物ページ（写真 + 美点グリッド）
    // すべてのスタイルをインラインで含む

    return fullHtmlString; // <!DOCTYPE html>から始まる完全なHTML
}
```

**このHTMLは**:
- ✅ window.print()で正常に表示される
- ✅ 日本語も完璧に表示される
- ✅ レイアウトも完璧

---

## 6. 考えられる原因

### 仮説1: フォントファイルの読み込みタイミング問題

**可能性**: 高

**理由**:
- CDNからフォントを読み込む際、PDF生成より遅れる可能性
- jsPDFがフォントが読み込まれる前にPDF生成を開始

**検証方法**:
- フォント読み込み完了を待つ処理を追加
- または、フォントをBase64で直接埋め込む

---

### 仮説2: html2canvasの画像化失敗

**可能性**: 高

**理由**:
- ファイルサイズ10KB以下 = 画像化されていない証拠
- 通常は画像化されるため数MB以上になる

**検証方法**:
- html2canvasが正しく動作しているか確認
- フォントが読み込まれているか確認
- CORS問題の可能性

---

### 仮説3: CORS (Cross-Origin Resource Sharing) 問題

**可能性**: 中

**理由**:
- CDNからのフォント読み込み時にCORS制限
- 写真（base64）の埋め込みでCORS問題

**検証方法**:
- ブラウザコンソールでCORSエラーを確認
- useCORS: true は既に設定済み

---

### 仮説4: ブラウザのセキュリティポリシー

**可能性**: 低

**理由**:
- GitHub Pagesはhttps対応
- 特にセキュリティ制限は無いはず

---

## 7. 検証されていない選択肢

### 選択肢A: window.print() に戻す（元の方式）

**メリット**:
- ✅ 日本語表示は完璧
- ✅ レイアウトも完璧
- ✅ 実績がある
- ✅ すぐに戻せる

**デメリット**:
- ❌ Androidで「保存」ボタンが押せない問題は未解決
- ただし、この問題は操作方法の可能性もある（要検証）

**推奨度**: ⭐⭐⭐⭐⭐（最も確実）

---

### 選択肢B: pdfmake による再実装

**メリット**:
- ✅ 日本語対応が非常に良い
- ✅ フォントをBase64で直接埋め込める
- ✅ 実績が多い

**デメリット**:
- ❌ 全レイアウトを作り直す必要がある
- ❌ 実装に時間がかかる（数日〜1週間）
- ❌ 学習コストが高い

**推奨度**: ⭐⭐⭐（時間があれば検討）

**参考URL**: http://pdfmake.org/

---

### 選択肢C: 既存フォントのBase64埋め込み

**メリット**:
- ✅ CDN読み込みタイミング問題を回避
- ✅ 確実にフォントが使用される

**デメリット**:
- ❌ フォントファイルが大きい（数MB）
- ❌ ページ読み込みが遅くなる

**推奨度**: ⭐⭐⭐⭐（試す価値あり）

---

### 選択肢D: サーバーサイドPDF生成

**メリット**:
- ✅ フォント問題を完全回避
- ✅ 確実に動作する

**デメリット**:
- ❌ サーバーが必要（現在は完全クライアントサイド）
- ❌ コストがかかる
- ❌ アーキテクチャの大幅変更

**推奨度**: ⭐（最終手段）

---

### 選択肢E: Chrome Print API の使用

**メリット**:
- ✅ ブラウザのネイティブ機能を使用
- ✅ 日本語問題なし

**デメリット**:
- ❌ Chrome拡張機能が必要
- ❌ ユーザーに追加インストールを強いる

**推奨度**: ⭐（非現実的）

---

## 8. 判断材料

### すぐに試せること（優先度高）

1. **フォント読み込み完了の確認**
   ```javascript
   // フォントが読み込まれるまで待つ
   await document.fonts.ready;
   ```

2. **html2canvasの動作確認**
   ```javascript
   // html2canvasが正しく画像化できているか確認
   const canvas = await html2canvas(element);
   const imgData = canvas.toDataURL('image/jpeg');
   console.log('Image size:', imgData.length); // サイズ確認
   ```

3. **ブラウザコンソールのエラー確認**
   - CORS エラー
   - フォント読み込みエラー
   - JavaScript エラー

---

### 中期的な対応（優先度中）

4. **pdfmake の評価・検証**
   - 小規模なPOCで日本語表示を確認
   - 実装工数の見積もり

5. **フォントのBase64埋め込み**
   - IPAexGothicをBase64化
   - ページに直接埋め込む

---

### 最終手段（優先度低）

6. **window.print() に戻す + ユーザーガイド追加**
   - Androidユーザー向けに操作手順を詳細に案内
   - 「PDFとして保存」の選択方法を明示

---

## 9. 推奨する次のステップ

### ステップ1: 原因の特定（デバッグ）

以下のコードを追加して、何が起きているか確認：

```javascript
// html2pdf.js実行前
console.log('=== PDF生成デバッグ開始 ===');

// フォント読み込み確認
await document.fonts.ready;
console.log('フォント読み込み完了');
console.log('利用可能なフォント:', Array.from(document.fonts).map(f => f.family));

// html2canvas実行
const canvas = await html2canvas(tempContainer, {
    scale: 2,
    useCORS: true,
    letterRendering: true,
    logging: true, // ログ有効化
    onclone: (clonedDoc) => {
        console.log('クローンされたドキュメント:', clonedDoc);
    }
});

console.log('Canvas生成成功');
console.log('Canvas サイズ:', canvas.width, 'x', canvas.height);

const imgData = canvas.toDataURL('image/jpeg');
console.log('画像データサイズ:', imgData.length, 'bytes');

// この画像データをチェック
const img = new Image();
img.src = imgData;
document.body.appendChild(img); // 画像を表示して確認
```

---

### ステップ2: 結果に応じた対応

**ケース1: html2canvasが画像化に失敗している場合**
→ フォント読み込み待機、CORS設定の見直し

**ケース2: 画像化は成功しているがPDF化で失敗**
→ jsPDF側の問題、pdfmakeへの移行検討

**ケース3: すべて失敗する場合**
→ window.print()に戻す

---

## 10. 添付資料

### 関連コミット履歴
- `0b74ab2`: jsPDF直接ダウンロード方式に変更
- `4f89334`: NotoSansJPフォント追加
- `4992faf`: IPAexGothicフォント変更
- `29d428d`: html2pdf.js方式に変更

### 参考URL
- プロジェクトURL: https://evahpro.github.io/biten_note/
- リポジトリ: https://github.com/evahsuga/biten_note.git
- jsPDF公式: https://github.com/parallax/jsPDF
- html2pdf.js公式: https://github.com/eKoopmans/html2pdf.js
- pdfmake公式: http://pdfmake.org/

---

## 11. 質問事項（専門家への確認項目）

1. **jsPDFで日本語フォントが正しく読み込まれているか確認する方法は？**

2. **html2canvasでフォントが正しく画像化されない原因として考えられることは？**

3. **GitHub Pages（静的ホスティング）環境でのPDF生成のベストプラクティスは？**

4. **pdfmake への移行は現実的な選択肢か？実装工数はどの程度か？**

5. **window.print()のAndroid問題は本当に解決不可能か？代替手段は？**

6. **CDNからのフォント読み込みとBase64埋め込み、どちらが確実か？**

---

**作成者**: Claude Code (Anthropic)
**技術サポート**: https://github.com/anthropics/claude-code

---
