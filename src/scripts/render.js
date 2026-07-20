const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderContent(i18nConfig, lang) {
  document.documentElement.lang = lang;
  
  const brandEl = document.querySelector('.brand');
  if (brandEl) {
    if (lang === 'ru') {
      brandEl.innerHTML = 'А<span class="dot">·</span>Б';
    } else {
      brandEl.innerHTML = 'A<span class="dot">·</span>B';
    }
  }

  const ui = i18nConfig.ui || {};
  const sections = ui.sections || {};

  // --- HERO ---
  const a = i18nConfig.about || {};
  const nameParts = (a.name || '—').split(' ');
  $('heroName').innerHTML = nameParts.length > 1 ? `<span>${esc(nameParts[0])}</span><em>${esc(nameParts.slice(1).join(' '))}</em>` : `<span>${esc(a.name)}</span>`;
  $('heroTagline').textContent = a.tagline || '';
  $('heroPhoto').src = i18nConfig.site.photo;
  $('scrollCueText').textContent = ui.scroll_cue;
  const writeMeLink = document.querySelector('.nav-link[href="#contact"]');
  if (writeMeLink) writeMeLink.textContent = ui.write_me;
  $('exportPdfBtn').textContent = ui.export_pdf;

  const iframe = $('heroIframe');
  const heroUrl = i18nConfig.hero?.iframe_url;
  if (heroUrl && !heroUrl.includes('...')) {
    iframe.src = heroUrl;
    iframe.style.display = 'block';
  } else {
    iframe.style.display = 'none';
  }

  // --- ABOUT ---
  const sAbout = sections;
  $('about-title').textContent = sAbout.about_title;
  $('about-sub').textContent = sAbout.about_sub;
  
  const interests = a.interests || { items: [] };
  const interestTags = interests.items.map(i => `<span class="interest-tag">${esc(i)}</span>`).join('');

  const socials = i18nConfig.socials || {};
  const socialsHtml = Object.entries(socials).filter(([k]) => k !== 'location_link').map(([k, v]) => 
    `<a href="https://${k}.com/${v}" target="_blank" class="interest-tag">${esc(k)}</a>`).join('');

  $('about-content').innerHTML = `
    <div class="about-grid">
      <div class="about-bio">
        <p class="lead">${esc(a.bio_lead)}</p>
        <p>${esc(a.bio)}</p>
        <div class="meta-block" style="margin-top:2rem;">
          <div class="meta-label">${esc(interests.title)}</div>
          <div class="interests-list">${interestTags}</div>
        </div>
        <div class="meta-block">
          <div class="meta-label">Public Profiles</div>
          <div class="interests-list">${socialsHtml}</div>
        </div>
      </div>
      <div class="about-meta">
        <div class="meta-block">
          <div class="meta-label">${esc(ui.based_in)}</div>
          <div class="meta-value"><a href="${esc(socials.location_link)}" target="_blank">${esc(a.location)}</a></div>
        </div>
        <div class="meta-block">
          <div class="meta-label">${esc(ui.spoken_languages)}</div>
          <div class="languages-list">
            ${Object.entries(a.spoken_languages || {}).map(([n, l]) => `<div class="language-item"><span>${esc(n)}</span><span class="level">${esc(l)}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // --- SKILLS ---
  $('skills-title').textContent = sAbout.skills_title;
  $('skills-sub').textContent = sAbout.skills_sub;
  const s = i18nConfig.skills || {};
  const skillGroups = [
    ['bioinformatics', 'Bioinformatics'],
    ['math', 'Mathematics'],
    ['wet_lab', 'Wet Lab'],
    ['devops', 'DevOps & Infra'],
    ['frontend', 'Frontend & Design']
  ].filter(([k]) => s[k] && s[k].length);
  
  $('skills-content').innerHTML = `
    <div class="skills-groups">
      ${skillGroups.map(([k, label]) => `
        <div class="skill-group">
          <h3>${esc(label)}</h3>
          <div class="skill-tags">${s[k].map(t => `<span class="skill-tag">${esc(t)}</span>`).join('')}</div>
        </div>`).join('')}
    </div>
  `;

  // --- EXPERIENCE ---
  $('exp-title').textContent = sAbout.exp_title;
  $('exp-sub').textContent = sAbout.exp_sub;
  const exps = i18nConfig.experience || [];
  const categories = { lab: sAbout.exp_lab, mgmt: sAbout.exp_mgmt, dev: sAbout.exp_dev };
  
  $('experience-content').innerHTML = Object.keys(categories).map(catKey => {
    const items = exps.filter(e => e.category === catKey);
    if (!items.length) return '';
    return `
      <div class="exp-category">
        <h3 class="exp-category-title">${esc(categories[catKey])}</h3>
        ${items.map(e => `
          <div class="exp-item">
            <div class="exp-period">${esc(e.period)}</div>
            <div>
              <div class="exp-role">${esc(e.role)}</div>
              <div class="exp-company">${esc(e.company)}</div>
              <div class="exp-desc">${esc(e.description)}</div>
            </div>
          </div>`).join('')}
      </div>`;
  }).join('');

  // --- PROJECTS ---
  $('proj-title').textContent = sAbout.proj_title;
  $('proj-sub').textContent = sAbout.proj_sub;
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

  // --- RESEARCH ---
  $('research-title').textContent = sAbout.research_title;
  $('research-sub').textContent = sAbout.research_sub;
  const pubs = i18nConfig.publications || [];
  const confs = i18nConfig.conferences || [];
  
  const confHtml = confs.map(c => `
    <a class="conf-item" href="${esc(c.url)}" target="_blank" rel="noopener">
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
        ${p.pdf_url ? `
          <button class="view-pdf-btn" data-pdf="${esc(p.pdf_url)}" style="margin-top: .75rem;">
            ${esc(ui.view_pdf || 'View PDF')}
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');

  $('research-content').innerHTML = `
    <div class="research-grid">
      <div class="research-col">
        <h3 class="research-col-title">${esc(sAbout.research_conf)}</h3>
        <div class="conf-list">${confHtml}</div>
      </div>
      <div class="research-col">
        <h3 class="research-col-title">${esc(sAbout.research_pubs)}</h3>
        <div class="pub-list">${pubHtml}</div>
      </div>
    </div>
  `;

  // --- EDUCATION ---
  $('edu-title').textContent = sAbout.edu_title;
  $('edu-sub').textContent = sAbout.edu_sub;
  const edu = i18nConfig.about.education || [];
  const courses = i18nConfig.about.coursework || [];
  
  $('education-content').innerHTML = `
    <div class="research-grid">
      <div class="research-col">
        ${edu.map(e => `
          <div class="edu-item">
            <div class="edu-degree">${esc(e.degree)}</div>
            <div class="edu-inst">${esc(e.institution)} (${esc(e.period)})</div>
            ${e.thesis_title ? `
              <div class="exp-desc" style="margin-top:.5rem;"><strong>${esc(e.thesis_title)}</strong></div>
            ` : ''}
            ${e.thesis_url ? `
              <button class="view-pdf-btn" data-pdf="${esc(e.thesis_url)}">${esc(ui.view_pdf)}</button>
            ` : ''}
          </div>`).join('')}
      </div>
      <div class="research-col">
        <h3 class="research-col-title">Coursework</h3>
        ${courses.map(c => `
          <div class="edu-item">
            <div class="edu-degree">${esc(c.title)}</div>
            <div class="exp-desc">${esc(c.description)}</div>
            <button class="view-pdf-btn" data-pdf="${esc(c.url)}">${esc(ui.view_pdf)}</button>
          </div>`).join('')}
      </div>
    </div>
  `;

  $('cert-title').textContent = sAbout.cert_title;
  $('cert-sub').textContent = sAbout.cert_sub;
  const certs = i18nConfig.certificates || [];
  
  $('certificates-content').innerHTML = `
    <div class="projects-grid">
      ${certs.map(c => `
        <div class="project-card" style="padding: 1.5rem;">
          <div class="project-name">${esc(c.title)}</div>
          <div class="project-desc">${esc(c.description)}</div>
          ${c.url ? `
            <button class="view-pdf-btn" data-pdf="${esc(c.url)}" style="margin-top: 1rem;">
              ${esc(ui.view_pdf)}
            </button>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;

  // --- CONTACT UI ---
  const c = ui.contact || {};
  $('contactTitle').innerHTML = c.title;
  $('contactIntro').textContent = c.intro;
  $('printContactText').textContent = c.print_contact_text || c.intro;
  $('submitBtn').textContent = c.send;
  $('lbl-name').textContent = c.name;
  $('lbl-email').textContent = c.email;
  $('lbl-subject').textContent = c.subject;
  $('lbl-message').textContent = c.message;

  $('footerAuthor').textContent = a.name || '';
  $('footerYear').textContent = new Date().getFullYear();
}