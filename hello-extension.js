(function () {
  'use strict';

  // このファイルの基準URL（classicでも安定）
  const BASE_URL = (function () {
    const src = (document.currentScript && document.currentScript.src) || location.href;
    return new URL('.', src);
  })();

  // --- 安全ヘルパ ---
  function safeGetQueryParam(name) {
    try {
      const params = new URLSearchParams(window.location.search || '');
      return params.get(name);
    } catch {
      return null;
    }
  }
  function safeLocalStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      // sandboxed iframe（allow-same-originなし）ではここに来る
      return null;
    }
  }

  // デフォルトの設定ファイルパス
  const DEFAULT_PDU_CONFIG_URL     = new URL('./config/pdu_config.json', BASE_URL).toString();
  const DEFAULT_SERVICE_CONFIG_URL = new URL('./config/drone_service.json', BASE_URL).toString();

  // クエリ / localStorage で上書き（失敗したら null が返り、デフォルト採用）
  const OVERRIDE_PDU     = safeGetQueryParam('pdu')     || safeLocalStorageGet('pdu_config_url');
  const OVERRIDE_SERVICE = safeGetQueryParam('service') || safeLocalStorageGet('service_config_url');

  const PDU_CONFIG_URL     = OVERRIDE_PDU     || DEFAULT_PDU_CONFIG_URL;
  const SERVICE_CONFIG_URL = OVERRIDE_SERVICE || DEFAULT_SERVICE_CONFIG_URL;

  const PORT = 8080;
  const URI  = `ws://localhost:${PORT}`;

  if (typeof Scratch === 'undefined' || !Scratch.extensions) {
    console.warn('[hello] Scratch API not found');
    return;
  }
  const { BlockType } = Scratch;

  class HelloExtension {
    constructor() {
      const HAKO_URL =
        safeGetQueryParam('hako') ||
        safeLocalStorageGet('hako_url') ||
        'http://127.0.0.1:8090/hakoniwa-pdu-javascript/src/index.js';

      this.ready = import(HAKO_URL).then(async (HakoPdu) => {
        const clientCommService = new HakoPdu.WebSocketCommunicationService('v2');
        const pduManager = new HakoPdu.RemotePduServiceClientManager(
          'service_client',
          PDU_CONFIG_URL,
          clientCommService,
          URI
        );
        await pduManager.initialize_services(SERVICE_CONFIG_URL, 30000);
        this.pdu = pduManager;
      }).catch(err => {
        console.error('[hello] failed to load HakoPdu:', err);
      });
    }

    getInfo() {
      return {
        id: 'helloblock',
        name: 'Hello Block',
        blocks: [
          { opcode: 'sayHello', blockType: BlockType.REPORTER, text: 'hello world' },
          { opcode: 'pduStatus', blockType: BlockType.REPORTER, text: 'pdu status' }
        ]
      };
    }
    sayHello() { return 'Hello, Scratch!'; }
    async pduStatus() {
      try { await this.ready; return this.pdu ? 'ok' : 'not ready'; }
      catch { return 'load error'; }
    }
  }

  Scratch.extensions.register(new HelloExtension());
})();
