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
