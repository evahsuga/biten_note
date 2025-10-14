// ================================
// 美点ノート Phase 1.5 - Firestore管理
// ================================

const DB = {
    // ===========================
    // 初期化
    // ===========================

    async init() {
        Utils.log('Firestore初期化完了');
        return true;
    },

    // 現在のユーザーIDを取得
    getCurrentUserId() {
        const userId = Auth.getCurrentUserId();
        if (!userId) {
            throw new Error('ログインしてください');
        }
        return userId;
    },

    // ===========================
    // persons CRUD操作
    // ===========================

    // 人物追加
    async addPerson(personData) {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('人物追加開始', personData);

            const personRef = db.collection('users').doc(userId).collection('persons').doc();

            const person = {
                id: personRef.id,
                name: personData.name.trim(),
                photo: personData.photo || null,
                relationship: personData.relationship || CONFIG.DEFAULTS.RELATIONSHIP,
                metDate: personData.metDate || Utils.getCurrentDate(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await personRef.set(person);

            Utils.log('人物追加成功', person);
            return person;
        } catch (error) {
            Utils.error('addPerson例外', error);
            throw error;
        }
    },

    // 全人物取得
    async getAllPersons() {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('全人物取得開始');

            const snapshot = await db.collection('users')
                .doc(userId)
                .collection('persons')
                .orderBy('createdAt', 'asc')
                .get();

            const persons = [];
            snapshot.forEach(doc => {
                persons.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            Utils.log('全人物取得成功', persons);
            return persons;
        } catch (error) {
            Utils.error('getAllPersons例外', error);
            throw error;
        }
    },

    // 人物取得（ID指定）
    async getPersonById(personId) {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('人物取得開始', personId);

            const doc = await db.collection('users')
                .doc(userId)
                .collection('persons')
                .doc(personId)
                .get();

            if (!doc.exists) {
                Utils.log('人物が見つかりません', personId);
                return null;
            }

            const person = {
                id: doc.id,
                ...doc.data()
            };

            Utils.log('人物取得成功', person);
            return person;
        } catch (error) {
            Utils.error('getPersonById例外', error);
            throw error;
        }
    },

    // 人物更新
    async updatePerson(personId, updateData) {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('人物更新開始', { personId, updateData });

            const personRef = db.collection('users')
                .doc(userId)
                .collection('persons')
                .doc(personId);

            const updatedData = {
                ...updateData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await personRef.update(updatedData);

            const updatedPerson = await this.getPersonById(personId);
            Utils.log('人物更新成功', updatedPerson);

            return updatedPerson;
        } catch (error) {
            Utils.error('updatePerson例外', error);
            throw error;
        }
    },

    // 人物削除
    async deletePerson(personId) {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('人物削除開始', personId);

            // 関連する美点も全て削除
            await this.deleteBitensByPersonId(personId);

            await db.collection('users')
                .doc(userId)
                .collection('persons')
                .doc(personId)
                .delete();

            Utils.log('人物削除成功', personId);
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
            const userId = this.getCurrentUserId();
            Utils.log('美点追加開始', bitenData);

            const bitenRef = db.collection('users')
                .doc(userId)
                .collection('bitens')
                .doc();

            const biten = {
                id: bitenRef.id,
                personId: bitenData.personId,
                content: bitenData.content.trim(),
                date: bitenData.date || Utils.getCurrentDate(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await bitenRef.set(biten);

            Utils.log('美点追加成功', biten);
            return biten;
        } catch (error) {
            Utils.error('addBiten例外', error);
            throw error;
        }
    },

    // 美点取得（人物ID指定）
    async getBitensByPersonId(personId) {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('美点取得開始', personId);

            const snapshot = await db.collection('users')
                .doc(userId)
                .collection('bitens')
                .where('personId', '==', personId)
                .orderBy('createdAt', 'asc')
                .get();

            const bitens = [];
            snapshot.forEach(doc => {
                bitens.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            Utils.log('美点取得成功', bitens);
            return bitens;
        } catch (error) {
            Utils.error('getBitensByPersonId例外', error);
            throw error;
        }
    },

    // 美点更新
    async updateBiten(bitenId, updateData) {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('美点更新開始', { bitenId, updateData });

            const bitenRef = db.collection('users')
                .doc(userId)
                .collection('bitens')
                .doc(bitenId);

            await bitenRef.update(updateData);

            const doc = await bitenRef.get();
            const updatedBiten = {
                id: doc.id,
                ...doc.data()
            };

            Utils.log('美点更新成功', updatedBiten);
            return updatedBiten;
        } catch (error) {
            Utils.error('updateBiten例外', error);
            throw error;
        }
    },

    // 美点削除（個別）
    async deleteBiten(bitenId) {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('美点削除開始', bitenId);

            await db.collection('users')
                .doc(userId)
                .collection('bitens')
                .doc(bitenId)
                .delete();

            Utils.log('美点削除成功', bitenId);
        } catch (error) {
            Utils.error('deleteBiten例外', error);
            throw error;
        }
    },

    // 美点削除（人物ID指定・全削除）
    async deleteBitensByPersonId(personId) {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('美点一括削除開始', personId);

            const snapshot = await db.collection('users')
                .doc(userId)
                .collection('bitens')
                .where('personId', '==', personId)
                .get();

            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            Utils.log('美点一括削除成功', snapshot.size);
        } catch (error) {
            Utils.error('deleteBitensByPersonId例外', error);
            throw error;
        }
    },

    // ===========================
    // リアルタイム監視
    // ===========================

    // 人物リストをリアルタイム監視
    onPersonsSnapshot(callback) {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('人物リアルタイム監視開始');

            return db.collection('users')
                .doc(userId)
                .collection('persons')
                .orderBy('createdAt', 'asc')
                .onSnapshot(snapshot => {
                    const persons = [];
                    snapshot.forEach(doc => {
                        persons.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    Utils.log('人物リアルタイム更新', persons.length);
                    callback(persons);
                }, error => {
                    Utils.error('人物リアルタイム監視エラー', error);
                });
        } catch (error) {
            Utils.error('onPersonsSnapshot例外', error);
            throw error;
        }
    },

    // 美点リストをリアルタイム監視（人物ID指定）
    onBitensSnapshot(personId, callback) {
        try {
            const userId = this.getCurrentUserId();
            Utils.log('美点リアルタイム監視開始', personId);

            return db.collection('users')
                .doc(userId)
                .collection('bitens')
                .where('personId', '==', personId)
                .orderBy('createdAt', 'asc')
                .onSnapshot(snapshot => {
                    const bitens = [];
                    snapshot.forEach(doc => {
                        bitens.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    Utils.log('美点リアルタイム更新', bitens.length);
                    callback(bitens);
                }, error => {
                    Utils.error('美点リアルタイム監視エラー', error);
                });
        } catch (error) {
            Utils.error('onBitensSnapshot例外', error);
            throw error;
        }
    },

    // ===========================
    // 統計情報取得
    // ===========================

    // 統計情報取得
    async getStats() {
        try {
            const userId = this.getCurrentUserId();
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
