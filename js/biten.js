// ================================
// 美点ノート Phase 1 - 美点記録機能
// ================================

const Biten = {
    // 美点追加処理
    async handleSubmit(personId) {
        try {
            // 既存の美点数をチェック
            const existingBitens = await DB.getBitensByPersonId(personId);

            // 100個達成済みの場合
            if (existingBitens.length >= CONFIG.LIMITS.MAX_BITENS_PER_PERSON) {
                this.showAchievementModal();
                return;
            }

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
            await this.appendBitenToChat(newBiten);

            // 100個達成したかチェック
            const updatedBitens = await DB.getBitensByPersonId(personId);
            if (updatedBitens.length >= CONFIG.LIMITS.MAX_BITENS_PER_PERSON) {
                // 入力欄を無効化
                input.disabled = true;
                input.placeholder = '100個達成しました！';

                // 送信ボタンを無効化
                const sendBtn = document.querySelector('.chat-send-btn');
                if (sendBtn) {
                    sendBtn.disabled = true;
                    sendBtn.style.opacity = '0.5';
                    sendBtn.style.cursor = 'not-allowed';
                }

                // 達成モーダルを表示
                setTimeout(() => {
                    this.showAchievementModal();
                }, 500);
            } else {
                // 入力欄にフォーカス
                input.focus();
            }

        } catch (error) {
            Utils.error('美点追加エラー', error);
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },

    // 100個達成モーダルを表示
    showAchievementModal() {
        const modal = document.getElementById('achievementModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },
    
    // チャットに美点を追加表示
    async appendBitenToChat(biten) {
        const chatContainer = document.getElementById('chatContainer');

        // 空状態を削除
        const emptyState = chatContainer.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        // 今日の日付セパレーターを確認
        const today = Utils.getCurrentDate();
        const existingSeparator = chatContainer.querySelector(`[data-date="${today}"]`);

        // データベースから全美点を取得して正確な番号を計算
        const allBitens = await DB.getBitensByPersonId(biten.personId);
        const bitensOldest = [...allBitens].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const bitenNumber = bitensOldest.findIndex(b => b.id === biten.id) + 1;

        // カウンターを更新（リアルタイム反映）
        const countElement = document.getElementById('bitenCount');
        if (countElement) {
            countElement.textContent = allBitens.length;
        }

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
    
    // 美点編集開始
    async startEditBiten(bitenId, personId) {
        try {
            this.editingBitenId = bitenId;
            this.editingPersonId = personId;

            // 美点データを取得
            const bitens = await DB.getBitensByPersonId(personId);
            const biten = bitens.find(b => b.id === bitenId);

            if (!biten) {
                showToast('美点が見つかりません', 'error');
                return;
            }

            // モーダルに現在の内容を表示
            const modal = document.getElementById('bitenEditModal');
            const input = document.getElementById('bitenEditInput');
            if (modal && input) {
                input.value = biten.content;
                modal.classList.remove('hidden');
                // 入力欄にフォーカス
                setTimeout(() => input.focus(), 100);
            }
        } catch (error) {
            console.error('美点編集開始エラー:', error);
            Utils.error('美点編集開始エラー', error);
            showToast('エラーが発生しました: ' + error.message, 'error');
        }
    },

    // 美点編集モーダルを閉じる
    closeBitenEditor() {
        const modal = document.getElementById('bitenEditModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // 美点編集を保存
    async saveBitenEdit() {
        const input = document.getElementById('bitenEditInput');
        const newContent = input.value.trim();

        // バリデーション
        const validation = Utils.validateBiten(newContent);
        if (!validation.valid) {
            showToast(validation.message, 'error');
            return;
        }

        try {
            showLoading();

            // 美点データを取得
            const bitens = await DB.getBitensByPersonId(this.editingPersonId);
            const biten = bitens.find(b => b.id === this.editingBitenId);

            if (!biten) {
                hideLoading();
                showToast('美点が見つかりません', 'error');
                return;
            }

            // 美点を更新
            const updateData = {
                ...biten,
                content: newContent
            };

            await DB.updateBiten(this.editingBitenId, updateData);

            // モーダルを閉じる
            this.closeBitenEditor();

            // 画面を再レンダリング
            await App.renderBitenNew(this.editingPersonId);

            hideLoading();
            showToast('美点を更新しました', 'success');

        } catch (error) {
            Utils.error('美点更新エラー', error);
            hideLoading();
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },

    // モーダルから美点削除
    async deleteBitenFromModal() {
        if (!confirm('この美点を削除してもよろしいですか？')) {
            return;
        }

        try {
            showLoading();

            // モーダルを閉じる
            this.closeBitenEditor();

            // データベースから削除
            await DB.deleteBiten(this.editingBitenId);

            // 画面を再レンダリング
            await App.renderBitenNew(this.editingPersonId);

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