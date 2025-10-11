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
            
            // jsPDF インスタンス作成
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // 日本語フォント設定は不要（標準フォントで日本語表示可能）
            doc.setFont('helvetica');
            
            // 表紙
            this.addCoverPage(doc);
            
            // 目次
            doc.addPage();
            this.addTableOfContents(doc, personsWithBitens);
            
            // 各人物のページ
            for (let i = 0; i < personsWithBitens.length; i++) {
                doc.addPage();
                this.addPersonPage(doc, personsWithBitens[i], i + 1);
            }
            
            // PDF保存
            const filename = `美点ノート_${Utils.getCurrentDate()}.pdf`;
            doc.save(filename);
            
            hideLoading();
            showToast(CONFIG.MESSAGES.SUCCESS.PDF_GENERATED, 'success');
            Utils.log('PDF生成完了', filename);
            
        } catch (error) {
            Utils.error('PDF生成エラー', error);
            hideLoading();
            showToast('PDF生成に失敗しました', 'error');
        }
    },
    
    // 表紙ページ
    addCoverPage(doc) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // グラデーション背景（簡易版）
        doc.setFillColor(102, 126, 234); // Primary color
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // タイトル
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(CONFIG.PDF.FONT_SIZE.TITLE);
        doc.text('美点ノート', pageWidth / 2, 80, { align: 'center' });
        
        // サブタイトル
        doc.setFontSize(CONFIG.PDF.FONT_SIZE.HEADING);
        doc.text('Biten Note', pageWidth / 2, 95, { align: 'center' });
        
        // 日付
        doc.setFontSize(CONFIG.PDF.FONT_SIZE.BODY);
        doc.text(Utils.formatDate(Utils.getCurrentDate()), pageWidth / 2, 120, { align: 'center' });
        
        // フッター
        doc.setFontSize(CONFIG.PDF.FONT_SIZE.SMALL);
        doc.text('大切な人の美点を記録した宝物', pageWidth / 2, pageHeight - 30, { align: 'center' });
    },
    
    // 目次ページ
    addTableOfContents(doc, personsWithBitens) {
        const pageWidth = doc.internal.pageSize.getWidth();
        let yPosition = 30;
        
        // タイトル
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(CONFIG.PDF.FONT_SIZE.HEADING);
        doc.text('目次', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 20;
        
        // 各人物
        doc.setFontSize(CONFIG.PDF.FONT_SIZE.BODY);
        personsWithBitens.forEach((item, index) => {
            const pageNumber = index + 3; // 表紙 + 目次 + 1
            const text = `${index + 1}. ${item.person.name} (${item.bitens.length}個) ......... ${pageNumber}`;
            doc.text(text, 30, yPosition);
            yPosition += 10;
            
            // ページが足りない場合は改ページ
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 30;
            }
        });
        
        // フッター
        this.addFooter(doc, 2);
    },
    
    // 人物ページ
    addPersonPage(doc, data, pageIndex) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 30;
        
        const person = data.person;
        const bitens = data.bitens;
        
        // ヘッダー: 人物名
        doc.setFontSize(CONFIG.PDF.FONT_SIZE.HEADING);
        doc.setTextColor(102, 126, 234); // Primary color
        doc.text(`${pageIndex}. ${person.name}`, 30, yPosition);
        
        yPosition += 5;
        
        // 関係性
        doc.setFontSize(CONFIG.PDF.FONT_SIZE.SMALL);
        doc.setTextColor(100, 100, 100);
        doc.text(`(${person.relationship})`, 30, yPosition);
        
        yPosition += 10;
        
        // 区切り線
        doc.setDrawColor(200, 200, 200);
        doc.line(30, yPosition, pageWidth - 30, yPosition);
        
        yPosition += 10;
        
        // 美点一覧（番号 + 美点のみ、日付なし）
        doc.setFontSize(CONFIG.PDF.FONT_SIZE.BODY);
        doc.setTextColor(0, 0, 0);
        
        const maxBitens = CONFIG.LIMITS.TARGET_BITEN_COUNT; // 100個
        
        for (let i = 0; i < maxBitens; i++) {
            const number = `${i + 1}.`;
            const content = bitens[i] ? bitens[i].content : ''; // 空白の場合は空文字
            
            // 番号
            doc.text(number, 30, yPosition);
            
            // 美点内容
            if (content) {
                doc.text(content, 45, yPosition);
            }
            
            yPosition += 7;
            
            // ページが足りない場合は改ページ
            if (yPosition > 270) {
                this.addFooter(doc, pageIndex + 2);
                doc.addPage();
                yPosition = 30;
                
                // ページヘッダー（継続ページ）
                doc.setFontSize(CONFIG.PDF.FONT_SIZE.BODY);
                doc.setTextColor(150, 150, 150);
                doc.text(`${person.name} の美点（続き）`, 30, yPosition);
                yPosition += 10;
            }
        }
        
        // フッター
        this.addFooter(doc, pageIndex + 2);
    },
    
    // フッター
    addFooter(doc, pageNumber) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        doc.setFontSize(CONFIG.PDF.FONT_SIZE.SMALL);
        doc.setTextColor(150, 150, 150);
        doc.text(`- ${pageNumber} -`, pageWidth / 2, pageHeight - 15, { align: 'center' });
        doc.text('美点ノート', pageWidth / 2, pageHeight - 10, { align: 'center' });
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