const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderContent(i18nConfig, lang) {
  document.documentElement.lang = lang;
  
  const a = i18nConfig.about || {};
  const fullName = a.name || '—';
  const nameParts = fullName.split(/\s+/).filter(p => p.length > 0);
  
  const brandEl = document.querySelector('.brand');
  if (brandEl) {
    if (nameParts.length >= 2) {
      const firstInitial = nameParts[0].charAt(0).toUpperCase();
      const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
      brandEl.innerHTML = `${firstInitial}<span class="dot">·</span>${lastInitial}`;
    } else if (nameParts.length === 1) {
      brandEl.innerHTML = `${nameParts[0].charAt(0).toUpperCase()}<span class="dot">·</span>`;
    } else {
      brandEl.innerHTML = `?<span class="dot">·</span>?`;
    }
  }

  const ui = i18nConfig.ui || {};
  const sections = ui.sections || {};

  // === Translate Navigation Links ===
  const navTitles = {
    about: sections.about_title,
    career: sections.career_title,
    projects: sections.proj_title,
    research: sections.research_title,
    documents: sections.docs_title,
    contact: ui.write_me
  };
  document.querySelectorAll('.nav-link').forEach(link => {
    const key = link.dataset.nav;
    if (navTitles[key]) link.textContent = navTitles[key];
  });

  // HERO
  $('heroName').innerHTML = nameParts.length > 1 ? `<span>${esc(nameParts[0])}</span><em>${esc(nameParts.slice(1).join(' '))}</em>` : `<span>${esc(a.name)}</span>`;
  $('heroTagline').textContent = a.tagline || '';
  $('heroPhoto').src = i18nConfig.site.photo_top;
  $('scrollCueText').textContent = ui.scroll_cue;

  const iframe = $('heroIframe');
  const heroUrl = i18nConfig.hero?.iframe_url;
  if (heroUrl && !heroUrl.includes('...')) {
    iframe.src = heroUrl;
    iframe.style.display = 'block';
  } else {
    iframe.style.display = 'none';
  }

  // === Draw Hint Text ===
  const drawHint = $('heroDrawHint');
  if (drawHint) {
    drawHint.textContent = ui.draw_hint || 'Try drawing on the background';
  }

  // HERO SOCIALS
  const heroIcons = i18nConfig.hero_icons || [];
  $('heroSocials').innerHTML = heroIcons.map(icon => `
    <a href="${esc(icon.url)}" class="hero-social-link" data-key="${esc(icon.key)}" target="${icon.url.startsWith('#') ? '_self' : '_blank'}" rel="noopener noreferrer">
      <img src="${esc(icon.icon)}" alt="${esc(icon.key)}">
    </a>
  `).join('');

  // ABOUT
  $('about-title').textContent = sections.about_title;
  $('about-sub').textContent = sections.about_sub;
  
  const interests = a.interests || { items: [] };
  const hobbies = a.hobbies || { items: [] };
  const social = a.social || { items: [] };

  $('about-content').innerHTML = `
    <div class="about-grid">
      <div class="about-bio">
        <p class="lead">${esc(a.bio_lead)}</p>
        <p>${esc(a.bio)}</p>
      </div>
      <div class="about-meta">
        <div class="meta-block">
          <div class="meta-label">${esc(ui.based_in)}</div>
          <div class="meta-value"><a href="https://www.openstreetmap.org/?query=${esc(a.location)}" target="_blank">${esc(a.location)}</a></div>
        </div>
        <div class="meta-block">
          <div class="meta-label">${esc(interests.title)}</div>
          <div class="skill-tags">${interests.items.map(i => `<span class="skill-tag">${esc(i)}</span>`).join('')}</div>
        </div>
        <div class="meta-block">
          <div class="meta-label">${esc(hobbies.title)}</div>
          <div class="skill-tags">${hobbies.items.map(i => `<span class="skill-tag">${esc(i)}</span>`).join('')}</div>
        </div>
        <div class="meta-block">
          <div class="meta-label">${esc(social.title)}</div>
          <div class="about-socials">
            ${social.items.map(icon => `
              <a href="${esc(icon.url)}" class="about-social-link" target="_blank" rel="noopener noreferrer" title="${esc(icon.key)}">
                <img src="${esc(icon.icon)}" alt="${esc(icon.key)}">
              </a>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // CAREER & SKILLS (Education and career)
  $('career-title').textContent = sections.career_title;
  $('career-sub').textContent = sections.career_sub;
  const timeline = i18nConfig.timeline || [];
  const skillGroups = i18nConfig.skill_groups || [];

  const timelineHtml = timeline.map(e => `
    <a class="timeline-item" href="${esc(e.url || '#')}" target="_blank" rel="noopener" data-place="${esc(e.place_id || '')}">
      <div class="timeline-period">${esc(e.period)}</div>
      <div class="timeline-content">
        <div class="timeline-role">${esc(e.role)}</div>
        <div class="timeline-org">${esc(e.organization)}</div>
        <div class="timeline-desc">${esc(e.description)}</div>
      </div>
    </a>
  `).join('');

  const skillsHtml = skillGroups.map(g => `
    <div class="skill-group">
      <div class="meta-label">${esc(g.title)}</div>
      <div class="skill-tags">${(g.items||[]).map(i => `<span class="skill-tag" data-places="${esc((i.places || []).join(' '))}">${esc(i.name)}</span>`).join('')}</div>
    </div>
  `).join('');

  $('career-content').innerHTML = `
    <div class="career-grid">
      <div class="career-col">
        <h3 class="research-col-title">${esc(ui.timeline_title || 'Timeline')}</h3>
        <div class="timeline-list">${timelineHtml}</div>
      </div>
      <div class="career-col">
        <h3 class="research-col-title">${esc(ui.expertise_title || 'Expertise')}</h3>
        <div class="skills-groups">${skillsHtml}</div>
      </div>
    </div>
  `;

  // PROJECTS
  $('proj-title').textContent = sections.proj_title;
  $('proj-sub').textContent = sections.proj_sub;
  $('projects-content').innerHTML = `
    <div class="projects-grid">
      ${(i18nConfig.projects || []).map(p => `
        <a class="project-card" href="${esc(p.url)}" target="_blank" rel="noopener">
          <img src="${esc(p.cover)}" class="project-cover" alt="${esc(p.name)}">
          <div class="project-info">
            <div class="project-name">${esc(p.name)}</div>
            <div class="project-desc">${esc(p.description)}</div>
            <div class="project-langs">${(p.languages || []).map(l => `<span class="lang-chip">${esc(l)}</span>`).join('')}</div>
          </div>
        </a>`).join('')}
    </div>
  `;

  // RESEARCH
  $('research-title').textContent = sections.research_title;
  $('research-sub').textContent = sections.research_sub;
  const pubs = i18nConfig.publications || [];
  const confs = i18nConfig.conferences || [];
  const grants = i18nConfig.grants || [];
  
  const renderItem = (item, showImage = false) => {
    const date = item.date || item.year;
    const meta = [item.authors, item.role, item.venue, item.location ? `${item.location}` : ''].filter(Boolean).join(' · ');
    return `
      <a class="research-item" href="${esc(item.url || '#')}" target="_blank" rel="noopener">
        ${showImage && item.cover ? `<img src="${esc(item.cover)}" class="research-cover" alt="${esc(item.title)}" onerror="this.style.display='none'">` : ''}
        <div class="research-details">
          ${date ? `<div class="research-date">${esc(date)}</div>` : ''}
          <div class="research-title">${esc(item.title)}</div>
          ${meta ? `<div class="research-meta">${esc(meta)}</div>` : ''}
          ${item.description ? `<div class="research-meta">${esc(item.description)}</div>` : ''}
          ${item.pdf ? `<button class="view-pdf-btn" data-pdf="${esc(item.pdf)}" type="button">${esc(ui.view_pdf || 'Open PDF')}</button>` : ''}
        </div>
      </a>
    `;
  };

  $('research-content').innerHTML = `
    <div class="research-grid">
      <div class="research-col">
        <h3 class="research-col-title">${esc(sections.research_conf)}</h3>
        <div class="research-list">${confs.map(c => renderItem(c, true)).join('')}</div>
      </div>
      <div class="research-col">
        <h3 class="research-col-title">${esc(sections.research_pubs)}</h3>
        <div class="research-list">${pubs.map(p => renderItem(p, false)).join('')}</div>
      </div>
      <div class="research-col">
        <h3 class="research-col-title">${esc(sections.research_grants)}</h3>
        <div class="research-list">${grants.map(g => renderItem(g, false)).join('')}</div>
      </div>
    </div>
  `;

  // DOCUMENTS
  $('docs-title').textContent = sections.docs_title;
  $('docs-sub').textContent = sections.docs_sub;
  const docs = (i18nConfig.documents || []).filter(d => !d.languages || d.languages.includes(lang));
  
  $('documents-content').innerHTML = `
    <div class="documents-grid">
      ${docs.map(d => {
        const Tag = d.url ? 'a' : 'div';
        const attrs = d.url ? `href="${esc(d.url)}" target="_blank" rel="noopener" data-pdf="${esc(d.url)}"` : '';
        return `
          <${Tag} class="doc-item" ${attrs}>
            <div class="doc-meta">
              <span class="doc-category">${esc(d.category)}</span>
              <span class="doc-date">${esc(d.date)}</span>
            </div>
            <div class="doc-content">
              <div class="doc-title">${esc(d.title)}</div>
              <div class="doc-desc">${esc(d.description)}</div>
            </div>
            ${d.url ? `<span class="view-pdf-btn">${esc(ui.view_pdf || 'Open PDF')}</span>` : ''}
          </${Tag}>
        `;
      }).join('')}
    </div>
  `;

  // CONTACT UI
  const c = ui.contact || {};
  $('contactTitle').innerHTML = c.title;
  $('contactIntro').textContent = c.intro;
  $('printContactText').textContent = c.print_contact_text || c.intro;
  $('leaveContactsBtn').textContent = c.leave_contacts || 'Leave contacts';
  $('submitBtn').textContent = c.send;
  $('lbl-name').textContent = c.name;
  $('lbl-email').textContent = c.email;
  $('lbl-subject').textContent = c.subject;
  $('lbl-message').textContent = c.message;

  const contactPhoto = $('contactPhoto');
  if (contactPhoto) {
    contactPhoto.src = i18nConfig.site.photo_bottom;
  }

  $('footerAuthor').textContent = a.name || '';
  $('footerYear').textContent = new Date().getFullYear();

  // === DEPLOY INFO ===
  const deployDate = import.meta.env.VITE_DEPLOY_DATE || 'Local Dev';
  const repoUrl = import.meta.env.VITE_REPO_URL || '#';
  
  const ghPagesLink = $('ghPagesLink');
  if (ghPagesLink) ghPagesLink.href = repoUrl;
  
  const deployDateText = $('deployDateText');
  if (deployDateText) deployDateText.textContent = ` · ${deployDate}`;
  
  // === PDF FOOTER ===
  const genDate = new Date().toLocaleString('sv-SE', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    timeZoneName: 'short' 
  });
  
  const siteUrl = window.location.origin;
  
  const pdfFooterTemplate = ui.pdf?.footer_text || "Generated from interactive <a href=\"{url}\" target=\"_blank\">portfolio</a> on {gen_date} · Last update: {deploy_date}";
  const pdfFooterText = pdfFooterTemplate
    .replace('{url}', siteUrl)
    .replace('{gen_date}', genDate)
    .replace('{deploy_date}', deployDate);
      
  const pdfFooterInfo = $('pdfFooterInfo');
  if (pdfFooterInfo) pdfFooterInfo.innerHTML = pdfFooterText;
}