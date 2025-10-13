// ================================
// 美点ノート Phase 1 - IndexedDB管理
// ================================

const DB = {
    db: null,
    
    // データベース初期化
    async init() {
        return new Promise((resolve, reject) => {
            Utils.log('IndexedDB初期化開始');
            
            const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
            
            // データベース作成・アップグレード時
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                Utils.log('IndexedDB onupgradeneeded', db);
                
                // persons ObjectStore
                if (!db.objectStoreNames.contains(CONFIG.STORE.PERSONS)) {
                    const personStore = db.createObjectStore(CONFIG.STORE.PERSONS, { keyPath: 'id' });
                    personStore.createIndex('name', 'name', { unique: false });
                    personStore.createIndex('createdAt', 'createdAt', { unique: false });
                    Utils.log('persons ObjectStore作成完了');
                }
                
                // bitens ObjectStore
                if (!db.objectStoreNames.contains(CONFIG.STORE.BITENS)) {
                    const bitenStore = db.createObjectStore(CONFIG.STORE.BITENS, { keyPath: 'id' });
                    bitenStore.createIndex('personId', 'personId', { unique: false });
                    bitenStore.createIndex('date', 'date', { unique: false });
                    bitenStore.createIndex('createdAt', 'createdAt', { unique: false });
                    Utils.log('bitens ObjectStore作成完了');
                }
                
                // appSettings ObjectStore
                if (!db.objectStoreNames.contains(CONFIG.STORE.SETTINGS)) {
                    const settingsStore = db.createObjectStore(CONFIG.STORE.SETTINGS, { keyPath: 'key' });
                    Utils.log('appSettings ObjectStore作成完了');
                }
            };
            
            // 成功時
            request.onsuccess = (event) => {
                this.db = event.target.result;
                Utils.log('IndexedDB初期化成功', this.db);
                resolve(this.db);
            };
            
            // エラー時
            request.onerror = (event) => {
                Utils.error('IndexedDB初期化エラー', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // ===========================
    // persons CRUD操作
    // ===========================
    
    // 人物追加
    async addPerson(personData) {
        try {
            Utils.log('人物追加開始', personData);
            
            const person = {
                id: Utils.generateUUID(),
                name: personData.name.trim(),
                photo: personData.photo || null,
                relationship: personData.relationship || CONFIG.DEFAULTS.RELATIONSHIP,
                metDate: personData.metDate || Utils.getCurrentDate(),
                createdAt: Utils.getCurrentDateTime(),
                updatedAt: Utils.getCurrentDateTime()
            };
            
            const transaction = this.db.transaction([CONFIG.STORE.PERSONS], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORE.PERSONS);
            const request = store.add(person);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    Utils.log('人物追加成功', person);
                    resolve(person);
                };
                request.onerror = (event) => {
                    Utils.error('人物追加エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('addPerson例外', error);
            throw error;
        }
    },
    
    // 全人物取得
    async getAllPersons() {
        try {
            Utils.log('全人物取得開始');
            
            const transaction = this.db.transaction([CONFIG.STORE.PERSONS], 'readonly');
            const store = transaction.objectStore(CONFIG.STORE.PERSONS);
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const persons = request.result;
                    Utils.log('全人物取得成功', persons);
                    resolve(persons);
                };
                request.onerror = (event) => {
                    Utils.error('全人物取得エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('getAllPersons例外', error);
            throw error;
        }
    },
    
    // 人物取得（ID指定）
    async getPersonById(personId) {
        try {
            Utils.log('人物取得開始', personId);
            
            const transaction = this.db.transaction([CONFIG.STORE.PERSONS], 'readonly');
            const store = transaction.objectStore(CONFIG.STORE.PERSONS);
            const request = store.get(personId);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const person = request.result;
                    Utils.log('人物取得成功', person);
                    resolve(person);
                };
                request.onerror = (event) => {
                    Utils.error('人物取得エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('getPersonById例外', error);
            throw error;
        }
    },
    
    // 人物更新
    async updatePerson(personId, updateData) {
        try {
            Utils.log('人物更新開始', { personId, updateData });
            
            const person = await this.getPersonById(personId);
            if (!person) {
                throw new Error(CONFIG.MESSAGES.ERROR.PERSON_NOT_FOUND);
            }
            
            const updatedPerson = {
                ...person,
                ...updateData,
                id: personId, // IDは変更不可
                updatedAt: Utils.getCurrentDateTime()
            };
            
            const transaction = this.db.transaction([CONFIG.STORE.PERSONS], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORE.PERSONS);
            const request = store.put(updatedPerson);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    Utils.log('人物更新成功', updatedPerson);
                    resolve(updatedPerson);
                };
                request.onerror = (event) => {
                    Utils.error('人物更新エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('updatePerson例外', error);
            throw error;
        }
    },
    
    // 人物削除
    async deletePerson(personId) {
        try {
            Utils.log('人物削除開始', personId);
            
            // 関連する美点も全て削除
            await this.deleteBitensByPersonId(personId);
            
            const transaction = this.db.transaction([CONFIG.STORE.PERSONS], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORE.PERSONS);
            const request = store.delete(personId);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    Utils.log('人物削除成功', personId);
                    resolve();
                };
                request.onerror = (event) => {
                    Utils.error('人物削除エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('deletePerson例外', error);
            throw error;
        }
    },
    
    // ===========================
    // bitens CRUD操作
    // ===========================
    
    // 美点追加
    async addBiten(bitenData) {
        try {
            Utils.log('美点追加開始', bitenData);
            
            const biten = {
                id: Utils.generateUUID(),
                personId: bitenData.personId,
                content: bitenData.content.trim(),
                date: bitenData.date || Utils.getCurrentDate(),
                createdAt: Utils.getCurrentDateTime()
            };
            
            const transaction = this.db.transaction([CONFIG.STORE.BITENS], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORE.BITENS);
            const request = store.add(biten);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    Utils.log('美点追加成功', biten);
                    resolve(biten);
                };
                request.onerror = (event) => {
                    Utils.error('美点追加エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('addBiten例外', error);
            throw error;
        }
    },
    
    // 美点取得（人物ID指定）
    async getBitensByPersonId(personId) {
        try {
            Utils.log('美点取得開始', personId);
            
            const transaction = this.db.transaction([CONFIG.STORE.BITENS], 'readonly');
            const store = transaction.objectStore(CONFIG.STORE.BITENS);
            const index = store.index('personId');
            const request = index.getAll(personId);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const bitens = request.result;
                    Utils.log('美点取得成功', bitens);
                    resolve(bitens);
                };
                request.onerror = (event) => {
                    Utils.error('美点取得エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('getBitensByPersonId例外', error);
            throw error;
        }
    },
    
    // 美点更新
    async updateBiten(bitenId, updateData) {
        try {
            Utils.log('美点更新開始', { bitenId, updateData });

            const transaction = this.db.transaction([CONFIG.STORE.BITENS], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORE.BITENS);
            const request = store.put(updateData);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    Utils.log('美点更新成功', updateData);
                    resolve(updateData);
                };
                request.onerror = (event) => {
                    Utils.error('美点更新エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('updateBiten例外', error);
            throw error;
        }
    },

    // 美点削除（個別）
    async deleteBiten(bitenId) {
        try {
            Utils.log('美点削除開始', bitenId);

            const transaction = this.db.transaction([CONFIG.STORE.BITENS], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORE.BITENS);
            const request = store.delete(bitenId);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    Utils.log('美点削除成功', bitenId);
                    resolve();
                };
                request.onerror = (event) => {
                    Utils.error('美点削除エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('deleteBiten例外', error);
            throw error;
        }
    },

    // 美点削除（人物ID指定・全削除）
    async deleteBitensByPersonId(personId) {
        try {
            Utils.log('美点一括削除開始', personId);
            
            const bitens = await this.getBitensByPersonId(personId);
            const transaction = this.db.transaction([CONFIG.STORE.BITENS], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORE.BITENS);
            
            bitens.forEach(biten => {
                store.delete(biten.id);
            });
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    Utils.log('美点一括削除成功', bitens.length);
                    resolve();
                };
                transaction.onerror = (event) => {
                    Utils.error('美点一括削除エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('deleteBitensByPersonId例外', error);
            throw error;
        }
    },
    
    // ===========================
    // appSettings操作
    // ===========================
    
    // 設定取得
    async getSetting(key) {
        try {
            Utils.log('設定取得開始', key);
            
            const transaction = this.db.transaction([CONFIG.STORE.SETTINGS], 'readonly');
            const store = transaction.objectStore(CONFIG.STORE.SETTINGS);
            const request = store.get(key);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const setting = request.result;
                    Utils.log('設定取得成功', setting);
                    resolve(setting ? setting.value : null);
                };
                request.onerror = (event) => {
                    Utils.error('設定取得エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('getSetting例外', error);
            throw error;
        }
    },
    
    // 設定保存
    async setSetting(key, value) {
        try {
            Utils.log('設定保存開始', { key, value });
            
            const setting = {
                key: key,
                value: value,
                updatedAt: Utils.getCurrentDateTime()
            };
            
            const transaction = this.db.transaction([CONFIG.STORE.SETTINGS], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORE.SETTINGS);
            const request = store.put(setting);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    Utils.log('設定保存成功', setting);
                    resolve();
                };
                request.onerror = (event) => {
                    Utils.error('設定保存エラー', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            Utils.error('setSetting例外', error);
            throw error;
        }
    },
    
    // ===========================
    // 統計情報取得
    // ===========================
    
    // 統計情報取得
    async getStats() {
        try {
            Utils.log('統計情報取得開始');
            
            const persons = await this.getAllPersons();
            const stats = {
                totalPersons: persons.length,
                totalBitens: 0,
                personStats: []
            };
            
            for (const person of persons) {
                const bitens = await this.getBitensByPersonId(person.id);
                stats.totalBitens += bitens.length;
                stats.personStats.push({
                    personId: person.id,
                    name: person.name,
                    bitenCount: bitens.length,
                    progress: Math.round((bitens.length / CONFIG.LIMITS.TARGET_BITEN_COUNT) * 100)
                });
            }
            
            Utils.log('統計情報取得成功', stats);
            return stats;
        } catch (error) {
            Utils.error('getStats例外', error);
            throw error;
        }
    }
};

// グローバルに公開
window.DB = DB;