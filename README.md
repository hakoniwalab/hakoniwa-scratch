# hakoniwa-scratch

Scratch/TurboWarp 向けの自作拡張と、箱庭RPCとの連携を試すリポジトリ。

## Getting Started

### 1. ローカルで TurboWarp Editor を起動
`scratch-gui` を clone & 起動:

```bash
git clone https://github.com/TurboWarp/scratch-gui
cd scratch-gui
npm ci
npm start
````

→ [http://localhost:8601/editor.html](http://localhost:8601/editor.html) が開発用エディタ。

### 2. 自作拡張をローカルHTTPサーバーで配信

例: `hello-extension.js` を作成して以下で配信:

```bash
npx http-server . -p 8080 --cors -c-1
```

### 3. エディタに読み込ませる

URLパラメータで拡張を指定:

```
http://localhost:8601/editor.html?extension=http://127.0.0.1:8080/hello-extension.js
```

→ ブロックパレットに `Hello Block` カテゴリが出れば成功。

---

## 開発メモ

* `--cors -c-1` でキャッシュ無効 & CORS許可
* 複数拡張を同時に読み込む場合は `&extension=...&extension=...` と繰り返し指定
* Unsandboxed 拡張が必要なときは Editor 内の「Custom Extension」ダイアログから URL を指定し、「Run without sandbox」をチェック

---

```js
(function () {
  'use strict';

  // ① 読み込まれた瞬間に出る確認ログ
  console.log('[hello] file loaded');

  // ② Scratch API の存在チェック（未定義なら何もしないで終了）
  if (typeof Scratch === 'undefined' || !Scratch.extensions) {
    console.warn('[hello] Scratch API not found');
    return;
  }

  const { BlockType } = Scratch;

  class HelloExtension {
    constructor() {
      // ③ 拡張インスタンス生成時に出るログ
      console.log('[hello] extension constructed');
    }

    getInfo() {
      return {
        id: 'helloblock',          // ← 既存プロジェクトで変えない
        name: 'Hello Block',
        blocks: [
          {
            opcode: 'sayHello',
            blockType: BlockType.REPORTER,
            text: 'hello world'
          }
        ]
      };
    }

    sayHello() {
      // ④ ブロック実行時に出るログ
      console.log('[hello] sayHello called');
      return 'Hello, Scratch!';
    }
  }

  Scratch.extensions.register(new HelloExtension());
  console.log('[hello] extension registered');
})();

```

## Tips

- ローカルだけで完結する場合は `http://localhost:8601/editor.html` を使うのが安定。
- 公開したい場合は GitHub Pages や Cloudflare Pages に拡張JSを置いて、
  `https://turbowarp.org/editor?extension=...` の形式で読み込ませられる。
- Scratch/TurboWarp 拡張には Sandboxed と Unsandboxed の2種類がある。
  - Sandboxed: 安全だが通信制約あり
  - Unsandboxed: WebSocket など自由に使える（要「Run without sandbox」）

## 今後の予定

* [ ] Hello Block の強化（引数付き、状態保持）
* [ ] WebSocket ブリッジ拡張（箱庭RPCと接続）
* [ ] サンプルプロジェクト（Scratch 側で箱庭ドローン操作）

```

