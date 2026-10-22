import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../admin.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const original = JSON.parse(await readFile(new URL('../data/content.json', import.meta.url), 'utf8'));
const definitions = admin.slice(admin.indexOf('  const fields = {'), admin.indexOf('  for (const [id, copy]'));
function extract(source, name, next) {
  return source.slice(source.indexOf(`  function ${name}(`), source.indexOf(`  function ${next}(`));
}

test('Editing ceremony time keeps the cover and calendar in sync without changing arrival', () => {
  const content = structuredClone(original);
  const edit = vm.runInNewContext(definitions + extract(admin, 'applyFieldEdit', 'editPreviewField') + '\napplyFieldEdit;', { content });
  const itinerary = content.modules.find(module => module.id === 'celebration');
  const cover = content.modules.find(module => module.id === 'hero');
  edit(itinerary, 'ceremonyTime', '16:00');
  assert.equal(edit(itinerary, 'ceremonyTime', '17:00'), true);
  assert.equal(itinerary.ceremonyTime, '17:00');
  assert.equal(cover.date, '2026-11-14T17:00');
  assert.equal(itinerary.arrivalTime, '16:00');
  const timeFormat = app.slice(app.indexOf('  function timeLabel('), app.indexOf('  const icons ='));
  const render = vm.runInNewContext(timeFormat + extract(app, 'timeRangeLabel', 'hero') + extract(app, 'celebration', 'gallery') + '\ncelebration;', {
    esc: value => String(value ?? ''), icons: {}, img: () => '', uiIcon: () => ''
  });
  assert.match(render(itinerary), /<time class="event-time">5:00 p\. m\.<\/time>/);
  assert.match(render(itinerary), /<time class="event-time">4:00 p\. m\.<\/time>/);
  assert.equal(edit(itinerary, 'ceremonyTime', ''), false, 'Partial native input must not erase the saved time.');
  assert.equal(edit(itinerary, 'ceremonyTime', '25:00'), false);
  assert.equal(itinerary.ceremonyTime, '17:00');
  assert.equal(edit(itinerary, 'dinnerEndTime', ''), true, 'The optional end of dinner can be cleared.');
  edit(cover, 'date', '2026-11-14T18:15');
  assert.equal(itinerary.ceremonyTime, '18:15');
});

test('Clicking a preview time selects its module, opens the group and focuses its input', () => {
  const actions = [];
  const group = { open: false, dataset: { stateKey: 'celebration:Horarios del día' } };
  const input = { dataset: { key: 'ceremonyTime' }, closest: () => group, scrollIntoView: () => actions.push('scroll'), focus: () => actions.push('focus') };
  const state = new Map();
  const edit = vm.runInNewContext(definitions + extract(admin, 'editPreviewField', 'updateCouple') + '\neditPreviewField;', {
    content: original, fieldGroupState: state,
    selectModule: (id, scroll) => actions.push([id, scroll]),
    window: { AdminSections: { workspace: mode => actions.push(mode) } }, $$: () => [input]
  });
  edit('celebration', 'ceremonyTime');
  assert.deepEqual(actions, [['celebration', false], 'edit', 'scroll', 'focus']);
  assert.equal(group.open, true);
  assert.equal(state.get(group.dataset.stateKey), true);
  actions.length = 0;
  edit('celebration', 'unknown');
  assert.deepEqual(actions, []);
});

test('Preview follows the section actually in view and exposes keyboard editing for every time', () => {
  const messages = [];
  const section = (id, top, bottom) => ({ id, dataset: { module: id }, getBoundingClientRect: () => ({ top, bottom }) });
  const sections = [section('welcome', -700, 80), section('celebration', 80, 1600), section('gallery', 1600, 2400)];
  const times = Array.from({ length: 4 }, () => ({ textContent: '5:00 p. m.', attributes: {}, listeners: {}, classList: { add() {} }, setAttribute(name, value) { this.attributes[name] = value; }, addEventListener(name, listener) { this.listeners[name] = listener; } }));
  let callback;
  class Observer { constructor(fn) { callback = fn; } observe() {} }
  const context = vm.createContext({
    preview: true, sectionObserver: null, innerHeight: 600, location: { origin: 'http://test.local' },
    parent: { postMessage: message => messages.push(JSON.parse(JSON.stringify(message))) },
    IntersectionObserver: Observer, $$: selector => selector === '[data-module]' ? sections : times
  });
  vm.runInContext(extract(app, 'observeModules', 'setActiveNavigation') + '\nobserveModules();', context);
  callback([{ target: sections[0], isIntersecting: true, intersectionRatio: .5 }]);
  assert.equal(messages.at(-1).id, 'celebration', 'A stale observer entry must not select the previous module.');
  times[1].listeners.click();
  assert.deepEqual(messages.at(-1), { type: 'boda:edit-field', id: 'celebration', key: 'ceremonyTime' });
  let prevented = false;
  times[0].listeners.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(messages.at(-1).key, 'arrivalTime');
  assert.equal(times[1].tabIndex, 0);
  vm.runInContext('reportPreviewModule(true);', context);
  assert.equal(messages.at(-1).interactive, true);
});
