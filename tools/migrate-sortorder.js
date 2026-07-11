#!/usr/bin/env node
// ================================
// 全ユーザーsortOrder一括マイグレーションスクリプト
// ================================
//
// 用途: 既存の全ユーザーデータにsortOrderフィールドを追加
// 実行: node tools/migrate-sortorder.js （プロジェクトルートから実行）
//

const admin = require('firebase-admin');

// サービスアカウントキーを読み込み（キーはプロジェクトルートに配置する。MIGRATION.md参照）
// 注意: キー名はダウンロード毎に変わる。実在するキー名に合わせて要調整（BACKLOG.md「キー指定の堅牢化」参照）
const serviceAccount = require('../biten-note-app-firebase-adminsdk-fbsvc-8166a79bf5.json');

// Firebase Admin SDK初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// マイグレーション実行
async function migrateSortOrder() {
  try {
    console.log('=================================');
    console.log('sortOrder一括マイグレーション開始');
    console.log('=================================\n');

    // 全ユーザーを取得
    const usersSnapshot = await db.collection('users').get();
    console.log(`対象ユーザー数: ${usersSnapshot.size}名\n`);

    let totalUsers = 0;
    let totalPersonsMigrated = 0;

    // 各ユーザーのデータをマイグレーション
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userEmail = userData.email || 'unknown';

      console.log(`[ユーザー ${++totalUsers}/${usersSnapshot.size}] ${userEmail} (${userId})`);

      // そのユーザーの全人物を取得
      const personsSnapshot = await db.collection('users')
        .doc(userId)
        .collection('persons')
        .get();

      console.log(`  人物数: ${personsSnapshot.size}名`);

      // sortOrder未設定の人物を抽出
      const personsToMigrate = [];
      personsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.sortOrder === undefined) {
          personsToMigrate.push({
            id: doc.id,
            ref: doc.ref,
            name: data.name || 'unknown',
            createdAt: data.createdAt
          });
        }
      });

      if (personsToMigrate.length === 0) {
        console.log('  ✅ 全員sortOrder設定済み（スキップ）\n');
        continue;
      }

      console.log(`  🔧 sortOrder未設定: ${personsToMigrate.length}名`);

      // createdAt順にソート
      personsToMigrate.sort((a, b) => {
        const aTime = a.createdAt?._seconds || 0;
        const bTime = b.createdAt?._seconds || 0;
        return aTime - bTime;
      });

      // バッチ更新
      const batch = db.batch();
      personsToMigrate.forEach((person, index) => {
        batch.update(person.ref, {
          sortOrder: index + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`     ${index + 1}. ${person.name}`);
      });

      await batch.commit();
      totalPersonsMigrated += personsToMigrate.length;
      console.log(`  ✅ ${personsToMigrate.length}名のマイグレーション完了\n`);
    }

    console.log('=================================');
    console.log('マイグレーション完了');
    console.log('=================================');
    console.log(`処理ユーザー数: ${totalUsers}名`);
    console.log(`更新した人物数: ${totalPersonsMigrated}名`);
    console.log('=================================\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
migrateSortOrder()
  .then(() => {
    console.log('✅ すべての処理が正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  });
