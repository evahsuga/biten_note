// ================================
// 美点ノート Phase 1 - 美点記録機能
// ================================

const Biten = {
    // 美点追加処理
    async handleSubmit(personId) {
        try {
            // 入力値取得
            const input = document.getElementById('bitenInput');
            const content = input.value.trim();
            
            // バリデーション
            const validation = Utils.validateBiten(content);
            if (!validation.valid) {
                showToast(validation.message, 'error');
                return;
            }
            
            // 美点データ作成
            const bitenData = {
                personId: personId,
                content: content,
                date: Utils.getCurrentDate()
            };
            
            // データベースに追加
            const newBiten = await DB.addBiten(bitenData);
            
            // 入力欄クリア
            input.value = '';
            
            // チャットに追加表示
            this.appendBitenToChat(newBiten);

            // 入力欄にフォーカス
            input.focus();
            
        } catch (error) {
            Utils.error('美点追加エラー', error);
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },
    
    // チャットに美点を追加表示
    appendBitenToChat(biten) {
        const chatContainer = document.getElementById('chatContainer');

        // 空状態を削除
        const emptyState = chatContainer.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        // 今日の日付セパレーターを確認
        const today = Utils.getCurrentDate();
        const existingSeparator = chatContainer.querySelector(`[data-date="${today}"]`);

        // 現在の美点数を計算（既存のメッセージ数 + 1）
        const existingMessages = chatContainer.querySelectorAll('.chat-message').length;
        const bitenNumber = existingMessages + 1;

        if (!existingSeparator) {
            // 日付セパレーター追加（先頭に）
            const separatorHTML = `
                <div class="chat-date-separator" data-date="${today}">
                    <span class="chat-date-text">${Utils.formatDate(today)}</span>
                </div>
            `;
            chatContainer.insertAdjacentHTML('afterbegin', separatorHTML);
        }

        // 美点メッセージ追加（日付セパレーターの直後に）
        const messageHTML = `
            <div class="chat-message" data-biten-id="${biten.id}">
                <div class="chat-bubble">
                    <div class="chat-bubble-number">${bitenNumber}</div>
                    <div class="chat-bubble-content">${biten.content}</div>
                </div>
            </div>
        `;

        // 今日のセパレーターの直後に挿入
        if (existingSeparator) {
            existingSeparator.insertAdjacentHTML('afterend', messageHTML);
        } else {
            // 新しく作成したセパレーターの直後に挿入
            const newSeparator = chatContainer.querySelector(`[data-date="${today}"]`);
            newSeparator.insertAdjacentHTML('afterend', messageHTML);
        }

        // 最上部へスクロール（新しいメッセージが見えるように）
        chatContainer.scrollTop = 0;
    },
    
    // 美点削除（Phase 2以降で実装予定）
    async deleteBiten(bitenId) {
        if (!confirm(CONFIG.MESSAGES.CONFIRM.DELETE_BITEN)) {
            return;
        }
        
        try {
            showLoading();
            
            // データベースから削除
            // Phase 1では実装しない（削除機能は Phase 2）
            
            hideLoading();
            showToast('美点を削除しました', 'success');
            
        } catch (error) {
            Utils.error('美点削除エラー', error);
            hideLoading();
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },
    
    // 文字数カウント表示（リアルタイム）
    setupCharCounter(inputId, counterId) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);
        
        if (!input || !counter) return;
        
        input.addEventListener('input', () => {
            const length = input.value.length;
            const max = CONFIG.LIMITS.MAX_BITEN_LENGTH;
            
            counter.textContent = `${length}/${max}`;
            
            // 文字数に応じてスタイル変更
            counter.classList.remove('warning', 'error');
            if (length >= max) {
                counter.classList.add('error');
            } else if (length >= max - 5) {
                counter.classList.add('warning');
            }
        });
    }
};

// グローバルに公開
window.Biten = Biten;