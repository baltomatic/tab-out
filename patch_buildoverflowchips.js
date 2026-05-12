const fs = require('fs');
let code = fs.readFileSync('extension/app.js', 'utf8');

const buildOverflowChipsRegex = /function buildOverflowChips\(hiddenTabs, urlCounts = Object\.create\(null\)\) \{[\s\S]*?return [\s\S]*?\`[\s\S]*?\`;\n\}/;

const newBuildOverflowChips = `function buildOverflowChips(hiddenTabs, urlCounts = Object.create(null)) {
  const chipsHtml = hiddenTabs.map(tab => {
    let label = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), '');
    try {
      const parsed = new URL(tab.url);
      if (parsed.hostname === 'localhost' && parsed.port) label = \`\${parsed.port} \${label}\`;
    } catch {}

    const count = urlCounts[tab.url] || 1;
    const chipClass = count > 1 ? ' chip-has-dupes' : '';
    const safeUrl = (tab.url || '').replace(/"/g, '&quot;');
    const safeTitle = label.replace(/"/g, '&quot;');
    let domain = '';
    try { domain = new URL(tab.url).hostname; } catch {}
    const faviconUrl = domain ? \`https://www.google.com/s2/favicons?domain=\${domain}&sz=16\` : '';

    // Instead of template literal, we build raw HTML safely or return a string for now,
    // because buildOverflowChips is inserted via innerHTML.
    // However, to be fully safe, we should build it like this:
    const safeLabel = label.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const dupeTag = count > 1 ? \` <span class="chip-dupe-badge">(\${count}x)</span>\` : '';

    return \`<div class="page-chip clickable\${chipClass}" data-action="focus-tab" data-tab-url="\${safeUrl}" title="\${safeTitle}">
      \${faviconUrl ? \`<img class="chip-favicon" src="\${faviconUrl}" alt="" onerror="this.style.display='none'">\` : ''}
      <span class="chip-text">\${safeLabel}</span>\${dupeTag}
      <div class="chip-actions">
        <button class="chip-action chip-save" data-action="defer-single-tab" data-tab-url="\${safeUrl}" data-tab-title="\${safeTitle}" title="Save for later">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
        </button>
        <button class="chip-action chip-close" data-action="close-single-tab" data-tab-url="\${safeUrl}" title="Close this tab">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>\`;
  }).join('');

  return \`
    <div class="page-chips-overflow" style="display:none;">\${chipsHtml}</div>
    <div class="page-chip clickable overflow-trigger" data-action="expand-chips">
      +\${hiddenTabs.length} more...
    </div>
  \`;
}`;

code = code.replace(buildOverflowChipsRegex, newBuildOverflowChips);
fs.writeFileSync('extension/app.js', code);
