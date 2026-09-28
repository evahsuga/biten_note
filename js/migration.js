// ================================
// 美点発見note - 協力利用から安心利用への移行（直接コピー）
// ================================
// ログイン中の協力利用のデータ（Firestore）を、この端末（IndexedDB）へコピーする。
// Firestore へは書き込まない（読み取りのみ）。
// 画面の出し分け・ボタンは App（app.js）側、ここはデータの処理だけを持つ。
// ================================

const Migration = {
    // コピー記録（この端末の LocalDB 設定に保存）のキー
    RECORDS_KEY: 'migrationCopyRecords',

    // 機能フラグ：CONFIG.MIGRATION の値。確認用の指定（?preview=migration）があれば OFF でも出す
    isPreview() {
        return new URLSearchParams(window.location.search).get('preview') === 'migration';
    },
    isCopyEnabled() {
        return !!(CONFIG.MIGRATION && CONFIG.MIGRATION.COPY_ENABLED) || this.isPreview();
    },

    // Firestore の Timestamp／{seconds}／文字列 を ISO 文字列にそろえる
    toISO(value) {
        if (!value) return new Date().toISOString();
        if (typeof value === 'string') return value;
        if (typeof value.toDate === 'function') return value.toDate().toISOString();
        if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
        return new Date().toISOString();
    },

    // 並び順：sortOrder がある人物が先（昇順）、無い人物は作成日時の古い順
    comparePersons(a, b) {
        const ha = typeof a.sortOrder === 'number';
        const hb = typeof b.sortOrder === 'number';
        if (ha && hb) return a.sortOrder - b.sortOrder;
        if (ha) return -1;
        if (hb) return 1;
        return new Date(Migration.toISO(a.createdAt)) - new Date(Migration.toISO(b.createdAt));
    },

    // Firestore の人物・美点を、この端末へ書き込む形に変換する（純粋関数・テスト用に分離）
    // existingMaxSortOrder: この端末に既にある人物の sortOrder の最大値（無ければ -1）
    convert(firestorePersons, firestoreBitens, existingMaxSortOrder) {
        const persons = [...firestorePersons].sort(this.comparePersons);
        const idMap = {};
        const outPersons = persons.map((p, i) => {
            const newId = Utils.generateUUID();
            idMap[p.id] = newId;
            const now = new Date().toISOString();
            return {
                id: newId,
                name: p.name,
                relationship: p.relationship || CONFIG.DEFAULTS.RELATIONSHIP,
                photo: p.photo || null,
                metDate: p.metDate || null,   // 無い記録に日付を作らない（そのまま運ぶ）
                bitenLimit: p.bitenLimit || CONFIG.LIMITS.DEFAULT_BITEN_LIMIT,
                sortOrder: existingMaxSortOrder + 1 + i,
                status: p.status || 'active',
                createdAt: this.toISO(p.createdAt),
                updatedAt: now
            };
        });

        const outBitens = [];
        let orphanCount = 0;
        for (const b of firestoreBitens) {
            const newPersonId = idMap[b.personId];
            if (!newPersonId) {
                // 人物に結び付かない美点（画面にも出ていない）は運ばない
                orphanCount++;
                continue;
            }
            outBitens.push({
                id: Utils.generateUUID(),
                personId: newPersonId,
                content: b.content,
                date: b.date || Utils.getCurrentDate(),
                createdAt: this.toISO(b.createdAt)
            });
        }
        return { persons: outPersons, bitens: outBitens, orphanCount };
    },

    // この端末のコピー記録（ログイン中の uid のもの）
    async getRecords(uid) {
        await LocalDB.init();
        const all = await LocalDB.getSetting(this.RECORDS_KEY);
        const list = Array.isArray(all) ? all : [];
        return uid ? list.filter(r => r.uid === uid) : list;
    },

    async getLatestRecord(uid) {
        const list = await this.getRecords(uid);
        return list.length ? list[list.length - 1] : null;
    },

    // 照合：記録の新 id がすべてこの端末にあるか（アーカイブ済みを含む全件で数える）
    async verifyRecord(record) {
        await LocalDB.init();
        const persons = await LocalDB.getAllPersonsIncludingArchived();
        const bitens = await LocalDB.getAllBitens();
        const personIds = new Set(persons.map(p => p.id));
        const bitenIds = new Set(bitens.map(b => b.id));
        const missingPersons = record.personIds.filter(id => !personIds.has(id)).length;
        const missingBitens = record.bitenIds.filter(id => !bitenIds.has(id)).length;
        return {
            ok: missingPersons === 0 && missingBitens === 0,
            persons: record.personIds.length - missingPersons,
            bitens: record.bitenIds.length - missingBitens,
            missingPersons,
            missingBitens
        };
    },

    // 直接コピーの本体。成功すると { persons, bitens, orphanCount, record } を返す。
    // 失敗したときは例外を投げる（書き込みは全か無かなので、この端末には何も増えていない）。
    async copyToThisDevice() {
        const uid = DB.getCurrentUserId();
        await LocalDB.init();

        // 1. サーバから取得（キャッシュを使わない）
        const fsPersons = await DB.getAllPersonsFromServer();
        const fsBitens = await DB.getAllBitensFromServer();

        // 2. 変換
        const existing = await LocalDB.getAllPersonsIncludingArchived();
        const maxSort = existing.reduce((m, p) => (typeof p.sortOrder === 'number' && p.sortOrder > m) ? p.sortOrder : m, -1);
        const converted = this.convert(fsPersons, fsBitens, maxSort);

        // 3. コピー記録（書き込みと同じトランザクションで保存する）
        const records = await this.getRecords(null);
        const record = {
            uid,
            copiedAt: new Date().toISOString(),
            persons: converted.persons.length,
            bitens: converted.bitens.length,
            orphans: converted.orphanCount,
            personIds: converted.persons.map(p => p.id),
            bitenIds: converted.bitens.map(b => b.id)
        };
        await LocalDB.bulkPutWithSetting(converted.persons, converted.bitens,
            this.RECORDS_KEY, [...records, record]);

        // 4. 読み直して数える
        const check = await this.verifyRecord(record);
        if (!check.ok) {
            throw new Error('コピーした記録の一部が見つかりません');
        }
        return { persons: check.persons, bitens: check.bitens, orphanCount: converted.orphanCount, record };
    },

    // 安心利用に切り替える：先に安心利用の印を立ててからログアウトする。
    // 以降の画面は認証リスナーの安心利用の分岐が描く（二重に描画しない）。
    async switchToGuest() {
        Auth.enterGuestMode();
        await Auth.signOut();
    }
};

// グローバル公開
window.Migration = Migration;
