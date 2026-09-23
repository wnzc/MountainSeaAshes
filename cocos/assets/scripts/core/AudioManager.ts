/**
 * 音效占位 — 与 HTML AudioManager 接口对齐。
 * 接入 AudioSource / 外部音频后在此填充。
 */
export class AudioManager {
  enabled = true;
  private unlocked = false;

  unlock(): void {
    this.unlocked = true;
  }

  tone(_freq: number, _dur = 0.08, _type = 'sine', _vol = 0.08, _slide = 0): void {
    // Web 可用 WebAudio；原生预留
  }

  noise(_dur = 0.15, _vol = 0.05): void {
    // 预留
  }

  play(id: string): void {
    if (!this.enabled || !this.unlocked) return;
    switch (id) {
      case 'click':
        this.tone(660, 0.05);
        break;
      case 'place':
        this.tone(440, 0.08);
        break;
      case 'hit':
        this.noise(0.06, 0.03);
        break;
      case 'reaction':
        this.tone(220, 0.12, 'triangle', 0.06, 80);
        break;
      case 'chain':
        this.tone(520, 0.16, 'square', 0.05, 120);
        break;
      case 'upgrade':
        this.tone(780, 0.1);
        break;
      default:
        break;
    }
  }
}

export const audio = new AudioManager();
