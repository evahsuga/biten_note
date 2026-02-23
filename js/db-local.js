// ================================
// 美点ノート - ローカルDB（IndexedDB）操作
// ゲストモード用のデータ永続化
// ================================

const LocalDB = {
    db: null,
    DB_NAME: 'BitenNoteDB',
    DB_VERSION: 1,
    STORES: {
        PERSONS: 'persons',
        BITENS: 'bitens',
        SETTINGS: 'appSettings'
    },

    // ================================
    // 初期化
    // ================================
    
    async init() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = (event) => {
                Utils.error('IndexedDB初期化エラー', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                Utils.log('IndexedDB初期化完了', { name: this.DB_NAME, version: this.DB_VERSION });
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // personsストア
                if (!db.objectStoreNames.contains(this.STORES.PERSONS)) {
                    const personStore = db.createObjectStore(this.STORES.PERSONS, { keyPath: 'id' });
                    personStore.createIndex('name', 'name', { unique: false });
                    personStore.createIndex('createdAt', 'createdAt', { unique: false });
                    personStore.createIndex('sortOrder', 'sortOrder', { unique: false });
                }

                // bitensストア
                if (!db.objectStoreNames.contains(this.STORES.BITENS)) {
                    const bitenStore = db.createObjectStore(this.STORES.BITENS, { keyPath: 'id' });
                    bitenStore.createIndex('personId', 'personId', { unique: false });
                    bitenStore.createIndex('createdAt', 'createdAt', { unique: false });
                    bitenStore.createIndex('date', 'date', { unique: false });
                }

                // settingsストア
                if (!db.objectStoreNames.contains(this.STORES.SETTINGS)) {
                    db.createObjectStore(this.STORES.SETTINGS, { keyPath: 'id' });
                }

                Utils.log('IndexedDBストア作成完了');
            };
        });
    },

    // ================================
    // 人物操作
    // ================================

    async addPerson(personData) {
        await this.init();
        const person = {
            id: personData.id || Utils.generateUUID(),
            name: personData.name,
            relationship: personData.relationship || CONFIG.DEFAULTS.RELATIONSHIP,
            photo: personData.photo || null,
            metDate: personData.metDate || Utils.getCurrentDate(),
            bitenLimit: personData.bitenLimit || CONFIG.LIMITS.DEFAULT_BITEN_LIMIT,
            sortOrder: personData.sortOrder,
            status: personData.status || 'active',
            createdAt: personData.createdAt || Utils.getCurrentDateTime(),
            updatedAt: Utils.getCurrentDateTime()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PERSONS], 'readwrite');
            const store = transaction.objectStore(this.STORES.PERSONS);
            const request = store.put(person);

            request.onsuccess = () => {
                Utils.log('人物追加成功（ローカル）', person.name);
                resolve(person);
            };
            request.onerror = (event) => {
                Utils.error('人物追加エラー（ローカル）', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async getPerson(personId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PERSONS], 'readonly');
            const store = transaction.objectStore(this.STORES.PERSONS);
            const request = store.get(personId);

            request.onsuccess = (event) => {
                resolve(event.target.result || null);
            };
            request.onerror = (event) => {
                Utils.error('人物取得エラー（ローカル）', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async getAllPersons(statusFilter = null) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PERSONS], 'readonly');
            const store = transaction.objectStore(this.STORES.PERSONS);
            const request = store.getAll();

            request.onsuccess = (event) => {
                let persons = event.target.result || [];
                
                // ステータスフィルタ
                if (statusFilter) {
                    persons = persons.filter(p => p.status === statusFilter);
                } else {
                    // デフォルトはactiveのみ（statusがないものも含む）
                    persons = persons.filter(p => !p.status || p.status === 'active');
                }

                // ソート（sortOrder優先、なければcreatedAt）
                persons.sort((a, b) => {
                    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
                        return a.sortOrder - b.sortOrder;
                    } else if (a.sortOrder !== undefined) {
                        return -1;
                    } else if (b.sortOrder !== undefined) {
                        return 1;
                    } else {
                        return new Date(a.createdAt) - new Date(b.createdAt);
                    }
                });

                Utils.log('全人物取得成功（ローカル）', persons.length);
                resolve(persons);
            };
            request.onerror = (event) => {
                Utils.error('全人物取得エラー（ローカル）', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async updatePerson(personId, updates) {
        await this.init();
        const person = await this.getPerson(personId);
        if (!person) {
            throw new Error('人物が見つかりません');
        }

        const updatedPerson = {
            ...person,
            ...updates,
            updatedAt: Utils.getCurrentDateTime()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PERSONS], 'readwrite');
            const store = transaction.objectStore(this.STORES.PERSONS);
            const request = store.put(updatedPerson);

            request.onsuccess = () => {
                Utils.log('人物更新成功（ローカル）', updatedPerson.name);
                resolve(updatedPerson);
            };
            request.onerror = (event) => {
                Utils.error('人物更新エラー（ローカル）', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async deletePerson(personId) {
        await this.init();
        
        // 関連する美点も削除
        const bitens = await this.getBitensByPersonId(personId);
        for (const biten of bitens) {
            await this.deleteBiten(biten.id);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PERSONS], 'readwrite');
            const store = transaction.objectStore(this.STORES.PERSONS);
            const request = store.delete(personId);

            request.onsuccess = () => {
                Utils.log('人物削除成功（ローカル）', personId);
                resolve();
            };
            request.onerror = (event) => {
                Utils.error('人物削除エラー（ローカル）', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // ================================
    // 美点操作
    // ================================

    async addBiten(bitenData) {
        await this.init();
        const biten = {
            id: bitenData.id || Utils.generateUUID(),
            personId: bitenData.personId,
            content: bitenData.content,
            date: bitenData.date || Utils.getCurrentDate(),
            createdAt: bitenData.createdAt || Utils.getCurrentDateTime()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.BITENS], 'readwrite');
            const store = transaction.objectStore(this.STORES.BITENS);
            const request = store.put(biten);

            request.onsuccess = () => {
                Utils.log('美点追加成功（ローカル）', biten.content);
                resolve(biten);
            };
            request.onerror = (event) => {
                Utils.error('美点追加エラー（ローカル）', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async getBitensByPersonId(personId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.BITENS], 'readonly');
            const store = transaction.objectStore(this.STORES.BITENS);
            const index = store.index('personId');
            const request = index.getAll(personId);

            request.onsuccess = (event) => {
                let bitens = event.target.result || [];
                // createdAtでソート（新しい順）
                bitens.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                Utils.log('美点取得成功（ローカル）', bitens.length);
                resolve(bitens);
            };
            request.onerror = (event) => {
                Utils.error('美点取得エラー（ローカル）', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async getAllBitens() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.BITENS], 'readonly');
            const store = transaction.objectStore(this.STORES.BITENS);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const bitens = event.target.result || [];
                Utils.log('全美点取得成功（ローカル）', bitens.length);
                resolve(bitens);
            };
            request.onerror = (event) => {
                Utils.error('全美点取得エラー（ローカル）', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async updateBiten(bitenId, updates) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.BITENS], 'readwrite');
            const store = transaction.objectStore(this.STORES.BITENS);
            const getRequest = store.get(bitenId);

            getRequest.onsuccess = (event) => {
                const biten = event.target.result;
                if (!biten) {
                    reject(new Error('美点が見つかりません'));
                    return;
                }

                const updatedBiten = { ...biten, ...updates };
                const putRequest = store.put(updatedBiten);

                putRequest.onsuccess = () => {
                    Utils.log('美点更新成功（ローカル）', updatedBiten.content);
                    resolve(updatedBiten);
                };
                putRequest.onerror = (event) => {
                    Utils.error('美点更新エラー（ローカル）', event.target.error);
                    reject(event.target.error);
                };
            };
        });
    },

    async deleteBiten(bitenId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.BITENS], 'readwrite');
            const store = transaction.objectStore(this.STORES.BITENS);
            const request = store.delete(bitenId);

            request.onsuccess = () => {
                Utils.log('美点削除成功（ローカル）', bitenId);
                resolve();
            };
            request.onerror = (event) => {
                Utils.error('美点削除エラー（ローカル）', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // ================================
    // 統計情報
    // ================================

    async getStats() {
        const persons = await this.getAllPersons();
        const allBitens = await this.getAllBitens();

        const personStats = [];
        for (const person of persons) {
            const personBitens = allBitens.filter(b => b.personId === person.id);
            const bitenLimit = person.bitenLimit || CONFIG.LIMITS.DEFAULT_BITEN_LIMIT;
            const bitenCount = personBitens.length;
            const progress = (bitenCount / bitenLimit) * 100;

            personStats.push({
                personId: person.id,
                name: person.name,
                bitenCount: bitenCount,
                bitenLimit: bitenLimit,
                progress: progress
            });
        }

        return {
            totalPersons: persons.length,
            totalBitens: allBitens.length,
            personStats: personStats
        };
    },

    // ================================
    // 設定操作
    // ================================

    async getSetting(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.SETTINGS], 'readonly');
            const store = transaction.objectStore(this.STORES.SETTINGS);
            const request = store.get(key);

            request.onsuccess = (event) => {
                const result = event.target.result;
                resolve(result ? result.value : null);
            };
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    async setSetting(key, value) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.SETTINGS], 'readwrite');
            const store = transaction.objectStore(this.STORES.SETTINGS);
            const request = store.put({ id: key, value: value });

            request.onsuccess = () => {
                resolve();
            };
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    // ================================
    // データ移行（Firestoreへ）
    // ================================

    async migrateToFirestore(userId) {
        Utils.log('Firestoreへのデータ移行開始');
        
        try {
            // 1. IndexedDBから全データ取得
            const persons = await this.getAllPersonsIncludingArchived();
            const bitens = await this.getAllBitens();
            
            Utils.log('移行対象データ', { persons: persons.length, bitens: bitens.length });

            // 2. Firestoreへ書き込み
            for (const person of persons) {
                await DB.addPerson(person);
            }
            
            for (const biten of bitens) {
                await DB.addBiten(biten);
            }

            // 3. IndexedDBをクリア
            await this.clearAll();
            
            Utils.log('Firestoreへのデータ移行完了');
            return { persons: persons.length, bitens: bitens.length };
        } catch (error) {
            Utils.error('データ移行エラー', error);
            throw error;
        }
    },

    async getAllPersonsIncludingArchived() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PERSONS], 'readonly');
            const store = transaction.objectStore(this.STORES.PERSONS);
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result || []);
            };
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    async hasData() {
        await this.init();
        const persons = await this.getAllPersonsIncludingArchived();
        return persons.length > 0;
    },

    async clearAll() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                [this.STORES.PERSONS, this.STORES.BITENS, this.STORES.SETTINGS],
                'readwrite'
            );

            transaction.objectStore(this.STORES.PERSONS).clear();
            transaction.objectStore(this.STORES.BITENS).clear();
            transaction.objectStore(this.STORES.SETTINGS).clear();

            transaction.oncomplete = () => {
                Utils.log('IndexedDBクリア完了');
                resolve();
            };
            transaction.onerror = (event) => {
                Utils.error('IndexedDBクリアエラー', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // ================================
    // 背景画像
    // ================================

    async getBackgroundImage() {
        return await this.getSetting('backgroundImage');
    },

    async setBackgroundImage(imageData) {
        return await this.setSetting('backgroundImage', imageData);
    },

    async removeBackgroundImage() {
        return await this.setSetting('backgroundImage', null);
    }
};

// グローバルに公開
window.LocalDB = LocalDB;

Utils.log('LocalDB（IndexedDB操作）モジュール読み込み完了');
