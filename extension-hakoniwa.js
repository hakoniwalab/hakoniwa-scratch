(function () {
  'use strict';

  // --- 安全なクエリ/LS取得 ---
  function safeGetQueryParam(name) {
    try { return new URLSearchParams(window.location.search || '').get(name); }
    catch { return null; }
  }
  function safeLocalStorageGet(key) {
    try { return window.localStorage.getItem(key); }
    catch { return null; }
  }

  const CONST_URL =
    safeGetQueryParam('hako') ||
    safeLocalStorageGet('hako_url') ||
    'http://127.0.0.1:8090/src/const.js';

  const HAKO_URL =
    safeGetQueryParam('hakopdu') ||
    safeLocalStorageGet('hakopdu_url') ||
    'http://127.0.0.1:8090/hakoniwa-pdu-javascript/src/index.js';

  if (typeof Scratch === 'undefined' || !Scratch.extensions) {
    console.warn('[hakoniwa] Scratch API not found');
    return;
  }
  const { BlockType } = Scratch;

  class HakoniwaExtension {
    constructor() {
      this.ready = Promise.all([
        import(CONST_URL),
        import(HAKO_URL)
      ]).then(async ([Const, HakoPdu]) => {
        this.Const = Const;
        this.HakoPdu = HakoPdu;

        const comm = new HakoPdu.WebSocketCommunicationService('v2');
        const pduManager = new HakoPdu.RemotePduServiceClientManager(
          Const.ASSET_NAME,
          Const.DEFAULT_PDU_CONFIG_URL,
          comm,
          Const.URI
        );
        await pduManager.initialize_services(Const.DEFAULT_SERVICE_CONFIG_URL, Const.DELTA_TIME_USEC);

        this._sysClient = await HakoPdu.makeProtocolClient({
          pduManager,
          serviceName: Const.SYSTEM_CONTROL_SERVICE_NAME,
          clientName : Const.CLIENT_NAME,
          srv        : 'SystemControl',
          pkg        : 'hako_srv_msgs'
        });

        await this._sysClient.startService();
        await this._sysClient.register();

        console.log('[hakoniwa] ready');
      });
    }

    getInfo() {
      return {
        id: 'hakoniwa',
        name: 'Hakoniwa Control',
        blocks: [
          { opcode: 'activate',  blockType: BlockType.COMMAND,  text: 'Hakoniwa activate' },
          { opcode: 'start',     blockType: BlockType.COMMAND,  text: 'Hakoniwa start' },
          { opcode: 'terminate', blockType: BlockType.COMMAND,  text: 'Hakoniwa terminate' }
        ]
      };
    }

    async _call(opcode) {
      await this.ready;
      const Req = this.HakoPdu.SystemControlRequest;
      const req = new Req();
      req.opcode = this.HakoPdu.SystemControlOpCode[opcode];
      const res = await this._sysClient.call(req, -1, 1);
      return res?.message || 'RPC failed';
    }

    activate()  { return this._call('ACTIVATE'); }
    start()     { return this._call('START'); }
    terminate() { return this._call('TERMINATE'); }
  }

  Scratch.extensions.register(new HakoniwaExtension());
})();
