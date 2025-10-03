// hakoniwa-client/drone-client.js
// 責務: ドローン制御の通信処理（UI非依存）

import { HakoniwaCoreClient } from './core.js';

export class HakoniwaDroneClient {
  constructor(coreClient = null) {
    this._core = coreClient || new HakoniwaCoreClient();
    this._clients = {};
    this._initPromise = null;
  }

  /**
   * 各ドローンサービスクライアントを初期化
   */
  async initialize() {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = (async () => {
      await this._core.initialize();
      
      const services = this._core.Const.DRONE_SERVICE;

      this._clients = {
        setReady: await this._core.createProtocolClient(services.SET_READY, 'DroneSetReady', 'drone_srv_msgs'),
        takeoff: await this._core.createProtocolClient(services.TAKEOFF, 'DroneTakeOff', 'drone_srv_msgs'),
        land: await this._core.createProtocolClient(services.LAND, 'DroneLand', 'drone_srv_msgs'),
        getState: await this._core.createProtocolClient(services.GET_STATE, 'DroneGetState', 'drone_srv_msgs'),
        goTo: await this._core.createProtocolClient(services.GO_TO, 'DroneGoTo', 'drone_srv_msgs'),
        camTilt: await this._core.createProtocolClient(services.CAMERA_TILT, 'CameraSetTilt', 'drone_srv_msgs'),
        magnet: await this._core.createProtocolClient(services.MAGNET_GRAB, 'MagnetGrab', 'drone_srv_msgs')
      };

      console.log('[HakoniwaDroneClient] Ready');
    })();

    return this._initPromise;
  }

  /**
   * 汎用RPCコール
   */
  async _call(clientKey, makeRequest, timeoutMsec = -1, pollSec = 0.05) {
    await this.initialize();

    const client = this._clients[clientKey];
    if (!client) {
      throw new Error(`Client ${clientKey} not found`);
    }

    try {
      const req = makeRequest(this._core.HakoPdu);
      console.log(`[DroneClient] Calling ${clientKey}`, req);

      const res = await client.call(req, timeoutMsec, pollSec);
      
      if (!res) {
        return { success: false, message: 'RPC call failed' };
      }

      return {
        success: true,
        data: res,
        message: typeof res.message === 'string' ? res.message : JSON.stringify(res)
      };
    } catch (error) {
      console.error(`[DroneClient] Error calling ${clientKey}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * ドローンを準備状態にする
   */
  async setReady(droneName = 'Drone') {
    return this._call('setReady', (HP) => {
      const req = new HP.DroneSetReadyRequest();
      req.drone_name = droneName;
      return req;
    });
  }

  /**
   * 離陸
   */
  async takeoff(droneName = 'Drone', altitudeM = 1.5) {
    return this._call('takeoff', (HP) => {
      const req = new HP.DroneTakeOffRequest();
      req.drone_name = droneName;
      req.alt_m = Number(altitudeM);
      return req;
    });
  }

  /**
   * 着陸
   */
  async land(droneName = 'Drone') {
    return this._call('land', (HP) => {
      const req = new HP.DroneLandRequest();
      req.drone_name = droneName;
      return req;
    });
  }

  /**
   * 状態取得
   */
  async getState(droneName = 'Drone') {
    return this._call('getState', (HP) => {
      const req = new HP.DroneGetStateRequest();
      req.drone_name = droneName;
      return req;
    }, 3000, 0.05);
  }

  /**
   * 指定位置へ移動
   */
  async goTo(params) {
    const {
      droneName = 'Drone',
      x = 0.0,
      y = 0.0,
      z = 1.0,
      speedMs = 1.0,
      yawDeg = 0.0,
      toleranceM = 0.5,
      timeoutSec = -1
    } = params;

    return this._call('goTo', (HP) => {
      const req = new HP.DroneGoToRequest();
      req.drone_name = droneName;
      req.target_pose = new HP.Vector3();
      req.target_pose.x = Number(x);
      req.target_pose.y = Number(y);
      req.target_pose.z = Number(z);
      req.speed_m_s = Number(speedMs);
      req.yaw_deg = Number(yawDeg);
      req.tolerance_m = Number(toleranceM);
      req.timeout_sec = Number(timeoutSec);
      return req;
    }, -1, 0.1);
  }

  /**
   * カメラチルト角度設定
   */
  async setCameraTilt(droneName = 'Drone', tiltAngleDeg = 0.0) {
    return this._call('camTilt', (HP) => {
      const req = new HP.CameraSetTiltRequest();
      req.drone_name = droneName;
      req.tilt_angle_deg = Number(tiltAngleDeg);
      return req;
    });
  }

  /**
   * マグネット制御
   */
  async setMagnet(droneName = 'Drone', grabOn = true, timeoutSec = -1) {
    return this._call('magnet', (HP) => {
      const req = new HP.MagnetGrabRequest();
      req.drone_name = droneName;
      req.grab_on = Boolean(grabOn);
      req.timeout_sec = Number(timeoutSec);
      return req;
    });
  }
}