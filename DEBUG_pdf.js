// ================================
// PDF生成デバッグ用コード
// ================================
// このコードをpdf.jsのgeneratePDFWithHtml2Pdf内に追加

async generatePDFWithHtml2Pdf_DEBUG(personsWithBitens) {
    try {
        console.log('========================================');
        console.log('=== PDF生成デバッグ開始 ===');
        console.log('========================================');

        // ステップ1: フォント読み込み確認
        console.log('[1] フォント読み込み確認...');
        await document.fonts.ready;
        console.log('✅ フォント読み込み完了');

        const fonts = Array.from(document.fonts).map(f => ({
            family: f.family,
            style: f.style,
            weight: f.weight,
            status: f.status
        }));
        console.log('利用可能なフォント:', fonts);

        // ステップ2: HTML生成
        console.log('[2] HTML生成...');
        const fullHtmlContent = this.generatePrintHTML(personsWithBitens);
        console.log('✅ HTML生成完了（長さ:', fullHtmlContent.length, '文字）');

        // ステップ3: DOM作成
        console.log('[3] 一時DOM作成...');
        const parser = new DOMParser();
        const doc = parser.parseFromString(fullHtmlContent, 'text/html');
        const bodyContent = doc.body.innerHTML;
        const styleElement = doc.querySelector('style');
        const styleContent = styleElement ? styleElement.innerHTML : '';

        const tempContainer = document.createElement('div');
        const tempStyle = document.createElement('style');
        tempStyle.innerHTML = styleContent;
        document.head.appendChild(tempStyle);

        tempContainer.innerHTML = bodyContent;
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '210mm';
        tempContainer.style.backgroundColor = 'white'; // 背景を白に
        document.body.appendChild(tempContainer);
        console.log('✅ 一時DOM作成完了');

        // ステップ4: フォント適用確認
        console.log('[4] フォント適用確認...');
        const computedStyle = window.getComputedStyle(tempContainer);
        console.log('コンテナのフォントファミリー:', computedStyle.fontFamily);

        // 少し待つ（フォントレンダリング）
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ステップ5: html2canvas実行（詳細ログ）
        console.log('[5] html2canvas実行...');

        // まずhtml2canvasが利用可能か確認
        if (typeof html2canvas === 'undefined') {
            console.error('❌ html2canvasが読み込まれていません！');
            alert('html2canvasライブラリが読み込まれていません');
            return;
        }
        console.log('✅ html2canvasライブラリ読み込み済み');

        const canvas = await html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            letterRendering: true,
            logging: true, // 詳細ログ有効化
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                console.log('クローンされたドキュメント:', clonedDoc);
                const clonedContainer = clonedDoc.querySelector('div');
                if (clonedContainer) {
                    console.log('クローンコンテナのフォント:',
                        window.getComputedStyle(clonedContainer).fontFamily);
                }
            }
        });

        console.log('✅ Canvas生成成功');
        console.log('Canvas サイズ:', canvas.width, 'x', canvas.height);

        // ステップ6: 画像データ確認
        console.log('[6] 画像データ確認...');
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const imgSizeKB = Math.round(imgData.length / 1024);
        console.log('画像データサイズ:', imgSizeKB, 'KB');

        if (imgSizeKB < 50) {
            console.error('⚠️ 警告: 画像サイズが異常に小さい（', imgSizeKB, 'KB）');
            console.error('→ html2canvasが正しく動作していない可能性');
        } else {
            console.log('✅ 画像サイズ正常（', imgSizeKB, 'KB）');
        }

        // デバッグ用: 画像を表示
        const debugImg = new Image();
        debugImg.src = imgData;
        debugImg.style.border = '2px solid red';
        debugImg.style.maxWidth = '500px';
        debugImg.style.position = 'fixed';
        debugImg.style.top = '10px';
        debugImg.style.left = '10px';
        debugImg.style.zIndex = '10000';
        debugImg.style.backgroundColor = 'white';
        document.body.appendChild(debugImg);
        console.log('🖼️ デバッグ用画像を画面左上に表示しました');
        console.log('→ 日本語が正しく表示されているか確認してください');

        // ステップ7: PDF生成
        console.log('[7] PDF生成...');

        // html2pdf.jsが利用可能か確認
        if (typeof html2pdf === 'undefined') {
            console.error('❌ html2pdf.jsが読み込まれていません！');
            alert('html2pdf.jsライブラリが読み込まれていません');
            return;
        }
        console.log('✅ html2pdf.jsライブラリ読み込み済み');

        const filename = `美点発見note_DEBUG_${new Date().toISOString().slice(0, 10)}.pdf`;

        const opt = {
            margin: 10,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                logging: true
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().set(opt).from(tempContainer).save();
        console.log('✅ PDF保存完了:', filename);

        // クリーンアップ（デバッグ画像は残す）
        document.body.removeChild(tempContainer);
        document.head.removeChild(tempStyle);

        console.log('========================================');
        console.log('=== PDF生成デバッグ完了 ===');
        console.log('========================================');
        console.log('');
        console.log('次のステップ:');
        console.log('1. 画面左上のデバッグ画像で日本語が表示されているか確認');
        console.log('2. ダウンロードされたPDFを確認');
        console.log('3. このコンソールログをスクリーンショットで保存');

        alert('デバッグ完了！\n\n1. 画面左上の画像で日本語を確認\n2. ダウンロードされたPDFを確認\n3. コンソールログを確認');

    } catch (error) {
        console.error('❌ エラー発生:', error);
        console.error('スタックトレース:', error.stack);
        alert('エラー発生: ' + error.message);
        throw error;
    }
}
