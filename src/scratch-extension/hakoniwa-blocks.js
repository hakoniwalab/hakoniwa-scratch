// scratch-extension/hakoniwa-blocks.js
// 責務: Scratchのブロック定義とUI（システム制御）

export class HakoniwaExtension {
  constructor(systemClient) {
    // 通信クライアント（UI非依存）を注入
    this._systemClient = systemClient;
  }

  getInfo() {
    if (typeof Scratch === 'undefined' || !Scratch.extensions) {
      console.warn('[HakoniwaBlocks] Scratch API not found');
      return null;
    }

    const { BlockType } = Scratch;

    return {
      id: 'hakoniwa',
      name: 'Hakoniwa Control',
      color1: '#4A90E2',
      color2: '#357ABD',
      blocks: [
        {
          opcode: 'activate',
          blockType: BlockType.COMMAND,
          text: 'Hakoniwa activate'
        },
        {
          opcode: 'start',
          blockType: BlockType.COMMAND,
          text: 'Hakoniwa start'
        },
        {
          opcode: 'terminate',
          blockType: BlockType.COMMAND,
          text: 'Hakoniwa terminate'
        }
      ]
    };
  }

  // Scratchブロックのハンドラ（通信クライアントに委譲）
  async activate() {
    console.log('[HakoniwaBlocks] activate called');
    const result = await this._systemClient.activate();
    return result.message;
  }

  async start() {
    console.log('[HakoniwaBlocks] start called');
    const result = await this._systemClient.start();
    return result.message;
  }

  async terminate() {
    console.log('[HakoniwaBlocks] terminate called');
    const result = await this._systemClient.terminate();
    return result.message;
  }
}