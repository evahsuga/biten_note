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
    }
};

// グローバルに公開
window.Person = Person;