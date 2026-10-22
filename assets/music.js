(() => {
  'use strict';
  const button = document.querySelector('.sound-toggle');
  const label = button.querySelector('.sound-label');
  const slot = document.querySelector('#wedding-music');
  let config = null, player = null, ready = false, wanted = false;
  let generation = 0, failed = false, apiPromise, playbackTimer, toastTimer;

  function videoId(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return null;
      let id;
      if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
      else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
        id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:embed|shorts)\/([^/]+)$/.exec(url.pathname)?.[1];
      }
      return /^[\w-]{11}$/.test(id || '') ? id : null;
    } catch { return null; }
  }

  function startSeconds(value) {
    const text = String(value ?? '').trim();
    if (/^\d+$/.test(text)) return Math.min(Number(text), 86400);
    const parts = /^(\d{1,3}):([0-5]\d)$/.exec(text);
    return parts ? Number(parts[1]) * 60 + Number(parts[2]) : 0;
  }

  function showState(playing = false, loading = false) {
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-busy', String(loading));
    button.setAttribute('aria-label', loading ? 'Cancelar el inicio de la música' : playing ? 'Pausar nuestra canción' : 'Reproducir nuestra canción');
    label.textContent = loading ? 'Iniciando música…' : playing ? 'Pausar música' : 'Nuestra canción';
  }

  function notify(message) {
    const toast = document.querySelector('.toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 5500);
  }

  function loadAPI() {
    if (window.YT?.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const previous = window.onYouTubeIframeAPIReady;
      const timer = setTimeout(() => { script.remove(); reject(new Error('YouTube no respondió.')); }, 12000);
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        if (typeof previous === 'function') previous();
        resolve();
      };
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('No se pudo cargar YouTube.')); };
      document.head.append(script);
    }).catch(error => { apiPromise = null; throw error; });
    return apiPromise;
  }

  function destroy() {
    generation++;
    clearTimeout(playbackTimer);
    wanted = ready = failed = false;
    player?.destroy();
    player = null;
    slot.replaceChildren();
    showState();
  }

  function playbackFailed(message) {
    const wasRequested = wanted;
    clearTimeout(playbackTimer);
    wanted = false;
    failed = true;
    player?.pauseVideo();
    showState();
    if (wasRequested) notify(message);
  }

  function watchPlayback() {
    clearTimeout(playbackTimer);
    playbackTimer = setTimeout(() => {
      if (wanted) playbackFailed('La música no pudo iniciar. Toca el botón para volver a intentarlo.');
    }, 15000);
  }

  function prepare() {
    if (!config) return;
    const token = generation;
    const track = { ...config };
    failed = false;
    // Prepare without autoplay so the click can call playVideo directly once ready.
    const frame = document.createElement('iframe');
    const url = new URL('https://www.youtube.com/embed/' + track.id);
    url.search = new URLSearchParams({ start: track.start, autoplay: '0', enablejsapi: '1', origin: location.origin, playsinline: '1', controls: '0', rel: '0' });
    frame.title = 'Música de nuestra boda';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.setAttribute('allow', 'autoplay; encrypted-media');
    frame.src = url.href;
    slot.replaceChildren(frame);
    loadAPI().then(() => {
      if (token !== generation) return;
      player = new window.YT.Player(frame, {
        events: {
          onReady(event) {
            if (token !== generation) return;
            ready = true;
            event.target.setVolume(45);
            if (wanted) event.target.playVideo();
          },
          onStateChange(event) {
            if (token !== generation) return;
            if (event.data === 1) {
              clearTimeout(playbackTimer);
              if (wanted) { failed = false; showState(true); }
              else event.target.pauseVideo();
            } else if (event.data === 2) {
              clearTimeout(playbackTimer);
              wanted = false;
              showState();
            } else if (event.data === 0 && wanted) {
              event.target.seekTo(track.start, true);
              event.target.playVideo();
            }
          },
          onAutoplayBlocked() {
            if (token !== generation) return;
            clearTimeout(playbackTimer);
            wanted = false;
            showState();
            notify('Toca de nuevo el botón de música para permitir el sonido.');
          },
          onError() {
            if (token === generation) playbackFailed('No se pudo reproducir la canción. Toca el botón para reintentar.');
          }
        }
      });
    }).catch(() => {
      if (token === generation) playbackFailed('No se pudo conectar con la música. Revisa tu conexión y vuelve a tocar el botón.');
    });
  }

  button.addEventListener('click', () => {
    if (!config) return;
    if (wanted) {
      wanted = false;
      clearTimeout(playbackTimer);
      if (ready) player.pauseVideo();
      showState();
      return;
    }
    if (failed) { destroy(); prepare(); }
    wanted = true;
    showState(false, true);
    watchPlayback();
    if (ready) player.playVideo();
  });

  window.BodaMusic = {
    configure(cover, { preview = false } = {}) {
      const id = videoId(cover.musicUrl);
      const next = id && !preview ? { id, start: startSeconds(cover.musicStart) } : null;
      const changed = config?.id !== next?.id || config?.start !== next?.start;
      if (changed) destroy();
      config = next;
      button.hidden = !config;
      if (changed && config) prepare();
    }
  };
})();
