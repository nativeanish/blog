import type { HimalayanScene } from './three-scene';
class LandscapeElement extends HTMLElement {
  private scene?: HimalayanScene;
  private events?: AbortController;
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  private generation = 0;
  private userPaused = false;
  connectedCallback() {
    this.events = new AbortController();
    const { signal } = this.events;
    this.motion.addEventListener('change', this.initialize, { signal });
    this.querySelector<HTMLButtonElement>(
      '[data-motion-toggle]',
    )?.addEventListener(
      'click',
      () => {
        this.userPaused = !this.userPaused;
        this.scene?.setPaused(this.userPaused);
        this.updateControls();
      },
      { signal },
    );
    window.addEventListener('pagehide', this.stop, { signal });
    window.addEventListener(
      'pageshow',
      (e) => {
        if (e.persisted) void this.initialize();
      },
      { signal },
    );
    void this.initialize();
  }
  private updateControls() {
    const button = this.querySelector<HTMLButtonElement>(
      '[data-motion-toggle]',
    )!;
    button.hidden = !this.scene;
    button.setAttribute('aria-pressed', String(this.userPaused));
    button.setAttribute(
      'aria-label',
      this.userPaused
        ? 'Resume landscape animation'
        : 'Pause landscape animation',
    );
    this.querySelector<HTMLElement>('[data-motion-label]')!.textContent = this
      .userPaused
      ? 'Resume motion'
      : 'Pause motion';
    this.querySelector<HTMLElement>('[data-scene-status]')!.textContent = this
      .scene
      ? this.userPaused
        ? 'LANDSCAPE PAUSED'
        : 'LIVE LANDSCAPE'
      : 'STILL LANDSCAPE';
  }
  private initialize = async () => {
    this.stop();
    const generation = this.generation;
    if (this.motion.matches || !this.isConnected) {
      this.updateControls();
      return;
    }
    const status = this.querySelector<HTMLElement>('[data-scene-status]')!;
    status.textContent = 'DRAWING THE LANDSCAPE';
    this.dataset.state = 'loading';
    try {
      const { HimalayanScene } = await import('./three-scene');
      if (
        this.generation !== generation ||
        !this.isConnected ||
        this.motion.matches
      )
        return;
      this.scene = new HimalayanScene(
        this.querySelector<HTMLCanvasElement>('canvas')!,
        this,
      );
      this.scene.setPaused(this.userPaused);
    } catch {
      this.dataset.state = 'fallback';
    }
    this.updateControls();
  };
  private stop = () => {
    this.generation++;
    if (this.scene) {
      this.scene.dispose();
      // A deliberately lost WebGL context cannot be reused by a new renderer.
      const canvas = this.querySelector('canvas')!;
      canvas.replaceWith(canvas.cloneNode(false));
    }
    this.scene = undefined;
    this.dataset.state = 'static';
    this.dataset.rendering = 'false';
  };
  disconnectedCallback() {
    this.stop();
    this.events?.abort();
  }
}
if (!customElements.get('himalayan-landscape'))
  customElements.define('himalayan-landscape', LandscapeElement);
