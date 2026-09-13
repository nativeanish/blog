class SiteHeader extends HTMLElement {
  private controller?: AbortController;
  private observer?: IntersectionObserver;
  connectedCallback() {
    this.controller?.abort();
    this.controller = new AbortController();
    const { signal } = this.controller;
    const button = this.querySelector<HTMLButtonElement>('.menu-toggle')!;
    const nav = this.querySelector<HTMLElement>('nav')!;
    const label = this.querySelector<HTMLElement>('[data-menu-label]')!;
    this.dataset.enhanced = 'true';
    const setOpen = (open: boolean, restoreFocus = false) => {
      this.dataset.open = String(open);
      button.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Close' : 'Menu';
      if (restoreFocus) button.focus();
    };
    button.addEventListener(
      'click',
      () => setOpen(this.dataset.open !== 'true'),
      { signal },
    );
    nav.addEventListener(
      'click',
      (e) => {
        const link = (e.target as Element).closest<HTMLAnchorElement>('a');
        if (!link) return;
        setOpen(false);
        // Transfer focus to the destination after hiding the mobile navigation.
        if (matchMedia('(max-width: 760px)').matches) {
          const section = document.querySelector<HTMLElement>(link.hash);
          section?.setAttribute('tabindex', '-1');
          section?.focus({ preventScroll: true });
        }
      },
      { signal },
    );
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && this.dataset.open === 'true')
          setOpen(false, true);
      },
      { signal },
    );
    document.addEventListener(
      'click',
      (e) => {
        if (!this.contains(e.target as Node)) setOpen(false);
      },
      { signal },
    );
    const wide = matchMedia('(min-width: 761px)');
    wide.addEventListener('change', () => setOpen(false), { signal });
    this.observer = new IntersectionObserver(
      (entries) => {
        const active = entries.find((entry) => entry.isIntersecting);
        if (!active) return;
        nav.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
          if (link.hash === '#' + active.target.id)
            link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      },
      { rootMargin: '-10% 0px -65% 0px' },
    );
    document
      .querySelectorAll('main > section')
      .forEach((section) => this.observer!.observe(section));
  }
  disconnectedCallback() {
    this.controller?.abort();
    this.observer?.disconnect();
  }
}
if (!customElements.get('site-header'))
  customElements.define('site-header', SiteHeader);

// Content is visible without JavaScript. Only enhance elements below the fold.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let reveals: IntersectionObserver | undefined;
function revealContent() {
  reveals?.disconnect();
  document
    .querySelectorAll('.reveal-pending')
    .forEach((el) => el.classList.remove('reveal-pending'));
  if (reduce.matches) return;
  reveals = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('reveal-pending');
          reveals?.unobserve(entry.target);
        }
      }),
    { threshold: 0.05 },
  );
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    if (el.getBoundingClientRect().top > innerHeight) {
      el.classList.add('reveal-pending');
      reveals!.observe(el);
    }
  });
}
revealContent();
reduce.addEventListener('change', revealContent);
window.addEventListener('pagehide', () => {
  reveals?.disconnect();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) revealContent();
});
