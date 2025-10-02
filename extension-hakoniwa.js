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
  const { BlockType, ArgumentType } = Scratch;
  const CORE = {
    initPromise: null,
    Const: null,
    HakoPdu: null,
    pduManager: null,
    clients: new Map(), // key: serviceName -> ProtocolClient
  };
  // ========== ベースクラス ==========
  class HakoniwaBaseExtension {
    constructor() {
      this._initPromise = null;
    }

    // 共通の初期化処理（一度だけ実行）
    async _ensureInitialized() {
      if (!CORE.initPromise) {
        CORE.initPromise = Promise.all([
          import(CONST_URL),
          import(HAKO_URL)
        ]).then(async ([Const, HakoPdu]) => {
          CORE.Const = Const;
          CORE.HakoPdu = HakoPdu;

          // ★ ここで一度だけ通信サービス起動
          if (!CORE._serviceStarted) {
            const comm = new HakoPdu.WebSocketCommunicationService('v2');
            CORE.pduManager = new HakoPdu.RemotePduServiceClientManager(
              Const.ASSET_NAME,
              Const.DEFAULT_PDU_CONFIG_URL,
              comm,
              Const.URI
            );
            await CORE.pduManager.initialize_services(
              Const.DEFAULT_SERVICE_CONFIG_URL,
              Const.DELTA_TIME_USEC
            );
            await CORE.pduManager.start_client_service();
            CORE._serviceStarted = true;
          }

          // ページ遷移時に優しく閉じる（任意）
          window.addEventListener('beforeunload', () => {
            CORE.pduManager?.stop_service?.();
          });

          console.log('[hakoniwa-core] initialized');
        }).catch(e => {
          CORE.initPromise = null; // 失敗時はリトライできるように巻き戻す
          throw e;
        });
      }
      return CORE.initPromise;
    }

    // クライアント作成ヘルパー
    async _makeClient(serviceName, srv, pkg = 'hako_srv_msgs') {
      await this._ensureInitialized();
      if (CORE.clients.has(serviceName)) return CORE.clients.get(serviceName);

      const client = await CORE.HakoPdu.makeProtocolClient({
        pduManager: CORE.pduManager,
        serviceName,
        clientName: CORE.Const.CLIENT_NAME, // 共有でも OK（サーバ側がサービス単位で分けていれば）
        srv,
        pkg
      });
      await client.register();

      CORE.clients.set(serviceName, client);
      return client;
    }

    // 汎用RPC呼び出しヘルパー
    async _callClient(client, makeReq, timeoutMsec = -1, pollSec = 0.05) {
      if (!client) return 'no client';
      try {
        const req = makeReq(CORE.HakoPdu);
        console.log('[_callClient] req=', req);
        const res = await client.call(req, timeoutMsec, pollSec);
        if (!res) return 'RPC failed';
        return typeof res.message === 'string' ? res.message : JSON.stringify(res);
      } catch (e) {
        console.error('[_callClient]', e);
        return 'error';
      }
    }
    get Const()   { return CORE.Const; }
    get HakoPdu() { return CORE.HakoPdu; }
  }

  // ========== システム制御拡張 ==========
  class HakoniwaExtension extends HakoniwaBaseExtension {
    constructor() {
      super();
      this.ready = this._ensureInitialized().then(async () => {
        this._sysClient = await this._makeClient(
          this.Const.SYSTEM_CONTROL_SERVICE_NAME,
          'SystemControl',
          'hako_srv_msgs'
        );
        console.log('[hakoniwa-control] ready');
      });
    }

    getInfo() {
      return {
        id: 'hakoniwa',
        name: 'Hakoniwa Control',
        color1: '#4A90E2',
        color2: '#357ABD',
        blocks: [
          { opcode: 'activate',  blockType: BlockType.COMMAND, text: 'Hakoniwa activate' },
          { opcode: 'start',     blockType: BlockType.COMMAND, text: 'Hakoniwa start' },
          { opcode: 'terminate', blockType: BlockType.COMMAND, text: 'Hakoniwa terminate' }
        ]
      };
    }

    async _call(opcode) {
      console.log(`[hakoniwa] ${opcode} called`);
      await this.ready;
      console.log(`[hakoniwa] ${opcode} ready`);
      return this._callClient(this._sysClient, (HP) => {
        const req = new HP.SystemControlRequest();
        req.opcode = HP.SystemControlOpCode[opcode];
        return req;
      }, -1, 1);
    }

    activate()  { return this._call('ACTIVATE'); }
    start()     { return this._call('START'); }
    terminate() { return this._call('TERMINATE'); }
  }

  // ========== ドローン制御拡張 ==========
  class HakoniwaDroneExtension extends HakoniwaBaseExtension {
    constructor() {
      super();
      this.ready = this._ensureInitialized().then(async () => {
        // 各サービスのクライアント作成
        this.clients = {
          setReady : await this._makeClient(this.Const.DRONE_SERVICE.SET_READY,   'DroneSetReady',  'drone_srv_msgs'),
          takeoff  : await this._makeClient(this.Const.DRONE_SERVICE.TAKEOFF,     'DroneTakeOff',   'drone_srv_msgs'),
          land     : await this._makeClient(this.Const.DRONE_SERVICE.LAND,        'DroneLand',      'drone_srv_msgs'),
          getState : await this._makeClient(this.Const.DRONE_SERVICE.GET_STATE,   'DroneGetState',  'drone_srv_msgs'),
          goTo     : await this._makeClient(this.Const.DRONE_SERVICE.GO_TO,       'DroneGoTo',      'drone_srv_msgs'),
          camTilt  : await this._makeClient(this.Const.DRONE_SERVICE.CAMERA_TILT, 'CameraSetTilt',  'drone_srv_msgs'),
          magnet   : await this._makeClient(this.Const.DRONE_SERVICE.MAGNET_GRAB, 'MagnetGrab',     'drone_srv_msgs'),
        };
        console.log('[hakoniwa-drone] ready');
      });
    }

    getInfo() {
      return {
        id: 'hakoniwadrone',
        name: 'Hakoniwa Drone',
        color1: '#3CB371',
        color2: '#2E8B57',
        blocks: [
          {
            opcode: 'droneSetReady',
            blockType: BlockType.COMMAND,
            text: 'drone [NAME] set ready',
            arguments: {
              NAME: { type: ArgumentType.STRING, defaultValue: 'Drone' }
            }
          },
          {
            opcode: 'droneTakeOff',
            blockType: BlockType.COMMAND,
            text: 'drone [NAME] takeoff to [HEIGHT] m',
            arguments: {
              NAME:   { type: ArgumentType.STRING, defaultValue: 'Drone' },
              HEIGHT: { type: ArgumentType.NUMBER, defaultValue: 1.5 }
            }
          },
          {
            opcode: 'droneLand',
            blockType: BlockType.COMMAND,
            text: 'drone [NAME] land',
            arguments: {
              NAME: { type: ArgumentType.STRING, defaultValue: 'Drone' }
            }
          },
          {
            opcode: 'droneGetState',
            blockType: BlockType.REPORTER,
            text: 'drone [NAME] state (json)',
            arguments: {
              NAME: { type: ArgumentType.STRING, defaultValue: 'Drone' }
            }
          },
          {
            opcode: 'droneGoTo',
            blockType: BlockType.COMMAND,
            text: 'drone [NAME] go to x:[X] y:[Y] z:[Z] speed:[S] yaw:[YAW] tol:[TOL]',
            arguments: {
              NAME: { type: ArgumentType.STRING, defaultValue: 'Drone' },
              X:    { type: ArgumentType.NUMBER, defaultValue: 0.0 },
              Y:    { type: ArgumentType.NUMBER, defaultValue: 0.0 },
              Z:    { type: ArgumentType.NUMBER, defaultValue: 1.0 },
              S:    { type: ArgumentType.NUMBER, defaultValue: 1.0 },
              YAW:  { type: ArgumentType.NUMBER, defaultValue: 0.0 },
              TOL:  { type: ArgumentType.NUMBER, defaultValue: 0.5 }
            }
          },
          {
            opcode: 'cameraSetTilt',
            blockType: BlockType.COMMAND,
            text: 'drone [NAME] camera tilt [ANGLE] deg',
            arguments: {
              NAME:  { type: ArgumentType.STRING, defaultValue: 'Drone' },
              ANGLE: { type: ArgumentType.NUMBER, defaultValue: 0 }
            }
          },
          {
            opcode: 'magnetGrab',
            blockType: BlockType.COMMAND,
            text: 'drone [NAME] magnet [ONOFF]',
            arguments: {
              NAME:  { type: ArgumentType.STRING, defaultValue: 'Drone' },
              ONOFF: { type: ArgumentType.STRING, menu: 'onoff', defaultValue: 'on' }
            }
          }
        ],
        menus: {
          onoff: {
            acceptReporters: true,
            items: ['on', 'off']
          }
        }
      };
    }

    async _call(clientKey, makeReq, timeoutMsec = -1, pollSec = 0.05) {
      await this.ready;
      return this._callClient(this.clients[clientKey], makeReq, timeoutMsec, pollSec);
    }

    droneSetReady({ NAME }) {
      return this._call('setReady', (HP) => {
        const req = new HP.DroneSetReadyRequest();
        req.drone_name = NAME || 'Drone';
        return req;
      });
    }

    droneTakeOff({ NAME, HEIGHT }) {
      return this._call('takeoff', (HP) => {
        const req = new HP.DroneTakeOffRequest();
        req.drone_name = NAME || 'Drone';
        req.alt_m = Number(HEIGHT) || 1.0;
        return req;
      });
    }

    droneLand({ NAME }) {
      return this._call('land', (HP) => {
        const req = new HP.DroneLandRequest();
        req.drone_name = NAME || 'Drone';
        return req;
      });
    }

    async droneGetState({ NAME }) {
      return this._call('getState', (HP) => {
        const req = new HP.DroneGetStateRequest();
        req.drone_name = NAME || 'Drone';
        return req;
      }, 3000, 0.05);
    }

    droneGoTo({ NAME, X, Y, Z, S, YAW, TOL }) {
      return this._call('goTo', (HP) => {
        const req = new HP.DroneGoToRequest();
        req.drone_name = NAME || 'Drone';
        req.target_pose = new HP.Vector3();
        req.target_pose.x = Number(X) || 0.0;
        req.target_pose.y = Number(Y) || 0.0;
        req.target_pose.z = Number(Z) || 0.0;
        req.speed_m_s   = Number(S)   || 1.0;
        req.yaw_deg     = Number(YAW) || 0.0;
        req.tolerance_m = Number(TOL) || 0.5;
        req.timeout_sec = -1;
        return req;
      }, -1, 0.1);
    }

    cameraSetTilt({ NAME, ANGLE }) {
      return this._call('camTilt', (HP) => {
        const req = new HP.CameraSetTiltRequest();
        req.drone_name    = NAME || 'Drone';
        req.tilt_angle_deg = Number(ANGLE) || 0.0;
        return req;
      });
    }

    magnetGrab({ NAME, ONOFF }) {
      return this._call('magnet', (HP) => {
        const req = new HP.MagnetGrabRequest();
        req.drone_name = NAME || 'Drone';
        req.grab_on    = String(ONOFF).toLowerCase() !== 'off';
        req.timeout_sec = -1;
        return req;
      });
    }
  }

  // 両方の拡張を登録
  Scratch.extensions.register(new HakoniwaExtension());
  Scratch.extensions.register(new HakoniwaDroneExtension());
})();