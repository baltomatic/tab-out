const fs = require('fs');
let code = fs.readFileSync('extension/app.js', 'utf8');

// Replace migrateStorage/getSavedTabs migration logic to batch update
code = code.replace(/if \(allData\.deferred && Array\.isArray\(allData\.deferred\)\) \{[\s\S]*?await chrome\.storage\.local\.remove\('deferred'\); \/\/ Remove old key\s*\}/, `if (allData.deferred && Array.isArray(allData.deferred)) {
    const batchUpdate = Object.create(null);
    for (const item of allData.deferred) {
      if (!item.id) item.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString().slice(2);
      deferred.push(item);
      batchUpdate[\`deferred_\${item.id}\`] = item;
    }
    await chrome.storage.local.set(batchUpdate);
    await chrome.storage.local.remove('deferred'); // Remove old key
  }`);

// Replace renderDomainCard function
const renderDomainCardRegex = /function renderDomainCard\(group\) \{[\s\S]*?return \`[\s\S]*?\`\n\}/;

const newRenderDomainCard = `function renderDomainCard(group) {
  const tabs      = group.tabs || [];
  const tabCount  = tabs.length;
  const isLanding = group.domain === '__landing-pages__';
  const stableId  = 'domain-' + group.domain.replace(/[^a-z0-9]/g, '-');

  // Count duplicates (exact URL match)
  const urlCounts = Object.create(null);
  for (const tab of tabs) urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1;
  const dupeUrls   = Object.entries(urlCounts).filter(([, c]) => c > 1);
  const hasDupes   = dupeUrls.length > 0;
  const totalExtras = dupeUrls.reduce((s, [, c]) => s + c - 1, 0);

  const card = document.createElement('div');
  card.className = \`mission-card domain-card \${hasDupes ? 'has-amber-bar' : 'has-neutral-bar'}\`;
  card.dataset.domainId = stableId;

  const statusBar = document.createElement('div');
  statusBar.className = 'status-bar';
  card.appendChild(statusBar);

  const missionContent = document.createElement('div');
  missionContent.className = 'mission-content';

  const missionTop = document.createElement('div');
  missionTop.className = 'mission-top';

  const missionName = document.createElement('span');
  missionName.className = 'mission-name';
  missionName.textContent = isLanding ? 'Homepages' : (group.label || friendlyDomain(group.domain));
  missionTop.appendChild(missionName);

  const tabBadge = document.createElement('span');
  tabBadge.className = 'open-tabs-badge';
  tabBadge.innerHTML = \`\${ICONS.tabs} \${tabCount} tab\${tabCount !== 1 ? 's' : ''} open\`;
  missionTop.appendChild(tabBadge);

  if (hasDupes) {
    const dupeBadge = document.createElement('span');
    dupeBadge.className = 'open-tabs-badge';
    dupeBadge.style.color = 'var(--accent-amber)';
    dupeBadge.style.background = 'rgba(200,113,58,0.08)';
    dupeBadge.textContent = \`\${totalExtras} duplicate\${totalExtras !== 1 ? 's' : ''}\`;
    missionTop.appendChild(dupeBadge);
  }

  missionContent.appendChild(missionTop);

  const missionPages = document.createElement('div');
  missionPages.className = 'mission-pages';

  const seen = new Set();
  const uniqueTabs = [];
  for (const tab of tabs) {
    if (!seen.has(tab.url)) { seen.add(tab.url); uniqueTabs.push(tab); }
  }

  const visibleTabs = uniqueTabs.slice(0, 8);
  const extraCount  = uniqueTabs.length - visibleTabs.length;

  visibleTabs.forEach(tab => {
    let label = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), group.domain);
    try {
      const parsed = new URL(tab.url);
      if (parsed.hostname === 'localhost' && parsed.port) label = \`\${parsed.port} \${label}\`;
    } catch {}

    const count    = urlCounts[tab.url];
    const chipClass = count > 1 ? ' chip-has-dupes' : '';

    const chip = document.createElement('div');
    chip.className = \`page-chip clickable\${chipClass}\`;
    chip.dataset.action = 'focus-tab';
    chip.dataset.tabUrl = tab.url || '';
    chip.title = label;

    let domain = '';
    try { domain = new URL(tab.url).hostname; } catch {}
    if (domain) {
      const img = document.createElement('img');
      img.className = 'chip-favicon';
      img.src = \`https://www.google.com/s2/favicons?domain=\${domain}&sz=16\`;
      img.alt = '';
      img.onerror = () => { img.style.display = 'none'; };
      chip.appendChild(img);
    }

    const span = document.createElement('span');
    span.className = 'chip-text';
    span.textContent = label;
    chip.appendChild(span);

    if (count > 1) {
      const dupeTag = document.createElement('span');
      dupeTag.className = 'chip-dupe-badge';
      dupeTag.textContent = \`(\${count}x)\`;
      chip.appendChild(document.createTextNode(' '));
      chip.appendChild(dupeTag);
    }

    const actions = document.createElement('div');
    actions.className = 'chip-actions';

    const btnSave = document.createElement('button');
    btnSave.className = 'chip-action chip-save';
    btnSave.dataset.action = 'defer-single-tab';
    btnSave.dataset.tabUrl = tab.url || '';
    btnSave.dataset.tabTitle = label;
    btnSave.title = 'Save for later';
    btnSave.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>\`;

    const btnClose = document.createElement('button');
    btnClose.className = 'chip-action chip-close';
    btnClose.dataset.action = 'close-single-tab';
    btnClose.dataset.tabUrl = tab.url || '';
    btnClose.title = 'Close this tab';
    btnClose.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>\`;

    actions.appendChild(btnSave);
    actions.appendChild(btnClose);
    chip.appendChild(actions);
    missionPages.appendChild(chip);
  });

  if (extraCount > 0) {
    const overflowHtml = buildOverflowChips(uniqueTabs.slice(8), urlCounts);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = overflowHtml;
    while(tempDiv.firstChild) {
        missionPages.appendChild(tempDiv.firstChild);
    }
  }

  missionContent.appendChild(missionPages);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'actions';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'action-btn close-tabs';
  closeBtn.dataset.action = 'close-domain-tabs';
  closeBtn.dataset.domainId = stableId;
  closeBtn.innerHTML = \`\${ICONS.close} Close all \${tabCount} tab\${tabCount !== 1 ? 's' : ''}\`;
  actionsDiv.appendChild(closeBtn);

  if (hasDupes) {
    const dupeUrlsEncoded = dupeUrls.map(([url]) => encodeURIComponent(url)).join(',');
    const dedupBtn = document.createElement('button');
    dedupBtn.className = 'action-btn';
    dedupBtn.dataset.action = 'dedup-keep-one';
    dedupBtn.dataset.dupeUrls = dupeUrlsEncoded;
    dedupBtn.textContent = \`Close \${totalExtras} duplicate\${totalExtras !== 1 ? 's' : ''}\`;
    actionsDiv.appendChild(dedupBtn);
  }

  missionContent.appendChild(actionsDiv);
  card.appendChild(missionContent);

  const missionMeta = document.createElement('div');
  missionMeta.className = 'mission-meta';

  const pageCount = document.createElement('div');
  pageCount.className = 'mission-page-count';
  pageCount.textContent = tabCount;
  missionMeta.appendChild(pageCount);

  const pageLabel = document.createElement('div');
  pageLabel.className = 'mission-page-label';
  pageLabel.textContent = 'tabs';
  missionMeta.appendChild(pageLabel);

  card.appendChild(missionMeta);

  return card;
}`;

code = code.replace(renderDomainCardRegex, newRenderDomainCard);

fs.writeFileSync('extension/app.js', code);
