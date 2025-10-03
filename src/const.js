// const.js
export const DEFAULT_PDU_CONFIG_URL     = new URL('./config/pdu_config.json', import.meta.url).toString();
export const DEFAULT_SERVICE_CONFIG_URL = new URL('./config/drone_service.json', import.meta.url).toString();

export const WS_PORT = 8080;
export const URI  = `ws://localhost:${WS_PORT}`;

// SystemControl サービス用
export const SYSTEM_CONTROL_SERVICE_NAME = 'Service/SystemControl';
export const ASSET_NAME  = 'HakoScrachClient';
export const CLIENT_NAME = 'HakoScrachClient';
export const DELTA_TIME_USEC = 1_000_000;

export const DRONE_SERVICE = {
  SET_READY   : 'DroneService/DroneSetReady',
  TAKEOFF     : 'DroneService/DroneTakeOff',
  LAND        : 'DroneService/DroneLand',
  GET_STATE   : 'DroneService/DroneGetState',
  GO_TO       : 'DroneService/DroneGoTo',
  CAMERA_TILT : 'DroneService/CameraSetTilt',
  MAGNET_GRAB : 'DroneService/MagnetGrab',
  // LiDAR や CameraCapture は後で追加
};
