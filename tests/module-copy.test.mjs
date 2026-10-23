import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const catalogSource = await readFile(new URL('../assets/module-copy.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(catalogSource, context);
const { modules, upgrade } = context.BodaModuleCopy;
const original = JSON.parse(await readFile(new URL('../data/content.json', import.meta.url)));

test('Module copy upgrades old content without losing existing edits or adding unrelated keys', () => {
  const old = structuredClone(original);
  old.modules.find(module => module.id === 'hero').groom = 'Nombre editado';
  const next = upgrade(old);
  assert.equal(next.modules[0].groom, 'Nombre editado');
  assert.equal(next.modules.find(module => module.id === 'rsvp').uiMessageLabel, 'Unas palabras para los novios');
  assert.equal(old.modules.find(module => module.id === 'rsvp').uiMessageLabel, undefined);
  next.modules.find(module => module.id === 'rsvp').uiMessageLabel = '';
  assert.equal(upgrade(next).modules.find(module => module.id === 'rsvp').uiMessageLabel, '', 'Keep intentionally empty labels.');
  assert.equal(JSON.stringify(upgrade(next)), JSON.stringify(next), 'Migration is idempotent.');
  assert.equal(upgrade(null), null);
  for (const fields of Object.values(modules)) assert.equal(new Set(fields.map(field => field.key)).size, fields.length);
});

test('RSVP renders editable copy, only optional words and no dietary field', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const start = source.indexOf('  function rsvp(m) {'), end = source.indexOf('  function initInvitation', start);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const renderer = vm.runInNewContext(source.slice(start, end) + '\nrsvp;', { esc, uiIcon: () => '', dateParts: () => ({ long: 'fecha de prueba' }) });
  const module = upgrade(original).modules.find(module => module.id === 'rsvp');
  module.uiMessageLabel = 'Una bendición para nuestro hogar';
  module.uiMessagePlaceholder = 'Comparte tus palabras';
  module.uiSubmit = 'Enviar mi confirmación';
  const html = renderer(module);
  assert.match(html, /Una bendición para nuestro hogar/);
  assert.match(html, /placeholder="Comparte tus palabras"/);
  assert.match(html, /Enviar mi confirmación/);
  assert.doesNotMatch(html, /diet|alimentari|rsvp-extra/);
  assert.match(html, /<textarea name="message"/);
  assert.doesNotMatch(html, /<textarea name="message"[^>]*required/);
  module.uiMessageLabel = '<img src=x onerror=alert(1)>';
  assert.ok(renderer(module).includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('All invitation modules render upgraded copy without missing labels', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const start = source.indexOf('  function hero(m) {'), end = source.indexOf('  function initInvitation', start);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const content = upgrade(original);
  const renderers = vm.runInNewContext(source.slice(start, end) + '\n({hero,countdown,illustrations,welcome,celebration,gallery,details,rsvp});', {
    content, esc, images: [], dateRevealed: false, surpriseKey: date => 'test:' + date,
    dateParts: () => ({ long: 'fecha de prueba' }), timeLabel: value => value, timeRangeLabel: (start, end) => start + end,
    icons: { arrival: '', rings: '', camera: '', dinner: '' }, uiIcon: () => '', svg: () => '',
    img: src => `<img src="${esc(src)}">`
  });
  for (const module of content.modules) {
    const html = renderers[module.id](module);
    assert.ok(html.includes(`id="${module.id}"`), module.id);
    assert.doesNotMatch(html, /undefined|\$\{/, module.id);
  }
});

test('Public copy initializes all desktop and mobile links without aborting invitation rendering', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const start = source.indexOf('  function syncPublicCopy() {');
  const end = source.indexOf('  function switchTab(', start);
  const content = upgrade(structuredClone(original));
  const cover = content.modules.find(module => module.id === 'hero');
  const rsvp = content.modules.find(module => module.id === 'rsvp');
  cover.uiNav = 'Our invitation';
  rsvp.uiNav = 'Reply to the couple';
  rsvp.uiDock = 'Reply';
  const makeLink = (id, { mobile = false, cta = false } = {}) => {
    const label = { textContent: 'Old label' };
    return {
      dataset: { moduleLink: id }, textContent: 'Old link', label,
      closest: selector => selector === '.mobile-dock' && mobile ? {} : null,
      classList: { contains: name => name === 'nav-rsvp' && cta },
      querySelector: selector => selector === 'span' ? label : null
    };
  };
  const desktop = makeLink('hero');
  const cta = makeLink('rsvp', { cta: true });
  const mobile = makeLink('rsvp', { mobile: true });
  const unknown = makeLink('unknown');
  const links = [desktop, cta, mobile, unknown];
  const selectors = ['footer>p', 'footer>small', '.reopen-invitation', '.envelope-letter>span', '.envelope-letter>p', '.invitation-touch', '.invitation-skip', '#letter-dialog>.eyebrow', '.letter-signature'];
  const elements = new Map(selectors.map(selector => [selector, { textContent: '' }]));
  const sync = vm.runInNewContext(source.slice(start, end) + '\nsyncPublicCopy;', {
    content,
    $: selector => selector === '[data-module-link]' ? links[0] : elements.get(selector),
    $$: selector => selector === '[data-module-link]' ? links : []
  });
  const before = JSON.stringify(content);
  assert.doesNotThrow(sync);
  assert.equal(desktop.textContent, cover.uiNav);
  assert.equal(cta.textContent, rsvp.uiNav);
  assert.equal(mobile.label.textContent, rsvp.uiDock);
  assert.equal(mobile.textContent, 'Old link', 'Keep mobile icon markup intact.');
  assert.equal(unknown.textContent, 'Old link');
  assert.equal(elements.get('footer>p').textContent, cover.uiFooter);
  assert.equal(elements.get('.letter-signature').textContent, content.modules.find(module => module.id === 'welcome').uiLetterSignature);
  assert.equal(JSON.stringify(content), before, 'Rendering must not change persisted content.');
});
