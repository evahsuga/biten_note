// ================================
// 美点ノート Phase 1 - 写真トリミング機能
// ================================

const Photo = {
    cropper: null,
    originalImage: null,
    
    // 写真選択時の処理
    handlePhotoSelect(event) {
        const file = event.target.files[0];
        
        if (!file) {
            return;
        }
        
        // ファイルタイプチェック
        if (!file.type.startsWith('image/')) {
            showToast('画像ファイルを選択してください', 'error');
            return;
        }
        
        // ファイルサイズチェック（5MB以下）
        if (file.size > 5 * 1024 * 1024) {
            showToast('ファイルサイズが大きすぎます（5MB以下）', 'error');
            return;
        }
        
        // ファイルを読み込み
        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.originalImage = e.target.result;
            this.initCropper(e.target.result);
        };
        
        reader.onerror = () => {
            Utils.error('ファイル読み込みエラー');
            showToast('ファイルの読み込みに失敗しました', 'error');
        };
        
        reader.readAsDataURL(file);
    },
    
    // Cropper.js初期化
    initCropper(imageSrc) {
        try {
            Utils.log('Cropper.js初期化開始');
            
            // プレビューエリアを表示
            const previewArea = document.getElementById('photoPreviewArea');
            const croppedPreview = document.getElementById('croppedPhotoPreview');
            
            previewArea.classList.remove('hidden');
            croppedPreview.classList.add('hidden');
            
            // 既存のCropperを破棄
            if (this.cropper) {
                this.cropper.destroy();
            }
            
            // コンテナに画像を追加
            const container = document.getElementById('cropperContainer');
            container.innerHTML = `<img id="cropperImage" src="${imageSrc}" style="max-width: 100%;">`;
            
            // Cropper.js初期化
            const image = document.getElementById('cropperImage');
            
            this.cropper = new Cropper(image, {
                aspectRatio: CONFIG.CROPPER.ASPECT_RATIO,
                viewMode: CONFIG.CROPPER.VIEW_MODE,
                responsive: CONFIG.CROPPER.RESPONSIVE,
                restore: CONFIG.CROPPER.RESTORE,
                guides: CONFIG.CROPPER.GUIDES,
                center: CONFIG.CROPPER.CENTER,
                highlight: CONFIG.CROPPER.HIGHLIGHT,
                cropBoxMovable: CONFIG.CROPPER.CROP_BOX_MOVABLE,
                cropBoxResizable: CONFIG.CROPPER.CROP_BOX_RESIZABLE,
                toggleDragModeOnDblclick: CONFIG.CROPPER.TOGGLE_DRAG_MODE_ON_DBLCLICK,
                ready() {
                    Utils.log('Cropper.js準備完了');
                }
            });
            
        } catch (error) {
            Utils.error('Cropper.js初期化エラー', error);
            showToast('写真の読み込みに失敗しました', 'error');
        }
    },
    
    // トリミング実行・保存
    cropAndSave() {
        if (!this.cropper) {
            showToast('写真を選択してください', 'error');
            return;
        }
        
        try {
            showLoading();
            
            // トリミング後のcanvasを取得
            const canvas = this.cropper.getCroppedCanvas({
                width: CONFIG.LIMITS.PHOTO_SIZE_PX,
                height: CONFIG.LIMITS.PHOTO_SIZE_PX,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            
            // Base64に変換（品質調整で150KB以下に）
            let quality = 0.7;
            let base64Data = canvas.toDataURL('image/jpeg', quality);
            
            // サイズチェックと圧縮
            let attempts = 0;
            while (this.getBase64Size(base64Data) > CONFIG.LIMITS.MAX_PHOTO_SIZE_KB && attempts < 10) {
                quality -= 0.05;
                base64Data = canvas.toDataURL('image/jpeg', quality);
                attempts++;
            }
            
            const sizeKB = this.getBase64Size(base64Data);
            Utils.log('トリミング完了', `${sizeKB}KB, 品質: ${quality}`);
            
            // サイズチェック
            if (sizeKB > CONFIG.LIMITS.MAX_PHOTO_SIZE_KB) {
                hideLoading();
                showToast(CONFIG.MESSAGES.ERROR.PHOTO_TOO_LARGE, 'error');
                return;
            }
            
            // トリミング済み写真をPersonオブジェクトに保存
            Person.setCroppedPhoto(base64Data);
            
            // プレビュー表示
            this.showCroppedPreview(base64Data);
            
            // Cropperを破棄
            this.cropper.destroy();
            this.cropper = null;
            
            // プレビューエリアを非表示
            const previewArea = document.getElementById('photoPreviewArea');
            previewArea.classList.add('hidden');
            
            hideLoading();
            showToast('写真をトリミングしました', 'success');
            
        } catch (error) {
            Utils.error('トリミングエラー', error);
            hideLoading();
            showToast('トリミングに失敗しました', 'error');
        }
    },
    
    // トリミング済み写真のプレビュー表示
    showCroppedPreview(base64Data) {
        const previewDiv = document.getElementById('croppedPhotoPreview');
        const previewImg = document.getElementById('croppedImage');
        
        previewImg.src = base64Data;
        previewDiv.classList.remove('hidden');
    },
    
    // トリミング済み写真を削除
    removeCroppedPhoto() {
        // Personオブジェクトから削除
        Person.clearCroppedPhoto();
        
        // プレビューを非表示
        const previewDiv = document.getElementById('croppedPhotoPreview');
        previewDiv.classList.add('hidden');
        
        // ファイル入力をリセット
        const fileInput = document.getElementById('personPhoto');
        if (fileInput) {
            fileInput.value = '';
        }
        
        showToast('写真を削除しました', 'info');
    },
    
    // Cropperをリセット
    resetCropper() {
        if (!this.cropper) {
            return;
        }
        
        try {
            this.cropper.reset();
            showToast('リセットしました', 'info');
        } catch (error) {
            Utils.error('リセットエラー', error);
        }
    },
    
    // Base64データのサイズ計算（KB）
    getBase64Size(base64String) {
        // Base64文字列からデータ部分のみ抽出
        const base64Data = base64String.split(',')[1];
        
        // Base64は4文字で3バイトを表現するため、実際のバイト数を計算
        const padding = (base64Data.match(/=/g) || []).length;
        const bytes = (base64Data.length * 3 / 4) - padding;
        
        return Math.round(bytes / 1024);
    },
    
    // Cropperを破棄
    destroy() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        this.originalImage = null;
    }
};

// グローバルに公開
window.Photo = Photo;

// ================================
// 背景画像トリミング機能
// ================================

const BackgroundPhoto = {
    cropper: null,
    originalImage: null,

    // 背景画像選択時の処理
    handlePhotoSelect(event) {
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        // ファイルタイプチェック
        if (!file.type.startsWith('image/')) {
            showToast('画像ファイルを選択してください', 'error');
            return;
        }

        // ファイルサイズチェック（10MB以下）
        if (file.size > 10 * 1024 * 1024) {
            showToast('ファイルサイズが大きすぎます（10MB以下）', 'error');
            return;
        }

        // ファイルを読み込み
        const reader = new FileReader();

        reader.onload = (e) => {
            this.originalImage = e.target.result;
            this.initCropper(e.target.result);
        };

        reader.onerror = () => {
            Utils.error('ファイル読み込みエラー');
            showToast('ファイルの読み込みに失敗しました', 'error');
        };

        reader.readAsDataURL(file);
    },

    // Cropper.js初期化（背景画像用）
    initCropper(imageSrc) {
        try {
            Utils.log('背景画像Cropper.js初期化開始');

            // プレビューエリアを表示
            const previewArea = document.getElementById('backgroundPhotoPreviewArea');

            if (previewArea) {
                previewArea.classList.remove('hidden');
            }

            // 既存のCropperを破棄
            if (this.cropper) {
                this.cropper.destroy();
            }

            // コンテナに画像を追加
            const container = document.getElementById('backgroundCropperContainer');
            container.innerHTML = `<img id="backgroundCropperImage" src="${imageSrc}" style="max-width: 100%;">`;

            // Cropper.js初期化（背景画像用設定）
            const image = document.getElementById('backgroundCropperImage');

            this.cropper = new Cropper(image, {
                aspectRatio: CONFIG.BACKGROUND_CROPPER.ASPECT_RATIO,
                viewMode: CONFIG.BACKGROUND_CROPPER.VIEW_MODE,
                responsive: CONFIG.BACKGROUND_CROPPER.RESPONSIVE,
                restore: CONFIG.BACKGROUND_CROPPER.RESTORE,
                guides: CONFIG.BACKGROUND_CROPPER.GUIDES,
                center: CONFIG.BACKGROUND_CROPPER.CENTER,
                highlight: CONFIG.BACKGROUND_CROPPER.HIGHLIGHT,
                cropBoxMovable: CONFIG.BACKGROUND_CROPPER.CROP_BOX_MOVABLE,
                cropBoxResizable: CONFIG.BACKGROUND_CROPPER.CROP_BOX_RESIZABLE,
                toggleDragModeOnDblclick: CONFIG.BACKGROUND_CROPPER.TOGGLE_DRAG_MODE_ON_DBLCLICK,
                ready() {
                    Utils.log('背景画像Cropper.js準備完了');
                }
            });

        } catch (error) {
            Utils.error('背景画像Cropper.js初期化エラー', error);
            showToast('画像の読み込みに失敗しました', 'error');
        }
    },

    // トリミング実行・保存
    async cropAndSave() {
        if (!this.cropper) {
            showToast('画像を選択してください', 'error');
            return;
        }

        try {
            showLoading();

            // トリミング後のcanvasを取得
            const canvas = this.cropper.getCroppedCanvas({
                maxWidth: CONFIG.LIMITS.BACKGROUND_IMAGE.MAX_WIDTH,
                maxHeight: CONFIG.LIMITS.BACKGROUND_IMAGE.MAX_HEIGHT,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            // Base64に変換（品質調整で300KB以下に）
            let quality = CONFIG.LIMITS.BACKGROUND_IMAGE.QUALITY;
            let base64Data = canvas.toDataURL('image/jpeg', quality);

            // サイズチェックと圧縮
            let attempts = 0;
            while (this.getBase64Size(base64Data) > CONFIG.LIMITS.BACKGROUND_IMAGE.MAX_SIZE_KB && attempts < 10) {
                quality -= 0.05;
                base64Data = canvas.toDataURL('image/jpeg', quality);
                attempts++;
            }

            const sizeKB = this.getBase64Size(base64Data);
            Utils.log('背景画像トリミング完了', `${sizeKB}KB, 品質: ${quality}`);

            // サイズチェック
            if (sizeKB > CONFIG.LIMITS.BACKGROUND_IMAGE.MAX_SIZE_KB) {
                hideLoading();
                showToast('画像サイズが大きすぎます（300KB以下）', 'error');
                return;
            }

            // Firestoreに保存
            await DB.saveBackgroundImage(base64Data);

            // 背景画像として適用
            App.applyBackgroundImage(base64Data);

            // プレビュー更新
            const previewImg = document.getElementById('currentBackgroundImage');
            const removeBtn = document.getElementById('removeBackgroundBtn');
            const previewDiv = document.getElementById('backgroundPreview');

            if (previewImg && removeBtn && previewDiv) {
                previewImg.src = base64Data;
                removeBtn.style.display = 'block';
                previewDiv.style.display = 'block';
            }

            // Cropperを破棄
            this.cropper.destroy();
            this.cropper = null;

            // プレビューエリアを非表示
            const previewArea = document.getElementById('backgroundPhotoPreviewArea');
            if (previewArea) {
                previewArea.classList.add('hidden');
            }

            hideLoading();
            showToast('背景画像を設定しました', 'success');

        } catch (error) {
            Utils.error('背景画像トリミングエラー', error);
            hideLoading();
            showToast('トリミングに失敗しました', 'error');
        }
    },

    // トリミングをキャンセル
    cancelCrop() {
        // Cropperを破棄
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }

        // プレビューエリアを非表示
        const previewArea = document.getElementById('backgroundPhotoPreviewArea');
        if (previewArea) {
            previewArea.classList.add('hidden');
        }

        // ファイル入力をリセット
        const fileInput = document.getElementById('backgroundImageInput');
        if (fileInput) {
            fileInput.value = '';
        }

        showToast('キャンセルしました', 'info');
    },

    // Cropperをリセット
    resetCropper() {
        if (!this.cropper) {
            return;
        }

        try {
            this.cropper.reset();
            showToast('リセットしました', 'info');
        } catch (error) {
            Utils.error('リセットエラー', error);
        }
    },

    // Base64データのサイズ計算（KB）
    getBase64Size(base64String) {
        // Base64文字列からデータ部分のみ抽出
        const base64Data = base64String.split(',')[1];

        // Base64は4文字で3バイトを表現するため、実際のバイト数を計算
        const padding = (base64Data.match(/=/g) || []).length;
        const bytes = (base64Data.length * 3 / 4) - padding;

        return Math.round(bytes / 1024);
    },

    // Cropperを破棄
    destroy() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        this.originalImage = null;
    }
};

// グローバルに公開
window.BackgroundPhoto = BackgroundPhoto;