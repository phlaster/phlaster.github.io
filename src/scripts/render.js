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

  // HERO
  $('heroName').innerHTML = nameParts.length > 1 ? `<span>${esc(nameParts[0])}</span><em>${esc(nameParts.slice(1).join(' '))}</em>` : `<span>${esc(a.name)}</span>`;
  $('heroTagline').textContent = a.tagline || '';
  $('heroPhoto').src = i18nConfig.site.photo_top;
  $('scrollCueText').textContent = ui.scroll_cue;
  const writeMeLink = document.querySelector('.nav-link[href="#contact"]');
  if (writeMeLink) writeMeLink.textContent = ui.write_me;

  const iframe = $('heroIframe');
  const heroUrl = i18nConfig.hero?.iframe_url;
  if (heroUrl && !heroUrl.includes('...')) {
    iframe.src = heroUrl;
    iframe.style.display = 'block';
  } else {
    iframe.style.display = 'none';
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
  const interestsHtml = interests.items.map(i => `<li>${esc(i)}</li>`).join('');

  const edu = a.education || [];
  const eduHtml = edu.map(e => `<li><strong>${esc(e.degree)}</strong> — ${esc(e.institution)} (${esc(e.period)})</li>`).join('');

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
          <div class="meta-label">${esc(ui.spoken_languages)}</div>
          <ul class="meta-list">
            ${Object.entries(a.spoken_languages || {}).map(([n, l]) => `<li><span>${esc(n)}</span><span class="lang-level">${esc(l)}</span></li>`).join('')}
          </ul>
        </div>
        <div class="meta-block">
          <div class="meta-label">${esc(ui.education)}</div>
          <ul class="meta-list">${eduHtml}</ul>
        </div>
      </div>
      <div class="about-meta" style="grid-column: 1 / -1;">
        <div class="meta-block">
          <div class="meta-label">${esc(interests.title)}</div>
          <ul class="meta-list interests-list">${interestsHtml}</ul>
        </div>
      </div>
    </div>
  `;

  // CAREER & SKILLS
  $('career-title').textContent = sections.career_title;
  $('career-sub').textContent = sections.career_sub;
  const exps = i18nConfig.experience || [];
  const skills = i18nConfig.skills || [];

  const expHtml = exps.map(e => `
    <div class="exp-item">
      <div class="exp-period">${esc(e.period)}</div>
      <div class="exp-content">
        <div class="exp-role">${esc(e.role)}</div>
        <div class="exp-company">${esc(e.company)}</div>
        <div class="exp-desc">${esc(e.description)}</div>
        ${e.skills_gained ? `
          <div class="exp-skills">
            <span class="meta-label">Skills gained:</span>
            <div class="skill-tags">${e.skills_gained.map(t => `<span class="skill-tag">${esc(t)}</span>`).join('')}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');

  const skillsHtml = skills.map(s => `
    <div class="skill-item">
      <h3>${esc(s.title)}</h3>
      <p class="skill-desc">${esc(s.description)}</p>
      <div class="skill-tags">${(s.tags||[]).map(t => `<span class="skill-tag">${esc(t)}</span>`).join('')}</div>
    </div>
  `).join('');

  $('career-content').innerHTML = `
    <div class="career-grid">
      <div class="career-col">
        <h3 class="research-col-title">Experience</h3>
        ${expHtml}
      </div>
      <div class="career-col">
        <h3 class="research-col-title">Expertise</h3>
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
  
  const confHtml = confs.map(c => `
    <a class="conf-item ${c.pdf_url ? 'has-pdf' : ''}" ${c.url ? `href="${esc(c.url)}" target="_blank" rel="noopener"` : ''}>
      <img src="${esc(c.cover)}" class="conf-cover" alt="${esc(c.title)}" onerror="this.style.display='none'">
      <div class="conf-details">
        <div class="conf-date">${esc(c.date)}</div>
        <div class="conf-title">${esc(c.title)}</div>
        <div class="conf-meta">
          <span class="conf-location">📍 ${esc(c.location)}</span>
          <span class="conf-role">${esc(c.role)}</span>
        </div>
      </div>
    </a>
  `).join('');

  const pubHtml = pubs.map(p => `
    <div class="pub-item">
      <div class="pub-year">${esc(p.year)}</div>
      <div class="pub-content">
        <a href="${esc(p.url)}" target="_blank" rel="noopener" class="pub-title-link">
          <div class="pub-title">${esc(p.title)}</div>
        </a>
        <div class="pub-authors">${esc(p.authors)}</div>
        <div class="pub-venue">${esc(p.venue)}</div>
      </div>
    </div>
  `).join('');

  const grantsHtml = grants.map(g => `
    <div class="pub-item">
      <div class="pub-year">${esc(g.year)}</div>
      <div class="pub-content">
        <a href="${esc(g.url)}" target="_blank" rel="noopener" class="pub-title-link">
          <div class="pub-title">${esc(g.title)}</div>
        </a>
        <div class="pub-authors">${esc(g.role)}</div>
        <div class="pub-venue">${esc(g.description)}</div>
      </div>
    </div>
  `).join('');

  $('research-content').innerHTML = `
    <div class="research-grid">
      <div class="research-col">
        <h3 class="research-col-title">${esc(sections.research_conf)}</h3>
        <div class="conf-list">${confHtml}</div>
      </div>
      <div class="research-col">
        <h3 class="research-col-title">${esc(sections.research_pubs)}</h3>
        <div class="pub-list">${pubHtml}</div>
      </div>
      <div class="research-col">
        <h3 class="research-col-title">${esc(sections.research_grants)}</h3>
        <div class="pub-list">${grantsHtml}</div>
      </div>
    </div>
  `;

  // DOCUMENTS
  $('docs-title').textContent = sections.docs_title;
  $('docs-sub').textContent = sections.docs_sub;
  const docs = i18nConfig.documents || [];
  
  $('documents-content').innerHTML = `
    <div class="documents-grid">
      ${docs.map(d => `
        <div class="doc-item">
          <div class="doc-meta">
            <span class="doc-category">${esc(d.category)}</span>
            <span class="doc-date">${esc(d.date)}</span>
          </div>
          <div class="doc-content">
            <div class="doc-title">${esc(d.title)}</div>
            <div class="doc-desc">${esc(d.description)}</div>
          </div>
          ${d.url ? `
            <button class="view-pdf-btn" data-pdf="${esc(d.url)}">
              ${esc(ui.view_pdf || 'Open PDF')}
            </button>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;

  // CONTACT UI
  const c = ui.contact || {};
  $('contactTitle').innerHTML = c.title;
  $('contactIntro').textContent = c.intro;
  $('printContactText').textContent = c.print_contact_text || c.intro;
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