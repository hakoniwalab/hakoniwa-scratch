// hakoniwa-client/loader.js
// 責務: 外部モジュールの動的fetch（URL取得・ロード）

export const FETCH_PORT = 8090;
export const FETCH_URI = `http://127.0.0.1:${FETCH_PORT}`;

export class HakoniwaModuleLoader {
  constructor() {
    this._loadedPduModules = null;
    this._loadedHakoniwaModules = null;
    this._baseUrl = null;
  }

  /**
   * クエリパラメータから値を安全に取得
   */
  static safeGetQueryParam(name) {
    try {
      return new URLSearchParams(window.location.search || '').get(name);
    } catch {
      return null;
    }
  }

  /**
   * LocalStorageから値を安全に取得
   */
  static safeLocalStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * ベースURLを取得（優先順位: クエリパラメータ → localStorage → デフォルト）
   */
  getBaseUrl() {
    if (this._baseUrl) {
      return this._baseUrl;
    }

    this._baseUrl = (
      HakoniwaModuleLoader.safeGetQueryParam('hakobase') ||
      HakoniwaModuleLoader.safeLocalStorageGet('hako_base_url') ||
      FETCH_URI
    );

    console.log('[HakoniwaLoader] Base URL:', this._baseUrl);
    return this._baseUrl;
  }

  /**
   * PDU関連モジュール（Const, HakoPdu）をロード
   * @returns {Promise<{Const, HakoPdu}>}
   */
  async loadPduModules() {
    if (this._loadedPduModules) {
      return this._loadedPduModules;
    }

    const baseUrl = this.getBaseUrl();
    const constUrl = `${baseUrl}/src/const.js`;
    const hakoPduUrl = `${baseUrl}/hakoniwa-pdu-javascript/src/index.js`;

    console.log('[HakoniwaLoader] Loading PDU modules:', { constUrl, hakoPduUrl });

    const [Const, HakoPdu] = await Promise.all([
      import(constUrl),
      import(hakoPduUrl)
    ]);

    this._loadedPduModules = { Const, HakoPdu };
    return this._loadedPduModules;
  }

  /**
   * 箱庭クライアント・拡張モジュールをロード
   * @returns {Promise<{HakoniwaCoreClient, HakoniwaSystemClient, HakoniwaDroneClient, HakoniwaExtension, HakoniwaDroneExtension}>}
   */
  async loadHakoniwaModules() {
    if (this._loadedHakoniwaModules) {
      return this._loadedHakoniwaModules;
    }

    const baseUrl = this.getBaseUrl();

    console.log('[HakoniwaLoader] Loading Hakoniwa modules from:', baseUrl);

    const [
      { HakoniwaCoreClient },
      { HakoniwaSystemClient },
      { HakoniwaDroneClient },
      { HakoniwaExtension },
      { HakoniwaDroneExtension }
    ] = await Promise.all([
      import(`${baseUrl}/src/hakoniwa-client/core.js`),
      import(`${baseUrl}/src/hakoniwa-client/system-client.js`),
      import(`${baseUrl}/src/hakoniwa-client/drone-client.js`),
      import(`${baseUrl}/src/scratch-extension/hakoniwa-blocks.js`),
      import(`${baseUrl}/src/scratch-extension/drone-blocks.js`)
    ]);

    this._loadedHakoniwaModules = {
      HakoniwaCoreClient,
      HakoniwaSystemClient,
      HakoniwaDroneClient,
      HakoniwaExtension,
      HakoniwaDroneExtension
    };

    return this._loadedHakoniwaModules;
  }

  /**
   * ロード済みモジュールをクリア（再ロード用）
   */
  reset() {
    this._loadedPduModules = null;
    this._loadedHakoniwaModules = null;
    this._baseUrl = null;
  }
}