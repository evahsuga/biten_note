// ================================
// 美点ノート Phase 1 - PDF出力機能
// ================================

const PDF = {
    // PDF生成・ダウンロード
    async generatePDF() {
        try {
            showLoading();
            Utils.log('PDF生成開始');

            // jsPDFライブラリの確認
            Utils.log('jsPDFライブラリチェック:', {
                'window.jspdf存在': !!window.jspdf,
                'window.jsPDF存在': !!window.jsPDF,
                'jspdfタイプ': typeof window.jspdf,
                'html2canvas存在': !!window.html2canvas
            });

            // html2canvasの確認（doc.html()に必要）
            if (!window.html2canvas) {
                throw new Error('html2canvasライブラリが読み込まれていません。PDF生成に必要です。');
            }

            // 全人物と美点を取得
            const persons = await DB.getAllPersons();
            Utils.log('取得した人物数:', persons.length);

            if (persons.length === 0) {
                hideLoading();
                showToast('登録された人物がいません', 'info');
                return;
            }

            // あいうえお順にソート
            persons.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

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

            // HTML要素を作成してPDF化
            const htmlContent = this.generateHTMLContent(personsWithBitens);

            // jsPDF インスタンス作成
            // jsPDFライブラリの読み込み確認
            if (!window.jspdf) {
                throw new Error('jsPDFライブラリが読み込まれていません');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            // HTMLをPDFに変換（日本語対応）
            Utils.log('HTML変換開始');

            // doc.htmlメソッドの存在確認
            if (typeof doc.html !== 'function') {
                throw new Error('doc.html()メソッドが利用できません。jsPDFのバージョンを確認してください。');
            }

            // html2canvasのオプション設定（日本語対応）
            const html2canvasOptions = {
                scale: 2, // 高解像度で描画
                useCORS: true,
                letterRendering: true,
                allowTaint: false,
                logging: false,
                backgroundColor: '#ffffff',
                // 日本語フォントを明示的に指定
                fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'メイリオ', Meiryo, 'MS PGothic', sans-serif"
            };

            await doc.html(htmlContent, {
                callback: function (doc) {
                    try {
                        // PDF保存
                        const filename = `美点ノート_${Utils.getCurrentDate()}.pdf`;
                        Utils.log('PDFファイル名:', filename);
                        doc.save(filename);

                        hideLoading();
                        showToast(CONFIG.MESSAGES.SUCCESS.PDF_GENERATED, 'success');
                        Utils.log('PDF生成完了', filename);
                    } catch (error) {
                        Utils.error('PDF保存エラー', error);
                        hideLoading();
                        showToast('PDFの保存に失敗しました', 'error');
                    }
                },
                x: 10,
                y: 10,
                width: 190,
                windowWidth: 800,
                html2canvas: html2canvasOptions
            });

        } catch (error) {
            Utils.error('PDF生成エラー', error);
            hideLoading();
            showToast('PDF生成に失敗しました', 'error');
        }
    },

    // HTML形式でコンテンツを生成
    generateHTMLContent(personsWithBitens) {
        const html = document.createElement('div');
        // 日本語フォントを明示的に指定
        html.style.fontFamily = "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'メイリオ', Meiryo, 'MS PGothic', sans-serif";
        html.style.fontSize = '10pt';

        // 日本語フォント設定
        const jpFont = "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'メイリオ', Meiryo, 'MS PGothic', sans-serif";

        // 表紙
        html.innerHTML += `
            <div style="text-align: center; padding: 100px 0; font-family: ${jpFont};">
                <h1 style="font-size: 36pt; color: #667eea; margin-bottom: 20px; font-family: ${jpFont};">美点ノート</h1>
                <h2 style="font-size: 18pt; color: #667eea; margin-bottom: 40px; font-family: ${jpFont};">Biten Note</h2>
                <p style="font-size: 14pt; font-family: ${jpFont};">${Utils.formatDate(Utils.getCurrentDate())}</p>
                <p style="margin-top: 80px; font-size: 12pt; color: #666; font-family: ${jpFont};">大切な人の美点を記録した宝物</p>
            </div>
            <div style="page-break-after: always;"></div>
        `;

        // 目次
        html.innerHTML += `
            <div style="padding: 20px; font-family: ${jpFont};">
                <h2 style="text-align: center; font-size: 24pt; margin-bottom: 30px; font-family: ${jpFont};">目次</h2>
                <ul style="list-style: none; padding: 0;">
        `;

        personsWithBitens.forEach((item, index) => {
            const pageNumber = index + 3;
            html.innerHTML += `
                <li style="margin-bottom: 10px; font-size: 12pt; font-family: ${jpFont};">
                    ${index + 1}. ${item.person.name} (${item.bitens.length}個) ......... ${pageNumber}
                </li>
            `;
        });

        html.innerHTML += `
                </ul>
            </div>
            <div style="page-break-after: always;"></div>
        `;

        // 各人物のページ（1人物1ページ）
        personsWithBitens.forEach((item, index) => {
            const person = item.person;
            const bitens = item.bitens;

            // 写真データ（あれば表示）
            const photoSrc = person.photo || '';
            const photoHTML = photoSrc
                ? `<img src="${photoSrc}" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc;">`
                : `<div style="width: 80px; height: 80px; border: 1px dashed #ccc; background: #f5f5f5;"></div>`;

            // 出会った日付（あれば表示）
            const metDateText = person.metDate ? Utils.formatDate(person.metDate) : '';

            html.innerHTML += `
                <div style="padding: 15px; font-size: 9pt; font-family: ${jpFont};">
                    <!-- ヘッダー部分: 写真 + 名前・関係性・日付 -->
                    <div style="display: flex; gap: 15px; margin-bottom: 15px; align-items: flex-start;">
                        <!-- 写真 -->
                        <div style="flex-shrink: 0;">
                            ${photoHTML}
                        </div>
                        <!-- 名前・関係性・日付 -->
                        <div style="flex-grow: 1;">
                            <h2 style="margin: 0 0 5px 0; font-size: 18pt; color: #667eea; font-family: ${jpFont};">
                                ${person.name}
                            </h2>
                            <p style="margin: 3px 0; font-size: 10pt; color: #666; font-family: ${jpFont};">
                                関係性: ${person.relationship}
                            </p>
                            <p style="margin: 3px 0; font-size: 10pt; color: #666; font-family: ${jpFont};">
                                出会った日: ${metDateText || '未設定'}
                            </p>
                        </div>
                    </div>

                    <hr style="border: none; border-top: 1px solid #ccc; margin-bottom: 10px;">

                    <!-- 美点100個を4列×5段×5ブロック = 100個 -->
                    <div style="margin-bottom: 10px;">
                        ${this.generateBitenBlocks(bitens, jpFont)}
                    </div>

                    <!-- 手書きメモスペース（3行） -->
                    <div style="margin-top: 10px;">
                        <p style="margin: 5px 0 3px 0; font-size: 9pt; font-weight: bold; font-family: ${jpFont};">メモ:</p>
                        <div style="border: 1px solid #ccc; padding: 5px; min-height: 60px; background: #fafafa;">
                            <div style="border-bottom: 1px dotted #ccc; height: 18px;"></div>
                            <div style="border-bottom: 1px dotted #ccc; height: 18px;"></div>
                            <div style="height: 18px;"></div>
                        </div>
                    </div>

                    <!-- ページフッター -->
                    <div style="text-align: center; margin-top: 10px; font-size: 8pt; color: #999; font-family: ${jpFont};">
                        - ${index + 3} - 美点ノート
                    </div>
                </div>
                <div style="page-break-after: always;"></div>
            `;
        });

        return html;
    },

    // 美点100個を4列×5段×5ブロックで生成
    generateBitenBlocks(bitens, jpFont) {
        let html = '';
        const blocksCount = 5; // 5ブロック
        const itemsPerBlock = 20; // 各ブロック20個（4列×5段）
        const cols = 4;
        const rows = 5;

        for (let block = 0; block < blocksCount; block++) {
            html += `<div style="margin-bottom: 8px;">`;

            // ブロック内の行
            for (let row = 0; row < rows; row++) {
                html += `<div style="display: flex; gap: 2px; margin-bottom: 2px;">`;

                // 各行の列
                for (let col = 0; col < cols; col++) {
                    const index = block * itemsPerBlock + row * cols + col;
                    const content = bitens[index] ? bitens[index].content : '';
                    const number = index + 1;

                    html += `
                        <div style="flex: 1; border: 1px solid #ddd; padding: 2px 4px; font-size: 8pt; min-height: 18px; background: ${content ? '#fff' : '#f9f9f9'}; font-family: ${jpFont};">
                            <span style="font-weight: bold; color: #667eea; font-family: ${jpFont};">${number}.</span>
                            <span style="color: #333; font-family: ${jpFont};">${content}</span>
                        </div>
                    `;
                }

                html += `</div>`;
            }

            html += `</div>`;
        }

        return html;
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