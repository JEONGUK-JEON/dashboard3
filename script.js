let dashboardData = null;
let selectedEntityName = null;
let trendChart = null;
let barChart = null;
let shareChart = null;

const numberFmt = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percentFmt = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function fmtEok(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${numberFmt.format(value)}억`;
}

function fmtPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value >= 0 ? '+' : ''}${percentFmt.format(value * 100)}%`;
}

function safeDivide(a, b) {
  if (b === 0 || b === null || b === undefined || Number.isNaN(b)) return null;
  return a / b;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function findEntity(name) {
  return dashboardData.entities.find(e => e.name === name);
}

function getValueByMonth(entity, month) {
  return entity.months.find(m => m.month === month) || null;
}

function getYtdSum(entity, year, latestMonthNumber) {
  return entity.months
    .filter(m => m.month.startsWith(String(year)) && Number(m.month.slice(5, 7)) <= latestMonthNumber)
    .reduce((sum, m) => sum + (m.sales_eok || 0), 0);
}

function getYearTotal(entity, year) {
  return entity.months
    .filter(m => m.month.startsWith(String(year)))
    .reduce((sum, m) => sum + (m.sales_eok || 0), 0);
}

function isRealEntity(entity) {
  return entity.category === '법인';
}

function isGroupEntity(entity) {
  return entity.category === 'group';
}

function isTotalEntity(entity) {
  return entity.category === 'total';
}

function getRealEntities() {
  return dashboardData.entities.filter(isRealEntity);
}

function getTopLevelRows() {
  const rows = dashboardData.entities.filter(entity => isTotalEntity(entity) || isGroupEntity(entity));
  const order = ['연합 총계', '국내법인', '해외법인', '판매사'];
  return rows.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
}

function buildEntityButtons() {
  const container = document.getElementById('entityButtons');
  container.innerHTML = '';

  const topRows = getTopLevelRows();
  const topWrap = document.createElement('div');
  topWrap.className = 'entity-row top-row';

  topRows.forEach(entity => {
    const btn = document.createElement('button');
    btn.className = 'entity-btn top-level-btn';
    if (entity.category === 'total') btn.classList.add('total-btn');
    btn.textContent = entity.name;
    btn.dataset.entity = entity.name;
    btn.addEventListener('click', () => selectEntity(entity.name));
    topWrap.appendChild(btn);
  });
  container.appendChild(topWrap);

  ['국내법인', '해외법인', '판매사'].forEach(groupName => {
    const groupEntities = getRealEntities().filter(e => e.group === groupName);
    if (!groupEntities.length) return;

    const groupBlock = document.createElement('div');
    groupBlock.className = 'entity-subgroup';

    const label = document.createElement('div');
    label.className = 'entity-group-label';
    label.textContent = groupName;
    groupBlock.appendChild(label);

    const row = document.createElement('div');
    row.className = 'entity-row';

    groupEntities.forEach(entity => {
      const btn = document.createElement('button');
      btn.className = 'entity-btn';
      btn.textContent = entity.name;
      btn.dataset.entity = entity.name;
      btn.addEventListener('click', () => selectEntity(entity.name));
      row.appendChild(btn);
    });

    groupBlock.appendChild(row);
    container.appendChild(groupBlock);
  });
}

function updateButtonState() {
  document.querySelectorAll('.entity-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.entity === selectedEntityName);
  });
}

function getCompareEntities(selectedEntity) {
  if (selectedEntity.category === 'total') {
    return getRealEntities();
  }
  if (selectedEntity.category === 'group') {
    return getRealEntities().filter(e => e.group === selectedEntity.name);
  }
  if (selectedEntity.category === '법인') {
    return getRealEntities().filter(e => e.group === selectedEntity.group);
  }
  return getRealEntities();
}

function renderKpis(entity) {
  const latest = entity.months[entity.months.length - 1];
  const latestMonth = latest.month;
  const year = Number(latestMonth.slice(0, 4));
  const monthNo = Number(latestMonth.slice(5, 7));
  const priorSameMonth = getValueByMonth(entity, `${year - 1}-${String(monthNo).padStart(2, '0')}`);
  const yoy = priorSameMonth ? safeDivide(latest.sales_eok, priorSameMonth.sales_eok) - 1 : null;
  const ytd = getYtdSum(entity, year, monthNo);
  const priorYtd = getYtdSum(entity, year - 1, monthNo);
  const priorYearTotal = getYearTotal(entity, year - 1);
  const ma12 = latest.ma12_eok;

  setText('kpiCurrentSales', fmtEok(latest.sales_eok));
  setText('kpiYoY', fmtPct(yoy));
  setText('kpiYTD', fmtEok(ytd));
  setText('kpiPriorYTD', fmtEok(priorYtd));
  setText('kpiPriorYearTotal', fmtEok(priorYearTotal));
  setText('kpiMA12', fmtEok(ma12));

  setText('selectedEntityName', entity.name);
  setText('selectedEntityGroup', entity.category === '법인' ? entity.group : entity.name);
  setText('selectedMonth', latestMonth);
  setText('latestMonthLabel', latestMonth);
  setText('trendSubtitle', `${entity.name} 기준 월별 매출 및 12M_MA`);
}

function renderTrendChart(entity) {
  const ctx = document.getElementById('trendChart');
  const labels = entity.months.map(m => m.label);
  const sales = entity.months.map(m => m.sales_eok);
  const ma12 = entity.months.map(m => m.ma12_eok);

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '매출',
          data: sales,
          borderColor: '#2f6bff',
          backgroundColor: 'rgba(47,107,255,0.10)',
          tension: 0.28,
          fill: 'origin',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 3
        },
        {
          label: '12M_MA',
          data: ma12,
          borderColor: '#11b7a4',
          backgroundColor: 'transparent',
          tension: 0.28,
          pointRadius: 0,
          borderWidth: 2.5,
          borderDash: [7, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#334155', usePointStyle: true, boxWidth: 10, padding: 18 }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.92)',
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtEok(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 14 },
          grid: { color: 'rgba(148,163,184,0.12)', drawBorder: false }
        },
        y: {
          title: { display: true, text: '억원', color: '#64748b', font: { weight: '700' } },
          ticks: { color: '#64748b' },
          grid: { color: 'rgba(148,163,184,0.14)', drawBorder: false }
        }
      }
    }
  });
}

function renderBarChart(entity) {
  const latestMonth = dashboardData.latestMonth;
  const compareEntities = getCompareEntities(entity);

  const latestData = compareEntities
    .map(item => {
      const point = getValueByMonth(item, latestMonth);
      return {
        name: item.name,
        value: point ? point.sales_eok : 0
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (entity.category === 'total') {
    setText('compareSubtitle', `${latestMonth} 기준 전체 법인 비교`);
  } else if (entity.category === 'group') {
    setText('compareSubtitle', `${latestMonth} 기준 ${entity.name} 소속 법인 비교`);
  } else {
    setText('compareSubtitle', `${latestMonth} 기준 ${entity.group} 소속 법인 비교`);
  }

  const ctx = document.getElementById('barChart');
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: latestData.map(d => d.name),
      datasets: [{
        label: '당월매출',
        data: latestData.map(d => d.value),
        backgroundColor: latestData.map(d => d.name === entity.name ? 'rgba(47,107,255,0.88)' : 'rgba(15,184,165,0.62)'),
        borderColor: latestData.map(d => d.name === entity.name ? 'rgba(47,107,255,1)' : 'rgba(15,184,165,0.75)'),
        borderWidth: 1,
        borderRadius: 10,
        maxBarThickness: 34
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.92)',
          callbacks: { label: (ctx) => ` ${fmtEok(ctx.parsed.y)}` }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', autoSkip: false, minRotation: 35, maxRotation: 35 },
          grid: { display: false }
        },
        y: {
          title: { display: true, text: '억원', color: '#64748b', font: { weight: '700' } },
          ticks: { color: '#64748b' },
          grid: { color: 'rgba(148,163,184,0.14)', drawBorder: false }
        }
      }
    }
  });
}

function renderShareChart(entity) {
  const canvas = document.getElementById('shareChart');
  if (!canvas) return;

  const latestMonth = dashboardData.latestMonth;
  const compareEntities = getCompareEntities(entity);
  const shareData = compareEntities
    .map(item => {
      const point = getValueByMonth(item, latestMonth);
      return {
        name: item.name,
        value: point ? point.sales_eok : 0
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = shareData.reduce((sum, item) => sum + item.value, 0);

  if (entity.category === 'total') {
    setText('shareSubtitle', `${latestMonth} 기준 전체 법인 매출 비중`);
  } else if (entity.category === 'group') {
    setText('shareSubtitle', `${latestMonth} 기준 ${entity.name} 내 법인별 점유율`);
  } else {
    setText('shareSubtitle', `${latestMonth} 기준 ${entity.group} 내 법인별 점유율`);
  }

  if (shareChart) shareChart.destroy();

  shareChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: shareData.map(d => d.name),
      datasets: [{
        data: shareData.map(d => d.value),
        backgroundColor: [
          '#2f6bff', '#11b7a4', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4',
          '#84cc16', '#f97316', '#14b8a6', '#6366f1', '#a855f7', '#22c55e'
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#334155',
            usePointStyle: true,
            boxWidth: 10,
            padding: 12,
            font: { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.92)',
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed;
              const pct = total ? (value / total * 100) : 0;
              return `${ctx.label}: ${fmtEok(value)} (${pct.toFixed(1)}%)`;
            }
          }
        }
      }
    }
  });
}

function renderDetailTable(entity) {
  const tbody = document.getElementById('detailTableBody');
  tbody.innerHTML = '';
  const recent12 = entity.months.slice(-12);

  recent12.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.label}</td>
      <td>${fmtEok(item.sales_eok)}</td>
      <td>${fmtEok(item.ma12_eok)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function selectEntity(name) {
  selectedEntityName = name;
  const entity = findEntity(name);
  if (!entity) return;

  updateButtonState();
  renderKpis(entity);
  renderTrendChart(entity);
  renderBarChart(entity);
  renderShareChart(entity);
  renderDetailTable(entity);
}

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function unlock() {
  const input = document.getElementById('passwordInput').value;
  const msg = document.getElementById('gateMsg');
  const hash = await sha256(input);

  if (hash === window.DASHBOARD_CONFIG.passwordHash) {
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    msg.textContent = '';
  } else {
    msg.textContent = '비밀번호가 올바르지 않습니다.';
  }
}

async function initDashboard() {
  const hintWrap = document.getElementById('gateHintWrap');
  const hintEl = document.getElementById('passwordHint');
  if (window.DASHBOARD_CONFIG.passwordHint) {
    hintEl.textContent = window.DASHBOARD_CONFIG.passwordHint;
    hintWrap.classList.remove('hidden');
  }

  document.getElementById('unlockBtn').addEventListener('click', unlock);
  document.getElementById('passwordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') unlock();
  });

  const res = await fetch('data.json');
  dashboardData = await res.json();

  buildEntityButtons();
  const defaultEntity = findEntity('연합 총계') ? '연합 총계' : dashboardData.entities[0].name;
  selectEntity(defaultEntity);
}

initDashboard();
