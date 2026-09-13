export {};
type Player = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  setVolume(volume: number): void;
  getVolume(): number;
  isMuted(): boolean;
  getPlayerState(): number;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
};
type YouTubeAPI = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host: string;
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
        onError: () => void;
        onAutoplayBlocked: () => void;
      };
    },
  ) => Player;
};
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let apiPromise: Promise<YouTubeAPI> | undefined;
function loadYouTube(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const previous = window.onYouTubeIframeAPIReady;
    const finish = () => {
      clearTimeout(timeout);
      window.onYouTubeIframeAPIReady = previous;
    };
    const fail = () => {
      finish();
      script.remove();
      apiPromise = undefined;
      reject(new Error('YouTube unavailable'));
    };
    const timeout = window.setTimeout(fail, 15000);
    window.onYouTubeIframeAPIReady = () => {
      finish();
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else fail();
    };
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  });
  return apiPromise;
}

class NepaliSoundtrack extends HTMLElement {
  private player?: Player;
  private events?: AbortController;
  private timer = 0;
  private timeout = 0;
  private session = 0;
  private loading = false;
  private ready = false;
  private playing = false;
  private wantsPlay = false;
  private open = false;
  private volume = 35;
  private get trigger() {
    return this.querySelector<HTMLButtonElement>('.soundtrack-trigger')!;
  }
  private get panel() {
    return this.querySelector<HTMLElement>('.soundtrack-panel')!;
  }
  private get play() {
    return this.querySelector<HTMLButtonElement>('[data-play]')!;
  }
  private get mute() {
    return this.querySelector<HTMLButtonElement>('[data-mute]')!;
  }
  private get slider() {
    return this.querySelector<HTMLInputElement>('input')!;
  }
  private status(text: string) {
    this.querySelector<HTMLElement>('[data-audio-status]')!.textContent = text;
  }
  connectedCallback() {
    this.events = new AbortController();
    const { signal } = this.events;
    this.trigger.addEventListener('click', () => this.setOpen(!this.open), {
      signal,
    });
    this.querySelector('[data-close]')!.addEventListener(
      'click',
      () => this.setOpen(false, true),
      { signal },
    );
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && this.open) this.setOpen(false, true);
      },
      { signal },
    );
    this.play.addEventListener(
      'click',
      () => {
        if (this.loading) return;
        if (this.ready && this.player) {
          this.wantsPlay = !this.playing;
          if (this.playing) this.player.pauseVideo();
          else this.player.playVideo();
        } else {
          this.wantsPlay = true;
          void this.initialize();
        }
      },
      { signal },
    );
    this.mute.addEventListener(
      'click',
      () => {
        if (!this.player || !this.ready) return;
        if (this.player.isMuted() || this.player.getVolume() === 0) {
          this.player.unMute();
          this.player.setVolume(this.volume || 35);
        } else this.player.mute();
        this.syncVolume();
      },
      { signal },
    );
    this.slider.addEventListener(
      'input',
      () => {
        this.volume = Number(this.slider.value);
        this.player?.setVolume(this.volume);
        if (this.volume > 0) this.player?.unMute();
        else this.player?.mute();
        this.syncVolume();
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          this.wantsPlay = false;
          if (this.ready) this.player?.pauseVideo();
          this.stopTimer();
        } else if (this.open) this.startTimer();
      },
      { signal },
    );
    window.addEventListener('pagehide', this.teardown, { signal });
  }
  private setOpen(open: boolean, focus = false) {
    this.open = open;
    this.panel.hidden = !open;
    this.trigger.setAttribute('aria-expanded', String(open));
    if (open) {
      this.play.focus();
      this.startTimer();
    } else {
      this.wantsPlay = false;
      if (this.ready) this.player?.pauseVideo();
      this.stopTimer();
      if (focus) this.trigger.focus();
    }
  }
  private initialize = async () => {
    this.loading = true;
    this.play.disabled = true;
    this.status('Connecting to YouTube…');
    const session = ++this.session;
    try {
      const api = await loadYouTube();
      if (session !== this.session || !this.isConnected) return;
      const mount = this.querySelector<HTMLElement>('[data-youtube-player]')!;
      this.querySelector<HTMLElement>('[data-player-placeholder]')!.hidden =
        true;
      this.timeout = window.setTimeout(() => this.fail(), 18000);
      this.player = new api.Player(mount, {
        videoId: 'taNFbSuESXA',
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '210',
        playerVars: {
          autoplay: 0,
          controls: 1,
          playsinline: 1,
          origin: location.origin,
          rel: 0,
        },
        events: {
          onReady: () => {
            if (session !== this.session) return;
            clearTimeout(this.timeout);
            this.ready = true;
            this.loading = false;
            if (this.open) this.startTimer();
            this.play.disabled = false;
            this.mute.disabled = false;
            this.slider.disabled = false;
            this.player!.getIframe().title =
              'Nepali soundtrack — official YouTube player';
            this.player!.setVolume(this.volume);
            this.status('Ready. Use play to listen.');
            if (this.wantsPlay && this.open && !document.hidden) {
              this.player!.playVideo();
              this.status('Press play in the video if your browser asks.');
            }
            this.syncVolume();
          },
          onStateChange: (event) => {
            if (session !== this.session) return;
            this.playing = event.data === 1 || event.data === 3;
            this.updatePlaying();
            if (event.data === 1)
              this.status('Playing your Nepali soundtrack.');
            else if (event.data === 2) this.status('Paused. Take your time.');
            else if (event.data === 0) {
              this.wantsPlay = false;
              this.status(
                'The soundtrack has ended. Press play to listen again.',
              );
            } else if (event.data === 3)
              this.status('Buffering the soundtrack…');
          },
          onError: () => {
            if (session === this.session) this.fail();
          },
          onAutoplayBlocked: () => {
            this.wantsPlay = false;
            this.status(
              'Your browser needs another tap. Press play in the video.',
            );
          },
        },
      });
    } catch {
      if (session === this.session) this.fail();
    }
  };
  private fail() {
    this.teardown();
    this.status(
      'The soundtrack is unavailable here. You can try again or listen on YouTube.',
    );
  }
  private updatePlaying() {
    this.dataset.playing = String(this.playing);
    this.play.textContent = this.playing ? 'Pause' : 'Play';
    this.play.setAttribute(
      'aria-label',
      this.playing ? 'Pause Nepali soundtrack' : 'Play Nepali soundtrack',
    );
    this.play.setAttribute('aria-pressed', String(this.playing));
    this.querySelector<HTMLElement>('[data-trigger-state]')!.textContent = this
      .playing
      ? 'ON'
      : 'OFF';
  }
  private syncVolume = () => {
    if (!this.ready || !this.player) return;
    const volume = Math.round(this.player.getVolume());
    const muted = this.player.isMuted() || volume === 0;
    this.slider.value = String(volume);
    this.querySelector('output')!.textContent = (muted ? 0 : volume) + '%';
    this.mute.textContent = muted ? 'Unmute' : 'Mute';
    this.mute.setAttribute(
      'aria-label',
      muted ? 'Unmute soundtrack' : 'Mute soundtrack',
    );
    this.mute.setAttribute('aria-pressed', String(muted));
    if (volume > 0) this.volume = volume;
  };
  private startTimer() {
    this.stopTimer();
    this.timer = window.setInterval(this.syncVolume, 750);
  }
  private stopTimer() {
    clearInterval(this.timer);
    this.timer = 0;
  }
  private teardown = () => {
    ++this.session;
    clearTimeout(this.timeout);
    this.stopTimer();
    this.player?.destroy();
    this.player = undefined;
    this.loading = false;
    this.ready = false;
    this.playing = false;
    this.wantsPlay = false;
    this.play.disabled = false;
    this.mute.disabled = true;
    this.slider.disabled = true;
    if (!this.querySelector('[data-youtube-player]')) {
      const mount = document.createElement('div');
      mount.dataset.youtubePlayer = '';
      this.querySelector('.youtube-frame')!.prepend(mount);
    }
    this.querySelector<HTMLElement>('[data-player-placeholder]')!.hidden =
      false;
    this.updatePlaying();
  };
  disconnectedCallback() {
    this.teardown();
    this.events?.abort();
  }
}
if (!customElements.get('nepali-soundtrack'))
  customElements.define('nepali-soundtrack', NepaliSoundtrack);
