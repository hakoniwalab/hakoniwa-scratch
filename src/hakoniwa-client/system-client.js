// hakoniwa-client/system-client.js
// 責務: システム制御（activate/start/terminate）の通信処理

import { HakoniwaCoreClient } from './core.js';

export class HakoniwaSystemClient {
  constructor(coreClient = null) {
    this._core = coreClient || new HakoniwaCoreClient();
    this._client = null;
    this._initPromise = null;
  }

  /**
   * システム制御クライアントを初期化
   */
  async initialize() {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = (async () => {
      await this._core.initialize();
      
      this._client = await this._core.createProtocolClient(
        this._core.Const.SYSTEM_CONTROL_SERVICE_NAME,
        'SystemControl',
        'hako_srv_msgs'
      );

      console.log('[HakoniwaSystemClient] Ready');
    })();

    return this._initPromise;
  }

  /**
   * 汎用RPCコール
   */
  async _call(opcode, timeoutMsec = -1, pollSec = 0.05) {
    await this.initialize();

    if (!this._client) {
      throw new Error('Client not initialized');
    }

    try {
      const HakoPdu = this._core.HakoPdu;
      const req = new HakoPdu.SystemControlRequest();
      req.opcode = HakoPdu.SystemControlOpCode[opcode];

      console.log(`[SystemClient] Calling ${opcode}`, req);

      const res = await this._client.call(req, timeoutMsec, pollSec);
      
      if (!res) {
        return { success: false, message: 'RPC call failed' };
      }

      return {
        success: true,
        message: typeof res.message === 'string' ? res.message : JSON.stringify(res)
      };
    } catch (error) {
      console.error(`[SystemClient] Error calling ${opcode}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Hakoniwaをアクティブ化
   */
  async activate() {
    return this._call('ACTIVATE');
  }

  /**
   * Hakoniwaを開始
   */
  async start() {
    return this._call('START');
  }

  /**
   * Hakoniwaを終了
   */
  async terminate() {
    return this._call('TERMINATE');
  }
}