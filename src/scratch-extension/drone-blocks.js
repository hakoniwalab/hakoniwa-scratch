// scratch-extension/drone-blocks.js
// 責務: Scratchのブロック定義とUI（ドローン制御）

export class HakoniwaDroneExtension {
  constructor(droneClient) {
    // 通信クライアント（UI非依存）を注入
    this._droneClient = droneClient;
  }

  getInfo() {
    if (typeof Scratch === 'undefined' || !Scratch.extensions) {
      console.warn('[DroneBlocks] Scratch API not found');
      return null;
    }

    const { BlockType, ArgumentType } = Scratch;

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
            NAME: { type: ArgumentType.STRING, defaultValue: 'Drone' },
            HEIGHT: { type: ArgumentType.NUMBER, defaultValue: 0.5 }
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
            X: { type: ArgumentType.NUMBER, defaultValue: 0.0 },
            Y: { type: ArgumentType.NUMBER, defaultValue: 0.0 },
            Z: { type: ArgumentType.NUMBER, defaultValue: 0.5 },
            S: { type: ArgumentType.NUMBER, defaultValue: 1.0 },
            YAW: { type: ArgumentType.NUMBER, defaultValue: 0.0 },
            TOL: { type: ArgumentType.NUMBER, defaultValue: 0.1 }
          }
        },
        {
          opcode: 'cameraSetTilt',
          blockType: BlockType.COMMAND,
          text: 'drone [NAME] camera tilt [ANGLE] deg',
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: 'Drone' },
            ANGLE: { type: ArgumentType.NUMBER, defaultValue: 0 }
          }
        },
        {
          opcode: 'magnetGrab',
          blockType: BlockType.COMMAND,
          text: 'drone [NAME] magnet [ONOFF]',
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: 'Drone' },
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

  // Scratchブロックのハンドラ（通信クライアントに委譲）
  async droneSetReady({ NAME }) {
    const result = await this._droneClient.setReady(NAME);
    return result.message;
  }

  async droneTakeOff({ NAME, HEIGHT }) {
    const result = await this._droneClient.takeoff(NAME, HEIGHT);
    return result.message;
  }

  async droneLand({ NAME }) {
    const result = await this._droneClient.land(NAME);
    return result.message;
  }

  async droneGetState({ NAME }) {
    const result = await this._droneClient.getState(NAME);
    return result.message;
  }

  async droneGoTo({ NAME, X, Y, Z, S, YAW, TOL }) {
    const result = await this._droneClient.goTo({
      droneName: NAME,
      x: X,
      y: Y,
      z: Z,
      speedMs: S,
      yawDeg: YAW,
      toleranceM: TOL
    });
    return result.message;
  }

  async cameraSetTilt({ NAME, ANGLE }) {
    const result = await this._droneClient.setCameraTilt(NAME, ANGLE);
    return result.message;
  }

  async magnetGrab({ NAME, ONOFF }) {
    const grabOn = String(ONOFF).toLowerCase() !== 'off';
    const result = await this._droneClient.setMagnet(NAME, grabOn);
    return result.message;
  }
}