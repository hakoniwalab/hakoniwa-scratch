// hakoniwa-client/core.js
// 責務: 箱庭通信の初期化・PDUマネージャー管理

import { HakoniwaModuleLoader } from './loader.js';

export class HakoniwaCoreClient {
  constructor() {
    this._initPromise = null;
    this._Const = null;
    this._HakoPdu = null;
    this._pduManager = null;
    this._serviceStarted = false;
  }

  /**
   * モジュールと通信サービスを初期化（一度だけ実行）
   */
  async initialize() {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = (async () => {
      try {
        // 1. PDUモジュールロード
        const loader = new HakoniwaModuleLoader();
        const { Const, HakoPdu } = await loader.loadPduModules();
        this._Const = Const;
        this._HakoPdu = HakoPdu;

        // 2. 通信サービス起動（一度だけ）
        if (!this._serviceStarted) {
          const comm = new HakoPdu.WebSocketCommunicationService('v2');
          this._pduManager = new HakoPdu.RemotePduServiceClientManager(
            Const.ASSET_NAME,
            Const.DEFAULT_PDU_CONFIG_URL,
            comm,
            Const.URI
          );

          await this._pduManager.initialize_services(
            Const.DEFAULT_SERVICE_CONFIG_URL,
            Const.DELTA_TIME_USEC
          );

          await this._pduManager.start_client_service();
          this._serviceStarted = true;

          // ページ離脱時のクリーンアップ
          window.addEventListener('beforeunload', () => {
            this.shutdown();
          });
        }

        console.log('[HakoniwaCoreClient] Initialized successfully');
      } catch (error) {
        console.error('[HakoniwaCoreClient] Initialization failed:', error);
        this._initPromise = null; // リトライ可能にするため巻き戻す
        throw error;
      }
    })();

    return this._initPromise;
  }

  /**
   * プロトコルクライアントを作成
   */
  async createProtocolClient(serviceName, srv, pkg = 'hako_srv_msgs') {
    await this.initialize();

    const client = await this._HakoPdu.makeProtocolClient({
      pduManager: this._pduManager,
      serviceName,
      clientName: this._Const.CLIENT_NAME,
      srv,
      pkg
    });

    await client.register();
    return client;
  }

  /**
   * 通信サービスを停止
   */
  shutdown() {
    if (this._pduManager?.stop_service) {
      this._pduManager.stop_service();
      console.log('[HakoniwaCoreClient] Service stopped');
    }
  }

  // ゲッター
  get Const() { return this._Const; }
  get HakoPdu() { return this._HakoPdu; }
  get pduManager() { return this._pduManager; }
  get isInitialized() { return this._serviceStarted; }
}