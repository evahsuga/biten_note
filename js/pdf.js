// ================================
// 美点ノート Phase 1 - PDF出力機能
// ================================

const PDF = {
    // PDF生成・ダウンロード
    async generatePDF() {
        try {
            showLoading();
            Utils.log('PDF生成開始');

            // 全人物と美点を取得
            const persons = await DB.getAllPersons();

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
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            // HTMLをPDFに変換（日本語対応）
            await doc.html(htmlContent, {
                callback: function (doc) {
                    // PDF保存
                    const filename = `美点ノート_${Utils.getCurrentDate()}.pdf`;
                    doc.save(filename);

                    hideLoading();
                    showToast(CONFIG.MESSAGES.SUCCESS.PDF_GENERATED, 'success');
                    Utils.log('PDF生成完了', filename);
                },
                x: 10,
                y: 10,
                width: 190,
                windowWidth: 800
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
        html.style.fontFamily = 'sans-serif';
        html.style.fontSize = '10pt';

        // 表紙
        html.innerHTML += `
            <div style="text-align: center; padding: 100px 0;">
                <h1 style="font-size: 36pt; color: #667eea; margin-bottom: 20px;">美点ノート</h1>
                <h2 style="font-size: 18pt; color: #667eea; margin-bottom: 40px;">Biten Note</h2>
                <p style="font-size: 14pt;">${Utils.formatDate(Utils.getCurrentDate())}</p>
                <p style="margin-top: 80px; font-size: 12pt; color: #666;">大切な人の美点を記録した宝物</p>
            </div>
            <div style="page-break-after: always;"></div>
        `;

        // 目次
        html.innerHTML += `
            <div style="padding: 20px;">
                <h2 style="text-align: center; font-size: 24pt; margin-bottom: 30px;">目次</h2>
                <ul style="list-style: none; padding: 0;">
        `;

        personsWithBitens.forEach((item, index) => {
            const pageNumber = index + 3;
            html.innerHTML += `
                <li style="margin-bottom: 10px; font-size: 12pt;">
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
                <div style="padding: 15px; font-size: 9pt;">
                    <!-- ヘッダー部分: 写真 + 名前・関係性・日付 -->
                    <div style="display: flex; gap: 15px; margin-bottom: 15px; align-items: flex-start;">
                        <!-- 写真 -->
                        <div style="flex-shrink: 0;">
                            ${photoHTML}
                        </div>
                        <!-- 名前・関係性・日付 -->
                        <div style="flex-grow: 1;">
                            <h2 style="margin: 0 0 5px 0; font-size: 18pt; color: #667eea;">
                                ${person.name}
                            </h2>
                            <p style="margin: 3px 0; font-size: 10pt; color: #666;">
                                関係性: ${person.relationship}
                            </p>
                            <p style="margin: 3px 0; font-size: 10pt; color: #666;">
                                出会った日: ${metDateText || '未設定'}
                            </p>
                        </div>
                    </div>

                    <hr style="border: none; border-top: 1px solid #ccc; margin-bottom: 10px;">

                    <!-- 美点100個を4列×5段×5ブロック = 100個 -->
                    <div style="margin-bottom: 10px;">
                        ${this.generateBitenBlocks(bitens)}
                    </div>

                    <!-- 手書きメモスペース（3行） -->
                    <div style="margin-top: 10px;">
                        <p style="margin: 5px 0 3px 0; font-size: 9pt; font-weight: bold;">メモ:</p>
                        <div style="border: 1px solid #ccc; padding: 5px; min-height: 60px; background: #fafafa;">
                            <div style="border-bottom: 1px dotted #ccc; height: 18px;"></div>
                            <div style="border-bottom: 1px dotted #ccc; height: 18px;"></div>
                            <div style="height: 18px;"></div>
                        </div>
                    </div>

                    <!-- ページフッター -->
                    <div style="text-align: center; margin-top: 10px; font-size: 8pt; color: #999;">
                        - ${index + 3} - 美点ノート
                    </div>
                </div>
                <div style="page-break-after: always;"></div>
            `;
        });

        return html;
    },

    // 美点100個を4列×5段×5ブロックで生成
    generateBitenBlocks(bitens) {
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
                        <div style="flex: 1; border: 1px solid #ddd; padding: 2px 4px; font-size: 8pt; min-height: 18px; background: ${content ? '#fff' : '#f9f9f9'};">
                            <span style="font-weight: bold; color: #667eea;">${number}.</span>
                            <span style="color: #333;">${content}</span>
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