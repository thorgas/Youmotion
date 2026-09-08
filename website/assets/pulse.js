(() => {
  const catalog = {
    en: {
      joy: ['Joy', ['Pleasure','Enjoyment','Cheerfulness','Optimism','Enthusiasm','Contentment','Happiness'], '#E7AD32'], love: ['Love', ['Fondness','Affection','Familiarity','Admiration','Passion','Desire'], '#C96E72'], shame: ['Shame', ['Confusion','Self-consciousness','Embarrassment','Humiliation','Regret','Remorse','Guilt'], '#A97688'], disgust: ['Disgust', ['Aversion','Reluctance','Contempt','Revulsion','Repulsion'], '#719A7B'], sadness: ['Sadness', ['Gloom','Sorrow','Disappointment','Hopelessness','Loneliness','Despair'], '#6689A8'], anger: ['Anger', ['Displeasure','Annoyance','Irritation','Anger','Resentment','Rage','Aggression'], '#B75C45'], fear: ['Fear', ['Uncertainty','Apprehension','Concern','Worry','Helplessness','Fright','Horror','Panic'], '#766A9A']
    },
    de: {
      joy: ['Freude', ['Vergnügen','Lust','Fröhlichkeit','Optimismus','Begeisterung','Zufriedenheit','Glück'], '#E7AD32'], love: ['Liebe', ['Sympathie','Zuneigung','Vertrautheit','Bewunderung','Leidenschaft','Begehren'], '#C96E72'], shame: ['Scham', ['Verwirrung','Befangenheit','Peinlichkeit','Demütigung','Bedauern','Reue','Schuldgefühl'], '#A97688'], disgust: ['Ekel', ['Abneigung','Widerwille','Verachtung','Abscheu','Abgestoßenheit'], '#719A7B'], sadness: ['Trauer', ['Bedrücktheit','Kummer','Enttäuschung','Hoffnungslosigkeit','Einsamkeit','Verzweiflung'], '#6689A8'], anger: ['Wut', ['Verstimmung','Genervtheit','Missmut','Ärger','Groll','Zorn','Aggression'], '#B75C45'], fear: ['Furcht', ['Unsicherheit','Befürchtung','Besorgnis','Sorge','Hilflosigkeit','Schrecken','Grauen','Panik'], '#766A9A']
    }
  };
  const order = ['joy','love','shame','disgust','sadness','anger','fear'];
  const storeLinks = { apple: 'https://apps.apple.com/app/id6807357236', google: 'https://play.google.com/store/apps/details?id=com.youmotion.mobile' };
  const pulse = document.querySelector('[data-pulse]');
  if (!pulse) return;
  const field = pulse.querySelector('[data-pulse-field]');
  const emotionText = pulse.querySelector('[data-pulse-emotion]');
  const nuanceText = pulse.querySelector('[data-pulse-nuance]');
  const status = pulse.querySelector('[data-pulse-status]');
  const locale = pulse.dataset.locale === 'de' ? 'de' : 'en';
  let committed = false;
  const setSelection = (emotionId, intensity, x, y) => {
    const entry = catalog[locale][emotionId];
    const level = Math.min(Math.floor(intensity * entry[1].length), entry[1].length - 1);
    pulse.style.setProperty('--pulse-x', `${x}%`); pulse.style.setProperty('--pulse-y', `${y}%`); pulse.style.setProperty('--pulse-color', entry[2]);
    nuanceText.textContent = entry[1][level]; emotionText.textContent = entry[0];
    pulse.querySelectorAll('[data-emotion]').forEach((node) => node.dataset.active = String(node.dataset.emotion === emotionId));
  };
  const selectionFromPoint = (clientX, clientY) => {
    const box = field.getBoundingClientRect(); const centerX = box.left + box.width / 2; const centerY = box.top + box.height / 2;
    const dx = clientX - centerX; const dy = clientY - centerY; const distance = Math.hypot(dx, dy); const deadZone = box.width * .055; const maxRadius = box.width * .36;
    if (distance < deadZone) return null;
    const angle = Math.atan2(dy, dx); let nearest = 0; let nearestDistance = Infinity;
    order.forEach((_, index) => { const axis = -Math.PI / 4 + index * Math.PI / 4; const raw = Math.abs(angle - axis) % (Math.PI * 2); const circular = Math.min(raw, Math.PI * 2 - raw); if (circular < nearestDistance) { nearest = index; nearestDistance = circular; } });
    const constrained = Math.min(distance, maxRadius); const scale = constrained / distance; const x = 50 + dx * scale / box.width * 100; const y = 50 + dy * scale / box.height * 100; const intensity = Math.max(0, Math.min(1, (distance - deadZone) / (maxRadius - deadZone)));
    return { emotionId: order[nearest], intensity, x, y };
  };
  const previewPoint = (event) => { if (committed || event.pointerType === 'touch') return; const next = selectionFromPoint(event.clientX, event.clientY); if (next) setSelection(next.emotionId, next.intensity, next.x, next.y); };
  const previewButton = (event) => { if (committed) return; const button = event.currentTarget; const box = field.getBoundingClientRect(); const point = button.getBoundingClientRect(); setSelection(button.dataset.emotion, .72, (point.left + point.width / 2 - box.left) / box.width * 100, (point.top + point.height / 2 - box.top) / box.height * 100); };
  const resetSelection = () => {
    pulse.style.removeProperty('--pulse-x'); pulse.style.removeProperty('--pulse-y'); pulse.style.removeProperty('--pulse-color');
    nuanceText.textContent = locale === 'de' ? 'Berühre den Punkt und bewege dich.' : 'Touch the point, then move.';
    emotionText.textContent = locale === 'de' ? 'Sieben Richtungen. Deine eigene Intensität.' : 'Seven directions. Your own intensity.';
    pulse.querySelectorAll('[data-emotion]').forEach((node) => node.removeAttribute('data-active'));
  };
  const activate = () => {
    committed = true;
    if (document.documentElement.dataset.storeState !== 'live') { document.querySelector('#download').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); status.textContent = locale === 'de' ? 'Youmotion kommt bald. Die Store-Links werden nach der Freigabe aktiviert.' : 'Youmotion is coming soon. Store links activate after release.'; requestAnimationFrame(() => requestAnimationFrame(resetSelection)); return; }
    const isAndroid = /Android/i.test(navigator.userAgent); window.location.assign(isAndroid ? storeLinks.google : storeLinks.apple);
  };
  field.addEventListener('pointermove', previewPoint);
  field.addEventListener('click', (event) => { const next = selectionFromPoint(event.clientX, event.clientY); if (next) { setSelection(next.emotionId, next.intensity, next.x, next.y); activate(); } });
  pulse.querySelectorAll('[data-emotion]').forEach((button) => {
    button.addEventListener('focus', previewButton); button.addEventListener('pointerenter', previewButton);
    button.addEventListener('click', (event) => { event.stopPropagation(); previewButton(event); activate(); });
  });
  document.querySelectorAll('[data-store]').forEach((link) => { const destination = storeLinks[link.dataset.store]; if (document.documentElement.dataset.storeState === 'live') { link.href = destination; link.removeAttribute('aria-disabled'); } });
})();
