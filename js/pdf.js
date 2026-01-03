// ================================
// 美点ノート Phase 1 - PDF出力機能
// ================================

const PDF = {
    // PDF生成・ダウンロード（jsPDF直接ダウンロード方式）
    async generatePDF(selectedPersonIds = null) {
        try {
            showLoading();
            Utils.log('PDF生成開始（jsPDF直接ダウンロード方式）', { selectedPersonIds });

            // 全人物と美点を取得
            const allPersons = await DB.getAllPersons();
            Utils.log('取得した人物数:', allPersons.length);

            if (allPersons.length === 0) {
                hideLoading();
                showToast('登録された人物がいません', 'info');
                return;
            }

            // 選択された人物のみをフィルタリング（指定がない場合は全員）
            const persons = selectedPersonIds && selectedPersonIds.length > 0
                ? allPersons.filter(p => selectedPersonIds.includes(p.id))
                : allPersons;

            Utils.log('PDF出力対象人物数:', persons.length);

            if (persons.length === 0) {
                hideLoading();
                showToast('出力する人物が選択されていません', 'info');
                return;
            }

            // getAllPersons()が既にsortOrder順でソート済みなので、
            // ユーザーが設定した並び順を尊重（あいうえお順ではなくsortOrder順）
            // フィルタリングした場合でも元の順序を維持

            // 各人物の美点を取得
            const personsWithBitens = [];
            for (const person of persons) {
                const bitens = await DB.getBitensByPersonId(person.id);
                // 日付順にソート
                bitens.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                personsWithBitens.push({
                    person: person,
                    bitens: bitens
                });
            }

            Utils.log('PDF生成準備完了、jsPDF開始');

            // jsPDFでPDF生成
            await this.generatePDFWithJsPDF(personsWithBitens);

            hideLoading();
            showToast('PDFダウンロードを開始しました', 'success');
            Utils.log('PDF生成完了');

        } catch (error) {
            Utils.error('PDF生成エラー', error);

            try {
                hideLoading();
            } catch (e) {
                // ローディング画面が既に存在しない場合は無視
            }

            let errorMessage = 'PDF生成に失敗しました';
            if (error.message) {
                errorMessage += ': ' + error.message;
            }

            try {
                showToast(errorMessage, 'error');
            } catch (e) {
                console.error(errorMessage);
            }

            if (error.stack) {
                console.error('スタックトレース:', error.stack);
            }
        }
    },

    // jsPDFでPDF生成（新方式）
    async generatePDFWithJsPDF(personsWithBitens) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // 日本語フォント設定（IPAexGothic）
            // CDNから読み込まれたIPAexGothicフォントを使用
            try {
                doc.setFont('IPAexGothic', 'normal');
                Utils.log('日本語フォント設定成功: IPAexGothic');
            } catch (error) {
                Utils.error('IPAexGothicフォント設定エラー', error);
                // フォールバック: courier（日本語は表示されないが処理は継続）
                doc.setFont('courier');
            }

            const today = new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            let currentPage = 1;

            // ========== 表紙ページ ==========
            doc.setFontSize(40);
            doc.setTextColor(102, 126, 234); // #667eea
            doc.text('美点発見note', 105, 100, { align: 'center' });

            doc.setFontSize(20);
            doc.text('Biten Note', 105, 120, { align: 'center' });

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(today, 105, 150, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(102, 102, 102);
            doc.text('大切な人の美点を記録した宝物', 105, 200, { align: 'center' });

            // ========== 目次ページ ==========
            doc.addPage();
            currentPage++;

            doc.setFontSize(20);
            doc.setTextColor(102, 126, 234);
            doc.text('目次', 105, 30, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);

            let yPos = 50;
            personsWithBitens.forEach((item, index) => {
                const pageNum = index + 3;
                const line = `${index + 1}. ${item.person.name} (${item.bitens.length}個) ................ ${pageNum}`;
                doc.text(line, 20, yPos);
                yPos += 10;

                // ページあふれ防止
                if (yPos > 270) {
                    doc.addPage();
                    currentPage++;
                    yPos = 30;
                }
            });

            // ========== 各人物のページ ==========
            for (const item of personsWithBitens) {
                doc.addPage();
                currentPage++;
                await this.addPersonPageToJsPDF(doc, item, currentPage);
            }

            // PDFダウンロード
            const filename = `美点発見note_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);

            Utils.log('jsPDF生成・ダウンロード完了', { filename });

        } catch (error) {
            Utils.error('jsPDF生成エラー', error);
            throw error;
        }
    },

    // 人物ページをjsPDFに追加
    async addPersonPageToJsPDF(doc, item, pageNumber) {
        try {
            const person = item.person;
            const bitens = item.bitens;

            let yPos = 20;

            // 写真があれば追加
            if (person.photo) {
                try {
                    doc.addImage(person.photo, 'JPEG', 20, yPos, 30, 30);
                } catch (error) {
                    Utils.error('写真埋め込みエラー', error);
                    // 写真エラーは無視して続行
                }
            }

            // 人物情報（写真の右側）
            const textX = person.photo ? 55 : 20;
            doc.setFontSize(14);
            doc.setTextColor(102, 126, 234);
            doc.text(person.name, textX, yPos + 5);

            doc.setFontSize(8);
            doc.setTextColor(102, 102, 102);
            const metDateText = person.metDate
                ? new Date(person.metDate).toLocaleDateString('ja-JP')
                : '未設定';
            doc.text(`関係性: ${person.relationship}`, textX, yPos + 12);
            doc.text(`出会った日: ${metDateText}`, textX, yPos + 18);

            yPos = person.photo ? yPos + 35 : yPos + 25;

            // 区切り線
            doc.setDrawColor(204, 204, 204);
            doc.line(20, yPos, 190, yPos);
            yPos += 5;

            // 美点グリッド（4列×25行 = 100個）
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);

            const cellWidth = 42;
            const cellHeight = 7;
            const cols = 4;
            const startX = 20;

            for (let i = 0; i < 100; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = startX + col * cellWidth;
                const y = yPos + row * cellHeight;

                // セル枠
                doc.setDrawColor(221, 221, 221);
                if (bitens[i]) {
                    doc.setFillColor(255, 255, 255);
                } else {
                    doc.setFillColor(249, 249, 249);
                }
                doc.rect(x, y, cellWidth, cellHeight, 'FD');

                // 番号
                doc.setTextColor(102, 126, 234);
                doc.text(`${i + 1}.`, x + 1, y + 4.5);

                // 美点内容
                if (bitens[i]) {
                    doc.setTextColor(51, 51, 51);
                    const content = bitens[i].content.substring(0, 15); // 15文字制限
                    doc.text(content, x + 6, y + 4.5);
                }

                // ページあふれ防止（25行ごとに新ページ）
                if (i === 99 || (row >= 24 && col === 3)) {
                    if (i < 99 && bitens.length > i + 1) {
                        doc.addPage();
                        yPos = 20;
                    }
                }
            }

            // フッター
            doc.setFontSize(8);
            doc.setTextColor(153, 153, 153);
            doc.text(`- ${pageNumber} - 美点発見note`, 105, 287, { align: 'center' });

        } catch (error) {
            Utils.error('人物ページ追加エラー', error);
            throw error;
        }
    },

    // 印刷用ウィンドウを開く（ポップアップブロック回避版）
    openPrintWindow(personsWithBitens) {
        try {
            Utils.log('印刷ページ作成開始');

            // HTMLコンテンツ生成
            Utils.log('HTMLコンテンツ生成開始');
            const htmlContent = this.generatePrintHTML(personsWithBitens);
            Utils.log('HTMLコンテンツ生成完了');

            // 現在のページを一時保存
            const currentHTML = document.documentElement.innerHTML;
            const currentTitle = document.title;

            // ページを印刷用HTMLに置き換え
            document.open();
            document.write(htmlContent);
            document.close();

            Utils.log('印刷ページ表示完了');

            // 印刷ダイアログを開く
            setTimeout(() => {
                window.print();

                // 印刷後、元のページに戻る
                window.onafterprint = () => {
                    Utils.log('印刷完了、元のページに戻ります');
                    document.open();
                    document.write('<!DOCTYPE html><html>' + currentHTML.substring(currentHTML.indexOf('<html>') + 6));
                    document.close();
                    document.title = currentTitle;

                    // ページをリロードして完全に元に戻す
                    setTimeout(() => {
                        location.reload();
                    }, 100);
                };
            }, 500);

        } catch (error) {
            Utils.error('印刷ページ作成エラー', error);
            throw error;
        }
    },

    // 印刷用HTML生成（完全なHTMLドキュメント）
    generatePrintHTML(personsWithBitens) {
        try {
            Utils.log('generatePrintHTML開始', { personsCount: personsWithBitens.length });

            const today = new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            let bodyHTML = '';

        // 表紙ページ
        bodyHTML += `
            <div class="page cover-page">
                <h1 class="title">美点発見note</h1>
                <h2 class="subtitle">Biten Note</h2>
                <p class="date">${today}</p>
                <p class="description">大切な人の美点を記録した宝物</p>
            </div>
        `;

        // 目次ページ
        bodyHTML += `
            <div class="page toc-page">
                <h2 class="page-title">目次</h2>
                <ul class="toc-list">
        `;

        personsWithBitens.forEach((item, index) => {
            const pageNum = index + 3;
            bodyHTML += `
                <li class="toc-item">
                    <span class="toc-number">${index + 1}.</span>
                    <span class="toc-name">${this.escapeHtml(item.person.name)}</span>
                    <span class="toc-count">(${item.bitens.length}個)</span>
                    <span class="toc-dots">..........................................</span>
                    <span class="toc-page">${pageNum}</span>
                </li>
            `;
        });

        bodyHTML += `
                </ul>
            </div>
        `;

        // 各人物のページ
        personsWithBitens.forEach((item, index) => {
            bodyHTML += this.generatePersonPage(item, index + 3);
        });

        // 戻るボタン（印刷時は非表示）
        bodyHTML += `
            <div class="back-button-container no-print">
                <button class="back-button" onclick="location.reload();">
                    ← アプリに戻る
                </button>
                <p class="back-button-hint">または、ブラウザの「印刷」機能でPDFとして保存できます</p>
            </div>
        `;

        // 完全なHTMLドキュメントを返す
        const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>美点発見note - ${today}</title>
    <style>
        @page {
            size: A4;
            margin: 10mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'メイリオ', Meiryo, 'MS PGothic', sans-serif;
            font-size: 9pt;
            line-height: 1.4;
            color: #333;
            background: white;
        }

        .page {
            width: 100%;
            display: flex;
            flex-direction: column;
        }

        /* 表紙のみ1ページに収める */
        .cover-page {
            page-break-inside: avoid;
            page-break-after: always;
            min-height: 277mm;
            max-height: 277mm;
            justify-content: center;
            align-items: center;
            text-align: center;
        }

        /* 目次は自然に複数ページに分割される */
        .toc-page {
            page-break-after: always;
        }

        /* 人物ページも複数ページに分割可能 */
        .person-page {
            page-break-after: always;
        }

        .person-page:last-of-type {
            page-break-after: avoid;
        }

        .title {
            font-size: 48pt;
            color: #667eea;
            margin-bottom: 20px;
            font-weight: bold;
        }

        .subtitle {
            font-size: 24pt;
            color: #667eea;
            margin-bottom: 60px;
        }

        .date {
            font-size: 14pt;
            margin-bottom: 100px;
        }

        .description {
            font-size: 12pt;
            color: #666;
        }

        /* 目次 */
        .toc-page {
            padding: 30px;
        }

        .page-title {
            font-size: 24pt;
            text-align: center;
            margin-bottom: 40px;
            color: #667eea;
        }

        .toc-list {
            list-style: none;
        }

        .toc-item {
            margin-bottom: 15px;
            font-size: 12pt;
            display: flex;
            align-items: baseline;
        }

        .toc-number {
            margin-right: 8px;
            font-weight: bold;
        }

        .toc-name {
            font-weight: bold;
            margin-right: 8px;
        }

        .toc-count {
            color: #666;
            margin-right: 8px;
        }

        .toc-dots {
            flex: 1;
            overflow: hidden;
            color: #ccc;
        }

        .toc-page {
            margin-left: 8px;
            font-weight: bold;
        }

        /* 個人ページ */
        .person-page {
            padding: 12px;
        }

        .person-header {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            align-items: flex-start;
        }

        .person-photo {
            width: 60px;
            height: 60px;
            flex-shrink: 0;
            border: 1px solid #ddd;
            object-fit: cover;
        }

        .person-photo-placeholder {
            width: 60px;
            height: 60px;
            flex-shrink: 0;
            border: 1px dashed #ccc;
            background: #f5f5f5;
        }

        .person-info {
            flex: 1;
        }

        .person-name {
            font-size: 16pt;
            color: #667eea;
            margin-bottom: 4px;
            font-weight: bold;
        }

        .person-detail {
            font-size: 8pt;
            color: #666;
            margin-bottom: 2px;
        }

        .divider {
            border: none;
            border-top: 1px solid #ccc;
            margin: 8px 0;
        }

        /* 美点グリッド */
        .bitens-grid {
            margin-bottom: 6px;
        }

        .biten-block {
            margin-bottom: 3px;
        }

        .biten-row {
            display: flex;
            gap: 2px;
            margin-bottom: 2px;
        }

        .biten-cell {
            flex: 1;
            border: 1px solid #ddd;
            padding: 2px 4px;
            font-size: 9pt;
            min-height: 18px;
            line-height: 1.3;
            background: white;
        }

        .biten-cell.empty {
            background: #f9f9f9;
        }

        .biten-number {
            font-weight: bold;
            color: #667eea;
            margin-right: 3px;
            font-size: 8pt;
        }

        .biten-content {
            color: #333;
            font-size: 9pt;
        }

        /* メモ欄 */
        .memo-section {
            margin-top: 6px;
        }

        .memo-title {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .memo-lines {
            border: 1px solid #ccc;
            padding: 4px;
            min-height: 40px;
            background: #fafafa;
        }

        .memo-line {
            border-bottom: 1px dotted #ccc;
            height: 12px;
        }

        .memo-line:last-child {
            border-bottom: none;
        }

        /* ページフッター */
        .page-footer {
            text-align: center;
            margin-top: auto;
            padding-top: 6px;
            font-size: 8pt;
            color: #999;
        }

        /* 戻るボタン（画面表示用） */
        .back-button-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            text-align: center;
        }

        .back-button {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            text-decoration: none;
        }

        .back-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .back-button:active {
            transform: translateY(0);
        }

        .back-button-hint {
            margin-top: 8px;
            font-size: 12px;
            color: #666;
            background: white;
            padding: 8px 12px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        @media print {
            /* 印刷時は戻るボタンを非表示 */
            .no-print {
                display: none !important;
            }
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .page {
                page-break-after: always;
            }
        }
    </style>
</head>
<body>
    ${bodyHTML}
</body>
</html>
        `;

            Utils.log('generatePrintHTML完了');
            return html;

        } catch (error) {
            Utils.error('generatePrintHTMLエラー', error);
            throw error;
        }
    },

    // 個人ページHTML生成
    generatePersonPage(item, pageNumber) {
        try {
            Utils.log('generatePersonPage開始', {
                personName: item.person.name,
                bitenCount: item.bitens.length,
                pageNumber
            });

            const person = item.person;
            const bitens = item.bitens;

            const photoHTML = person.photo
                ? `<img src="${person.photo}" class="person-photo" alt="${this.escapeHtml(person.name)}">`
                : `<div class="person-photo-placeholder"></div>`;

            const metDateText = person.metDate
                ? new Date(person.metDate).toLocaleDateString('ja-JP')
                : '未設定';

            Utils.log('美点グリッド生成開始');
            let bitenGridHTML = this.generateBitenGrid(bitens);
            Utils.log('美点グリッド生成完了');

            return `
            <div class="page person-page">
                <div class="person-header">
                    ${photoHTML}
                    <div class="person-info">
                        <div class="person-name">${this.escapeHtml(person.name)}</div>
                        <div class="person-detail">関係性: ${this.escapeHtml(person.relationship)}</div>
                        <div class="person-detail">出会った日: ${metDateText}</div>
                    </div>
                </div>

                <hr class="divider">

                <div class="bitens-grid">
                    ${bitenGridHTML}
                </div>

                <div class="memo-section">
                    <div class="memo-title">メモ:</div>
                    <div class="memo-lines">
                        <div class="memo-line"></div>
                        <div class="memo-line"></div>
                        <div class="memo-line"></div>
                    </div>
                </div>

                <div class="page-footer">
                    - ${pageNumber} - 美点発見note
                </div>
            </div>
        `;

        } catch (error) {
            Utils.error('generatePersonPageエラー', error);
            throw error;
        }
    },

    // 美点グリッド生成（4列×5段×5ブロック = 100個）
    generateBitenGrid(bitens) {
        let html = '';
        const blocksCount = 5;
        const itemsPerBlock = 20;
        const cols = 4;
        const rows = 5;

        for (let block = 0; block < blocksCount; block++) {
            html += '<div class="biten-block">';

            for (let row = 0; row < rows; row++) {
                html += '<div class="biten-row">';

                for (let col = 0; col < cols; col++) {
                    const index = block * itemsPerBlock + row * cols + col;
                    const biten = bitens[index];
                    const number = index + 1;

                    const cellClass = biten ? 'biten-cell' : 'biten-cell empty';
                    const content = biten ? this.escapeHtml(biten.content) : '';

                    html += `
                        <div class="${cellClass}">
                            <span class="biten-number">${number}.</span>
                            <span class="biten-content">${content}</span>
                        </div>
                    `;
                }

                html += '</div>';
            }

            html += '</div>';
        }

        return html;
    },

    // HTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 写真をPDFに追加（Phase 2以降で実装予定）
    addPhotoToPDF(doc, photoBase64, x, y, width, height) {
        try {
            if (photoBase64) {
                doc.addImage(photoBase64, 'JPEG', x, y, width, height);
            }
        } catch (error) {
            Utils.error('PDF写真追加エラー', error);
        }
    }
};

// グローバルに公開
window.PDF = PDF;