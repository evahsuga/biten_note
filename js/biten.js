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
            
            // 成功メッセージ
            showToast(CONFIG.MESSAGES.SUCCESS.BITEN_ADDED, 'success');
            
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
        
        if (!existingSeparator) {
            // 日付セパレーター追加
            const separatorHTML = `
                <div class="chat-date-separator" data-date="${today}">
                    <span class="chat-date-text">${Utils.formatDate(today)}</span>
                </div>
            `;
            chatContainer.insertAdjacentHTML('beforeend', separatorHTML);
        }
        
        // 美点メッセージ追加
        const time = new Date(biten.createdAt).toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const messageHTML = `
            <div class="chat-message" data-biten-id="${biten.id}">
                <div class="chat-bubble">
                    <div class="chat-bubble-content">${biten.content}</div>
                    <div class="chat-bubble-time">${time}</div>
                </div>
            </div>
        `;
        
        chatContainer.insertAdjacentHTML('beforeend', messageHTML);
        
        // 最下部へスクロール
        chatContainer.scrollTop = chatContainer.scrollHeight;
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