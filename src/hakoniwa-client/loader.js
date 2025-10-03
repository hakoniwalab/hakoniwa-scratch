// hakoniwa-client/loader.js
// 責務: 外部モジュールの動的fetch（URL取得・ロード）

export class HakoniwaModuleLoader {
  constructor() {
    this._loadedPduModules = null;
    this._loadedHakoniwaModules = null;
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
   * URLを優先順位付きで解決
   * 1. クエリパラメータ
   * 2. LocalStorage
   * 3. デフォルト値
   */
  static resolveUrl(queryParam, localStorageKey, defaultUrl) {
    return (
      this.safeGetQueryParam(queryParam) ||
      this.safeLocalStorageGet(localStorageKey) ||
      defaultUrl
    );
  }

  /**
   * PDU関連モジュール（Const, HakoPdu）をロード
   * @returns {Promise<{Const, HakoPdu}>}
   */
  async loadPduModules() {
    if (this._loadedPduModules) {
      return this._loadedPduModules;
    }

    const constUrl = HakoniwaModuleLoader.resolveUrl(
      'hako',
      'hako_url',
      'http://127.0.0.1:8090/src/const.js'
    );

    const hakoPduUrl = HakoniwaModuleLoader.resolveUrl(
      'hakopdu',
      'hakopdu_url',
      'http://127.0.0.1:8090/hakoniwa-pdu-javascript/src/index.js'
    );

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

    const baseUrl = HakoniwaModuleLoader.resolveUrl(
      'hakobase',
      'hako_base_url',
      'http://127.0.0.1:8090'
    );

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
  }
}