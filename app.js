(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const preview = new URLSearchParams(location.search).has('preview');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let content, countdownTimer, revealObserver, sectionObserver, animationContext, galleryIndex = 0, images = [];
  let toastTimer, rsvpCompanions;
  let sceneTimeline, sceneObserver, storyScroll, openingTimeline, navigationObserver, navigationResizeTimer, currentNavigationId;
  let dateRevealed = false;
  const surpriseKey = date => 'boda-surprise-revealed:' + date;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function imageUrl(value) {
    if (/^\/assets\/[\w.-]+$/.test(value)) return value;
    try { const url = new URL(value); if (url.protocol === 'https:') return url.href; } catch { /* invalid image */ }
    return '/assets/garden.webp';
  }
  const img = (src, alt, attrs = '') => `<img src="${esc(imageUrl(src))}" alt="${esc(alt)}" ${attrs}>`;
  const svg = (body, cls = 'event-icon') => `<svg class="${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const uiIcon = name => `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({ check: '<path d="m5 12 4 4L19 6"/>', heart: '<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 4 11 8 14 4-3 13-9 8-14Z"/>', pin: '<path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-12 4 3 3 5-5"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>' })[name] || ''}</svg>`;
  function timeLabel(value) { if (!/^\d{2}:\d{2}$/.test(value)) return value; const [hours, minutes] = value.split(':'); return `${Number(hours) % 12 || 12}:${minutes} ${Number(hours) >= 12 ? 'p. m.' : 'a. m.'}`; }
  const icons = {
    arrival: svg('<path d="M6 42h36M11 42V8h26v34M18 42V14l13-3v31M25 27v3M6 15h5m26 0h5"/>'),
    camera: svg('<rect x="5" y="13" width="38" height="29" rx="5"/><path d="m14 13 4-7h12l4 7"/><circle cx="24" cy="27" r="9"/><path d="M36 20h1"/>'),
    rings: svg('<circle cx="18" cy="28" r="11"/><circle cx="31" cy="28" r="11"/><path d="m15 14 3-5 3 5-3 4-3-4Zm13 0 3-5 3 5-3 4-3-4Z"/>'),
    blessing: svg('<path d="M20 6h8v11h11v8H28v17h-8V25H9v-8h11V6Z"/><path d="M8 6 5 3m35 3 3-3M4 32l-3 2m43-2 3 2"/>'),
    dinner: svg('<circle cx="24" cy="25" r="13"/><circle cx="24" cy="25" r="9"/><path d="M4 6v12m5-12v12M4 13h5M6.5 18v24M43 6v36M43 6c-7 7-7 17 0 17"/>'),
    joy: svg('<path d="M24 40S4 28 4 15c0-10 15-13 20-2 5-11 20-8 20 2 0 13-20 25-20 25Z"/><path d="m18 23 4 4 8-9"/>')
  };
  function dateParts(date) {
    const d = new Date(`${date}:00-05:00`);
    return { long: new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' }).format(d), short: new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Bogota' }).format(d).replaceAll('/', ' · ') };
  }
  function timeRangeLabel(start, end) {
    if (!/^\d{2}:\d{2}$/.test(end || '')) return timeLabel(start);
    const first = timeLabel(start), last = timeLabel(end);
    const samePeriod = (Number(start.slice(0, 2)) >= 12) === (Number(end.slice(0, 2)) >= 12);
    return `${samePeriod ? first.replace(/ [ap]\. m\.$/, '') : first} a ${last}`;
  }
  function hero(m) {
    const d = dateParts(m.date);
    const date = new Date(m.date + ':00-05:00');
    const part = options => new Intl.DateTimeFormat('es-CO', { ...options, timeZone: 'America/Bogota' }).format(date);
    const lattice = '<path d="M4 3C164 62 164 298 4 357M4 3v354M4 3l92 91-92 83 128 1L4 270l92 0L4 357M4 55l92 39 36 84-36 92L4 305M4 119l128 59L4 237"/>';
    return `<section class="hero botanical-hero" id="hero" data-module="hero">
      <div class="welcome-frame" aria-hidden="true"></div>
      <svg class="welcome-lattice lattice-left" viewBox="0 0 150 360" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${lattice}</svg>
      <svg class="welcome-lattice lattice-right" viewBox="0 0 150 360" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${lattice}</svg>
      <div class="welcome-sheet">
        ${img(m.welcomeCrestImage, '', 'class="welcome-crest hero-animate" width="320" height="200" fetchpriority="high" aria-hidden="true"')}
        <span class="eyebrow welcome-eyebrow hero-animate">${esc(m.eyebrow)}</span>
        <p class="welcome-introduction hero-animate">${esc(m.subtitle)}</p>
        <span class="welcome-heart-rule hero-animate" aria-hidden="true"><i></i>♥<i></i></span>
        <h1 class="hero-animate"><span class="welcome-title">${esc(m.welcomeTitle)}</span><span class="welcome-names"><b>${esc(m.groom)}</b><em>&</em><b>${esc(m.bride)}</b></span></h1>
        <figure class="welcome-couple hero-animate">${img(m.image, 'Ilustración de Miller y Daniela: él con traje gris claro y corbata verde salvia, ella con vestido de novia marfil', 'class="welcome-couple-image" width="1024" height="1536" fetchpriority="high"')}</figure>
        <p class="welcome-blessing hero-animate">${esc(m.welcomeMessage)}</p>
        <span class="welcome-heart-rule hero-animate" aria-hidden="true"><i></i>♥<i></i></span>
        <p class="welcome-closing hero-animate">${esc(m.welcomeClosing)}</p>
        <p class="hero-full-names hero-animate"><span>${esc(m.groomFull)}</span><i>&</i><span>${esc(m.brideFull)}</span></p>
        <div class="hero-event-ticket hero-animate">
          <a class="hero-date-teaser" href="#countdown" ${dateRevealed ? 'hidden' : ''}>${uiIcon('calendar')}<span><small>${esc(m.uiSurpriseEyebrow)}</small><strong>${esc(m.uiSurpriseTitle)}</strong></span><i aria-hidden="true">↓</i></a>
          <div class="hero-date" ${dateRevealed ? '' : 'hidden'} aria-label="${esc(d.long)}"><strong class="date-day">${part({day:'2-digit'})}</strong><div class="date-month"><b>${part({month:'long'})}</b><span>${part({year:'numeric'})} · ${part({weekday:'long'})}</span></div></div>
          <p class="hero-location">${uiIcon('pin')}${esc(m.location)}</p>
        </div>
        <div class="hero-actions hero-animate"><a class="button button-gold" href="#rsvp"><span class="button-emblem" aria-hidden="true">♡</span><span class="button-label">${esc(m.button)}</span></a><button type="button" class="button button-secondary hero-calendar" id="hero-save-date">${uiIcon('calendar')}<span class="button-label">${esc(m.uiDiscoverDate)}</span></button></div>
        <button type="button" class="welcome-photo-link hero-animate" data-gallery-source="${esc(m.accentImage)}">${img(m.accentImage, 'Fotografía real de nuestro compromiso', 'width="48" height="48"')}<span>${esc(m.photoCaption)}<b>${esc(m.uiAlbumLink)}</b></span></button>
        <a class="hero-discover" href="#${content.modules.find(m => m.id !== 'hero' && m.enabled)?.id || 'rsvp'}"><span>${esc(m.uiContinue)}</span><i aria-hidden="true">↓</i></a>
      </div>
    </section>`;
  }
  function countdownClock(covered = false) {
    const m = content.modules.find(module => module.id === 'countdown');
    return `<div class="countdown-clock" role="timer" aria-label="Tiempo que falta para nuestra boda" ${covered ? 'aria-hidden="true"' : ''}>${[m.uiDays, m.uiHours, m.uiMinutes, m.uiSeconds].map((label, i) => `<div class="time-unit"><strong data-time="${i}"><span class="digit-value">00</span></strong><span>${esc(label)}</span></div>`).join('')}</div>`;
  }
  function scratchCountdown(m) {
    if (!m.scratchTitle?.trim()) return countdownClock();
    const hero = content.modules.find(module => module.id === 'hero');
    return `<div class="scratch-experience reveal"><h3>${esc(m.scratchTitle)}</h3><p class="scratch-instruction">${esc(m.scratchHint)}</p><div class="scratch-card" data-date="${esc(hero.date)}" data-storage-key="${esc(surpriseKey(hero.date))}" data-message="${esc(m.scratchReveal)}" data-instruction="${esc(m.uiInstruction)}" data-progress="${esc(m.uiProgress)}"><div class="scratch-surface"><div class="scratch-time"><span class="scratch-kicker">${esc(m.uiKicker)}</span>${countdownClock(true)}<p class="scratch-wedding-date" hidden><strong>${esc(dateParts(hero.date).long)}</strong><span>${esc(timeLabel(hero.date.slice(11)))}</span></p><span class="scratch-signature">${esc(hero.groom)} & ${esc(hero.bride)}</span></div><canvas aria-hidden="true"></canvas><div class="scratch-cover-label" aria-hidden="true"><i>✧</i><strong>${esc(m.uiCoverTitle)}</strong><span>${esc(m.uiCoverHint)}</span></div></div><p class="scratch-status" role="status">${esc(m.uiInstruction)}</p><div class="scratch-actions"><button type="button" class="scratch-reveal">${esc(m.uiReveal)}</button><button type="button" class="scratch-save" hidden>${esc(m.uiSave)} <span aria-hidden="true">↓</span></button><button type="button" class="scratch-reset" hidden>${esc(m.uiReset)} <span aria-hidden="true">↻</span></button></div></div></div>`;
  }
  function countdown(m) { return `<section class="countdown" id="countdown" data-module="countdown"><div class="countdown-heading"><span class="eyebrow">${esc(m.eyebrow)}</span><h2>${esc(m.title)}</h2></div>${scratchCountdown(m)}</section>`; }
  function welcome(m) {
    return `<section class="section-wrap welcome" id="welcome" data-module="welcome"><div class="welcome-image-wrap reveal">${img(m.image, 'Miller y Daniela compartiendo un atardecer', 'class="welcome-image" loading="lazy"')}<div class="rotating-seal" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><path id="seal-circle" d="M60,60m-47,0a47,47 0 1,1 94,0a47,47 0 1,1-94,0"/></defs><text><textPath href="#seal-circle">${esc(m.uiSeal)}</textPath></text></svg><span>${esc(m.uiSealCenter)}</span></div></div><div class="welcome-copy reveal"><span class="eyebrow">${esc(m.eyebrow)}</span><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p><blockquote>“${esc(m.quote)}”</blockquote><button class="text-link" id="open-letter">${esc(m.uiLetterButton)}</button></div>${svg('<path d="M26 47C19 27 28 12 18 1M23 39C4 37 6 25 17 29m5-2C43 24 39 13 29 17M22 19C7 20 6 10 15 12M22 10C36 12 34 1 26 4"/>', 'flower-line')}</section>`;
  }
  function illustrations(m) {
    const scenes = ['car', 'rings', 'dance'];
    return `<section class="couple-story" id="illustrations" data-module="illustrations"><div class="section-wrap"><div class="section-intro reveal"><span class="eyebrow">${esc(m.eyebrow)}</span><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p></div><div class="story-scene-shell"><div class="story-scene-meta"><span><b data-story-current>01</b><i> / </i>03</span><span class="story-mode-desktop">${esc(m.uiScroll)} <i aria-hidden="true">↓</i></span><span class="story-mode-mobile">${esc(m.uiSwipe)} <i aria-hidden="true">↔</i></span></div><div class="story-tabs" role="tablist" aria-label="Escenas de nuestra historia">${scenes.map((scene, i) => `<button id="story-tab-${i}" role="tab" aria-selected="${i === 0}" aria-controls="story-panel-${i}" tabindex="${i === 0 ? 0 : -1}" data-scene="${i}"><span>0${i + 1}</span>${esc(m[scene + 'Label'])}</button>`).join('')}</div><div class="story-book">${scenes.map((scene, i) => `<div class="story-panel scene-${scene}" id="story-panel-${i}" role="tabpanel" aria-labelledby="story-tab-${i}" tabindex="0" ${i ? 'hidden' : ''}><div class="story-stage"><div class="story-arch" aria-hidden="true"></div><div class="story-ground" aria-hidden="true"></div><div class="story-sparkles" aria-hidden="true">${['✧', '♡', '✦', '✧', '♡'].map((symbol, j) => `<span class="story-sparkle sparkle-${j}">${symbol}</span>`).join('')}</div>${img(m[scene + 'Image'], ['Miller y Daniela ilustrados en un auto de boda color marfil', 'Miller y Daniela ilustrados celebrando su promesa de amor', 'Miller y Daniela ilustrados celebrando su unión'][i], 'class="story-couple" loading="lazy" width="1024" height="1024"')}</div><div class="story-caption"><span class="story-chapter">${esc(m.uiChapter)} 0${i + 1}</span><h3>${esc(m[scene + 'Title'])}</h3><p>${esc(m[scene + 'Text'])}</p></div></div>`).join('')}<div class="story-controls"><button class="story-replay" type="button"><span aria-hidden="true">↻</span> ${esc(m.uiReplay)}</button><button class="story-next" type="button">${esc(m.uiNext)} <span aria-hidden="true">→</span></button></div></div><div class="story-scroll-meter" aria-hidden="true"><span></span></div><p class="story-footnote">${esc(content.modules.find(m => m.id === 'hero').groom)} & ${esc(content.modules.find(m => m.id === 'hero').bride)} <span>·</span> ${esc(m.uiFootnote)}</p></div></div></section>`;
  }
  function playScene() {
    sceneTimeline?.revert(); sceneTimeline = null;
    const panel = $('.story-panel:not([hidden])');
    if (!panel || reduced.matches || preview || !window.gsap) return;
    const couple = $('.story-couple', panel), sparkles = $$('.story-sparkle', panel);
    sceneTimeline = gsap.timeline();
    sceneTimeline.fromTo($('.story-caption', panel), { y: 12, autoAlpha: .3 }, { y: 0, autoAlpha: 1, duration: .7, ease: 'power2.out' }, 0);
    if (panel.classList.contains('scene-car')) {
      sceneTimeline.fromTo(couple, { x: -90, scale: .9, autoAlpha: 0 }, { x: 0, scale: 1, autoAlpha: 1, duration: 1.6, ease: 'power2.out' });
      sceneTimeline.to(couple, { y: -3, duration: .24, repeat: 3, yoyo: true, ease: 'sine.inOut' }, .9);
    } else if (panel.classList.contains('scene-rings')) {
      sceneTimeline.fromTo(couple, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.3, ease: 'power2.out' });
    } else {
      sceneTimeline.fromTo(couple, { autoAlpha: 0 }, { autoAlpha: 1, duration: .7 });
      sceneTimeline.fromTo(couple, { rotation: -2, x: -5 }, { rotation: 2, x: 5, duration: 1.1, repeat: 3, yoyo: true, ease: 'sine.inOut', transformOrigin: '50% 90%' }, 0);
      sceneTimeline.to(couple, { rotation: 0, x: 0, duration: .6, ease: 'sine.inOut' });
    }
    sceneTimeline.fromTo(sparkles, { y: 12, scale: .65, autoAlpha: 0 }, { y: -6, scale: 1, autoAlpha: 1, stagger: .12, duration: 1.1, ease: 'sine.out' }, .5);
    sceneTimeline.to(sparkles, { autoAlpha: .35, duration: 1.2, stagger: .06 });
  }
  function selectScene(index, focus = false, fromScroll = false) {
    const tabs = $$('[data-scene]');
    if (!tabs.length) return;
    index = (index + tabs.length) % tabs.length;
    if (storyScroll && !fromScroll) window.scrollTo({ top: storyScroll.start + (index + .3) / 3 * (storyScroll.end - storyScroll.start), behavior: 'instant' });
    $$('[data-scene]').forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    $$('.story-panel').forEach((panel, i) => panel.hidden = i !== index);
    if (focus) tabs[index].focus();
    if ($('[data-story-current]')) $('[data-story-current]').textContent = '0' + (index + 1);
    if (!storyScroll && $('.story-scroll-meter span')) $('.story-scroll-meter span').style.transform = `scaleX(${(index + 1) / 3})`;
    playScene();
    if (!storyScroll && !fromScroll) window.ScrollTrigger?.refresh();
  }
  function setupStoryScroll() {
    const shell = $('.story-scene-shell'), section = $('#illustrations');
    if (!shell) return () => {};
    section.classList.add('is-scroll-story');
    const trigger = ScrollTrigger.create({
      id: 'couple-chapters', trigger: shell,
      start: () => { const flow = shell.parentElement.classList.contains('pin-spacer') ? shell.parentElement : shell; return flow.getBoundingClientRect().top + window.scrollY - 94; },
      end: () => '+=' + Math.round(innerHeight * 2.2), pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      onToggle(self) { section.classList.toggle('story-pinned', self.isActive); },
      onUpdate(self) {
        if (self.isActive) setActiveNavigation('illustrations');
        const index = Math.min(2, Math.floor(self.progress * 3));
        if (Number($('[data-scene][aria-selected="true"]')?.dataset.scene) !== index) selectScene(index, false, true);
        gsap.set($('.story-scroll-meter span'), { scaleX: self.progress });
      }
    });
    storyScroll = trigger;
    return () => { if (storyScroll === trigger) storyScroll = null; section.classList.remove('is-scroll-story', 'story-pinned'); };
  }
  function celebration(m) {
    const event = (prefix, icon) => `<div class="timeline-item reveal"><span class="timeline-index" aria-hidden="true">0${["arrival", "ceremony", "memories", "dinner"].indexOf(prefix) + 1}</span><div class="timeline-icon">${icons[icon]}</div><time class="event-time">${esc(prefix === "dinner" ? timeRangeLabel(m.dinnerTime, m.dinnerEndTime) : timeLabel(m[prefix + "Time"]))}</time><h3>${esc(m[prefix + "Title"])}</h3><p>${esc(m[prefix + "Text"])}</p></div>`;
    return `<section class="celebration" id="celebration" data-module="celebration"><div class="section-wrap"><div class="section-intro reveal"><span class="eyebrow">${esc(m.eyebrow)}</span><h2>${esc(m.title)}</h2></div><div class="timeline">${event('arrival', 'arrival')}${event('ceremony', 'rings')}${event('memories', 'camera')}${event('dinner', 'dinner')}</div></div><div class="venue">${img(m.image, 'Mesa de celebración con flores, velas y detalles dorados', 'class="venue-image" loading="lazy"')}<div class="venue-copy reveal"><span class="eyebrow">${esc(m.uiVenueHeading)}</span><h3>${esc(m.venue)}</h3><p>${esc(m.address)}</p><p class="venue-note">${esc(m.note)}</p>${/^https:\/\//.test(m.mapUrl) ? `<a class="button button-outline" href="${esc(m.mapUrl)}" target="_blank" rel="noopener noreferrer">${esc(m.uiDirections)}</a>` : `<span class="button button-outline">${esc(m.uiPendingMap)}</span>`}<button class="text-link" id="save-date">Guardar la fecha <span>↓</span></button></div></div></section>`;
  }
  function gallery(m) {
    images = Array.from({ length: 14 }, (_, i) => m['image' + (i + 1)]).filter(Boolean);
    return `<section class="section-wrap gallery" id="gallery" data-module="gallery"><div class="section-intro reveal"><span class="eyebrow">${esc(m.eyebrow)}</span><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p></div><div class="gallery-grid">${images.slice(0, 3).map((image, i) => `<button class="gallery-item reveal" data-gallery="${i}" aria-label="Ampliar fotografía ${i + 1}">${img(image, ['Miller y Daniela, el día de su compromiso', 'Miller y Daniela abrazados al atardecer', 'La pedida de mano de Miller y Daniela'][i], 'loading="lazy"')}<span class="gallery-index" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span><span class="gallery-photo-label">${esc([m.uiPhoto1, m.uiPhoto2, m.uiPhoto3][i])}</span></button>`).join('')}</div><div class="album-footer"><p class="gallery-caption">${esc(m.caption)}</p><button class="button button-outline" data-gallery="0">${esc(m.uiAlbum)} <span>${images.length} ${esc(m.uiMemories)}</span></button></div></section>`;
  }
  function details(m) {
    return `<section class="details" id="details" data-module="details"><div class="section-wrap"><div class="section-intro reveal"><span class="eyebrow">${esc(m.eyebrow)}</span><h2>${esc(m.title)}</h2></div><div class="detail-tabs" role="tablist" aria-label="Detalles de la boda">${[m.uiDressTab, m.uiGiftTab].map((name, i) => `<button id="tab-${i}" class="detail-tab" role="tab" aria-selected="${i === 0}" aria-controls="panel-${i}" tabindex="${i === 0 ? 0 : -1}" data-tab="${i}">${esc(name)}</button>`).join('')}</div><div id="panel-0" class="detail-panel" role="tabpanel" aria-labelledby="tab-0"><h3>${esc(m.dressTitle)}</h3><p>${esc(m.dressText)}</p><div class="dress-swatches" aria-label="Paleta de inspiración: champaña, dorado, amarillo suave, verde oliva"><i style="background:#e4d4b7"></i><i style="background:#bb9e63"></i><i style="background:#e9cc77"></i><i style="background:#83866b"></i></div><p class="swatch-caption">${esc(m.uiPaletteCaption)}</p></div><div id="panel-1" class="detail-panel" role="tabpanel" aria-labelledby="tab-1" hidden><h3>${esc(m.giftTitle)}</h3><p>${esc(m.giftText)}</p><div class="rsvp-heart" aria-hidden="true">♡</div></div></div></section>`;
  }
  function rsvp(m) {
    return `<section class="rsvp" id="rsvp" data-module="rsvp"><div class="section-wrap"><div class="rsvp-copy reveal"><span class="eyebrow">${esc(m.eyebrow)}</span><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p><p class="rsvp-deadline">${uiIcon("calendar")}<span>${esc(m.uiDeadline)} ${esc(dateParts(m.deadline + "T12:00").long.toUpperCase())}</span></p><div class="rsvp-heart" aria-hidden="true">♡</div></div><form class="rsvp-form reveal"><div class="form-heading"><span class="form-heading-icon">${uiIcon("mail")}</span><div><p class="form-intro">${esc(m.uiFormTitle)}</p><p class="form-subtitle">${esc(m.uiFormSubtitle)}</p></div></div><label class="field">${esc(m.uiNameLabel)}<input name="name" placeholder="${esc(m.uiNamePlaceholder)}" autocomplete="name" maxlength="100" required></label><fieldset class="attendance-options"><legend>${esc(m.uiAttendance)}</legend><div class="attendance-grid"><label class="attendance-choice"><input type="radio" name="attendance" value="yes" checked><span class="attendance-card"><i>${uiIcon("check")}</i><b>${esc(m.uiYes)}</b><small>${esc(m.uiYesHint)}</small></span></label><label class="attendance-choice"><input type="radio" name="attendance" value="no"><span class="attendance-card"><i>${uiIcon("heart")}</i><b>${esc(m.uiNo)}</b><small>${esc(m.uiNoHint)}</small></span></label></div></fieldset><div class="guest-field"><div><label for="guest-count">${esc(m.uiGuests)}</label><p>${esc(m.uiGuestsHint)}</p></div><div class="guest-stepper"><button type="button" data-guest-step="-1" aria-label="Quitar una persona" disabled>−</button><input id="guest-count" name="guests" type="number" min="1" max="8" value="1" required inputmode="numeric" aria-label="Cantidad de personas"><button type="button" data-guest-step="1" aria-label="Añadir una persona">+</button></div></div><fieldset class="companion-fields" hidden><legend>${esc(m.uiCompanionTitle)} <span class="companion-count"></span></legend><p>${esc(m.uiCompanionHint)}</p><div class="companion-names"></div></fieldset><div class="rsvp-message"><label class="field"><span class="message-label">${esc(m.uiMessageLabel)}<small>${esc(m.uiOptional)}</small></span><textarea name="message" placeholder="${esc(m.uiMessagePlaceholder)}" maxlength="2000" rows="3"></textarea></label></div><p class="form-error" role="alert" hidden></p><button type="submit" class="button button-gold">${esc(m.uiSubmit)}</button><p class="form-note">${uiIcon("heart")} ${esc(m.uiNote)}</p></form></div></section>`;
  }
  function initInvitation(cover) {
    $('#invitation-names').innerHTML = `<span>${esc(cover.groom)}</span><em>&</em><span>${esc(cover.bride)}</span>`;
    $('.invitation-eyebrow').textContent = cover.openingEyebrow || 'UNA INVITACIÓN MUY ESPECIAL';
    $('.invitation-message').textContent = cover.openingMessage || cover.subtitle;
    $('.letter-couple').textContent = cover.groom + ' & ' + cover.bride;
    $('.letter-date').textContent = dateRevealed ? dateParts(cover.date).long : cover.uiHiddenDate;
    $('.seal-initials').textContent = cover.groom.charAt(0) + ' · ' + cover.bride.charAt(0);
    $('.reopen-invitation').hidden = preview;
    if (preview || location.hash || $('#invitation-dialog').open) return;
    let visited = false;
    try { visited = sessionStorage.getItem('boda-invitation-open:' + cover.date) === 'yes'; } catch {}
    if (!visited || new URLSearchParams(location.search).get('invitacion') === '1') showInvitation();
  }
  function showInvitation() {
    openingTimeline?.revert(); openingTimeline = null;
    const dialog = $('#invitation-dialog');
    $('.envelope-seal').disabled = false; dialog.classList.remove('is-opening');
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('invitation-active');
  }
  function finishInvitation() {
    $('#invitation-dialog').close();
    window.scrollTo({ top: 0, behavior: 'instant' });
    const heading = $('.hero h1'); heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
    if (!preview && !reduced.matches && window.gsap) gsap.fromTo('.hero-animate', { y: 18, opacity: .15 }, { y: 0, opacity: 1, duration: .9, stagger: .08, ease: 'power2.out', clearProps: 'all' });
  }
  function openEnvelope() {
    if ($('.envelope-seal').disabled) return;
    $('.envelope-seal').disabled = true;
    if (preview || reduced.matches || !window.gsap) return finishInvitation();
    $('#invitation-dialog').classList.add('is-opening');
    openingTimeline = gsap.timeline({ onComplete: finishInvitation });
    openingTimeline.to('.envelope-seal', { scale: .8, autoAlpha: 0, duration: .3 });
    openingTimeline.to('.envelope-flap', { rotationX: -170, duration: .65, ease: 'power2.inOut' }, .15);
    openingTimeline.to('.envelope-letter', { yPercent: -38, duration: .7, ease: 'power2.out' }, .45);
    openingTimeline.to('.invitation-touch, .invitation-skip', { opacity: 0, duration: .2 }, 0);
    openingTimeline.to('.invitation-opening', { y: -16, opacity: 0, duration: .45, ease: 'power2.in' }, 1.3);
  }
  function toast(message) { clearTimeout(toastTimer); $('.toast').textContent = message; $('.toast').classList.add('visible'); toastTimer = setTimeout(() => $('.toast').classList.remove('visible'), 4200); }
  function updateCountdown() {
    if (!content) return;
    const left = Math.max(0, new Date(content.modules.find(m => m.id === 'hero').date + ':00-05:00') - Date.now());
    const values = [Math.floor(left / 86400000), Math.floor(left / 3600000) % 24, Math.floor(left / 60000) % 60, Math.floor(left / 1000) % 60];
    const clock = $('.countdown-clock'), card = $('.scratch-card'), rect = clock?.getBoundingClientRect();
    const tick = !preview && !reduced.matches && !document.hidden && (!card || card.classList.contains('is-revealed')) && rect?.bottom > 0 && rect.top < innerHeight;
    $$('[data-time]').forEach(el => {
      const number = $('.digit-value', el), next = String(values[Number(el.dataset.time)]).padStart(2, '0');
      if (!number || number.textContent === next) return;
      const initialized = el.dataset.initialized;
      number.textContent = next; el.dataset.initialized = 'true';
      if (tick && initialized) number.animate([{ transform: 'translateY(7px)', opacity: .4 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 280, easing: 'ease-out' });
    });
    if (!left && $('.countdown-clock')) { $('.countdown-clock').innerHTML = `<div class="countdown-message">${esc(content.modules.find(m => m.id === 'countdown').message)}</div>`; clearInterval(countdownTimer); }
  }
  function animate() {
    revealObserver?.disconnect();
    animationContext?.revert();
    if (window.gsap && !preview) {
      animationContext = gsap.matchMedia();
      animationContext.add({ motion: '(prefers-reduced-motion: no-preference)', large: '(min-width: 1000px) and (min-height: 780px)' }, context => {
        if (!context.conditions.motion) return;
        let cleanupStory = () => {};
        gsap.from('.hero-animate', { y: 23, autoAlpha: 0, duration: 1.3, stagger: .13, ease: 'power2.out', clearProps: 'all' });
        gsap.from('.welcome-couple-image', { scale: .975, duration: 2, ease: 'power1.out', clearProps: 'transform' });
        if (window.ScrollTrigger) {
          gsap.registerPlugin(ScrollTrigger);
          if (context.conditions.large) cleanupStory = setupStoryScroll();
          $$('.reveal, .countdown-heading, .countdown > .countdown-clock, .story-tabs, .story-book, .album-footer').forEach(element => {
            gsap.from(element, { y: 28, autoAlpha: .12, duration: .9, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 91%', toggleActions: 'play none none reverse' } });
          });
          $$('.scroll-flourish').forEach(element => gsap.from(element, { scaleX: .1, autoAlpha: .2, scrollTrigger: { trigger: element.closest('.section-intro'), start: 'top 92%', end: 'top 45%', scrub: .8 } }));
          $$('.welcome-image, .venue-image').forEach(element => gsap.fromTo(element, { yPercent: -2, scale: 1.06 }, { yPercent: 2, scale: 1.06, ease: 'none', scrollTrigger: { trigger: element.parentElement, start: 'top bottom', end: 'bottom top', scrub: .8 } }));
          const book = $('.story-book');
          if (book) gsap.fromTo(book, { scale: .98 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: book, start: 'top bottom', end: 'top 25%', scrub: 1 } });
          document.fonts.ready.then(() => { if (animationContext && !reduced.matches) ScrollTrigger.refresh(); });
        }
        return cleanupStory;
      });
    }
    if (!reduced.matches && !preview && !window.ScrollTrigger) {
      $$('.reveal').forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(25px)'; });
      revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (window.gsap) gsap.to(entry.target, { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out', clearProps: 'all' });
        else entry.target.animate([{ opacity: 0, transform: 'translateY(25px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, easing: 'ease-out', fill: 'forwards' }).finished.then(() => { entry.target.style.opacity = ''; entry.target.style.transform = ''; });
        revealObserver.unobserve(entry.target);
      }), { threshold: .09 });
      $$('.reveal').forEach(el => revealObserver.observe(el));
    }
  }
  function render(next) {
    currentNavigationId = null;
    window.BodaInteractions?.destroy();
    sceneObserver?.disconnect(); sceneTimeline?.revert(); sceneTimeline = null;
    content = window.BodaModuleCopy.upgrade(next);
    const scratchModule = content.modules.find(m => m.id === 'countdown');
    dateRevealed = !scratchModule?.enabled || !scratchModule.scratchTitle?.trim();
    if (!preview) { try { dateRevealed ||= sessionStorage.getItem(surpriseKey(content.modules.find(m => m.id === 'hero').date)) === 'yes'; } catch {} }
    animationContext?.revert();
    const album = content.modules.find(m => m.id === 'gallery');
    images = Array.from({ length: 14 }, (_, i) => album['image' + (i + 1)]).filter(Boolean);
    const renderers = { hero, countdown, illustrations, welcome, celebration, gallery, details, rsvp };
    $('#main').innerHTML = content.modules.filter(m => m.enabled).map(m => renderers[m.id]?.(m) || '').join('');
    $$('[data-module]').forEach((section, index) => {
      const m = content.modules.find(m => m.id === section.dataset.module);
      if (m.decorationImage === '') return;
      const decorationUrl = m.decorationImage || '/assets/gold-floral-corner.png';
      const divider = /divider|garland/.test(decorationUrl);
      for (const side of divider ? ['center'] : ['left', 'right']) {
        const decoration = document.createElement('img');
        decoration.src = imageUrl(decorationUrl);
        decoration.alt = ''; decoration.setAttribute('aria-hidden', 'true'); decoration.loading = index === 0 ? 'eager' : 'lazy';
        decoration.className = `section-decor decor-${side}${divider ? ' floral-divider' : ''}`; section.prepend(decoration);
      }
    });
    const cover = content.modules.find(m => m.id === 'hero');
    window.BodaMusic?.configure(cover, { preview });
    document.title = `${cover.groom} & ${cover.bride} · Nuestra boda`;
    const ceremonyTime = document.createElement('span'); ceremonyTime.className = 'hero-ceremony-time'; ceremonyTime.textContent = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' }).format(new Date(cover.date + ':00-05:00'));
    $('.hero-date').append(ceremonyTime);
    const celebrationModule = content.modules.find(m => m.id === 'celebration');
    if ($('.timeline') && celebrationModule.timelineNote) { const note = document.createElement('p'); note.className = 'timeline-note'; note.textContent = celebrationModule.timelineNote; $('.timeline').after(note); }
    if ($('.venue-image')) { const photo = $('.venue-image'), figure = document.createElement('figure'), caption = document.createElement('figcaption'); figure.className = 'venue-photo'; photo.before(figure); figure.append(photo); caption.textContent = content.demo || celebrationModule.image === '/assets/reception.webp' ? celebrationModule.uiPhotoCaption : ''; figure.append(caption); }
    $('.monogram').innerHTML = `${esc(cover.groom.charAt(0))}<span>&</span>${esc(cover.bride.charAt(0))}<i>${dateRevealed ? esc(dateParts(cover.date).short) : esc(cover.uiMonogram)}</i>`;
    $('.footer-monogram').innerHTML = `${esc(cover.groom.charAt(0))} <i>&</i> ${esc(cover.bride.charAt(0))}`;
    $('#demo-note').textContent = content.demo ? 'Invitación de muestra · fecha y lugar ficticios' : '';
    $$('[data-module-link]').forEach(a => { a.hidden = !content.modules.find(m => m.id === a.dataset.moduleLink)?.enabled; });
    clearInterval(countdownTimer); updateCountdown(); countdownTimer = setInterval(updateCountdown, 1000);
    const palette = $('.dress-swatches');
    if (palette) palette.setAttribute('aria-label', 'Paleta de inspiración: marfil, verde salvia, verde bosque y dorado');
    $$('.section-intro').forEach(intro => { const flourish = document.createElement('span'); flourish.className = 'scroll-flourish'; flourish.setAttribute('aria-hidden', 'true'); intro.append(flourish); });
    syncPublicCopy();
    initInvitation(cover);
    bindSectionActions(); animate(); observeModules(); observeNavigation();
  }
  function syncPublicCopy() {
    const cover = content.modules.find(m => m.id === 'hero'), letter = content.modules.find(m => m.id === 'welcome');
    $('[data-module-link]').forEach(link => {
      const m = content.modules.find(m => m.id === link.dataset.moduleLink);
      if (!m) return;
      if (link.closest('.mobile-dock')) link.querySelector('span').textContent = m.uiDock ?? m.uiNav;
      else if (link.classList.contains('nav-rsvp')) link.textContent = m.uiNav;
      else link.textContent = m.uiNav;
    });
    $('footer>p').textContent = cover.uiFooter;
    $('footer>small').textContent = cover.uiFooterCredit;
    $('.reopen-invitation').textContent = cover.uiReopen;
    $('.envelope-letter>span').textContent = cover.uiEnvelopeTop;
    $('.envelope-letter>p').textContent = cover.uiFooter;
    $('.invitation-touch').textContent = cover.uiEnvelopeHint;
    $('.invitation-skip').textContent = cover.uiEnvelopeSkip;
    $('#letter-dialog>.eyebrow').textContent = letter.uiLetterHeading;
    $('.letter-signature').textContent = letter.uiLetterSignature;
  }
  function switchTab(index) {
    $$('[data-tab]').forEach((tab, i) => { tab.setAttribute('aria-selected', i === index); tab.tabIndex = i === index ? 0 : -1; });
    $$('.detail-panel').forEach((panel, i) => panel.hidden = i !== index);
  }
  function showGallery(index) { if (!images.length) return toast('Pronto compartiremos nuestros recuerdos aquí.'); galleryIndex = (index + images.length) % images.length; $('#gallery-dialog img').src = imageUrl(images[galleryIndex]); $('#gallery-dialog img').alt = `Recuerdo ${galleryIndex + 1} de Miller y Daniela`; $('.gallery-counter').textContent = `${galleryIndex + 1} / ${images.length}`; if (!$('#gallery-dialog').open) $('#gallery-dialog').showModal(); }
  function download(text, type, name) { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function setDateRevealed(revealed) {
    dateRevealed = revealed;
    const cover = content.modules.find(m => m.id === 'hero');
    $('.hero-date').hidden = !revealed;
    $('.hero-date-teaser').hidden = revealed;
    $('.monogram i').textContent = revealed ? dateParts(cover.date).short : cover.uiMonogram;
    $('.letter-date').textContent = revealed ? dateParts(cover.date).long : cover.uiHiddenDate;
    const weddingDate = $('.scratch-wedding-date');
    if (weddingDate) weddingDate.hidden = !revealed;
    const deadline = $('.rsvp-deadline');
    if (deadline) deadline.hidden = !revealed;
    $('#hero-save-date .button-label').textContent = revealed ? cover.uiSaveDate : cover.uiDiscoverDate;
    const venueSave = $('#save-date');
    if (venueSave) venueSave.innerHTML = `${esc(revealed ? cover.uiSaveDate : cover.uiDiscoverDate)} <span>${revealed ? '↓' : '↑'}</span>`;
    requestAnimationFrame(() => window.ScrollTrigger?.refresh());
  }
  function saveDate() {
    if (!dateRevealed) {
      const card = $('.scratch-card');
      card?.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'center' });
      $('.scratch-reveal')?.focus({ preventScroll: true });
      return;
    }
    const m = content.modules.find(m => m.id === 'hero'), v = content.modules.find(m => m.id === 'celebration');
    const start = new Date(m.date + ':00-05:00');
    const utc = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const clean = value => String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    download(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Miller y Daniela//Boda//ES', 'BEGIN:VEVENT', `UID:${m.date.replace(/\D/g, '')}@miller-daniela.local`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(start)}`, `DTEND:${utc(new Date(start.getTime() + 6 * 3600000))}`, `SUMMARY:${clean(`Boda de ${m.groom} y ${m.bride}`)}`, `LOCATION:${clean(v.venue + ', ' + v.address)}`, 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n'), 'text/calendar;charset=utf-8', 'miller-y-daniela.ics');
    toast('La fecha está lista para añadir a tu calendario.');
  }
  function bindSectionActions() {
    setDateRevealed(dateRevealed);
    window.BodaInteractions?.init({ preview, reduced, onRevealChange: setDateRevealed });
    $('.scratch-save')?.addEventListener('click', saveDate);
    $$('[data-scene]').forEach(tab => {
      tab.addEventListener('click', () => selectScene(Number(tab.dataset.scene)));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); selectScene(event.key === 'Home' ? 0 : event.key === 'End' ? 2 : Number(tab.dataset.scene) + (event.key === 'ArrowRight' ? 1 : -1), true);
      });
    });
    $('.story-replay')?.addEventListener('click', playScene);
    $('.story-next')?.addEventListener('click', () => selectScene(Number($('[data-scene][aria-selected="true"]').dataset.scene) + 1));
    let swipeStart;
    $('.story-book')?.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') swipeStart = { x: event.clientX, y: event.clientY }; });
    $('.story-book')?.addEventListener('pointerup', event => {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y; swipeStart = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) selectScene(Number($('[data-scene][aria-selected="true"]').dataset.scene) + (dx < 0 ? 1 : -1));
    });
    $('.story-book')?.addEventListener('pointercancel', () => swipeStart = null);
    if ($('.story-book')) {
      sceneObserver = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { playScene(); sceneObserver.disconnect(); } }, { threshold: .35 });
      sceneObserver.observe($('.story-book'));
    }
    $('#open-letter')?.addEventListener('click', () => { $('#letter-text').textContent = content.modules.find(m => m.id === 'welcome').letter; $('#letter-dialog').showModal(); });
    $('#save-date')?.addEventListener('click', saveDate);
    $('#hero-save-date')?.addEventListener('click', saveDate);
    $$('[data-gallery]').forEach(button => button.addEventListener('click', () => showGallery(Number(button.dataset.gallery))));
    $$('[data-gallery-source]').forEach(button => button.addEventListener('click', () => showGallery(Math.max(0, images.indexOf(button.dataset.gallerySource)))));
    $$('[data-tab]').forEach(tab => {
      tab.addEventListener('click', () => switchTab(Number(tab.dataset.tab)));
      tab.addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return; e.preventDefault(); const tabs = $$('[data-tab]'), count = tabs.length; const i = e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : (Number(tab.dataset.tab) + (e.key === 'ArrowRight' ? 1 : count - 1)) % count; switchTab(i); tabs[i].focus(); });
    });
    const form = $('.rsvp-form');
    rsvpCompanions = form ? window.BodaCompanions.init(form, { onChange: () => window.ScrollTrigger?.refresh(), nameLabel: content.modules.find(m => m.id === 'rsvp').uiCompanionName, namePlaceholder: content.modules.find(m => m.id === 'rsvp').uiCompanionPlaceholder }) : null;
    form?.addEventListener('submit', submitRsvp);
    $$('#main img').forEach(image => image.addEventListener('error', () => { if (!image.dataset.fallback) { image.dataset.fallback = '1'; image.src = '/assets/garden.webp'; } }, { once: true }));
  }
  reduced.addEventListener('change', () => { sceneTimeline?.revert(); sceneTimeline = null; });
  async function submitRsvp(event) {
    event.preventDefault();
    if (preview) return toast('Vista previa: aquí no se envían respuestas.');
    const form = event.currentTarget, button = $('[type="submit"]', form), error = $('.form-error', form);
    const values = { name: form.elements.name.value.trim(), attendance: form.elements.attendance.value, guests: Number(form.elements.guests.value), companions: form.elements.attendance.value === 'yes' ? rsvpCompanions.names() : [], message: form.elements.message.value };
    if (!values.name) { error.hidden = false; error.textContent = 'Escribe tu nombre para poder identificar tu respuesta.'; return; }
    if (values.attendance === 'yes' && (values.companions.length !== values.guests - 1 || values.companions.some(name => !name))) { error.hidden = false; error.textContent = 'Escribe el nombre de cada acompañante.'; return; }
    button.disabled = true; button.textContent = 'Guardando tu respuesta…'; error.hidden = true;
    try {
      const response = await fetch('/api/rsvps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'No fue posible guardar tu respuesta.');
      const module = content.modules.find(m => m.id === 'rsvp');
      form.innerHTML = `<div class="rsvp-success"><span>♡</span><h3>${esc(values.attendance === 'yes' ? module.uiSuccessYes : module.uiSuccessNo)}</h3><p>${esc(module.thanks)}</p>${/^\d{8,15}$/.test(module.whatsapp) ? `<a class="button button-outline" target="_blank" rel="noopener noreferrer" href="https://wa.me/${module.whatsapp}?text=${encodeURIComponent(`Hola, soy ${values.name}. Ya registré mi respuesta para la boda: ${values.attendance === 'yes' ? `asistiré (${values.guests} personas)` : 'no podré asistir'}.`)}">${esc(module.uiWhatsapp)}</a>` : ''}</div>`;
      if (values.attendance === 'yes') celebrate();
    } catch (err) { error.hidden = false; error.textContent = err.message || 'No hay conexión. Intenta de nuevo en un momento.'; button.disabled = false; button.textContent = 'Reintentar confirmación'; }
  }
  function celebrate() {
    if (reduced.matches) return;
    for (let i = 0; i < 35; i++) { const p = document.createElement('i'); Object.assign(p.style, { position: 'fixed', zIndex: 90, width: '7px', height: '11px', background: ['#b79b5b', '#e8cf84', '#f7eee0'][i % 3], left: '50%', top: '50%', pointerEvents: 'none' }); document.body.append(p); const a = p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${(Math.random() - .5) * innerWidth}px,${(Math.random() - .3) * innerHeight}px) rotate(${Math.random() * 700}deg)`, opacity: 0 }], { duration: 1800 + Math.random() * 1000, easing: 'cubic-bezier(.1,.5,.6,1)' }); a.finished.then(() => p.remove()); }
  }
  function observeModules() {
    if (!preview) return;
    sectionObserver?.disconnect();
    sectionObserver = new IntersectionObserver(() => reportPreviewModule(), { rootMargin: `-${Math.round(innerHeight * .25)}px 0px -${Math.round(innerHeight * .74)}px 0px`, threshold: 0 });
    $$('[data-module]').forEach(s => sectionObserver.observe(s));
    $$('.timeline-item .event-time').forEach((time, index) => {
      const key = ['arrivalTime', 'ceremonyTime', 'memoriesTime', 'dinnerTime'][index];
      time.setAttribute('role', 'button'); time.tabIndex = 0;
      time.classList.add('preview-edit-time');
      time.title = 'Pulsa para editar este horario';
      time.setAttribute('aria-label', `Editar horario: ${time.textContent}`);
      const edit = () => parent.postMessage({ type: 'boda:edit-field', id: 'celebration', key }, location.origin);
      time.addEventListener('click', edit);
      time.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); edit(); } });
    });
  }
  function visibleModule() {
    const point = innerHeight * .25, sections = $$('[data-module]').map(element => ({ element, rect: element.getBoundingClientRect() }));
    return (sections.find(section => section.rect.top <= point && section.rect.bottom > point) || sections.filter(section => section.rect.top <= point).at(-1) || sections[0])?.element;
  }
  function reportPreviewModule(interactive = false) {
    if (!preview) return;
    const current = visibleModule();
    if (current) parent.postMessage({ type: 'boda:section', id: current.dataset.module, interactive }, location.origin);
  }
  function setActiveNavigation(moduleId) {
    const id = ['countdown', 'welcome'].includes(moduleId) ? 'hero' : moduleId;
    if (id === currentNavigationId) return;
    currentNavigationId = id;
    $$('[data-module-link]').forEach(link => { const active = link.dataset.moduleLink === id; link.classList.toggle('is-active', active); if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  }
  function observeNavigation() {
    navigationObserver?.disconnect();
    navigationObserver = new IntersectionObserver(() => {
      const current = visibleModule();
      if (!current) return;
      setActiveNavigation(current.id);
    }, { rootMargin: `-${Math.round(innerHeight * .18)}px 0px -${Math.round(innerHeight * .7)}px 0px`, threshold: 0 });
    $$('[data-module]').forEach(section => navigationObserver.observe(section));
  }
  function scrollModule(id) { $$('.preview-selected').forEach(el => el.classList.remove('preview-selected')); const el = document.getElementById(id); if (el) { el.classList.add('preview-selected'); el.scrollIntoView({ behavior: 'instant', block: 'start' }); } }
  if (preview) {
    document.body.classList.add('preview-mode');
    let previewSyncPending = false;
    const syncFromInteraction = () => { if (previewSyncPending) return; previewSyncPending = true; requestAnimationFrame(() => { previewSyncPending = false; reportPreviewModule(true); }); };
    addEventListener('wheel', syncFromInteraction, { passive: true });
    addEventListener('touchmove', syncFromInteraction, { passive: true });
    addEventListener('keydown', event => { if (['PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', ' '].includes(event.key) && !event.target.closest('input, textarea, select, button, [role="button"], [role="tab"]')) syncFromInteraction(); });
  }
  $('.envelope-seal').addEventListener('click', openEnvelope);
  $('.invitation-skip').addEventListener('click', finishInvitation);
  $('.reopen-invitation').addEventListener('click', showInvitation);
  $('#invitation-dialog').addEventListener('close', () => {
    document.body.classList.remove('invitation-active');
    if (preview) return;
    try { sessionStorage.setItem('boda-invitation-open:' + content.modules.find(m => m.id === 'hero').date, 'yes'); } catch {}
    requestAnimationFrame(() => window.ScrollTrigger?.refresh());
  });
  function closeMenu() { $('.site-header nav').classList.remove('is-open'); $('.menu-toggle').setAttribute('aria-expanded', 'false'); $('.menu-toggle').setAttribute('aria-label', 'Abrir menú'); }
  $('.menu-toggle').addEventListener('click', () => { const open = $('.site-header nav').classList.toggle('is-open'); $('.menu-toggle').setAttribute('aria-expanded', open); $('.menu-toggle').setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); });
  $$('.site-header a, .mobile-dock a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  addEventListener('resize', () => { clearTimeout(navigationResizeTimer); navigationResizeTimer = setTimeout(() => { if (content) observeNavigation(); }, 180); });
  $$('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); }));
  $('.gallery-prev').addEventListener('click', () => showGallery(galleryIndex - 1)); $('.gallery-next').addEventListener('click', () => showGallery(galleryIndex + 1));
  $('#gallery-dialog').addEventListener('keydown', e => { if (e.key === 'ArrowLeft') showGallery(galleryIndex - 1); if (e.key === 'ArrowRight') showGallery(galleryIndex + 1); });
  let scrollPending = false;
  addEventListener('scroll', () => { if (scrollPending) return; scrollPending = true; requestAnimationFrame(() => { const total = document.documentElement.scrollHeight - innerHeight; $('.scroll-progress').style.transform = `scaleX(${total > 0 ? scrollY / total : 0})`; scrollPending = false; }); }, { passive: true });
  addEventListener('message', event => { if (!preview || event.origin !== location.origin || event.source !== parent) return; if (event.data.type === 'boda:update') { const y = scrollY; render(event.data.content); scrollTo(0, y); if (event.data.id) scrollModule(event.data.id); } if (event.data.type === 'boda:envelope') showInvitation(); if (event.data.type === 'boda:select') scrollModule(event.data.id); });
  fetch('/api/content', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => { render(data); if (preview) parent.postMessage({ type: 'boda:ready' }, location.origin); else if (location.hash) setTimeout(() => $(location.hash)?.scrollIntoView(), 150); }).catch(() => { $('#main').innerHTML = '<div class="initial-loading"><h2>Nos vemos en un momento.</h2><p>No se pudo cargar la invitación. Actualiza la página para volver a intentar.</p><a class="button button-gold" href="/">Volver a intentar</a></div>'; });
})();
