(() => {
  'use strict';

  const STORAGE_KEY = 'lise_takip_state_v1';
  const VALID_TABS = new Set(['dashboard', 'courses', 'exams', 'goals']);

  const GRADE_FIELDS = [
    { key: 'exam1', label: '1. Sınav' },
    { key: 'exam2', label: '2. Sınav' },
    { key: 'oral1', label: '1. Sözlü' },
    { key: 'oral2', label: '2. Sözlü' }
  ];

  const DURATION_PRESETS = ['15 dk', '20 dk', '30 dk', '45 dk'];

  // ================================
  // TARİH YARDIMCILARI (YEREL SAAT)
  // ================================
  function getTodayDate() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function formatISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDaysISO(offsetDays) {
    const d = getTodayDate();
    d.setDate(d.getDate() + offsetDays);
    return formatISO(d);
  }

  function parseLocalDate(isoStr) {
    if (typeof isoStr !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoStr.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const parsed = new Date(year, month, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return parsed;
  }

  function getDaysUntil(isoStr) {
    const target = parseLocalDate(isoStr);
    if (!target) return null;
    const today = getTodayDate();
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  function formatDateTR(isoStr) {
    const date = parseLocalDate(isoStr);
    if (!date) return 'Geçersiz tarih';
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  function formatShortMonthTR(isoStr) {
    const date = parseLocalDate(isoStr);
    if (!date) return '';
    return new Intl.DateTimeFormat('tr-TR', { month: 'short' })
      .format(date)
      .replace('.', '');
  }

  function formatTodayFullTR() {
    return new Intl.DateTimeFormat('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }

  function getGreetingTR() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Günaydın';
    if (hour >= 12 && hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  }

  // ================================
  // VARSAYILAN VERİ & DEPOLAMA
  // ================================
  function createDefaultCourses() {
    return [
      {
        id: 'course-mat',
        name: 'Matematik',
        hours: 6,
        grades: { exam1: null, exam2: null, oral1: null, oral2: null }
      },
      {
        id: 'course-fiz',
        name: 'Fizik',
        hours: 2,
        grades: { exam1: null, exam2: null, oral1: null, oral2: null }
      },
      {
        id: 'course-ing',
        name: 'İngilizce',
        hours: 4,
        grades: { exam1: null, exam2: null, oral1: null, oral2: null }
      },
      {
        id: 'course-bil',
        name: 'Bilişim Teknolojileri',
        hours: 6,
        grades: { exam1: null, exam2: null, oral1: null, oral2: null }
      }
    ];
  }

  function createDefaultState() {
    return {
      courses: createDefaultCourses(),
      exams: [
        {
          id: 'exam-seed-1',
          courseName: 'Matematik',
          date: addDaysISO(3),
          topic: '1. Dönem 1. Yazılı — Fonksiyonlar ve Polinomlar',
          completed: false
        },
        {
          id: 'exam-seed-2',
          courseName: 'Fizik',
          date: addDaysISO(8),
          topic: 'Hareket ve Kuvvet Ünitesi',
          completed: false
        },
        {
          id: 'exam-seed-3',
          courseName: 'İngilizce',
          date: addDaysISO(14),
          topic: 'Unit 3-4 Vocabulary & Reading',
          completed: false
        }
      ],
      goals: [
        {
          id: 'goal-seed-1',
          text: '30 dk Temel Matematik pratiği',
          completed: false
        },
        {
          id: 'goal-seed-2',
          text: '20 dk İngilizce kelime/konuşma',
          completed: false
        },
        {
          id: 'goal-seed-3',
          text: '25 dk Fizik soru çözümü',
          completed: false
        }
      ]
    };
  }

  function normalizeGrade(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0 || num > 100) return null;
    return Math.round(num * 100) / 100;
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object') return createDefaultState();

    const courses = Array.isArray(raw.courses)
      ? raw.courses
          .filter((c) => c && typeof c === 'object' && typeof c.name === 'string' && c.name.trim())
          .map((c) => {
            const g = c.grades && typeof c.grades === 'object' ? c.grades : {};
            const parsedHours = Math.round(Number(c.hours));
            const hours = Number.isFinite(parsedHours) ? Math.min(20, Math.max(1, parsedHours)) : 2;
            return {
              id: typeof c.id === 'string' && c.id ? c.id : generateId('course'),
              name: c.name.trim(),
              hours,
              grades: {
                exam1: normalizeGrade(g.exam1),
                exam2: normalizeGrade(g.exam2),
                oral1: normalizeGrade(g.oral1),
                oral2: normalizeGrade(g.oral2)
              }
            };
          })
      : createDefaultCourses();

    const exams = Array.isArray(raw.exams)
      ? raw.exams
          .filter(
            (e) =>
              e &&
              typeof e === 'object' &&
              typeof e.courseName === 'string' &&
              e.courseName.trim() &&
              parseLocalDate(e.date) !== null
          )
          .map((e) => ({
            id: typeof e.id === 'string' && e.id ? e.id : generateId('exam'),
            courseName: e.courseName.trim(),
            date: e.date,
            topic: typeof e.topic === 'string' ? e.topic.trim() : '',
            completed: Boolean(e.completed)
          }))
      : [];

    const goals = Array.isArray(raw.goals)
      ? raw.goals
          .filter((g) => g && typeof g === 'object' && typeof g.text === 'string' && g.text.trim())
          .map((g) => ({
            id: typeof g.id === 'string' && g.id ? g.id : generateId('goal'),
            text: g.text.trim(),
            completed: Boolean(g.completed)
          }))
      : [];

    return { courses, exams, goals };
  }

  function loadState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized === null) {
        const fresh = createDefaultState();
        saveState(fresh);
        return fresh;
      }
      const parsed = JSON.parse(serialized);
      return normalizeState(parsed);
    } catch (err) {
      return createDefaultState();
    }
  }

  function saveState(nextState = state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (err) {
      showToast('Veriler tarayıcıya kaydedilemedi.', 'warning');
    }
  }

  // ================================
  // NOT & OBP HESAPLAMALARI
  // ================================
  function isValidGrade(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
  }

  function getCourseAverage(course) {
    if (!course || !course.grades) return null;
    const valid = GRADE_FIELDS.map((f) => course.grades[f.key]).filter(isValidGrade);
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, n) => acc + n, 0);
    return sum / valid.length;
  }

  function getWeightedOBP(courses) {
    let weightedSum = 0;
    let gradedHours = 0;
    let totalHours = 0;
    let gradedCount = 0;

    for (const course of courses) {
      const hours = Number(course.hours) || 0;
      totalHours += hours;
      const avg = getCourseAverage(course);
      if (avg !== null && hours > 0) {
        weightedSum += avg * hours;
        gradedHours += hours;
        gradedCount += 1;
      }
    }

    return {
      obp: gradedHours > 0 ? weightedSum / gradedHours : null,
      totalHours,
      gradedHours,
      gradedCount,
      totalCourses: courses.length
    };
  }

  function getGradeBadgeMeta(score) {
    if (score === null || !Number.isFinite(score)) {
      return { cls: 'badge-neutral', label: 'Not Yok', text: '—' };
    }
    const rounded = Math.round(score * 100) / 100;
    const formatted = rounded.toFixed(2);
    if (rounded < 50) {
      return { cls: 'badge-danger', label: 'Geliştirilmeli', text: formatted };
    }
    if (rounded < 70) {
      return { cls: 'badge-warning', label: 'Orta', text: formatted };
    }
    if (rounded < 85) {
      return { cls: 'badge-info', label: 'İyi (Teşekkür)', text: formatted };
    }
    return { cls: 'badge-success', label: 'Pekiyi (Takdir)', text: formatted };
  }

  function getExamCountdownMeta(exam) {
    if (exam.completed) {
      return { cls: 'badge-success', text: 'Tamamlandı' };
    }
    const diff = getDaysUntil(exam.date);
    if (diff === null) {
      return { cls: 'badge-neutral', text: 'Tarih yok' };
    }
    if (diff < 0) {
      return { cls: 'badge-danger', text: `${Math.abs(diff)} gün geçti` };
    }
    if (diff === 0) {
      return { cls: 'badge-danger', text: 'Bugün!' };
    }
    if (diff === 1) {
      return { cls: 'badge-warning', text: 'Yarın' };
    }
    if (diff <= 3) {
      return { cls: 'badge-danger', text: `${diff} gün kaldı` };
    }
    if (diff <= 7) {
      return { cls: 'badge-warning', text: `${diff} gün kaldı` };
    }
    return { cls: 'badge-info', text: `${diff} gün kaldı` };
  }

  function getGoalsStats(goals) {
    const total = goals.length;
    const completed = goals.filter((g) => g.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }

  function getNearestExam(exams) {
    const active = exams
      .filter((e) => !e.completed)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    if (active.length === 0) return null;

    const upcoming = active.find((e) => {
      const diff = getDaysUntil(e.date);
      return diff !== null && diff >= 0;
    });

    if (upcoming) return upcoming;
    return active[active.length - 1];
  }

  function getSortedUpcomingExams(exams) {
    return exams
      .filter((e) => !e.completed)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ================================
  // GENEL UI YARDIMCILARI
  // ================================
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function generateId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const ICONS = {
    trash: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>`,
    check: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    undo: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>`,
    arrowRight: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
    award: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"></circle><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"></path></svg>`,
    clock: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    target: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`
  };

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-dot" aria-hidden="true"></span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add('toast-leaving');
      window.setTimeout(() => toast.remove(), 220);
    }, 2600);
  }

  let modalConfirmHandler = null;
  let lastFocusedElement = null;

  function openConfirmModal({ title, message, confirmLabel = 'Sil', danger = true, onConfirm }) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');

    if (!modal || !titleEl || !messageEl || !okBtn) return;

    lastFocusedElement = document.activeElement;
    titleEl.textContent = title;
    messageEl.textContent = message;
    okBtn.textContent = confirmLabel;
    okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
    modalConfirmHandler = onConfirm;

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    okBtn.focus();
  }

  function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (!modal || modal.hidden) return;

    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modalConfirmHandler = null;

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  // ================================
  // UYGULAMA DURUMU & NAVİGASYON
  // ================================
  let state = loadState();
  let activeTab = getInitialTab();
  let examFilter = 'upcoming';

  function getInitialTab() {
    const hash = window.location.hash.replace('#', '').trim();
    return VALID_TABS.has(hash) ? hash : 'dashboard';
  }

  function setMobileSidebarOpen(open) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const toggleBtn = document.getElementById('menu-toggle');
    if (!sidebar || !backdrop || !toggleBtn) return;

    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('visible', open);
    toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function updateChrome() {
    const obpStats = getWeightedOBP(state.courses);
    const obpMeta = getGradeBadgeMeta(obpStats.obp);

    const sidebarObpValue = document.getElementById('sidebar-obp-value');
    const sidebarObpStatus = document.getElementById('sidebar-obp-status');
    const mobileObpPill = document.getElementById('mobile-obp-pill');

    if (sidebarObpValue) {
      sidebarObpValue.textContent = obpMeta.text;
    }
    if (sidebarObpStatus) {
      sidebarObpStatus.className = `badge ${obpMeta.cls}`;
      sidebarObpStatus.textContent = obpMeta.label;
    }
    if (mobileObpPill) {
      mobileObpPill.textContent = `OBP: ${obpMeta.text}`;
    }

    const activeExamsCount = state.exams.filter((e) => !e.completed).length;
    const examsBadge = document.getElementById('nav-exams-badge');
    if (examsBadge) {
      examsBadge.textContent = String(activeExamsCount);
      examsBadge.hidden = activeExamsCount === 0;
    }

    const goalStats = getGoalsStats(state.goals);
    const goalsBadge = document.getElementById('nav-goals-badge');
    if (goalsBadge) {
      goalsBadge.textContent = `${goalStats.completed}/${goalStats.total}`;
    }

    document.querySelectorAll('.nav-item[data-tab]').forEach((btn) => {
      const isCurrent = btn.dataset.tab === activeTab;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });
  }

  function navigateTo(tab, updateHash = true) {
    if (!VALID_TABS.has(tab)) tab = 'dashboard';
    activeTab = tab;

    if (updateHash && window.location.hash !== `#${tab}`) {
      try {
        window.history.replaceState(null, '', `#${tab}`);
      } catch (err) {
        window.location.hash = `#${tab}`;
      }
    }

    setMobileSidebarOpen(false);
    renderActiveView();
  }

  function renderActiveView() {
    const root = document.getElementById('view-root');
    if (!root) return;

    updateChrome();

    if (activeTab === 'dashboard') {
      root.innerHTML = renderDashboardHTML();
      bindDashboardEvents();
    } else if (activeTab === 'courses') {
      root.innerHTML = renderCoursesHTML();
      bindCoursesEvents();
    } else if (activeTab === 'exams') {
      root.innerHTML = renderExamsHTML();
      bindExamsEvents();
    } else if (activeTab === 'goals') {
      root.innerHTML = renderGoalsHTML();
      bindGoalsEvents();
    }
  }

  // ================================
  // 1. ÖZET PANELİ (DASHBOARD)
  // ================================
  function renderGoalRowHTML(goal, compact = false) {
    const rowClass = `goal-row${compact ? ' goal-row-compact' : ''}${goal.completed ? ' is-completed' : ''}`;
    return `
      <div class="${rowClass}" data-goal-id="${escapeHtml(goal.id)}">
        <label class="goal-toggle">
          <input class="goal-checkbox-native" type="checkbox" ${goal.completed ? 'checked' : ''} data-goal-toggle="${escapeHtml(goal.id)}">
          <span class="goal-checkbox-box">${ICONS.check}</span>
          <span class="goal-text">${escapeHtml(goal.text)}</span>
        </label>
        <button class="icon-btn icon-btn-danger" type="button" title="Görevi sil" aria-label="Görevi sil" data-goal-delete="${escapeHtml(goal.id)}">
          ${ICONS.trash}
        </button>
      </div>
    `;
  }

  function renderDashboardHTML() {
    const obpStats = getWeightedOBP(state.courses);
    const obpMeta = getGradeBadgeMeta(obpStats.obp);

    const nearestExam = getNearestExam(state.exams);
    const nearestMeta = nearestExam ? getExamCountdownMeta(nearestExam) : null;

    const upcomingExams = getSortedUpcomingExams(state.exams).slice(0, 5);
    const goalStats = getGoalsStats(state.goals);

    let obpSubtext = 'Henüz not girilmedi. Ders notlarını ekleyerek ortalamanı gör.';
    if (obpStats.obp !== null) {
      obpSubtext = `${obpStats.gradedCount}/${obpStats.totalCourses} ders notlu • ${obpStats.gradedHours} saat üzerinden hesaplandı`;
    } else if (obpStats.totalCourses > 0) {
      obpSubtext = `${obpStats.totalCourses} ders kayıtlı (${obpStats.totalHours} saat) • Not bekleniyor`;
    }

    const nearestBody = nearestExam
      ? `
        <div class="kpi-value-row">
          <span class="kpi-title-value">${escapeHtml(nearestExam.courseName)}</span>
          <span class="badge ${nearestMeta.cls}">${escapeHtml(nearestMeta.text)}</span>
        </div>
        <div class="kpi-meta">
          ${escapeHtml(formatDateTR(nearestExam.date))}${nearestExam.topic ? ` • ${escapeHtml(nearestExam.topic)}` : ''}
        </div>
      `
      : `
        <div class="kpi-value-row">
          <span class="kpi-title-value">Planlı sınav yok</span>
          <span class="badge badge-neutral">Rahat</span>
        </div>
        <div class="kpi-meta">Yaklaşan sınavlarını Sınav Takvimi bölümünden ekleyebilirsin.</div>
      `;

    const upcomingExamsHTML =
      upcomingExams.length > 0
        ? `<div class="mini-exam-list">
            ${upcomingExams
              .map((exam) => {
                const badge = getExamCountdownMeta(exam);
                return `
                  <div class="mini-exam-item">
                    <div class="mini-exam-info">
                      <div class="mini-exam-course">${escapeHtml(exam.courseName)}</div>
                      <div class="mini-exam-meta">
                        ${escapeHtml(formatDateTR(exam.date))}${exam.topic ? ` — ${escapeHtml(exam.topic)}` : ''}
                      </div>
                    </div>
                    <span class="badge ${badge.cls}">${escapeHtml(badge.text)}</span>
                  </div>
                `;
              })
              .join('')}
          </div>`
        : `<div class="empty-state empty-state-compact">
            <div class="empty-state-title">Yaklaşan sınav bulunmuyor</div>
            <div class="empty-state-desc">Yeni bir sınav tarihi eklediğinde burada özetlenecek.</div>
          </div>`;

    const goalsListHTML =
      state.goals.length > 0
        ? `<div id="dash-goals-list" class="goals-list">
            ${state.goals.map((g) => renderGoalRowHTML(g, true)).join('')}
          </div>`
        : `<div id="dash-goals-list" class="empty-state empty-state-compact">
            <div class="empty-state-title">Bugün için hedef yok</div>
            <div class="empty-state-desc">Yukarıdan hızlıca kısa bir çalışma hedefi ekleyebilirsin.</div>
          </div>`;

    return `
      <section class="view-panel">
        <header class="page-header">
          <div>
            <div class="page-eyebrow">Özet Paneli</div>
            <h1 class="page-title">${escapeHtml(getGreetingTR())}, çalışmaya hazır mısın?</h1>
            <p class="page-subtitle">Not durumun, yaklaşan sınavların ve bugünkü çalışma hedeflerin tek ekranda.</p>
          </div>
          <div class="date-chip">${escapeHtml(formatTodayFullTR())}</div>
        </header>

        <div class="kpi-grid">
          <article class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Genel Ağırlıklı Ortalama (OBP)</span>
              <span class="kpi-icon">${ICONS.award}</span>
            </div>
            <div>
              <div class="kpi-value-row">
                <span class="kpi-value">${escapeHtml(obpMeta.text)}</span>
                <span class="badge ${obpMeta.cls}">${escapeHtml(obpMeta.label)}</span>
              </div>
              <p class="kpi-meta" style="margin-top: 8px;">${escapeHtml(obpSubtext)}</p>
            </div>
            <div class="kpi-footer">
              <span class="kpi-meta">Haftalık ders saatine göre ağırlıklı</span>
              <button class="link-btn" type="button" data-go-tab="courses">Notları Aç ${ICONS.arrowRight}</button>
            </div>
          </article>

          <article class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">En Yakın Sınav</span>
              <span class="kpi-icon">${ICONS.clock}</span>
            </div>
            <div>${nearestBody}</div>
            <div class="kpi-footer">
              <span class="kpi-meta">${state.exams.filter((e) => !e.completed).length} aktif sınav</span>
              <button class="link-btn" type="button" data-go-tab="exams">Takvime Git ${ICONS.arrowRight}</button>
            </div>
          </article>

          <article class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Bugünkü Hedef Tamamlanma</span>
              <span class="kpi-icon">${ICONS.target}</span>
            </div>
            <div>
              <div class="kpi-value-row">
                <span id="dash-goals-percent" class="kpi-value">%${goalStats.percent}</span>
                <span id="dash-goals-ratio" class="badge ${goalStats.total > 0 && goalStats.completed === goalStats.total ? 'badge-success' : 'badge-accent'}">
                  ${goalStats.completed}/${goalStats.total} görev
                </span>
              </div>
              <div class="progress-track progress-track-sm" style="margin-top: 12px;">
                <div id="dash-goals-progress" class="progress-fill" style="width: ${goalStats.percent}%;"></div>
              </div>
            </div>
            <div class="kpi-footer">
              <span id="dash-goals-meta" class="kpi-meta">
                ${goalStats.total === 0 ? 'Bugün için hedef ekle' : goalStats.completed === goalStats.total ? 'Bugünkü tüm hedefler tamam!' : `${goalStats.total - goalStats.completed} görev kaldı`}
              </span>
              <button class="link-btn" type="button" data-go-tab="goals">Hedefleri Aç ${ICONS.arrowRight}</button>
            </div>
          </article>
        </div>

        <div class="dashboard-grid">
          <section class="card">
            <div class="card-header">
              <div>
                <h2 class="card-title">Yaklaşan Sınavlar</h2>
                <p class="card-subtitle">Tarihe göre en yakın sınavların</p>
              </div>
              <button class="link-btn" type="button" data-go-tab="exams">Tümünü Gör ${ICONS.arrowRight}</button>
            </div>
            ${upcomingExamsHTML}
          </section>

          <section class="card">
            <div class="card-header">
              <div>
                <h2 class="card-title">Bugünkü Mini Çalışma Görevleri</h2>
                <p class="card-subtitle">Tamamladıklarına hızlıca tik at</p>
              </div>
              <button class="link-btn" type="button" data-go-tab="goals">Yönet ${ICONS.arrowRight}</button>
            </div>

            <form id="dash-quick-goal-form" class="inline-quick-form" autocomplete="off">
              <input id="dash-quick-goal-input" class="input" type="text" maxlength="120" placeholder="Hızlı görev ekle (örn: 20 dk Paragraf)..." required>
              <button class="btn btn-primary btn-sm" type="submit">Ekle</button>
            </form>

            ${goalsListHTML}
          </section>
        </div>
      </section>
    `;
  }

  function updateDashboardGoalSummaryDOM() {
    const goalStats = getGoalsStats(state.goals);
    const percentEl = document.getElementById('dash-goals-percent');
    const ratioEl = document.getElementById('dash-goals-ratio');
    const progressEl = document.getElementById('dash-goals-progress');
    const metaEl = document.getElementById('dash-goals-meta');

    if (percentEl) percentEl.textContent = `%${goalStats.percent}`;
    if (ratioEl) {
      ratioEl.textContent = `${goalStats.completed}/${goalStats.total} görev`;
      ratioEl.className = `badge ${goalStats.total > 0 && goalStats.completed === goalStats.total ? 'badge-success' : 'badge-accent'}`;
    }
    if (progressEl) progressEl.style.width = `${goalStats.percent}%`;
    if (metaEl) {
      metaEl.textContent =
        goalStats.total === 0
          ? 'Bugün için hedef ekle'
          : goalStats.completed === goalStats.total
            ? 'Bugünkü tüm hedefler tamam!'
            : `${goalStats.total - goalStats.completed} görev kaldı`;
    }
  }

  function bindDashboardEvents() {
    document.querySelectorAll('[data-go-tab]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.goTab));
    });

    const quickForm = document.getElementById('dash-quick-goal-form');
    const quickInput = document.getElementById('dash-quick-goal-input');
    if (quickForm && quickInput) {
      quickForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = quickInput.value.trim();
        if (!text) return;
        state.goals.push({ id: generateId('goal'), text, completed: false });
        saveState();
        showToast('Çalışma görevi eklendi.', 'success');
        renderActiveView();
      });
    }

    const goalsContainer = document.getElementById('dash-goals-list');
    if (goalsContainer) {
      goalsContainer.addEventListener('change', (e) => {
        const checkbox = e.target.closest('[data-goal-toggle]');
        if (!checkbox) return;
        const goal = state.goals.find((g) => g.id === checkbox.dataset.goalToggle);
        if (!goal) return;
        goal.completed = checkbox.checked;
        saveState();
        const row = checkbox.closest('.goal-row');
        if (row) row.classList.toggle('is-completed', goal.completed);
        updateDashboardGoalSummaryDOM();
        updateChrome();
      });

      goalsContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-goal-delete]');
        if (!deleteBtn) return;
        const id = deleteBtn.dataset.goalDelete;
        state.goals = state.goals.filter((g) => g.id !== id);
        saveState();
        showToast('Görev silindi.');
        renderActiveView();
      });
    }
  }

  // ================================
  // 2. DERSLER & NOTLAR
  // ================================
  function renderCourseCardHTML(course) {
    const avg = getCourseAverage(course);
    const badge = getGradeBadgeMeta(avg);

    const gradeInputsHTML = GRADE_FIELDS.map((field) => {
      const val = course.grades[field.key];
      const displayVal = isValidGrade(val) ? String(val) : '';
      const inputId = `grade-${escapeHtml(course.id)}-${field.key}`;
      return `
        <div class="grade-field">
          <label for="${inputId}">${field.label}</label>
          <input
            id="${inputId}"
            class="grade-input no-spinner"
            type="number"
            min="0"
            max="100"
            step="any"
            inputmode="decimal"
            placeholder="—"
            value="${escapeHtml(displayVal)}"
            data-course-id="${escapeHtml(course.id)}"
            data-grade-field="${field.key}"
          >
        </div>
      `;
    }).join('');

    return `
      <article class="card course-card" data-course-card="${escapeHtml(course.id)}">
        <div class="course-card-header">
          <div class="course-identity">
            <h3 class="course-name">${escapeHtml(course.name)}</h3>
            <div class="course-hours-row">
              <span>Haftalık</span>
              <input
                class="course-hours-edit no-spinner"
                type="number"
                min="1"
                max="20"
                step="1"
                inputmode="numeric"
                aria-label="${escapeHtml(course.name)} haftalık ders saati"
                value="${course.hours}"
                data-course-hours-id="${escapeHtml(course.id)}"
              >
              <span>saat</span>
            </div>
          </div>

          <div class="course-header-actions">
            <span class="badge badge-lg ${badge.cls}" data-course-avg-badge="${escapeHtml(course.id)}" title="${escapeHtml(badge.label)}">
              Ort: ${escapeHtml(badge.text)}
            </span>
            <button
              class="icon-btn icon-btn-danger"
              type="button"
              title="Dersi sil"
              aria-label="${escapeHtml(course.name)} dersini sil"
              data-course-delete="${escapeHtml(course.id)}"
            >
              ${ICONS.trash}
            </button>
          </div>
        </div>

        <div class="grades-grid">
          ${gradeInputsHTML}
        </div>
      </article>
    `;
  }

  function renderCoursesHTML() {
    const obpStats = getWeightedOBP(state.courses);
    const obpMeta = getGradeBadgeMeta(obpStats.obp);

    const obpDetailText =
      obpStats.obp !== null
        ? `${obpStats.gradedCount}/${obpStats.totalCourses} dersin ortalaması dahil • ${obpStats.gradedHours} saat ağırlıklı`
        : `${obpStats.totalCourses} ders • Toplam ${obpStats.totalHours} haftalık saat (Not girdikçe anlık hesaplanır)`;

    const coursesHTML =
      state.courses.length > 0
        ? `<div id="courses-list" class="courses-grid">
            ${state.courses.map((course) => renderCourseCardHTML(course)).join('')}
          </div>`
        : `<div class="empty-state">
            <div class="empty-state-title">Henüz ekli ders bulunmuyor</div>
            <div class="empty-state-desc">Yukarıdaki formdan ders adını ve haftalık saatini girerek yeni ders ekleyebilirsin.</div>
          </div>`;

    return `
      <section class="view-panel">
        <header class="page-header">
          <div>
            <div class="page-eyebrow">Dersler &amp; Notlar</div>
            <h1 class="page-title">Ders Ortalamaları &amp; Ağırlıklı OBP</h1>
            <p class="page-subtitle">Notlarını 0–100 aralığında gir; ders ortalaman ve haftalık saat ağırlıklı OBP anlık güncellensin.</p>
          </div>
        </header>

        <section class="card obp-banner" aria-label="Genel Ortalama Özeti">
          <div class="obp-main">
            <div class="obp-score-box">
              <span id="courses-obp-value" class="obp-number">${escapeHtml(obpMeta.text)}</span>
              <span id="courses-obp-badge" class="badge badge-lg ${obpMeta.cls}">${escapeHtml(obpMeta.label)}</span>
            </div>
            <div>
              <div class="obp-details-label">Genel Ağırlıklı Ortalama (OBP)</div>
              <div id="courses-obp-meta" class="obp-details-meta">${escapeHtml(obpDetailText)}</div>
            </div>
          </div>

          <div class="grade-legend" aria-label="Not renk açıklaması">
            <span class="badge badge-danger">&lt; 50 Kırmızı</span>
            <span class="badge badge-warning">50–69 Sarı</span>
            <span class="badge badge-info">70–84 Mavi</span>
            <span class="badge badge-success">85+ Yeşil</span>
          </div>
        </section>

        <section class="card form-card">
          <div class="card-header" style="margin-bottom: 12px;">
            <h2 class="card-title">Yeni Ders Ekle</h2>
          </div>
          <form id="add-course-form" class="course-form-grid" autocomplete="off">
            <div class="field">
              <label class="field-label" for="course-name-input">Ders Adı</label>
              <input id="course-name-input" class="input" type="text" maxlength="60" placeholder="Örn: Kimya, Tarih, Edebiyat" required>
            </div>
            <div class="field">
              <label class="field-label" for="course-hours-input">Haftalık Ders Saati</label>
              <input id="course-hours-input" class="input" type="number" min="1" max="20" step="1" value="2" required>
            </div>
            <button class="btn btn-primary" type="submit">+ Ders Ekle</button>
          </form>
        </section>

        ${coursesHTML}
      </section>
    `;
  }

  function updateCoursesSummaryDOM() {
    const obpStats = getWeightedOBP(state.courses);
    const obpMeta = getGradeBadgeMeta(obpStats.obp);

    const valEl = document.getElementById('courses-obp-value');
    const badgeEl = document.getElementById('courses-obp-badge');
    const metaEl = document.getElementById('courses-obp-meta');

    if (valEl) valEl.textContent = obpMeta.text;
    if (badgeEl) {
      badgeEl.className = `badge badge-lg ${obpMeta.cls}`;
      badgeEl.textContent = obpMeta.label;
    }
    if (metaEl) {
      metaEl.textContent =
        obpStats.obp !== null
          ? `${obpStats.gradedCount}/${obpStats.totalCourses} dersin ortalaması dahil • ${obpStats.gradedHours} saat ağırlıklı`
          : `${obpStats.totalCourses} ders • Toplam ${obpStats.totalHours} haftalık saat (Not girdikçe anlık hesaplanır)`;
    }
  }

  function updateCourseCardBadgeDOM(course) {
    const avg = getCourseAverage(course);
    const badge = getGradeBadgeMeta(avg);
    const badgeEl = document.querySelector(`[data-course-avg-badge="${course.id}"]`);
    if (badgeEl) {
      badgeEl.className = `badge badge-lg ${badge.cls}`;
      badgeEl.textContent = `Ort: ${badge.text}`;
      badgeEl.title = badge.label;
    }
  }

  function bindCoursesEvents() {
    const addForm = document.getElementById('add-course-form');
    const nameInput = document.getElementById('course-name-input');
    const hoursInput = document.getElementById('course-hours-input');

    if (addForm && nameInput && hoursInput) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const rawHours = Math.round(Number(hoursInput.value));
        if (!name) return;

        const duplicate = state.courses.some(
          (c) => c.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR')
        );
        if (duplicate) {
          showToast('Bu isimde bir ders zaten ekli.', 'warning');
          nameInput.focus();
          return;
        }

        const hours = Number.isFinite(rawHours) ? Math.min(20, Math.max(1, rawHours)) : 2;
        state.courses.push({
          id: generateId('course'),
          name,
          hours,
          grades: { exam1: null, exam2: null, oral1: null, oral2: null }
        });
        saveState();
        showToast(`${name} dersi eklendi.`, 'success');
        renderActiveView();
      });
    }

    const coursesList = document.getElementById('courses-list');
    if (!coursesList) return;

    // Anlık not ve saat güncellemesi (odak kaybı olmadan cerrahi DOM güncelleme)
    coursesList.addEventListener('input', (e) => {
      const gradeInput = e.target.closest('[data-grade-field]');
      if (gradeInput) {
        const course = state.courses.find((c) => c.id === gradeInput.dataset.courseId);
        const field = gradeInput.dataset.gradeField;
        if (!course || !field) return;

        if (gradeInput.validity && gradeInput.validity.badInput) {
          gradeInput.classList.add('input-invalid');
          return;
        }

        const raw = gradeInput.value.trim();
        if (raw === '') {
          gradeInput.classList.remove('input-invalid');
          course.grades[field] = null;
          saveState();
          updateCourseCardBadgeDOM(course);
          updateCoursesSummaryDOM();
          updateChrome();
          return;
        }

        const num = Number(raw);
        if (!Number.isFinite(num) || num < 0 || num > 100) {
          gradeInput.classList.add('input-invalid');
          return;
        }

        gradeInput.classList.remove('input-invalid');
        course.grades[field] = Math.round(num * 100) / 100;
        saveState();
        updateCourseCardBadgeDOM(course);
        updateCoursesSummaryDOM();
        updateChrome();
        return;
      }

      const hoursInputEdit = e.target.closest('[data-course-hours-id]');
      if (hoursInputEdit) {
        const course = state.courses.find((c) => c.id === hoursInputEdit.dataset.courseHoursId);
        if (!course) return;
        const raw = hoursInputEdit.value.trim();
        const num = Math.round(Number(raw));
        if (raw === '' || !Number.isFinite(num) || num < 1 || num > 20) {
          hoursInputEdit.classList.add('input-invalid');
          return;
        }
        hoursInputEdit.classList.remove('input-invalid');
        course.hours = num;
        saveState();
        updateCoursesSummaryDOM();
        updateChrome();
      }
    });

    // Odaktan çıkınca aralık dışı değerleri güvenli sınıra sabitle
    coursesList.addEventListener(
      'blur',
      (e) => {
        const gradeInput = e.target.closest('[data-grade-field]');
        if (gradeInput) {
          const course = state.courses.find((c) => c.id === gradeInput.dataset.courseId);
          const field = gradeInput.dataset.gradeField;
          if (!course || !field) return;

          const raw = gradeInput.value.trim();
          if (raw === '' && !(gradeInput.validity && gradeInput.validity.badInput)) {
            gradeInput.classList.remove('input-invalid');
            return;
          }

          const num = Number(raw);
          if (!Number.isFinite(num) || (gradeInput.validity && gradeInput.validity.badInput)) {
            const prev = course.grades[field];
            gradeInput.value = isValidGrade(prev) ? String(prev) : '';
            gradeInput.classList.remove('input-invalid');
            return;
          }

          const clamped = Math.round(Math.min(100, Math.max(0, num)) * 100) / 100;
          gradeInput.value = String(clamped);
          gradeInput.classList.remove('input-invalid');
          course.grades[field] = clamped;
          saveState();
          updateCourseCardBadgeDOM(course);
          updateCoursesSummaryDOM();
          updateChrome();
          return;
        }

        const hoursInputEdit = e.target.closest('[data-course-hours-id]');
        if (hoursInputEdit) {
          const course = state.courses.find((c) => c.id === hoursInputEdit.dataset.courseHoursId);
          if (!course) return;
          const num = Math.round(Number(hoursInputEdit.value));
          const clamped = Number.isFinite(num) ? Math.min(20, Math.max(1, num)) : course.hours;
          hoursInputEdit.value = String(clamped);
          hoursInputEdit.classList.remove('input-invalid');
          course.hours = clamped;
          saveState();
          updateCoursesSummaryDOM();
          updateChrome();
        }
      },
      true
    );

    coursesList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('[data-course-delete]');
      if (!deleteBtn) return;
      const id = deleteBtn.dataset.courseDelete;
      const course = state.courses.find((c) => c.id === id);
      if (!course) return;

      openConfirmModal({
        title: 'Dersi Sil',
        message: `"${course.name}" dersini ve girilmiş tüm notlarını silmek istediğine emin misin?`,
        confirmLabel: 'Dersi Sil',
        danger: true,
        onConfirm: () => {
          state.courses = state.courses.filter((c) => c.id !== id);
          saveState();
          showToast(`${course.name} silindi.`);
          renderActiveView();
        }
      });
    });
  }

  // ================================
  // 3. SINAV TAKVİMİ
  // ================================
  function getFilteredSortedExams() {
    const upcoming = state.exams
      .filter((e) => !e.completed)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    const completed = state.exams
      .filter((e) => e.completed)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    if (examFilter === 'upcoming') return upcoming;
    if (examFilter === 'completed') return completed;
    return upcoming.concat(completed);
  }

  function renderExamCardHTML(exam) {
    const dateObj = parseLocalDate(exam.date);
    const dayStr = dateObj ? String(dateObj.getDate()).padStart(2, '0') : '--';
    const monthStr = formatShortMonthTR(exam.date);
    const countdown = getExamCountdownMeta(exam);

    return `
      <article class="card exam-card${exam.completed ? ' is-completed' : ''}" data-exam-id="${escapeHtml(exam.id)}">
        <div class="exam-left">
          <div class="exam-date-box" aria-hidden="true">
            <span class="exam-date-day">${escapeHtml(dayStr)}</span>
            <span class="exam-date-month">${escapeHtml(monthStr)}</span>
          </div>
          <div class="exam-info">
            <h3 class="exam-course">${escapeHtml(exam.courseName)}</h3>
            ${exam.topic ? `<p class="exam-topic">${escapeHtml(exam.topic)}</p>` : ''}
            <div class="exam-full-date">${escapeHtml(formatDateTR(exam.date))}</div>
          </div>
        </div>

        <div class="exam-right">
          <span class="badge ${countdown.cls}">${escapeHtml(countdown.text)}</span>
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            data-exam-toggle="${escapeHtml(exam.id)}"
            title="${exam.completed ? 'Tekrar aktif yap' : 'Tamamlandı olarak işaretle'}"
          >
            ${exam.completed ? `${ICONS.undo} Geri Al` : `${ICONS.check} Tamamlandı`}
          </button>
          <button
            class="icon-btn icon-btn-danger"
            type="button"
            title="Sınavı sil"
            aria-label="${escapeHtml(exam.courseName)} sınavını sil"
            data-exam-delete="${escapeHtml(exam.id)}"
          >
            ${ICONS.trash}
          </button>
        </div>
      </article>
    `;
  }

  function renderExamsHTML() {
    const upcomingCount = state.exams.filter((e) => !e.completed).length;
    const completedCount = state.exams.filter((e) => e.completed).length;
    const allCount = state.exams.length;
    const visibleExams = getFilteredSortedExams();

    const suggestionsHTML = state.courses
      .map((c) => `<option value="${escapeHtml(c.name)}"></option>`)
      .join('');

    const emptyCopy =
      examFilter === 'completed'
        ? {
            title: 'Tamamlanmış sınav yok',
            desc: 'Girdiğin sınavları "Tamamlandı" olarak işaretlediğinde burada saklanır.'
          }
        : {
            title: 'Planlı sınav bulunmuyor',
            desc: 'Yukarıdaki formdan ders adı ve tarih seçerek yeni sınav ekleyebilirsin.'
          };

    const listHTML =
      visibleExams.length > 0
        ? `<div id="exams-list" class="exams-list">
            ${visibleExams.map((exam) => renderExamCardHTML(exam)).join('')}
          </div>`
        : `<div class="empty-state">
            <div class="empty-state-title">${emptyCopy.title}</div>
            <div class="empty-state-desc">${emptyCopy.desc}</div>
          </div>`;

    return `
      <section class="view-panel">
        <header class="page-header">
          <div>
            <div class="page-eyebrow">Sınav Takvimi</div>
            <h1 class="page-title">Yaklaşan Sınavlar &amp; Geri Sayım</h1>
            <p class="page-subtitle">Sınavların tarihe göre yakından uzağa otomatik sıralanır ve kalan gün anlık hesaplanır.</p>
          </div>
        </header>

        <section class="card form-card">
          <div class="card-header" style="margin-bottom: 12px;">
            <h2 class="card-title">Yeni Sınav Ekle</h2>
          </div>
          <form id="add-exam-form" class="exam-form-grid" autocomplete="off">
            <div class="field">
              <label class="field-label" for="exam-course-input">Ders Adı</label>
              <input id="exam-course-input" class="input" type="text" list="course-suggestions" maxlength="60" placeholder="Ders seç veya yaz..." required>
              <datalist id="course-suggestions">${suggestionsHTML}</datalist>
            </div>
            <div class="field">
              <label class="field-label" for="exam-date-input">Sınav Tarihi</label>
              <input id="exam-date-input" class="input" type="date" value="${escapeHtml(addDaysISO(7))}" required>
            </div>
            <div class="field">
              <label class="field-label" for="exam-topic-input">Sınav Konusu / Notu</label>
              <input id="exam-topic-input" class="input" type="text" maxlength="140" placeholder="Örn: 1. Yazılı — Türev ve İntegral">
            </div>
            <button class="btn btn-primary" type="submit">+ Sınav Ekle</button>
          </form>
        </section>

        <div class="filter-bar">
          <div class="filter-pills" role="tablist" aria-label="Sınav filtresi">
            <button class="filter-pill${examFilter === 'upcoming' ? ' active' : ''}" type="button" data-exam-filter="upcoming">
              Yaklaşanlar <span class="filter-count">${upcomingCount}</span>
            </button>
            <button class="filter-pill${examFilter === 'completed' ? ' active' : ''}" type="button" data-exam-filter="completed">
              Tamamlananlar <span class="filter-count">${completedCount}</span>
            </button>
            <button class="filter-pill${examFilter === 'all' ? ' active' : ''}" type="button" data-exam-filter="all">
              Tümü <span class="filter-count">${allCount}</span>
            </button>
          </div>
        </div>

        ${listHTML}
      </section>
    `;
  }

  function bindExamsEvents() {
    const addForm = document.getElementById('add-exam-form');
    const courseInput = document.getElementById('exam-course-input');
    const dateInput = document.getElementById('exam-date-input');
    const topicInput = document.getElementById('exam-topic-input');

    if (addForm && courseInput && dateInput && topicInput) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const courseName = courseInput.value.trim();
        const date = dateInput.value.trim();
        const topic = topicInput.value.trim();

        if (!courseName || !parseLocalDate(date)) {
          showToast('Lütfen geçerli bir ders adı ve tarih gir.', 'warning');
          return;
        }

        state.exams.push({
          id: generateId('exam'),
          courseName,
          date,
          topic,
          completed: false
        });
        saveState();
        examFilter = 'upcoming';
        showToast(`${courseName} sınavı takvime eklendi.`, 'success');
        renderActiveView();
      });
    }

    document.querySelectorAll('[data-exam-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        examFilter = btn.dataset.examFilter;
        renderActiveView();
      });
    });

    const listEl = document.getElementById('exams-list');
    if (!listEl) return;

    listEl.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-exam-toggle]');
      if (toggleBtn) {
        const exam = state.exams.find((x) => x.id === toggleBtn.dataset.examToggle);
        if (!exam) return;
        exam.completed = !exam.completed;
        saveState();
        showToast(exam.completed ? 'Sınav tamamlandı olarak işaretlendi.' : 'Sınav tekrar aktife alındı.');
        renderActiveView();
        return;
      }

      const deleteBtn = e.target.closest('[data-exam-delete]');
      if (deleteBtn) {
        const id = deleteBtn.dataset.examDelete;
        const exam = state.exams.find((x) => x.id === id);
        if (!exam) return;

        openConfirmModal({
          title: 'Sınavı Sil',
          message: `"${exam.courseName}" (${formatDateTR(exam.date)}) sınav kaydını silmek istediğine emin misin?`,
          confirmLabel: 'Sınavı Sil',
          danger: true,
          onConfirm: () => {
            state.exams = state.exams.filter((x) => x.id !== id);
            saveState();
            showToast('Sınav kaydı silindi.');
            renderActiveView();
          }
        });
      }
    });
  }

  // ================================
  // 4. GÜNLÜK ÇALIŞMA & HEDEFLER
  // ================================
  function getGoalsMessage(stats) {
    if (stats.total === 0) return 'Bugün için 3–5 kısa ve net hedef belirleyerek başla.';
    if (stats.completed === 0) return 'Küçük bir adımla başla; ilk görevi tamamlamak ivme kazandırır.';
    if (stats.completed < stats.total) return `Harika gidiyorsun! ${stats.total - stats.completed} hedefin daha var.`;
    return 'Tebrikler! Bugünkü tüm çalışma hedeflerini tamamladın.';
  }

  function renderGoalsHTML() {
    const stats = getGoalsStats(state.goals);
    const presetsHTML = DURATION_PRESETS.map(
      (preset) => `<button class="preset-chip" type="button" data-duration-preset="${preset}">+ ${preset}</button>`
    ).join('');

    const goalsListHTML =
      state.goals.length > 0
        ? `<div id="goals-list" class="goals-list">
            ${state.goals.map((g) => renderGoalRowHTML(g, false)).join('')}
          </div>`
        : `<div class="empty-state">
            <div class="empty-state-title">Günlük görev listen boş</div>
            <div class="empty-state-desc">Bunaltıcı uzun listeler yerine odaklanabileceğin kısa bir görev ekle.</div>
          </div>`;

    const hasCompleted = state.goals.some((g) => g.completed);

    return `
      <section class="view-panel">
        <header class="page-header">
          <div>
            <div class="page-eyebrow">Günlük Çalışma &amp; Hedefler</div>
            <h1 class="page-title">Odaklı Günlük Çalışma Planı</h1>
            <p class="page-subtitle">Uzun listeler yerine kısa, bitirilebilir hedefler koy ve gün içindeki ilerlemeni takip et.</p>
          </div>
        </header>

        <section class="card goals-hero">
          <div class="goals-hero-top">
            <div>
              <div id="goals-percent" class="goals-percent">%${stats.percent}</div>
              <p id="goals-status-copy" class="goals-status-copy">${escapeHtml(getGoalsMessage(stats))}</p>
            </div>
            <div id="goals-ratio-pill" class="goals-ratio-pill">${stats.completed} / ${stats.total} tamamlandı</div>
          </div>
          <div class="progress-track" aria-label="Günlük hedef ilerleme çubuğu">
            <div id="goals-progress-fill" class="progress-fill" style="width: ${stats.percent}%;"></div>
          </div>
        </section>

        <section class="card form-card">
          <form id="add-goal-form" autocomplete="off">
            <div class="goal-form-row">
              <input
                id="goal-text-input"
                class="input"
                type="text"
                maxlength="140"
                placeholder="Örn: 30 dk Temel Matematik pratiği"
                aria-label="Yeni günlük çalışma hedefi"
                required
              >
              <button class="btn btn-primary" type="submit">+ Hedef Ekle</button>
            </div>
            <div class="goal-presets">
              <span class="preset-label">Hızlı süre ekle:</span>
              ${presetsHTML}
            </div>
          </form>
        </section>

        ${goalsListHTML}

        <div class="goals-footer">
          <span class="goals-tip">İpucu: Günde 3–5 kısa ve net hedef belirlemek odaklanmayı artırır.</span>
          ${
            state.goals.length > 0
              ? `<div class="goals-bulk-actions">
                  <button id="clear-completed-goals-btn" class="btn btn-secondary btn-sm" type="button"${hasCompleted ? '' : ' hidden'}>Tamamlananları Temizle</button>
                  <button id="uncheck-all-goals-btn" class="btn btn-secondary btn-sm" type="button">Yeni Gün İçin Sıfırla</button>
                </div>`
              : ''
          }
        </div>
      </section>
    `;
  }

  function updateGoalsHeroDOM() {
    const stats = getGoalsStats(state.goals);
    const percentEl = document.getElementById('goals-percent');
    const copyEl = document.getElementById('goals-status-copy');
    const ratioEl = document.getElementById('goals-ratio-pill');
    const fillEl = document.getElementById('goals-progress-fill');
    const clearDoneBtn = document.getElementById('clear-completed-goals-btn');

    if (percentEl) percentEl.textContent = `%${stats.percent}`;
    if (copyEl) copyEl.textContent = getGoalsMessage(stats);
    if (ratioEl) ratioEl.textContent = `${stats.completed} / ${stats.total} tamamlandı`;
    if (fillEl) fillEl.style.width = `${stats.percent}%`;
    if (clearDoneBtn) clearDoneBtn.hidden = !state.goals.some((g) => g.completed);
  }

  function bindGoalsEvents() {
    const addForm = document.getElementById('add-goal-form');
    const goalInput = document.getElementById('goal-text-input');

    if (addForm && goalInput) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = goalInput.value.trim();
        if (!text) return;
        state.goals.push({ id: generateId('goal'), text, completed: false });
        saveState();
        showToast('Yeni çalışma hedefi eklendi.', 'success');
        renderActiveView();
      });

      document.querySelectorAll('[data-duration-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const preset = btn.dataset.durationPreset;
          const cleaned = goalInput.value.replace(/^\d+\s*dk\s+/i, '').trim();
          goalInput.value = cleaned ? `${preset} ${cleaned}` : `${preset} `;
          goalInput.focus();
        });
      });
    }

    const listEl = document.getElementById('goals-list');
    if (listEl) {
      listEl.addEventListener('change', (e) => {
        const checkbox = e.target.closest('[data-goal-toggle]');
        if (!checkbox) return;
        const goal = state.goals.find((g) => g.id === checkbox.dataset.goalToggle);
        if (!goal) return;
        goal.completed = checkbox.checked;
        saveState();

        const row = checkbox.closest('.goal-row');
        if (row) row.classList.toggle('is-completed', goal.completed);

        updateGoalsHeroDOM();
        updateChrome();
      });

      listEl.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-goal-delete]');
        if (!deleteBtn) return;
        const id = deleteBtn.dataset.goalDelete;
        state.goals = state.goals.filter((g) => g.id !== id);
        saveState();
        showToast('Görev silindi.');
        renderActiveView();
      });
    }

    const clearDoneBtn = document.getElementById('clear-completed-goals-btn');
    if (clearDoneBtn) {
      clearDoneBtn.addEventListener('click', () => {
        state.goals = state.goals.filter((g) => !g.completed);
        saveState();
        showToast('Tamamlanan hedefler temizlendi.');
        renderActiveView();
      });
    }

    const uncheckAllBtn = document.getElementById('uncheck-all-goals-btn');
    if (uncheckAllBtn) {
      uncheckAllBtn.addEventListener('click', () => {
        state.goals.forEach((g) => {
          g.completed = false;
        });
        saveState();
        showToast('Tüm görevler yeni gün için sıfırlandı.');
        renderActiveView();
      });
    }
  }

  // ================================
  // BAŞLATMA (BOOTSTRAP)
  // ================================
  function bindShellEvents() {
    document.querySelectorAll('.nav-item[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.tab));
    });

    const menuToggle = document.getElementById('menu-toggle');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const isOpen = sidebar ? sidebar.classList.contains('open') : false;
        setMobileSidebarOpen(!isOpen);
      });
    }
    if (backdrop) {
      backdrop.addEventListener('click', () => setMobileSidebarOpen(false));
    }

    const resetBtn = document.getElementById('reset-data-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        openConfirmModal({
          title: 'Tüm Verileri Sıfırla',
          message:
            'Girdiğin tüm notlar, eklediğin dersler, sınavlar ve hedefler silinerek başlangıç verilerine dönülecek. Devam etmek istiyor musun?',
          confirmLabel: 'Evet, Sıfırla',
          danger: true,
          onConfirm: () => {
            state = createDefaultState();
            saveState();
            showToast('Uygulama varsayılan verilere sıfırlandı.');
            renderActiveView();
          }
        });
      });
    }

    const modal = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('confirm-cancel');
    const okBtn = document.getElementById('confirm-ok');

    if (cancelBtn) cancelBtn.addEventListener('click', closeConfirmModal);
    if (okBtn) {
      okBtn.addEventListener('click', () => {
        const handler = modalConfirmHandler;
        closeConfirmModal();
        if (typeof handler === 'function') handler();
      });
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeConfirmModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeConfirmModal();
        setMobileSidebarOpen(false);
      }
    });

    window.addEventListener('hashchange', () => {
      const hashTab = window.location.hash.replace('#', '').trim();
      if (VALID_TABS.has(hashTab) && hashTab !== activeTab) {
        navigateTo(hashTab, false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindShellEvents();
    renderActiveView();
  });
})();
