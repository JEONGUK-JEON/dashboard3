
let RAW = null;
let charts = {};

const fmt = (v, suffix='') => {
  if (v === null || v === undefined || Number.isNaN(v)) return '-';
  return `${Number(v).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${suffix}`;
};

const pct = (v) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '-';
  return `${(v * 100).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function unlock() {
  const input = document.getElementById('passwordInput').value;
  const msg = document.getElementById('gateMsg');
  const hash = await sha256(input);
  if (hash === window.DASHBOARD_CONFIG.passwordHash) {
    localStorage.setItem('dashboard_unlocked', '1');
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    msg.textContent = '접속되었습니다.';
  } else {
    msg.textContent = '비밀번호가 올바르지 않습니다.';
  }
}

function recsByEntity(entity) {
  return RAW.records.filter(r => r.entity === entity).sort((a,b) => a.date.localeCompare(b.date));
}

function latestMonth(records) {
  return records.reduce((max, r) => r.month_label > max ? r.month_label : max, '');
}

function renderSelectors() {
  const entitySelect = document.getElementById('entitySelect');
  entitySelect.innerHTML = RAW.entities.map(e => `<option value="${e}">${e}</option>`).join('');
  entitySelect.value = '연합 총계';

  const sectionSelect = document.getElementById('sectionSelect');
  const sections = ['전체', ...RAW.sections.filter(Boolean)];
  sectionSelect.innerHTML = sections.map(s => `<option value="${s}">${s}</option>`).join('');
}

function summarize(entity) {
  const rows = recsByEntity(entity);
  const latest = latestMonth(rows);
  const [yr, mo] = latest.split('-').map(Number);
  const current = rows.find(r => r.month_label === latest)?.sales_eok ?? null;
  const ma3 = rows.find(r => r.month_label === latest)?.ma3_eok ?? null;
  const prev = rows.find(r => r.year === yr - 1 && r.month === mo)?.sales_eok ?? null;
  const yoy = (current && prev) ? current / prev - 1 : null;
  const ytd = rows.filter(r => r.year === yr && r.month <= mo).reduce((a, r) => a + (r.sales_eok || 0), 0);
  const prevYtd = rows.filter(r => r.year === yr - 1 && r.month <= mo).reduce((a, r) => a + (r.sales_eok || 0), 0);

  document.getElementById('latestText').textContent = `데이터 최신월: ${latest} · 기본 선택: ${entity}`;
  document.getElementById('kpiCurrent').textContent = fmt(current, ' 억');
  document.getElementById('kpiYoY').textContent = pct(yoy);
  document.getElementById('kpiYtd').textContent = fmt(ytd, ' 억');
  document.getElementById('kpiPrevYtd').textContent = fmt(prevYtd, ' 억');
  document.getElementById('kpiMa3').textContent = fmt(ma3, ' 억');

  return { rows, latest, yr, mo };
}

function makeTrend(entityRows) {
  const labels = entityRows.map(r => r.month_label);
  const actual = entityRows.map(r => r.sales_eok);
  const ma = entityRows.map(r => r.ma3_eok);
  if (charts.trend) charts.trend.destroy();
  charts.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '매출(억)', data: actual, tension: 0.25, borderWidth: 2 },
        { label: '3M 평균', data: ma, tension: 0.25, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } }
    }
  });
}

function makeSection(latest) {
  const labels = ['국내법인 소계', '해외법인 소계', '판매사 소계'];
  const values = labels.map(name => {
    const rec = RAW.records.find(r => r.entity === name && r.month_label === latest);
    return rec?.sales_eok ?? 0;
  });
  if (charts.section) charts.section.destroy();
  charts.section = new Chart(document.getElementById('sectionChart'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function makeEntityBars(latest, sectionFilter='전체') {
  let rows = RAW.records.filter(r => r.month_label === latest && !r.entity.includes('소계') && r.entity !== '연합 총계');
  if (sectionFilter !== '전체') rows = rows.filter(r => r.section === sectionFilter);
  rows.sort((a,b) => (b.sales_eok || 0) - (a.sales_eok || 0));
  if (charts.entity) charts.entity.destroy();
  charts.entity = new Chart(document.getElementById('entityChart'), {
    type: 'bar',
    data: {
      labels: rows.map(r => r.entity),
      datasets: [{ label: '최신월 매출(억)', data: rows.map(r => r.sales_eok) }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } }
    }
  });
}

function renderAll() {
  const entity = document.getElementById('entitySelect').value;
  const section = document.getElementById('sectionSelect').value;
  const { rows, latest } = summarize(entity);
  makeTrend(rows);
  makeSection(latest);
  makeEntityBars(latest, section);
}

async function init() {
  document.getElementById('unlockBtn').addEventListener('click', unlock);
  document.getElementById('passwordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') unlock();
  });

  if (localStorage.getItem('dashboard_unlocked') === '1') {
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }

  const res = await fetch('./data.json');
  RAW = await res.json();
  renderSelectors();
  document.getElementById('entitySelect').addEventListener('change', renderAll);
  document.getElementById('sectionSelect').addEventListener('change', renderAll);
  renderAll();
}

init();
