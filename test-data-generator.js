// ====================================
// テストデータ生成スクリプト
// ブラウザコンソールで実行してください
// ====================================

(async function generateTestData() {
  console.log('🚀 テストデータ生成を開始します...');
  
  const userId = Auth.getCurrentUserId();
  if (!userId) {
    console.error('❌ ログインしていません');
    return;
  }
  console.log('✅ ユーザーID:', userId);

  // テスト用の人物データ
  const testPersons = [
    { name: '山田太郎', relationship: '同僚', bitenCount: 120 },
    { name: '佐藤花子', relationship: '友人', bitenCount: 85 },
    { name: '鈴木一郎', relationship: '上司', bitenCount: 50 },
    { name: '田中美咲', relationship: '家族', bitenCount: 30 },
    { name: '高橋健二', relationship: '知人', bitenCount: 15 }
  ];

  // 美点のサンプルリスト
  const bitenSamples = [
    '笑顔が素敵', '優しい', '頼りになる', '話を聞いてくれる', '気配りができる',
    '誠実', '前向き', '努力家', '責任感がある', '明るい',
    'ユーモアがある', '思いやりがある', '行動力がある', '創造的', '冷静',
    '忍耐強い', '協力的', '素直', '感謝の心がある', '礼儀正しい',
    '約束を守る', '時間を守る', '清潔感がある', '挨拶が良い', '謙虚',
    '向上心がある', '好奇心旺盛', '決断力がある', '包容力がある', '親切'
  ];

  let totalBitens = 0;

  for (const personData of testPersons) {
    console.log('\n📝 ' + personData.name + ' を作成中...');
    
    // 人物を作成
    const personId = Utils.generateUUID();
    const person = {
      id: personId,
      name: personData.name,
      relationship: personData.relationship,
      photo: null,
      metDate: Utils.getCurrentDate(),
      bitenLimit: personData.bitenCount > 100 ? 200 : 100,
      createdAt: Utils.getCurrentDateTime(),
      updatedAt: Utils.getCurrentDateTime()
    };

    await db.collection('users').doc(userId)
      .collection('persons').doc(personId).set(person);
    console.log('  ✅ 人物作成完了: ' + personData.name);

    // 美点を作成（バッチ処理）
    let currentBatch = db.batch();
    let batchCount = 0;
    
    for (let i = 0; i < personData.bitenCount; i++) {
      const bitenId = Utils.generateUUID();
      const randomBiten = bitenSamples[Math.floor(Math.random() * bitenSamples.length)];
      
      // 日付をランダムに過去30日以内に設定
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split('T')[0];

      const biten = {
        id: bitenId,
        personId: personId,
        content: randomBiten,
        date: dateStr,
        createdAt: new Date(date.getTime() + Math.random() * 86400000).toISOString()
      };

      const bitenRef = db.collection('users').doc(userId)
        .collection('bitens').doc(bitenId);
      currentBatch.set(bitenRef, biten);
      batchCount++;

      // Firestoreのバッチ制限（500件）を考慮
      if (batchCount >= 400) {
        await currentBatch.commit();
        console.log('  📊 ' + (i + 1) + '/' + personData.bitenCount + ' 件の美点を保存...');
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
    
    // 残りをコミット
    if (batchCount > 0) {
      await currentBatch.commit();
    }
    console.log('  ✅ 美点作成完了: ' + personData.bitenCount + ' 件');
    totalBitens += personData.bitenCount;
  }

  console.log('\n====================================');
  console.log('🎉 テストデータ生成完了！');
  console.log('👤 人物: ' + testPersons.length + ' 人');
  console.log('✨ 美点: ' + totalBitens + ' 件');
  console.log('====================================');
  console.log('🔄 ページをリロードしてデータを確認してください');
})();
