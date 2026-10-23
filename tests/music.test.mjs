import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../assets/music.js', import.meta.url), 'utf8');
const cover = { musicUrl: 'https://www.youtube.com/watch?v=bBzKFjP4Rw4', musicStart: '1:53' };
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

class Element {
  children = []; attributes = {}; listeners = {}; textContent = '';
  classList = { add() {}, remove() {} };
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  replaceChildren(...children) { this.children = children; }
  append(child) { this.children.push(child); }
  remove() {}
  closest() { return this.soundButton ? this : null; }
}

function fixture() {
  const button = new Element(), label = new Element(), slot = new Element(), toast = new Element(), head = new Element();
  button.soundButton = true;
  button.querySelector = () => label;
  const listeners = {}, timers = new Map(), players = [];
  let sequence = 0;
  class Player {
    constructor(frame, options) { this.events = options.events; this.calls = []; players.push(this); }
    setVolume(value) { this.calls.push(['volume', value]); }
    playVideo() { this.calls.push(['play']); }
    pauseVideo() { this.calls.push(['pause']); }
    seekTo(value) { this.calls.push(['seek', value]); }
    destroy() { this.destroyed = true; }
    emit(name, data) { this.events[name]?.({ target: this, data }); }
  }
  const document = {
    head,
    querySelector: selector => ({ '.sound-toggle': button, '#wedding-music': slot, '.toast': toast })[selector],
    createElement: () => new Element(),
    addEventListener(name, listener) { listeners[name] = listener; }
  };
  const window = {};
  vm.runInNewContext(source, {
    window, document, location: { origin: 'https://boda.example' }, URL, URLSearchParams,
    setTimeout(fn, ms) { const id = ++sequence; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  const gesture = (target = new Element()) => listeners.click({ target, isTrusted: true });
  const clickMusic = () => { gesture(button); button.listeners.click(); };
  const load = async () => { window.YT = { Player }; window.onYouTubeIframeAPIReady(); await flush(); players.at(-1).emit('onReady'); return players.at(-1); };
  return { button, label, slot, toast, head, window, players, timers, listeners, gesture, clickMusic, load, configure: window.BodaMusic.configure };
}

test('Music attempts audible playback on arrival at the configured 1:53 start', async () => {
  const f = fixture();
  f.configure(cover);
  const url = new URL(f.slot.children[0].src);
  assert.equal(url.searchParams.get('start'), '113');
  assert.equal(url.searchParams.get('origin'), 'https://boda.example');
  assert.equal(f.slot.children[0].attributes.allow, 'autoplay; encrypted-media');
  assert.equal(f.button.attributes['aria-busy'], 'true');
  const player = await f.load();
  assert.deepEqual(player.calls, [['volume', 45], ['play']], 'No click is needed to request playback.');
  assert.equal(f.button.attributes['aria-pressed'], 'false', 'Show real playback rather than an optimistic state.');
  player.emit('onStateChange', 1);
  assert.equal(f.button.attributes['aria-pressed'], 'true');
  assert.equal(f.label.textContent, 'Pausar música');
});

test('Blocked autoplay retries on the envelope tap, including keyboard activation', async () => {
  const f = fixture(); f.configure(cover); const player = await f.load();
  player.emit('onAutoplayBlocked');
  assert.equal(f.label.textContent, 'Toca para escuchar');
  assert.equal(f.toast.textContent, '', 'The initial browser restriction should not interrupt the invitation.');
  f.gesture();
  assert.equal(player.calls.at(-1)[0], 'play');
  player.emit('onAutoplayBlocked');
  const count = player.calls.length;
  f.listeners.keydown({ key: 'Enter', repeat: false, isTrusted: true, target: new Element() });
  assert.equal(player.calls.length, count + 1);
  player.emit('onStateChange', 1);
  assert.equal(f.button.attributes['aria-pressed'], 'true');
});

test('Music button starts after a block and a manual pause survives later interactions and edits', async () => {
  const f = fixture(); f.configure(cover); const player = await f.load();
  player.emit('onAutoplayBlocked');
  const count = player.calls.length;
  f.clickMusic();
  assert.equal(player.calls.length, count + 1, 'The same click must not start and immediately pause.');
  player.emit('onStateChange', 1);
  f.clickMusic(); player.emit('onStateChange', 2);
  const paused = player.calls.length;
  f.gesture();
  f.configure({ ...cover, subtitle: 'Texto editado' });
  assert.equal(player.calls.length, paused);
  assert.equal(player.destroyed, undefined);
  f.clickMusic();
  assert.equal(player.calls.at(-1)[0], 'play');
  assert.equal(player.calls.some(call => call[0] === 'seek'), false, 'Resume at the paused position.');
});

test('Cancelling while the API loads prevents late autoplay and gesture retries', async () => {
  const f = fixture(); f.configure(cover); f.clickMusic(); f.gesture();
  const player = await f.load();
  assert.equal(player.calls.some(call => call[0] === 'play'), false);
  assert.equal(f.button.attributes['aria-busy'], 'false');
  f.clickMusic();
  assert.equal(player.calls.at(-1)[0], 'play');
});

test('Playback loops from the chosen start and preview mode cancels all pending playback', async () => {
  const f = fixture(); f.configure(cover); const first = await f.load();
  first.emit('onStateChange', 1); first.emit('onStateChange', 0);
  assert.deepEqual(first.calls.slice(-2), [['seek', 113], ['play']]);
  f.configure({ ...cover, musicStart: '2:05' }); await flush();
  assert.equal(first.destroyed, true);
  assert.equal(new URL(f.slot.children[0].src).searchParams.get('start'), '125');
  const second = f.players.at(-1);
  f.configure(cover, { preview: true });
  second.emit('onReady'); first.emit('onStateChange', 1); f.gesture();
  assert.equal(second.calls.length, 0);
  assert.equal(f.button.hidden, true);
  assert.equal(f.slot.children.length, 0);
  for (const musicUrl of ['', 'javascript:alert(1)', 'https://youtube.com.evil.example/watch?v=bBzKFjP4Rw4']) {
    f.configure({ ...cover, musicUrl });
    assert.equal(f.button.hidden, true);
    assert.equal(f.slot.children.length, 0);
  }
});

test('Silent autoplay timeouts fall back to interaction and network errors remain recoverable', async () => {
  const f = fixture(); f.configure(cover); const player = await f.load();
  [...f.timers.values()].find(timer => timer.ms === 15000).fn();
  assert.equal(f.button.attributes['aria-busy'], 'false');
  f.gesture();
  assert.equal(player.calls.at(-1)[0], 'play');
  player.emit('onError', 150);
  assert.match(f.toast.textContent, /No se pudo/);
  f.clickMusic(); await flush();
  assert.equal(player.destroyed, true);
  f.players.at(-1).emit('onReady');
  assert.equal(f.players.at(-1).calls.at(-1)[0], 'play');
  const offline = fixture(); offline.configure(cover);
  offline.head.children[0].onerror(); await flush();
  assert.equal(offline.button.attributes['aria-busy'], 'false');
  offline.clickMusic();
  assert.equal(offline.head.children.length, 2);
  offline.configure(cover, { preview: true });
  offline.window.YT = { Player: class { constructor() { throw new Error('Preview must not load a player.'); } } };
  offline.window.onYouTubeIframeAPIReady(); await flush();
  assert.equal(offline.slot.children.length, 0);
});
