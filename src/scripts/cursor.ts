export class CustomCursor {
  private dot: HTMLElement | null = null;
  private ring: HTMLElement | null = null;

  private mouse = { x: -100, y: -100 };
  private ringPos = { x: -100, y: -100 };
  private isHovered = false;
  private isVisible = false;
  private animationId: number | null = null;

  constructor() {
    // Disable completely on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    this.dot = document.getElementById('cursor-dot');
    this.ring = document.getElementById('cursor-ring');

    if (!this.dot || !this.ring) return;

    this.bindEvents();
    this.render();
  }

  private bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;

      if (!this.isVisible) {
        this.isVisible = true;
        this.dot?.classList.add('is-visible');
        this.ring?.classList.add('is-visible');
      }

      if (this.dot) {
        this.dot.style.transform = `translate3d(${this.mouse.x}px, ${this.mouse.y}px, 0)`;
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      this.isVisible = false;
      this.dot?.classList.remove('is-visible');
      this.ring?.classList.remove('is-visible');
    });

    document.addEventListener('mouseenter', () => {
      this.isVisible = true;
      this.dot?.classList.add('is-visible');
      this.ring?.classList.add('is-visible');
    });

    // Detect interactive element hovers
    const interactiveSelector = 'a, button, [data-cursor], .telemetry-chip, input';
    
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest(interactiveSelector)) {
        this.isHovered = true;
        this.ring?.classList.add('is-hovering');
        this.dot?.classList.add('is-hovering');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest(interactiveSelector)) {
        this.isHovered = false;
        this.ring?.classList.remove('is-hovering');
        this.dot?.classList.remove('is-hovering');
      }
    });
  }

  private render = () => {
    // Lerp outer ring towards mouse
    const lerp = 0.16;
    this.ringPos.x += (this.mouse.x - this.ringPos.x) * lerp;
    this.ringPos.y += (this.mouse.y - this.ringPos.y) * lerp;

    if (this.ring) {
      this.ring.style.transform = `translate3d(${this.ringPos.x}px, ${this.ringPos.y}px, 0) ${this.isHovered ? 'scale(1.6)' : 'scale(1)'}`;
    }

    this.animationId = requestAnimationFrame(this.render);
  };

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

export function initCursor(): CustomCursor | null {
  return new CustomCursor();
}
