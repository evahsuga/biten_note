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
        html.style.fontSize = '12pt';

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
                <li style="margin-bottom: 10px;">
                    ${index + 1}. ${item.person.name} (${item.bitens.length}個) ......... ${pageNumber}
                </li>
            `;
        });

        html.innerHTML += `
                </ul>
            </div>
            <div style="page-break-after: always;"></div>
        `;

        // 各人物のページ
        personsWithBitens.forEach((item, index) => {
            const person = item.person;
            const bitens = item.bitens;
            const maxBitens = CONFIG.LIMITS.TARGET_BITEN_COUNT;

            html.innerHTML += `
                <div style="padding: 20px;">
                    <h2 style="color: #667eea; font-size: 20pt; margin-bottom: 5px;">
                        ${index + 1}. ${person.name}
                    </h2>
                    <p style="color: #666; font-size: 10pt; margin-bottom: 20px;">
                        (${person.relationship})
                    </p>
                    <hr style="border: none; border-top: 1px solid #ccc; margin-bottom: 20px;">
                    <ol style="padding-left: 20px;">
            `;

            for (let i = 0; i < maxBitens; i++) {
                const content = bitens[i] ? bitens[i].content : '';
                html.innerHTML += `
                    <li style="margin-bottom: 5px; font-size: 12pt;">
                        ${content}
                    </li>
                `;
            }

            html.innerHTML += `
                    </ol>
                </div>
                <div style="page-break-after: always;"></div>
            `;
        });

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