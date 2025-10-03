# hakoniwa-scratch

Scratch/TurboWarp 向けの箱庭システム連携拡張。

箱庭（Hakoniwa）のドローンシミュレーションをScratchのビジュアルブロックで制御できます。

## 特徴

- **ビジュアルプログラミング**: Scratchブロックでドローン制御
- **リアルタイム通信**: WebSocketを使った箱庭システムとの双方向通信
- **モジュール分割設計**: 通信層とUI層を分離し、保守性・再利用性を向上

---

## Getting Started

### 1. ローカルで TurboWarp Editor を起動

`scratch-gui` を clone & 起動:

```bash
git clone https://github.com/TurboWarp/scratch-gui
cd scratch-gui
npm ci
npm start
```

→ [http://localhost:8601/editor.html](http://localhost:8601/editor.html) が開発用エディタ。

### 2. 箱庭拡張をローカルHTTPサーバーで配信

このリポジトリをHTTPサーバーで配信:

```bash
npx http-server . -p 8090 --cors -c-1
```

- `--cors`: CORS許可（TurboWarpからのアクセスに必要）
- `-c-1`: キャッシュ無効化（開発中の変更を即座に反映）

### 3. エディタに拡張を読み込ませる

URLパラメータで拡張を指定:

```
http://localhost:8601/editor.html?extension=http://127.0.0.1:8090/extension.js
```

→ ブロックパレットに以下が出れば成功:
- **Hakoniwa Control** カテゴリ（システム制御）
- **Hakoniwa Drone** カテゴリ（ドローン操作）

### 4. 箱庭シミュレーターを起動

別ターミナルで箱庭システムを起動してください。
（箱庭システムの起動方法は [hakoniwa](https://github.com/toppers/hakoniwa) を参照）

---

## アーキテクチャ

### ディレクトリ構成

```
extension.js              # エントリーポイント
src/
├── config/               # 設定ファイル
│   ├── drone_service.json
│   └── pdu_config.json
├── const.js              # 箱庭システム定数
├── hakoniwa-client/      # 通信層（UI非依存）
│   ├── loader.js         # モジュール動的ロード
│   ├── core.js           # 通信コア（PDUマネージャー）
│   ├── system-client.js  # システム制御API
│   └── drone-client.js   # ドローン制御API
└── scratch-extension/    # UI層（Scratch依存）
    ├── hakoniwa-blocks.js # システム制御ブロック定義
    └── drone-blocks.js    # ドローンブロック定義
```

### クラス設計と責務分離

#### 1. **通信層** (`hakoniwa-client/`)

UI非依存の純粋な通信ロジック。他のプラットフォーム（CLI、Webアプリ等）でも再利用可能。

##### `loader.js` - モジュールローダー
- **責務**: 外部モジュールの動的import
- **機能**:
  - ベースURLの解決（クエリパラメータ → localStorage → デフォルト）
  - PDUモジュール（`const.js`, `hakoniwa-pdu-javascript`）のロード
  - 箱庭クライアント・拡張モジュールのロード

##### `core.js` - 通信コア
- **責務**: 箱庭システムとの通信基盤
- **機能**:
  - PDUマネージャーの初期化
  - WebSocket通信の管理
  - プロトコルクライアントの生成

##### `system-client.js` - システム制御クライアント
- **責務**: 箱庭システムの制御API
- **機能**:
  - `activate()`: システムのアクティブ化
  - `start()`: シミュレーション開始
  - `terminate()`: システム終了

##### `drone-client.js` - ドローン制御クライアント
- **責務**: ドローン操作API
- **機能**:
  - `setReady()`: ドローン準備
  - `takeoff()`: 離陸
  - `land()`: 着陸
  - `goTo()`: 指定位置への移動
  - `getState()`: 状態取得
  - `setCameraTilt()`: カメラチルト角度設定
  - `setMagnet()`: マグネット制御

#### 2. **UI層** (`scratch-extension/`)

Scratch特有のブロック定義とイベントハンドラー。通信クライアントに処理を委譲。

##### `hakoniwa-blocks.js` - システム制御ブロック
- **責務**: Scratchブロックの定義とハンドリング
- **機能**:
  - `getInfo()`: ブロックメタデータ定義
  - ブロックハンドラー（`activate`, `start`, `terminate`）
  - `system-client.js` への処理委譲

##### `drone-blocks.js` - ドローンブロック
- **責務**: ドローン操作ブロックの定義とハンドリング
- **機能**:
  - `getInfo()`: ドローンブロックメタデータ定義
  - 各種ドローン操作ブロックのハンドラー
  - `drone-client.js` への処理委譲

#### 3. **エントリーポイント** (`extension.js`)

- **責務**: モジュール統合とScratch拡張登録
- **機能**:
  - `loader.js` を使って全モジュールを動的ロード
  - 通信クライアントのインスタンス化と初期化
  - クライアントをブロック定義クラスに注入
  - Scratch APIへの拡張登録

### データフロー

```
[Scratchブロック実行]
    ↓
[hakoniwa-blocks.js / drone-blocks.js]
    ↓ (委譲)
[system-client.js / drone-client.js]
    ↓ (RPC呼び出し)
[core.js - PDUマネージャー]
    ↓ (WebSocket)
[箱庭システム]
```

---

## 利用可能なブロック

### Hakoniwa Control カテゴリ

- **Hakoniwa activate**: システムをアクティブ化
- **Hakoniwa start**: シミュレーション開始
- **Hakoniwa terminate**: システム終了

### Hakoniwa Drone カテゴリ

- **drone [NAME] set ready**: ドローンを準備状態に
- **drone [NAME] takeoff to [HEIGHT] m**: 指定高度まで離陸
- **drone [NAME] land**: 着陸
- **drone [NAME] state (json)**: ドローン状態を取得（JSON形式）
- **drone [NAME] go to x:[X] y:[Y] z:[Z] speed:[S] yaw:[YAW] tol:[TOL]**: 指定座標へ移動
- **drone [NAME] camera tilt [ANGLE] deg**: カメラチルト角度設定
- **drone [NAME] magnet [on/off]**: マグネットON/OFF

---

## カスタマイズ

### ベースURLの変更

デフォルトでは `http://127.0.0.1:8090` から各モジュールをロードします。

#### 方法1: クエリパラメータ

```
http://localhost:8601/editor.html?extension=http://example.com/extension.js&hakobase=http://example.com:9000
```

#### 方法2: localStorage

```javascript
localStorage.setItem('hako_base_url', 'http://example.com:9000');
```

---

## 開発ガイド

### モジュールの追加

新しい機能を追加する場合:

1. **通信APIの追加**: `hakoniwa-client/` 配下に新しいクライアントクラスを作成
2. **ブロック定義の追加**: `scratch-extension/` 配下に新しいブロック定義クラスを作成
3. **エントリーポイントの更新**: `extension.js` で新しいモジュールをロード・登録

### テスト

通信クライアントはUI非依存なので、Node.js環境で単体テスト可能:

```javascript
import { HakoniwaDroneClient } from './src/hakoniwa-client/drone-client.js';

const client = new HakoniwaDroneClient();
await client.initialize();
const result = await client.takeoff('TestDrone', 2.0);
console.log(result);
```

---

## トラブルシューティング

### 拡張が読み込まれない

- ブラウザコンソールでエラーを確認
- HTTPサーバーが起動しているか確認（`http://127.0.0.1:8090/extension.js` に直接アクセス）
- CORSエラーが出る場合は `--cors` オプションを確認

### ブロックが実行されない

- 箱庭システムが起動しているか確認
- WebSocket接続が確立されているか確認（コンソールログを確認）
- `Hakoniwa activate` → `Hakoniwa start` の順で実行

---

## ライセンス

MIT

## 参考リンク

- [TurboWarp](https://turbowarp.org/)
- [TurboWarp 拡張開発ドキュメント](https://docs.turbowarp.org/development/extensions/introduction)
- [箱庭（Hakoniwa）](https://github.com/toppers/hakoniwa)