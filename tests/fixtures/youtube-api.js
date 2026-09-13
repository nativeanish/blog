// Deterministic API double. These tests do not claim the remote song is playable.
window.YT = {
  Player: class {
    constructor(mount, options) {
      this.options = options;
      this.volume = 100;
      this.muted = false;
      this.state = -1;
      this.destroyed = false;
      this.iframe = document.createElement('iframe');
      mount.replaceWith(this.iframe);
      window.__youtube = this;
      setTimeout(() => options.events.onReady(), 0);
    }
    playVideo() {
      this.state = 1;
      this.options.events.onStateChange({ data: 1 });
    }
    pauseVideo() {
      this.state = 2;
      this.options.events.onStateChange({ data: 2 });
    }
    mute() {
      this.muted = true;
    }
    unMute() {
      this.muted = false;
    }
    setVolume(value) {
      this.volume = value;
    }
    getVolume() {
      return this.volume;
    }
    isMuted() {
      return this.muted;
    }
    getPlayerState() {
      return this.state;
    }
    getIframe() {
      return this.iframe;
    }
    destroy() {
      this.destroyed = true;
      this.iframe.remove();
    }
    fail() {
      this.options.events.onError();
    }
  },
};
window.onYouTubeIframeAPIReady();
