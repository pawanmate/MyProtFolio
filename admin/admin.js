// admin/admin.js
// Main Application Controller for Pawan Mate Portfolio Admin Dashboard

let currentData = null;
let hasUnsavedChanges = false;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Authenticate user
  const user = await SupabaseService.getUser();
  if (!user) {
    window.location.href = '/admin/login';
    return;
  }

  // Display user info
  const userEl = document.getElementById('adminUserEmail');
  if (userEl) userEl.textContent = user.email || 'Admin';

  // 2. Setup navigation & sidebar
  initNavigation();

  // 3. Load Draft Content
  await loadPortfolioData();

  // 4. Bind Global Actions (Save Draft, Publish, Discard, Logout, Preview)
  initGlobalActions();
});

// Navigation & Sidebar Handling
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
      if (window.innerWidth <= 900) {
        sidebar.classList.remove('open');
      }
    });
  });

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

function switchView(viewName) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });

  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSec = document.getElementById(`view-${viewName}`);
  if (targetSec) targetSec.classList.add('active');

  const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (activeNav) {
    const titleEl = document.getElementById('currentViewTitle');
    if (titleEl) titleEl.textContent = activeNav.textContent.trim().replace(/^.+?\s/, '');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Data Loading
async function loadPortfolioData() {
  try {
    showToast('Loading draft content...', 'info');
    const res = await SupabaseService.getDraftContent();
    if (!res || !res.draft) {
      throw new Error('No draft content available.');
    }

    currentData = res.draft;
    hasUnsavedChanges = false;
    updateStatusBadge(false);

    // Populate all section forms
    populateAllViews(currentData);

    // Update Overview Stats
    updateOverviewStats(res);

    showToast('Content loaded successfully!', 'success');
  } catch (err) {
    showToast('Failed to load content: ' + err.message, 'error');
  }
}

function updateOverviewStats(res) {
  const projCount = currentData.projects ? currentData.projects.length : 0;
  const skillCount = currentData.skills ? currentData.skills.length : 0;

  const projEl = document.getElementById('statProjectsCount');
  if (projEl) projEl.textContent = projCount;

  const skillEl = document.getElementById('statSkillsCount');
  if (skillEl) skillEl.textContent = skillCount;

  const pubEl = document.getElementById('statLastPublished');
  const pubDetail = document.getElementById('publishTimeDetail');
  const timeStr = res.published_at ? new Date(res.published_at).toLocaleString() : 'Never';
  if (pubEl) pubEl.textContent = timeStr;
  if (pubDetail) pubDetail.textContent = timeStr;
}

function updateStatusBadge(isDirty) {
  hasUnsavedChanges = isDirty;
  const badge = document.getElementById('statusBadge');
  const text = document.getElementById('statusText');
  if (!badge || !text) return;

  if (isDirty) {
    badge.className = 'status-pill unsaved';
    text.textContent = '● Unsaved Draft Changes';
  } else {
    badge.className = 'status-pill synced';
    text.textContent = 'Draft: Synchronized';
  }
}

// Populate all Views
function populateAllViews(data) {
  if (!data) return;

  // 1. Hero
  const hero = data.hero || {};
  setVal('heroEyebrowInput', hero.eyebrow);
  setVal('heroFirstInput', hero.name_first);
  setVal('heroLastInput', hero.name_last);
  setVal('heroIntroInput', hero.intro);
  renderHeroStats(hero.stats || []);
  renderHeroSlides(hero.slider || []);

  // 2. About
  const about = data.about || {};
  setVal('aboutEyebrowInput', about.eyebrow);
  setVal('aboutHeadingInput', about.heading);
  setVal('aboutDescInput', about.description);
  setVal('aboutPurposeHeadingInput', about.purpose_heading);
  setVal('aboutPurposeTextInput', about.purpose_text);
  setVal('aboutEduHeadingInput', about.education_heading);
  setVal('aboutAcademicInput', about.academic_performance);
  setVal('aboutEduTextInput', about.education_text);

  // 3. Skills
  renderSkillsTable(data.skills || []);

  // 4. Projects
  renderProjectsTable(data.projects || []);

  // 5. Education
  renderEducationTable(data.education || []);

  // 6. Experience
  renderExperienceTable(data.experience || []);

  // 7. Certifications
  renderCertificationsTable(data.certifications || []);

  // 8. Achievements
  renderAchievementsTable(data.achievements || []);

  // 9. Activities
  renderActivitiesTable(data.activities || []);

  // 10. CV
  const cv = data.cv_section || {};
  setVal('cvEyebrowInput', cv.eyebrow);
  setVal('cvHeadingInput', cv.heading);
  setVal('cvRoleInput', cv.role);
  setVal('cvTextInput', cv.text);
  const cvLink = document.getElementById('currentCvLink');
  if (cvLink && cv.file) cvLink.href = cv.file;

  // 11. Contact
  const contact = data.contact || {};
  setVal('contactEmailInput', contact.email);
  setVal('contactPhoneInput', contact.phone);
  setVal('contactLocationInput', contact.location);
  setVal('contactHeadingInput', contact.heading);
  setVal('footerTextInput', data.site?.footer);

  // 12. Social
  setVal('socialLinkedinInput', contact.linkedin_url);
  setVal('socialPortfolioInput', contact.portfolio_url);
  setVal('socialGithubInput', contact.github_url);
  setVal('socialInstagramInput', contact.instagram_url);

  // 13. Appearance
  const app = data.appearance || {};
  setVal('appAccentColor', app.accent_color || '#ff9a4a');
  setVal('appAccentColorText', app.accent_color || '#ff9a4a');
  setVal('appBgColor', app.bg_color || '#0b1020');
  setVal('appBgColorText', app.bg_color || '#0b1020');
  setChecked('appBlueprintToggle', app.blueprint_overlay !== false);
  setChecked('appCursorGlowToggle', app.cursor_glow !== false);
  setChecked('appMotionToggle', app.motion_animations !== false);

  // 14. Sections
  renderSectionsManager(data.sections || []);

  // 15. SEO
  const seo = data.seo || {};
  setVal('seoTitleInput', seo.title);
  setVal('seoDescInput', seo.description);
  setVal('seoKeywordsInput', seo.keywords);
  setVal('seoAuthorInput', seo.author);
}

// Helpers for input elements
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val !== undefined && val !== null ? val : '';
}
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function setChecked(id, bool) {
  const el = document.getElementById(id);
  if (el) el.checked = !!bool;
}
function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

// Render Hero Components
function renderHeroStats(stats) {
  const container = document.getElementById('heroStatsContainer');
  if (!container) return;
  container.innerHTML = stats.map((s, idx) => `
    <div class="form-group" style="background: var(--bg); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--line);">
      <label class="form-label">Stat ${idx + 1} Number</label>
      <input type="text" class="form-control stat-val" data-idx="${idx}" value="${s.value}">
      <label class="form-label" style="margin-top: 6px;">Stat ${idx + 1} Label</label>
      <input type="text" class="form-control stat-label" data-idx="${idx}" value="${s.label}">
    </div>
  `).join('');

  container.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = inp.dataset.idx;
      if (inp.classList.contains('stat-val')) currentData.hero.stats[idx].value = inp.value;
      if (inp.classList.contains('stat-label')) currentData.hero.stats[idx].label = inp.value;
      updateStatusBadge(true);
    });
  });
}

function renderHeroSlides(slides) {
  const container = document.getElementById('heroSlidesList');
  if (!container) return;
  container.innerHTML = slides.map((s, i) => `
    <div style="display: flex; gap: 12px; align-items: center; background: var(--bg); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--line);">
      <img src="${s.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
      <div style="flex: 1;">
        <input type="text" class="form-control slide-label" data-idx="${i}" value="${s.label}" placeholder="Slide label">
        <input type="text" class="form-control slide-img" data-idx="${i}" value="${s.image}" style="margin-top: 4px;" placeholder="Image URL">
      </div>
      <button class="btn btn-sm btn-danger" onclick="removeHeroSlide(${i})">Delete</button>
    </div>
  `).join('');

  container.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = inp.dataset.idx;
      if (inp.classList.contains('slide-label')) currentData.hero.slider[idx].label = inp.value;
      if (inp.classList.contains('slide-img')) currentData.hero.slider[idx].image = inp.value;
      updateStatusBadge(true);
    });
  });
}

function addHeroSlide() {
  if (!currentData.hero.slider) currentData.hero.slider = [];
  currentData.hero.slider.push({
    project_index: 0,
    image: "assets/highres/post-office-1.png",
    alt: "New featured project",
    label: "Project Highlight"
  });
  renderHeroSlides(currentData.hero.slider);
  updateStatusBadge(true);
}

function removeHeroSlide(idx) {
  currentData.hero.slider.splice(idx, 1);
  renderHeroSlides(currentData.hero.slider);
  updateStatusBadge(true);
}

// Render Skills Table
function renderSkillsTable(skills) {
  const tbody = document.getElementById('skillsTableBody');
  if (!tbody) return;
  tbody.innerHTML = skills.map((s, idx) => `
    <tr>
      <td style="font-size: 20px;">${s.icon || '📐'}</td>
      <td><b>${s.name}</b></td>
      <td><code>${s.id}</code></td>
      <td><span class="status-pill">${s.category || 'Tool'}</span></td>
      <td style="color: var(--text-muted); max-width: 320px;">${s.description}</td>
      <td class="item-row-actions">
        <button class="btn btn-sm" onclick="editSkill(${idx})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteSkill(${idx})">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Render Projects Table (CRUD)
function renderProjectsTable(projects) {
  const tbody = document.getElementById('projectsTableBody');
  if (!tbody) return;

  const countLabel = document.getElementById('projectsCountLabel');
  if (countLabel) countLabel.textContent = `Showing ${projects.length} projects`;

  tbody.innerHTML = projects.map((p, idx) => `
    <tr>
      <td>
        <img src="${p.image}" style="width: 50px; height: 40px; object-fit: contain; background: #fff; border-radius: 4px; border: 1px solid var(--line);">
      </td>
      <td>
        <b>${p.title}</b>
        <div style="font-size: 11px; color: var(--text-muted);">${p.type || ''}</div>
      </td>
      <td><span class="status-pill">${p.tag}</span></td>
      <td>${p.software}</td>
      <td>${(p.documents || []).length} PDF(s)</td>
      <td>${p.featured ? '⭐ Yes' : 'No'}</td>
      <td class="item-row-actions">
        <button class="btn btn-sm" onclick="moveProject(${idx}, -1)" title="Move Up">↑</button>
        <button class="btn btn-sm" onclick="moveProject(${idx}, 1)" title="Move Down">↓</button>
        <button class="btn btn-sm" onclick="duplicateProject(${idx})" title="Duplicate">Copy</button>
        <button class="btn btn-sm btn-cyan" onclick="openProjectModal(${idx})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProject(${idx})">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Project Modal & CRUD Actions
function openProjectModal(idx = -1) {
  document.getElementById('editProjectIndex').value = idx;
  const isEdit = idx >= 0 && currentData.projects[idx];
  const p = isEdit ? currentData.projects[idx] : {
    title: '',
    tag: 'AUTOCAD · STRUCTURAL',
    categories: ['autocad'],
    description: '',
    type: 'Civil Design',
    software: 'AutoCAD',
    skills: 'Drafting · Planning',
    scale: 'Scale 1:100',
    image: 'assets/highres/post-office-1.png',
    gallery: [],
    documents: [],
    featured: false,
    visible: true
  };

  document.getElementById('projectModalTitle').textContent = isEdit ? 'Edit Project' : 'Add New Project';
  setVal('projTitle', p.title);
  setVal('projTag', p.tag);
  setVal('projCategories', (p.categories || []).join(', '));
  setVal('projDesc', p.description);
  setVal('projType', p.type);
  setVal('projSoftware', p.software);
  setVal('projSkills', p.skills);
  setVal('projScale', p.scale);
  setVal('projImage', p.image);
  setVal('projGallery', (p.gallery || []).join('\n'));
  setVal('projDocuments', (p.documents || []).join('\n'));
  setChecked('projFeatured', p.featured);
  setChecked('projVisible', p.visible !== false);

  const preview = document.getElementById('projImgPreview');
  if (preview) preview.src = p.image || '';

  openModal('projectModal');
}

function saveProjectItem() {
  const idx = parseInt(document.getElementById('editProjectIndex').value, 10);
  const title = getVal('projTitle');
  if (!title) {
    alert('Project title is required.');
    return;
  }

  const galleryList = getVal('projGallery').split('\n').map(s => s.trim()).filter(Boolean);
  const docList = getVal('projDocuments').split('\n').map(s => s.trim()).filter(Boolean);
  const catList = getVal('projCategories').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const newProj = {
    title,
    tag: getVal('projTag') || 'CIVIL · PROJECT',
    categories: catList.length ? catList : ['civil'],
    description: getVal('projDesc'),
    type: getVal('projType'),
    software: getVal('projSoftware'),
    skills: getVal('projSkills'),
    scale: getVal('projScale'),
    image: getVal('projImage') || 'assets/highres/post-office-1.png',
    gallery: galleryList.length ? galleryList : [getVal('projImage')],
    documents: docList,
    featured: getChecked('projFeatured'),
    visible: getChecked('projVisible')
  };

  if (!currentData.projects) currentData.projects = [];

  if (idx >= 0) {
    currentData.projects[idx] = newProj;
    showToast('Project updated!', 'success');
  } else {
    currentData.projects.unshift(newProj);
    showToast('Project added!', 'success');
  }

  renderProjectsTable(currentData.projects);
  closeModal('projectModal');
  updateStatusBadge(true);
}

function duplicateProject(idx) {
  const p = JSON.parse(JSON.stringify(currentData.projects[idx]));
  p.title += ' (Copy)';
  currentData.projects.splice(idx + 1, 0, p);
  renderProjectsTable(currentData.projects);
  updateStatusBadge(true);
  showToast('Project duplicated!', 'info');
}

function deleteProject(idx) {
  if (confirm(`Are you sure you want to delete "${currentData.projects[idx].title}"?`)) {
    currentData.projects.splice(idx, 1);
    renderProjectsTable(currentData.projects);
    updateStatusBadge(true);
    showToast('Project deleted.', 'warning');
  }
}

function moveProject(idx, direction) {
  const target = idx + direction;
  if (target < 0 || target >= currentData.projects.length) return;
  const temp = currentData.projects[idx];
  currentData.projects[idx] = currentData.projects[target];
  currentData.projects[target] = temp;
  renderProjectsTable(currentData.projects);
  updateStatusBadge(true);
}

// Media Uploaders
async function handleProjectImageUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  try {
    showToast('Uploading project image...', 'info');
    const url = await SupabaseService.uploadFile(file, 'projects');
    document.getElementById('projImage').value = url;
    document.getElementById('projImgPreview').src = url;
    showToast('Image uploaded successfully!', 'success');
  } catch (err) {
    showToast('Upload failed: ' + err.message, 'error');
  }
}

async function handleProjectDocUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  try {
    showToast('Uploading PDF document...', 'info');
    const url = await SupabaseService.uploadFile(file, 'documents');
    const docs = document.getElementById('projDocuments');
    docs.value = (docs.value.trim() ? docs.value.trim() + '\n' : '') + url;
    showToast('Document uploaded successfully!', 'success');
  } catch (err) {
    showToast('Upload failed: ' + err.message, 'error');
  }
}

async function handleCvUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  try {
    const textEl = document.getElementById('cvUploadText');
    textEl.textContent = '⏳ Uploading CV PDF...';
    const url = await SupabaseService.uploadFile(file, 'cv');
    if (!currentData.cv_section) currentData.cv_section = {};
    currentData.cv_section.file = url;
    document.getElementById('currentCvLink').href = url;
    textEl.textContent = '✅ Uploaded: ' + file.name;
    updateStatusBadge(true);
    showToast('Resume / CV uploaded successfully!', 'success');
  } catch (err) {
    showToast('Upload failed: ' + err.message, 'error');
  }
}

// Dynamic Section Manager
function renderSectionsManager(sections) {
  const list = document.getElementById('sectionManagerList');
  if (!list) return;
  list.innerHTML = sections.map((sec, i) => `
    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg); padding: 14px 18px; border-radius: var(--radius-sm); border: 1px solid var(--line);">
      <div style="display: flex; align-items: center; gap: 14px;">
        <span style="font-weight: 700; color: var(--accent);">${i + 1}.</span>
        <b>${sec.name}</b>
        <code style="color: var(--text-muted); font-size: 11px;">#${sec.id}</code>
      </div>
      <div style="display: flex; align-items: center; gap: 14px;">
        <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
          <input type="checkbox" ${sec.visible !== false ? 'checked' : ''} onchange="toggleSectionVis(${i}, this.checked)">
          Visible on Website
        </label>
        <button class="btn btn-sm" onclick="moveSection(${i}, -1)">↑</button>
        <button class="btn btn-sm" onclick="moveSection(${i}, 1)">↓</button>
      </div>
    </div>
  `).join('');
}

function toggleSectionVis(i, checked) {
  currentData.sections[i].visible = checked;
  updateStatusBadge(true);
}

function moveSection(i, dir) {
  const target = i + dir;
  if (target < 0 || target >= currentData.sections.length) return;
  const temp = currentData.sections[i];
  currentData.sections[i] = currentData.sections[target];
  currentData.sections[target] = temp;
  renderSectionsManager(currentData.sections);
  updateStatusBadge(true);
}

// Education, Experience, Certifications, Achievements, Activities Table Handlers
function renderEducationTable(items) {
  const tbody = document.getElementById('educationTableBody');
  if (!tbody) return;
  tbody.innerHTML = items.map((it, idx) => `
    <tr>
      <td><b>${it.degree}</b></td>
      <td>${it.institution}</td>
      <td>${it.duration}</td>
      <td><span class="status-pill">${it.score || ''}</span></td>
      <td style="color: var(--text-muted);">${it.details || ''}</td>
      <td class="item-row-actions">
        <button class="btn btn-sm btn-danger" onclick="deleteEducationItem(${idx})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderExperienceTable(items) {
  const tbody = document.getElementById('experienceTableBody');
  if (!tbody) return;
  tbody.innerHTML = items.map((it, idx) => `
    <tr>
      <td><b>${it.role}</b></td>
      <td>${it.organization}</td>
      <td>${it.duration}</td>
      <td style="color: var(--text-muted);">${it.details || ''}</td>
      <td class="item-row-actions">
        <button class="btn btn-sm btn-danger" onclick="deleteExperienceItem(${idx})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderCertificationsTable(items) {
  const tbody = document.getElementById('certificationsTableBody');
  if (!tbody) return;
  tbody.innerHTML = items.map((it, idx) => `
    <tr>
      <td><b>${it.title}</b></td>
      <td>${it.issuer}</td>
      <td>${it.year}</td>
      <td style="color: var(--text-muted);">${it.description || ''}</td>
      <td class="item-row-actions">
        <button class="btn btn-sm btn-danger" onclick="deleteCertificationItem(${idx})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderAchievementsTable(items) {
  const tbody = document.getElementById('achievementsTableBody');
  if (!tbody) return;
  tbody.innerHTML = items.map((it, idx) => `
    <tr>
      <td><b>${it.title}</b></td>
      <td>${it.organization}</td>
      <td>${it.year}</td>
      <td style="color: var(--text-muted);">${it.details || ''}</td>
      <td class="item-row-actions">
        <button class="btn btn-sm btn-danger" onclick="deleteAchievementItem(${idx})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderActivitiesTable(items) {
  const tbody = document.getElementById('activitiesTableBody');
  if (!tbody) return;
  tbody.innerHTML = items.map((it, idx) => `
    <tr>
      <td><b>${it.title}</b></td>
      <td>${it.organization}</td>
      <td><span class="status-pill">${it.role || ''}</span></td>
      <td style="color: var(--text-muted);">${it.description || ''}</td>
      <td class="item-row-actions">
        <button class="btn btn-sm btn-danger" onclick="deleteActivityItem(${idx})">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Delete Helpers
function deleteEducationItem(idx) { currentData.education.splice(idx, 1); renderEducationTable(currentData.education); updateStatusBadge(true); }
function deleteExperienceItem(idx) { currentData.experience.splice(idx, 1); renderExperienceTable(currentData.experience); updateStatusBadge(true); }
function deleteCertificationItem(idx) { currentData.certifications.splice(idx, 1); renderCertificationsTable(currentData.certifications); updateStatusBadge(true); }
function deleteAchievementItem(idx) { currentData.achievements.splice(idx, 1); renderAchievementsTable(currentData.achievements); updateStatusBadge(true); }
function deleteActivityItem(idx) { currentData.activities.splice(idx, 1); renderActivitiesTable(currentData.activities); updateStatusBadge(true); }

// Global Actions (Save Section, Save Draft, Publish, Discard, Preview)
function saveSectionChanges(sectionName) {
  gatherFormData();
  saveDraftToDatabase();
}

function gatherFormData() {
  if (!currentData) return;

  // Hero
  if (!currentData.hero) currentData.hero = {};
  currentData.hero.eyebrow = getVal('heroEyebrowInput');
  currentData.hero.name_first = getVal('heroFirstInput');
  currentData.hero.name_last = getVal('heroLastInput');
  currentData.hero.intro = getVal('heroIntroInput');

  // About
  if (!currentData.about) currentData.about = {};
  currentData.about.eyebrow = getVal('aboutEyebrowInput');
  currentData.about.heading = getVal('aboutHeadingInput');
  currentData.about.description = getVal('aboutDescInput');
  currentData.about.purpose_heading = getVal('aboutPurposeHeadingInput');
  currentData.about.purpose_text = getVal('aboutPurposeTextInput');
  currentData.about.education_heading = getVal('aboutEduHeadingInput');
  currentData.about.academic_performance = getVal('aboutAcademicInput');
  currentData.about.education_text = getVal('aboutEduTextInput');

  // CV Section
  if (!currentData.cv_section) currentData.cv_section = {};
  currentData.cv_section.eyebrow = getVal('cvEyebrowInput');
  currentData.cv_section.heading = getVal('cvHeadingInput');
  currentData.cv_section.role = getVal('cvRoleInput');
  currentData.cv_section.text = getVal('cvTextInput');

  // Contact
  if (!currentData.contact) currentData.contact = {};
  currentData.contact.email = getVal('contactEmailInput');
  currentData.contact.phone = getVal('contactPhoneInput');
  currentData.contact.location = getVal('contactLocationInput');
  currentData.contact.heading = getVal('contactHeadingInput');
  currentData.contact.linkedin_url = getVal('socialLinkedinInput');
  currentData.contact.portfolio_url = getVal('socialPortfolioInput');
  currentData.contact.github_url = getVal('socialGithubInput');
  currentData.contact.instagram_url = getVal('socialInstagramInput');

  if (!currentData.site) currentData.site = {};
  currentData.site.footer = getVal('footerTextInput');

  // Appearance
  if (!currentData.appearance) currentData.appearance = {};
  currentData.appearance.accent_color = getVal('appAccentColorText') || getVal('appAccentColor');
  currentData.appearance.bg_color = getVal('appBgColorText') || getVal('appBgColor');
  currentData.appearance.blueprint_overlay = getChecked('appBlueprintToggle');
  currentData.appearance.cursor_glow = getChecked('appCursorGlowToggle');
  currentData.appearance.motion_animations = getChecked('appMotionToggle');

  // SEO
  if (!currentData.seo) currentData.seo = {};
  currentData.seo.title = getVal('seoTitleInput');
  currentData.seo.description = getVal('seoDescInput');
  currentData.seo.keywords = getVal('seoKeywordsInput');
  currentData.seo.author = getVal('seoAuthorInput');
}

async function saveDraftToDatabase() {
  try {
    gatherFormData();
    showToast('Saving draft to database...', 'info');
    const res = await SupabaseService.saveDraft(currentData);
    updateStatusBadge(false);
    showToast('Draft successfully saved!', 'success');
  } catch (err) {
    showToast('Failed to save draft: ' + err.message, 'error');
  }
}

async function publishLiveWebsite() {
  if (!confirm('Are you sure you want to publish the draft to the live website? Live visitors will see your changes immediately.')) {
    return;
  }

  try {
    gatherFormData();
    showToast('Publishing to live website...', 'info');
    const res = await SupabaseService.publish(currentData);
    updateStatusBadge(false);
    const pubTime = res.published_at ? new Date(res.published_at).toLocaleString() : 'Just now';
    document.getElementById('publishTimeDetail').textContent = pubTime;
    document.getElementById('statLastPublished').textContent = pubTime;
    showToast('Website is LIVE with updated changes!', 'success');
  } catch (err) {
    showToast('Publishing failed: ' + err.message, 'error');
  }
}

async function discardUnsavedChanges() {
  if (!confirm('Discard all unsaved draft changes and restore the currently published version? This action cannot be undone.')) {
    return;
  }

  try {
    showToast('Discarding draft changes...', 'info');
    const res = await SupabaseService.discardDraft();
    currentData = res.content;
    populateAllViews(currentData);
    updateStatusBadge(false);
    showToast('Draft reverted to live published version.', 'warning');
  } catch (err) {
    showToast('Failed to discard changes: ' + err.message, 'error');
  }
}

function openPreviewTab() {
  // Store preview payload or token
  window.open('/?preview=true', '_blank');
}

function initGlobalActions() {
  document.getElementById('saveDraftBtn').addEventListener('click', saveDraftToDatabase);
  document.getElementById('publishTopBtn').addEventListener('click', publishLiveWebsite);
  document.getElementById('publishMainBtn').addEventListener('click', publishLiveWebsite);
  document.getElementById('discardChangesBtn').addEventListener('click', discardUnsavedChanges);
  document.getElementById('previewBtn').addEventListener('click', openPreviewTab);
  document.getElementById('logoutBtn').addEventListener('click', () => SupabaseService.logout());

  // Color picker sync
  const accentInp = document.getElementById('appAccentColor');
  const accentTxt = document.getElementById('appAccentColorText');
  if (accentInp && accentTxt) {
    accentInp.addEventListener('input', () => { accentTxt.value = accentInp.value; updateStatusBadge(true); });
    accentTxt.addEventListener('input', () => { accentInp.value = accentTxt.value; updateStatusBadge(true); });
  }

  const bgInp = document.getElementById('appBgColor');
  const bgTxt = document.getElementById('appBgColorText');
  if (bgInp && bgTxt) {
    bgInp.addEventListener('input', () => { bgTxt.value = bgInp.value; updateStatusBadge(true); });
    bgTxt.addEventListener('input', () => { bgInp.value = bgTxt.value; updateStatusBadge(true); });
  }
}

// Modal and Toast Helpers
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
