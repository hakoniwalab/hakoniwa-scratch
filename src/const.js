// const.js
export const DEFAULT_PDU_CONFIG_URL     = new URL('./config/pdu_config.json', import.meta.url).toString();
export const DEFAULT_SERVICE_CONFIG_URL = new URL('./config/drone_service.json', import.meta.url).toString();

export const PORT = 8080;
export const URI  = `ws://localhost:${PORT}`;

// SystemControl サービス用
export const SYSTEM_CONTROL_SERVICE_NAME = 'Service/SystemControl';
export const ASSET_NAME  = 'HakoMcpServer';
export const CLIENT_NAME = 'HakoMcpServerClient';
export const DELTA_TIME_USEC = 1_000_000;
