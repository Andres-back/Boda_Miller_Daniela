(() => {
  'use strict';
  let cleanup = () => {};
  window.BodaInteractions = {
    destroy() { cleanup(); cleanup = () => {}; },
    init({ preview, reduced, onRevealChange = () => {} }) {
      this.destroy();
      const controller = new AbortController(), options = { signal: controller.signal }, animations = new Set();
      const motion = (element, frames, settings) => {
        if (preview || reduced.matches) return null;
        const animation = element.animate(frames, settings); animations.add(animation);
        animation.finished.catch(() => {}).finally(() => animations.delete(animation));
        return animation;
      };
      const stopMotion = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
      reduced.addEventListener('change', stopMotion, options);
      cleanup = () => { controller.abort(); stopMotion(); document.querySelectorAll('.tap-ripple, .reveal-sparkle').forEach(effect => effect.remove()); };
      const removeEffects = cleanup;
      document.addEventListener('click', event => {
        const target = event.target.closest?.('.button, .story-tabs button, .detail-tab, .story-next, .story-replay, .scratch-reveal, .scratch-reset, .scratch-save, .nav-rsvp');
        if (!target || preview || reduced.matches || target.disabled) return;
        const rect = target.getBoundingClientRect(), size = Math.max(rect.width, rect.height) * 1.5;
        if (!rect.width || !rect.height) return;
        const ripple = document.createElement('span'); ripple.className = 'tap-ripple'; ripple.setAttribute('aria-hidden', 'true');
        Object.assign(ripple.style, { width: size + 'px', height: size + 'px', left: (event.detail ? event.clientX - rect.left : rect.width / 2) - size / 2 + 'px', top: (event.detail ? event.clientY - rect.top : rect.height / 2) - size / 2 + 'px' });
        target.append(ripple);
        const animation = motion(ripple, [{ transform: 'scale(.05)', opacity: .5 }, { transform: 'scale(1)', opacity: 0 }], { duration: 550, easing: 'ease-out' });
        animation?.finished.catch(() => {}).finally(() => ripple.remove());
      }, options);
      const card = document.querySelector('.scratch-card');
      if (!card) return;
      const canvas = card.querySelector('canvas'), context = canvas.getContext('2d');
      const button = card.querySelector('.scratch-reveal'), status = card.querySelector('.scratch-status');
      const clock = card.querySelector('.countdown-clock'), resetButton = card.querySelector('.scratch-reset');
      let width = 0, height = 0, drawing = false, last = null, revealed = false, cells = new Set(), strokes = [];
      const key = card.dataset.storageKey;
      const message = card.dataset.message;
      const reveal = (celebrate = true) => {
        if (revealed) return;
        revealed = true; drawing = false; card.classList.add('is-revealed');
        status.textContent = message; button.hidden = true;
        card.querySelector('.scratch-save').hidden = false;
        resetButton.hidden = false; clock.removeAttribute('aria-hidden');
        onRevealChange(true);
        if (celebrate) card.querySelectorAll('.time-unit').forEach((unit, index) => motion(unit, [{ transform: 'translateY(10px) scale(.96)', opacity: .2 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 600, delay: index * 75, easing: 'cubic-bezier(.2,.8,.2,1)' }));
        if (!preview) { try { sessionStorage.setItem(key, 'yes'); } catch {} }
        if (celebrate && !preview && !reduced.matches) for (let i = 0; i < 6; i++) {
          const sparkle = document.createElement('span'); sparkle.className = 'reveal-sparkle'; sparkle.textContent = '✦'; sparkle.setAttribute('aria-hidden', 'true');
          sparkle.style.left = (10 + i * 15) + '%'; sparkle.style.top = (i % 2 ? 75 : 30) + '%'; card.querySelector('.scratch-surface').append(sparkle);
          motion(sparkle, [{ transform: 'translateY(5px) scale(.4)', opacity: 0 }, { transform: 'translateY(-10px) scale(1)', opacity: .8, offset: .35 }, { transform: 'translateY(-26px) scale(.6)', opacity: 0 }], { duration: 900, delay: i * 60, easing: 'ease-out' }).finished.catch(() => {}).finally(() => sparkle.remove());
        }
      };
      const erase = (x, y, radius) => {
        context.globalCompositeOperation = 'destination-out';
        context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
      };
      const draw = () => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height || revealed) return;
        width = rect.width; height = rect.height;
        const ratio = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.globalCompositeOperation = 'source-over';
        const gold = context.createLinearGradient(0, 0, width, height);
        gold.addColorStop(0, '#ac823c'); gold.addColorStop(.28, '#e1c780'); gold.addColorStop(.55, '#f5e5b1'); gold.addColorStop(.78, '#c5a256'); gold.addColorStop(1, '#a77c36');
        context.fillStyle = gold; context.fillRect(0, 0, width, height);
        context.strokeStyle = '#fff6d633'; context.lineWidth = 1;
        for (let x = -height; x < width; x += 14) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x + height, height); context.stroke(); }
        context.strokeStyle = '#fff6d699'; context.strokeRect(9, 9, width - 18, height - 18);
        strokes.forEach(point => erase(point.x * width, point.y * height, point.radius * width));
      };
      const mark = (x, y) => {
        const radius = Math.min(30, width * .1);
        erase(x, y, radius); strokes.push({ x: x / width, y: y / height, radius: radius / width });
        // Small occupancy grid measures cleared area without repeatedly reading canvas pixels.
        for (let row = 0; row < 20; row++) for (let column = 0; column < 40; column++) {
          const dx = (column + .5) * width / 40 - x, dy = (row + .5) * height / 20 - y;
          if (dx * dx + dy * dy < radius * radius) cells.add(row * 40 + column);
        }
      };
      const point = event => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
      canvas.addEventListener('pointerdown', event => {
        if (revealed || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault(); drawing = true; last = point(event);
        card.classList.add('is-scratching'); status.textContent = card.dataset.progress; mark(last.x, last.y);
      }, options);
      window.addEventListener('pointermove', event => {
        if (!drawing || revealed) return;
        const current = point(event), distance = Math.hypot(current.x - last.x, current.y - last.y), steps = Math.max(1, Math.ceil(distance / 8));
        for (let i = 1; i <= steps; i++) mark(last.x + (current.x - last.x) * i / steps, last.y + (current.y - last.y) * i / steps);
        last = current;
        if (cells.size / 800 >= .38) reveal();
      }, options);
      const stop = () => { drawing = false; last = null; };
      window.addEventListener('pointerup', stop, options); window.addEventListener('pointercancel', stop, options); window.addEventListener('blur', stop, options);
      button.addEventListener('click', () => reveal(), options);
      resetButton.addEventListener('click', () => {
        revealed = false; drawing = false; last = null; cells.clear(); strokes = [];
        card.classList.remove('is-revealed', 'is-scratching'); clock.setAttribute('aria-hidden', 'true');
        button.hidden = false; resetButton.hidden = true; card.querySelector('.scratch-save').hidden = true;
        status.textContent = card.dataset.instruction;
        if (!preview) { try { sessionStorage.removeItem(key); } catch {} }
        onRevealChange(false);
        draw();
      }, options);
      if (!context) { reveal(false); resetButton.hidden = true; return; }
      const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
      if (!preview) { try { if (sessionStorage.getItem(key) === 'yes') reveal(false); } catch {} }
      cleanup = () => { observer.disconnect(); removeEffects(); };
    }
  };
})();
