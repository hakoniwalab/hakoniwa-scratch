// extension-hakoniwa.js
// Scratchエントリーポイント: 分割モジュールを動的importで統合

(async function () {
  'use strict';

  if (typeof Scratch === 'undefined' || !Scratch.extensions) {
    console.warn('[Hakoniwa] Scratch API not found');
    return;
  }

  // ========== ローダー単体をインポート ==========
  const loaderUrl = 'http://127.0.0.1:8090/src/hakoniwa-client/loader.js';
  const { HakoniwaModuleLoader } = await import(loaderUrl);

  // ========== 全モジュールをロード ==========
  const loader = new HakoniwaModuleLoader();
  const {
    HakoniwaCoreClient,
    HakoniwaSystemClient,
    HakoniwaDroneClient,
    HakoniwaExtension,
    HakoniwaDroneExtension
  } = await loader.loadHakoniwaModules();

  console.log('[Hakoniwa] All modules loaded successfully');

  // ========== 初期化と登録 ==========
  // 共有コアクライアントを作成
  const core = new HakoniwaCoreClient();
  
  // 各通信クライアントを作成（コアを共有）
  const systemClient = new HakoniwaSystemClient(core);
  const droneClient = new HakoniwaDroneClient(core);

  // 初期化を開始（非同期だが待たない - バックグラウンドで実行）
  systemClient.initialize().catch(err => {
    console.error('[Hakoniwa] SystemClient initialization failed:', err);
  });
  
  droneClient.initialize().catch(err => {
    console.error('[Hakoniwa] DroneClient initialization failed:', err);
  });

  // Scratch拡張を登録（ブロック定義クラスにクライアントを注入）
  Scratch.extensions.register(new HakoniwaExtension(systemClient));
  Scratch.extensions.register(new HakoniwaDroneExtension(droneClient));

  console.log('[Hakoniwa] Extensions registered successfully');
})();