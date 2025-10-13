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
            
            // 人数制限チェック
            const persons = await DB.getAllPersons();
            if (persons.length >= CONFIG.LIMITS.MAX_PERSONS_FREE) {
                hideLoading();
                this.showProModal();
                return;
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
    
    // Pro版モーダル表示
    showProModal() {
        const modal = document.getElementById('proModal');
        modal.classList.remove('hidden');
    },
    
    // 人物更新（Phase 2以降で実装予定）
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
        const modal = document.getElementById('photoEditModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    // 写真編集モーダルを閉じる
    closePhotoEditor() {
        const modal = document.getElementById('photoEditModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        // クロッパーとプレビューをリセット
        Photo.resetCropper();
        this.currentPhoto = null;
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
    }
};

// グローバルに公開
window.Person = Person;