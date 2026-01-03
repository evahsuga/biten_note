// ================================
// 美点ノート Phase 1 - 人物管理機能
// ================================

const Person = {
    currentPhoto: null, // トリミング済み写真データ
    
    // フォーム送信処理
    async handleSubmit(event) {
        event.preventDefault();
        
        try {
            showLoading();
            
            // フォームデータ取得
            const name = document.getElementById('personName').value.trim();
            const relationship = document.getElementById('personRelationship').value.trim() || CONFIG.DEFAULTS.RELATIONSHIP;
            const metDate = document.getElementById('personMetDate').value;

            // バリデーション: 名前
            const nameValidation = Utils.validateName(name);
            if (!nameValidation.valid) {
                hideLoading();
                showToast(nameValidation.message, 'error');
                return;
            }

            // バリデーション: 出会った日（未来日付チェック）
            if (metDate) {
                const selectedDate = new Date(metDate);
                const today = new Date(Utils.getCurrentDate());
                if (selectedDate > today) {
                    hideLoading();
                    showToast('未来の日付は選択できません', 'error');
                    return;
                }
            }
            
            // 人物データ作成
            const personData = {
                name: name,
                relationship: relationship,
                metDate: metDate,
                photo: this.currentPhoto // トリミング済み写真（Base64）
            };
            
            // データベースに追加
            const newPerson = await DB.addPerson(personData);
            
            hideLoading();
            showToast(CONFIG.MESSAGES.SUCCESS.PERSON_ADDED, 'success');
            
            // 写真データをクリア
            this.currentPhoto = null;
            
            // 人物詳細画面へ遷移
            App.navigate(`#/person/${newPerson.id}`);
            
        } catch (error) {
            Utils.error('人物追加エラー', error);
            hideLoading();
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },
    
    // 人物削除
    async deletePerson(personId) {
        // 確認ダイアログ
        if (!confirm(CONFIG.MESSAGES.CONFIRM.DELETE_PERSON)) {
            return;
        }
        
        try {
            showLoading();
            
            // データベースから削除（美点も一緒に削除される）
            await DB.deletePerson(personId);
            
            hideLoading();
            showToast(CONFIG.MESSAGES.SUCCESS.PERSON_DELETED, 'success');
            
            // 人物一覧へ遷移
            App.navigate('#/persons');
            
        } catch (error) {
            Utils.error('人物削除エラー', error);
            hideLoading();
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },
    
    // 人物更新
    async updatePerson(personId, updateData) {
        try {
            showLoading();
            
            const updatedPerson = await DB.updatePerson(personId, updateData);
            
            hideLoading();
            showToast(CONFIG.MESSAGES.SUCCESS.PERSON_UPDATED, 'success');
            
            return updatedPerson;
        } catch (error) {
            Utils.error('人物更新エラー', error);
            hideLoading();
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
            throw error;
        }
    },
    
    // トリミング済み写真を設定
    setCroppedPhoto(photoData) {
        this.currentPhoto = photoData;
        Utils.log('トリミング済み写真設定完了', `${photoData.length}文字`);
    },
    
    // トリミング済み写真をクリア
    clearCroppedPhoto() {
        this.currentPhoto = null;
        Utils.log('トリミング済み写真クリア');
    },

    // 写真編集モーダルを開く
    openPhotoEditor(personId) {
        this.editingPersonId = personId;

        // 前回の写真データをクリア
        this.currentPhoto = null;
        Photo.destroy();

        const modal = document.getElementById('photoEditModal');
        if (modal) {
            modal.classList.remove('hidden');

            // ファイル入力をリセット
            setTimeout(() => {
                const fileInput = document.getElementById('photoEditInput');
                if (fileInput) {
                    fileInput.value = '';
                }

                // プレビューエリアを非表示に
                const photoPreviewArea = document.getElementById('photoPreviewArea');
                const croppedPhotoPreview = document.getElementById('croppedPhotoPreview');
                if (photoPreviewArea) {
                    photoPreviewArea.classList.add('hidden');
                }
                if (croppedPhotoPreview) {
                    croppedPhotoPreview.classList.add('hidden');
                }
            }, 0);
        }
    },

    // 写真編集モーダルを閉じる
    closePhotoEditor() {
        const modal = document.getElementById('photoEditModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        // クロッパーとプレビューをリセット
        Photo.destroy();
        this.currentPhoto = null;

        // ファイル入力をリセット
        const fileInput = document.getElementById('photoEditInput');
        if (fileInput) {
            fileInput.value = '';
        }
    },

    // 写真を保存（更新）
    async savePhoto() {
        if (!this.currentPhoto) {
            showToast('写真を選択してトリミングしてください', 'error');
            return;
        }

        try {
            showLoading();

            // 人物データを取得
            const person = await DB.getPersonById(this.editingPersonId);

            // 写真を更新
            const updateData = {
                ...person,
                photo: this.currentPhoto,
                updatedAt: Utils.getCurrentDateTime()
            };

            await DB.updatePerson(this.editingPersonId, updateData);

            // モーダルを閉じる
            this.closePhotoEditor();

            // ページを強制的に再レンダリング
            await App.renderPersonDetail(this.editingPersonId);

            hideLoading();
            showToast('写真を更新しました', 'success');

        } catch (error) {
            Utils.error('写真更新エラー', error);
            hideLoading();
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },

    // 名前編集開始
    startEditName(personId) {
        this.editingPersonId = personId;
        const modal = document.getElementById('nameEditModal');
        if (modal) {
            // 現在の名前を取得してモーダルに表示
            DB.getPersonById(personId).then(person => {
                const nameInput = document.getElementById('nameEditInput');
                if (nameInput) {
                    nameInput.value = person.name;
                }
            });
            modal.classList.remove('hidden');
            // 入力欄にフォーカス
            setTimeout(() => {
                document.getElementById('nameEditInput')?.focus();
            }, 100);
        }
    },

    // 名前編集モーダルを閉じる
    closeNameEditor() {
        const modal = document.getElementById('nameEditModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // 名前を保存
    async saveName() {
        const nameInput = document.getElementById('nameEditInput');
        const newName = nameInput.value.trim();

        // バリデーション
        const validation = Utils.validateName(newName);
        if (!validation.valid) {
            showToast(validation.message, 'error');
            return;
        }

        try {
            showLoading();

            // 人物データを取得
            const person = await DB.getPersonById(this.editingPersonId);

            // 名前を更新
            const updateData = {
                ...person,
                name: newName,
                updatedAt: Utils.getCurrentDateTime()
            };

            await DB.updatePerson(this.editingPersonId, updateData);

            // モーダルを閉じる
            this.closeNameEditor();

            // ページを強制的に再レンダリング
            await App.renderPersonDetail(this.editingPersonId);

            hideLoading();
            showToast('名前を更新しました', 'success');

        } catch (error) {
            Utils.error('名前更新エラー', error);
            hideLoading();
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },

    // 関係性編集開始
    startEditRelationship(personId) {
        this.editingPersonId = personId;
        const modal = document.getElementById('relationshipEditModal');
        if (modal) {
            // 現在の関係性を取得してモーダルに表示
            DB.getPersonById(personId).then(person => {
                const relationshipInput = document.getElementById('relationshipEditInput');
                if (relationshipInput) {
                    relationshipInput.value = person.relationship;
                }
            });
            modal.classList.remove('hidden');
            // 入力欄にフォーカス
            setTimeout(() => {
                document.getElementById('relationshipEditInput')?.focus();
            }, 100);
        }
    },

    // 関係性編集モーダルを閉じる
    closeRelationshipEditor() {
        const modal = document.getElementById('relationshipEditModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // 関係性を保存
    async saveRelationship() {
        const relationshipInput = document.getElementById('relationshipEditInput');
        const newRelationship = relationshipInput.value.trim();

        // バリデーション
        if (!newRelationship) {
            showToast('関係性を入力してください', 'error');
            return;
        }
        if (newRelationship.length > CONFIG.LIMITS.MAX_RELATIONSHIP_LENGTH) {
            showToast(`関係性は${CONFIG.LIMITS.MAX_RELATIONSHIP_LENGTH}文字以内で入力してください`, 'error');
            return;
        }

        try {
            showLoading();

            // 人物データを取得
            const person = await DB.getPersonById(this.editingPersonId);

            // 関係性を更新
            const updateData = {
                ...person,
                relationship: newRelationship,
                updatedAt: Utils.getCurrentDateTime()
            };

            await DB.updatePerson(this.editingPersonId, updateData);

            // モーダルを閉じる
            this.closeRelationshipEditor();

            // ページを強制的に再レンダリング
            await App.renderPersonDetail(this.editingPersonId);

            hideLoading();
            showToast('関係性を更新しました', 'success');

        } catch (error) {
            Utils.error('関係性更新エラー', error);
            hideLoading();
            showToast(CONFIG.MESSAGES.ERROR.DB_ERROR, 'error');
        }
    },

    // ===========================
    // ドラッグ&ドロップ機能（人物一覧用）
    // ===========================

    draggedElement: null,

    // ドラッグ準備（ハンドルがマウスダウンされた時）
    startDrag(event) {
        // ハンドルの親要素（.list-item）を取得
        const listItem = event.currentTarget.closest('.list-item');
        if (listItem) {
            this.draggedElement = listItem;
        }
    },

    // ドラッグ開始
    handleDragStart(event) {
        // ハンドルの親要素を取得
        const listItem = event.currentTarget.closest('.list-item');
        if (!listItem) return;

        this.draggedElement = listItem;

        // ドラッグ開始時の順序を保存
        const listItems = document.querySelectorAll('#personList .list-item');
        this.originalOrder = Array.from(listItems).map(item => item.getAttribute('data-person-id'));

        listItem.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', listItem.innerHTML);
    },

    // ドラッグオーバー
    handleDragOver(event) {
        if (!this.draggedElement) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        // personListを取得
        const personList = document.getElementById('personList');
        if (!personList) return;

        // 挿入位置を計算
        const afterElement = this.getDragAfterElement(personList, event.clientY);
        const draggable = this.draggedElement;

        // DOM操作を最小限に - 位置が変わる場合のみ挿入
        const currentNext = draggable.nextElementSibling;

        if (afterElement === null) {
            // 最後に挿入
            if (currentNext !== null) {
                personList.appendChild(draggable);
            }
        } else {
            // afterElementの前に挿入
            if (afterElement !== currentNext) {
                personList.insertBefore(draggable, afterElement);
            }
        }

        // ホバー中の要素をハイライト（軽量化）
        const currentTarget = event.currentTarget;
        if (currentTarget !== this.draggedElement && !currentTarget.classList.contains('drag-over')) {
            // 他の要素からdrag-overクラスを削除
            const prevHighlighted = personList.querySelector('.list-item.drag-over');
            if (prevHighlighted && prevHighlighted !== currentTarget) {
                prevHighlighted.classList.remove('drag-over');
            }
            currentTarget.classList.add('drag-over');
        }
    },

    // ドロップ
    async handleDrop(event) {
        event.stopPropagation();
        event.preventDefault();

        // ドロップが一度だけ実行されるようにする
        if (this.isDropping) return;
        this.isDropping = true;

        try {
            // ドロップ先の要素を確認
            const dropTarget = event.currentTarget;
            const personList = document.getElementById('personList');

            if (this.draggedElement && dropTarget && personList && this.draggedElement !== dropTarget) {
                // ドロップ位置を計算して、最終的な位置を確定
                const afterElement = this.getDragAfterElement(personList, event.clientY);

                if (afterElement == null) {
                    personList.appendChild(this.draggedElement);
                } else {
                    personList.insertBefore(this.draggedElement, afterElement);
                }
            }

            // 新しい順序を取得
            const listItems = document.querySelectorAll('#personList .list-item');
            const currentOrder = Array.from(listItems).map(item => item.getAttribute('data-person-id'));

            // 順序が変わったかチェック
            const hasChanged = !this.originalOrder ||
                this.originalOrder.length !== currentOrder.length ||
                this.originalOrder.some((id, index) => id !== currentOrder[index]);

            if (hasChanged) {
                // 順序が変わった場合のみ保存
                const newOrder = [];
                listItems.forEach((item, index) => {
                    const personId = item.getAttribute('data-person-id');
                    newOrder.push({
                        id: personId,
                        sortOrder: index + 1
                    });
                });

                // データベースに保存（バックグラウンドで実行）
                await DB.updatePersonsSortOrder(newOrder);

                Utils.log('並び順を更新しました', newOrder);
                showToast('並び順を更新しました', 'success');
            }

        } catch (error) {
            Utils.error('並び順更新エラー', error);
            showToast('並び順の更新に失敗しました', 'error');
        } finally {
            this.isDropping = false;
            this.originalOrder = null;
        }
    },

    // ドラッグ終了
    handleDragEnd(event) {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }
        this.draggedElement = null;
        this.isDropping = false;

        // すべてのリストアイテムからdrag-overクラスを削除
        document.querySelectorAll('.list-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    },

    // ドラッグ中の要素の後ろにある要素を取得
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.list-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    // ===========================
    // 進捗バーのドラッグ&ドロップ機能（ホーム画面用）
    // ===========================

    draggedProgressElement: null,

    // 進捗バー: ドラッグ準備（ハンドルがマウスダウンされた時）
    startProgressDrag(event) {
        // ハンドルの親要素（.progress-container）を取得
        const container = event.currentTarget.closest('.progress-container');
        if (container) {
            this.draggedProgressElement = container;
        }
    },

    // 進捗バー: ドラッグ開始
    handleProgressDragStart(event) {
        // ハンドルの親要素を取得
        const container = event.currentTarget.closest('.progress-container');
        if (!container) return;

        this.draggedProgressElement = container;

        // ドラッグ開始時の順序を保存
        const progressItems = document.querySelectorAll('#progressList .progress-container');
        this.originalProgressOrder = Array.from(progressItems).map(item => item.getAttribute('data-person-id'));

        container.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', container.innerHTML);
    },

    // 進捗バー: ドラッグオーバー
    handleProgressDragOver(event) {
        if (!this.draggedProgressElement) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        // progressListを取得
        const progressList = document.getElementById('progressList');
        if (!progressList) return;

        // 挿入位置を計算
        const afterElement = this.getProgressDragAfterElement(progressList, event.clientY);
        const draggable = this.draggedProgressElement;

        // DOM操作を最小限に - 位置が変わる場合のみ挿入
        const currentNext = draggable.nextElementSibling;

        if (afterElement === null) {
            // 最後に挿入
            if (currentNext !== null) {
                progressList.appendChild(draggable);
            }
        } else {
            // afterElementの前に挿入
            if (afterElement !== currentNext) {
                progressList.insertBefore(draggable, afterElement);
            }
        }

        // ホバー中の要素をハイライト（軽量化）
        const currentTarget = event.currentTarget;
        if (currentTarget !== this.draggedProgressElement && !currentTarget.classList.contains('drag-over')) {
            // 他の要素からdrag-overクラスを削除
            const prevHighlighted = progressList.querySelector('.progress-container.drag-over');
            if (prevHighlighted && prevHighlighted !== currentTarget) {
                prevHighlighted.classList.remove('drag-over');
            }
            currentTarget.classList.add('drag-over');
        }
    },

    // 進捗バー: ドロップ
    async handleProgressDrop(event) {
        event.stopPropagation();
        event.preventDefault();

        // ドロップが一度だけ実行されるようにする
        if (this.isProgressDropping) return;
        this.isProgressDropping = true;

        try {
            // ドロップ先の要素を確認
            const dropTarget = event.currentTarget;
            const progressList = document.getElementById('progressList');

            if (this.draggedProgressElement && dropTarget && progressList && this.draggedProgressElement !== dropTarget) {
                // ドロップ位置を計算して、最終的な位置を確定
                const afterElement = this.getProgressDragAfterElement(progressList, event.clientY);

                if (afterElement == null) {
                    progressList.appendChild(this.draggedProgressElement);
                } else {
                    progressList.insertBefore(this.draggedProgressElement, afterElement);
                }
            }

            // 新しい順序を取得
            const progressItems = document.querySelectorAll('#progressList .progress-container');
            const currentOrder = Array.from(progressItems).map(item => item.getAttribute('data-person-id'));

            // 順序が変わったかチェック
            const hasChanged = !this.originalProgressOrder ||
                this.originalProgressOrder.length !== currentOrder.length ||
                this.originalProgressOrder.some((id, index) => id !== currentOrder[index]);

            if (hasChanged) {
                // 順序が変わった場合のみ保存
                const newOrder = [];
                progressItems.forEach((item, index) => {
                    const personId = item.getAttribute('data-person-id');
                    newOrder.push({
                        id: personId,
                        sortOrder: index + 1
                    });
                });

                // データベースに保存（バックグラウンドで実行）
                await DB.updatePersonsSortOrder(newOrder);

                Utils.log('進捗状況の並び順を更新しました', newOrder);
                showToast('並び順を更新しました', 'success');
            }

        } catch (error) {
            Utils.error('進捗状況の並び順更新エラー', error);
            showToast('並び順の更新に失敗しました', 'error');
        } finally {
            this.isProgressDropping = false;
            this.originalProgressOrder = null;
        }
    },

    // 進捗バー: ドラッグ終了
    handleProgressDragEnd(event) {
        if (this.draggedProgressElement) {
            this.draggedProgressElement.classList.remove('dragging');
        }
        this.draggedProgressElement = null;
        this.isProgressDropping = false;

        // すべての進捗コンテナからdrag-overクラスを削除
        document.querySelectorAll('.progress-container').forEach(item => {
            item.classList.remove('drag-over');
        });
    },

    // 進捗バー: ドラッグ中の要素の後ろにある要素を取得
    getProgressDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.progress-container:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
};

// グローバルに公開
window.Person = Person;