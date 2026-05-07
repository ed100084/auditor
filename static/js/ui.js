import { S } from './state.js';

// ─── Loading / Toast ──────────────────────────────────────────────
export function showLoading(text = '處理中...') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-overlay').classList.remove('hidden');
}
export function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}
export function showError(msg) {
  const t = document.getElementById('error-toast');
  document.getElementById('error-text').textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 5000);
}

// ─── Step Nav ─────────────────────────────────────────────────────
export function updateNavBar(current) {
  for (let i = 1; i <= 5; i++) {
    const nav = document.getElementById(`nav-${i}`);
    if (!nav) continue;
    const dot = nav.querySelector('.step-indicator');
    const label = nav.querySelector('span:last-child');
    dot.className = 'step-indicator w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium';
    if (i < current) {
      dot.classList.add('done');
      label.className = 'text-gray-600';
    } else if (i === current) {
      dot.classList.add('current');
      label.className = 'text-blue-700 font-medium';
    } else {
      dot.classList.add('pending');
      label.className = 'text-gray-400';
    }
  }
}

// ─── Templates ───────────────────────────────────────────────────
const CATEGORY_STYLE = {
  '資安法系列': { badge: 'bg-blue-100 text-blue-700',   border: 'border-blue-400' },
  '醫療特化':   { badge: 'bg-green-100 text-green-700', border: 'border-green-400' },
  '通用IT':     { badge: 'bg-gray-100 text-gray-600',   border: 'border-gray-400' },
  'ISO':        { badge: 'bg-purple-100 text-purple-700', border: 'border-purple-400' },
};

export function renderTemplates(templates) {
  const grid = document.getElementById('template-grid');
  if (!grid) return;

  if (!templates || templates.length === 0) {
    grid.innerHTML = `<p class="text-sm text-gray-400 col-span-full text-center py-4">無法載入範本</p>`;
    return;
  }

  const categories = [...new Set(templates.map(t => t.category))];
  grid.innerHTML = categories.map(cat => {
    const style = CATEGORY_STYLE[cat] || { badge: 'bg-gray-100 text-gray-600', border: 'border-gray-300' };
    const items = templates.filter(t => t.category === cat);
    return `
      <div class="col-span-full">
        <span class="inline-block text-xs font-semibold px-2 py-0.5 rounded ${style.badge} mb-2">${escHtml(cat)}</span>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${items.map(t => `
            <button type="button" id="tmpl-btn-${t.id}"
              onclick="selectTemplate('${t.id}')"
              class="text-left border-2 border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors group">
              <div class="flex items-start justify-between gap-2">
                <span class="text-sm font-medium text-gray-800 group-hover:text-blue-700">${escHtml(t.name)}</span>
                <span class="text-xs text-gray-400 shrink-0">~${t.estimated_questions}題</span>
              </div>
              <p class="text-xs text-gray-500 mt-1 line-clamp-2">${escHtml(t.description)}</p>
            </button>
          `).join('')}
        </div>
      </div>`;
  }).join('');
}

export function highlightSelectedTemplate(templateId) {
  document.querySelectorAll('[id^="tmpl-btn-"]').forEach(btn => {
    btn.classList.remove('border-blue-500', 'bg-blue-50', 'ring-2', 'ring-blue-300');
    btn.classList.add('border-gray-200');
  });
  if (templateId) {
    const el = document.getElementById(`tmpl-btn-${templateId}`);
    if (el) {
      el.classList.remove('border-gray-200');
      el.classList.add('border-blue-500', 'bg-blue-50', 'ring-2', 'ring-blue-300');
    }
    document.getElementById('template-applied-banner').classList.remove('hidden');
  } else {
    document.getElementById('template-applied-banner').classList.add('hidden');
  }
}

// ─── Frameworks ──────────────────────────────────────────────────
export function renderFrameworks(allFrameworks) {
  const container = document.getElementById('framework-list');
  container.innerHTML = allFrameworks.map(fw => `
    <label class="framework-card block cursor-pointer">
      <input type="checkbox" value="${fw.id}" class="sr-only framework-checkbox"
        ${fw.primary ? 'checked' : ''}
        onchange="onFrameworkChange('${fw.id}', this.checked)">
      <div class="card-body border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors ${fw.primary ? 'border-blue-500 bg-blue-50' : ''}">
        <div class="flex items-start gap-3">
          <div class="mt-0.5">
            <div class="w-5 h-5 rounded border-2 ${fw.primary ? 'bg-blue-600 border-blue-600' : 'border-gray-300'} flex items-center justify-center fw-check-${fw.id}">
              ${fw.primary ? '<svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
            </div>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900 text-sm">${fw.name}</span>
              <span class="text-xs text-gray-400">${fw.name_en}</span>
              ${fw.primary ? '<span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">主要法規</span>' : ''}
            </div>
            <p class="text-xs text-gray-500 mt-0.5">${fw.description}</p>
          </div>
        </div>
      </div>
    </label>
    ${fw.id === 'iso27701' ? `
    <label class="framework-card block cursor-pointer">
      <input type="checkbox" value="custom" class="sr-only framework-checkbox" onchange="onCustomToggle(this.checked)">
      <div class="card-body border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-300 transition-colors">
        <div class="flex items-start gap-3">
          <div class="mt-0.5">
            <div class="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center fw-check-custom"></div>
          </div>
          <div>
            <span class="font-medium text-gray-700 text-sm">自訂法規 / 標準文件</span>
            <p class="text-xs text-gray-400 mt-0.5">上傳您的內部規範、作業程序或其他法規文件</p>
          </div>
        </div>
      </div>
    </label>
    ` : ''}
  `).join('');

  S.frameworks = allFrameworks.filter(fw => fw.primary).map(fw => fw.id);
}

// ─── Questions ───────────────────────────────────────────────────
export function renderQuestions() {
  const container = document.getElementById('question-list');
  document.getElementById('q-count-badge').textContent = S.questions.length + ' 題';
  container.innerHTML = S.questions.map((q, i) => {
    const isSystemic = q.dimension === 'systemic';
    const rows = isSystemic ? 8 : 2;
    const dimLabel = isSystemic ? '系統性探詢' : (q.dimension || '');
    return `
    <div class="bg-white border border-gray-200 rounded-lg p-4${isSystemic ? ' border-l-4 border-l-indigo-400' : ''}" id="qcard-${q.id}">
      <div class="flex items-start gap-3">
        <span class="text-xs font-bold text-gray-400 mt-1 w-6 shrink-0 text-right">${i + 1}</span>
        <div class="flex-1">
          <textarea class="w-full text-sm text-gray-800 border-0 p-0 resize-none focus:ring-0 bg-transparent font-mono leading-relaxed"
            rows="${rows}" onchange="updateQuestionText('${q.id}', this.value)">${escHtml(q.text)}</textarea>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">${escHtml(q.category)}</span>
            <span class="text-xs text-gray-400">${escHtml(q.source_framework)}</span>
            ${q.reference ? `<span class="text-xs text-blue-500">${escHtml(q.reference)}</span>` : ''}
            ${dimLabel ? `<span class="text-xs font-semibold px-2 py-0.5 rounded ${dimensionStyle(q.dimension)}">${escHtml(dimLabel)}</span>` : ''}
          </div>
        </div>
        <button onclick="removeQuestion('${q.id}')" class="text-gray-300 hover:text-red-400 transition-colors mt-1 shrink-0">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
}

// ─── Responses ───────────────────────────────────────────────────
export function renderResponses() {
  const container = document.getElementById('response-list');
  updateRespProgress();
  container.innerHTML = S.questions.map((q, i) => {
    const isSystemic = q.dimension === 'systemic';
    const dimLabel = isSystemic ? '系統性探詢' : (q.dimension || '');
    const respRows = isSystemic ? 10 : 4;
    const placeholder = isSystemic
      ? '請依題目各分項逐一回答（可依 (1)(2)(3)(4) 分段說明），並附上所要求的佐證資料說明。'
      : '請輸入受稽單位的回覆...';
    return `
    <div class="bg-white border border-gray-200 rounded-lg p-4${isSystemic ? ' border-l-4 border-l-indigo-400' : ''}">
      <div class="flex items-start gap-2 mb-3">
        <span class="text-xs font-bold text-blue-600 shrink-0 mt-0.5 w-7">Q${i + 1}</span>
        <div class="flex-1 min-w-0">
          <pre class="text-sm font-medium text-gray-800 whitespace-pre-wrap break-words font-sans leading-relaxed">${escHtml(q.text)}</pre>
          <div class="flex gap-2 mt-2 flex-wrap">
            <span class="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">${escHtml(q.category)}</span>
            ${dimLabel ? `<span class="text-xs font-semibold px-2 py-0.5 rounded ${dimensionStyle(q.dimension)}">${escHtml(dimLabel)}</span>` : ''}
            ${q.reference ? `<span class="text-xs text-blue-400">${escHtml(q.reference)}</span>` : ''}
          </div>
        </div>
      </div>
      <textarea class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        rows="${respRows}" placeholder="${escHtml(placeholder)}"
        oninput="updateResponse('${q.id}', this.value)">${escHtml(S.responses[q.id] || '')}</textarea>
    </div>`;
  }).join('');
}

export function updateRespProgress() {
  const answered = S.questions.filter(q => (S.responses[q.id] || '').trim().length > 0).length;
  document.getElementById('resp-progress').textContent = `已回覆 ${answered} / ${S.questions.length}`;
}

// ─── Report Format Toggle ─────────────────────────────────────────
export function setReportFormat(val) {
  S.reportFormat = val;
  document.getElementById('fmt-iia5c').className =
    val === 'iia5c'
      ? 'flex items-start gap-3 p-3 rounded-lg border-2 border-blue-500 bg-blue-50 cursor-pointer'
      : 'flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 bg-white cursor-pointer';
  document.getElementById('fmt-gov').className =
    val === 'gov'
      ? 'flex items-start gap-3 p-3 rounded-lg border-2 border-blue-500 bg-blue-50 cursor-pointer'
      : 'flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 bg-white cursor-pointer';
}

// ─── IIA 5C Findings Renderer ─────────────────────────────────────
export function renderFindings() {
  const report = S.findings;
  if (!report) return;

  if (report.executive_summary) {
    document.getElementById('exec-summary-text').textContent = report.executive_summary;
    document.getElementById('exec-summary').classList.remove('hidden');
  }

  const findings = report.findings || [];
  const container = document.getElementById('findings-list');

  if (findings.length === 0) {
    container.innerHTML = `<div class="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
      <p class="text-green-700 font-medium">未發現重大稽核缺失</p>
      <p class="text-sm text-green-600 mt-1">受稽單位的回覆均符合適用法規要求</p>
    </div>`;
    return;
  }

  const high = findings.filter(f => f.risk_level === 'High').length;
  const med  = findings.filter(f => f.risk_level === 'Medium').length;
  const low  = findings.filter(f => f.risk_level === 'Low').length;

  container.innerHTML = `
    <div class="flex gap-3 mb-4">
      ${high ? `<span class="bg-red-100 text-red-700 text-sm font-medium px-3 py-1 rounded-full">高風險 ${high} 項</span>` : ''}
      ${med  ? `<span class="bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1 rounded-full">中風險 ${med} 項</span>` : ''}
      ${low  ? `<span class="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">低風險 ${low} 項</span>` : ''}
    </div>
    ${findings.map((f, i) => `
    <div class="bg-white border border-gray-200 rounded-lg overflow-hidden risk-${f.risk_level}">
      <details>
        <summary class="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 select-none list-none">
          <span class="text-sm font-bold text-gray-400 shrink-0">F${i + 1}</span>
          <span class="badge-${f.risk_level} text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">${f.risk_level}</span>
          <span class="font-medium text-gray-900 text-sm flex-1">${escHtml(f.title)}</span>
          <span class="text-xs text-gray-400 shrink-0">${escHtml(f.regulatory_reference || '')}</span>
          <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </summary>
        <div class="px-5 pb-5 pt-2 space-y-4 border-t border-gray-100">
          ${(f.legal_basis || f.legal_requirement) ? `
          <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
            ${f.legal_basis ? `<div class="flex items-start gap-2">
              <span class="text-xs font-bold text-indigo-600 shrink-0 mt-0.5 whitespace-nowrap">⚖️ 法源依據</span>
              <p class="text-sm text-indigo-900 font-medium">${escHtml(f.legal_basis)}</p>
            </div>` : ''}
            ${f.legal_requirement ? `<div>
              <p class="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">應辦事項（法條原文）</p>
              <blockquote class="border-l-4 border-indigo-300 pl-3 text-sm text-indigo-800 whitespace-pre-line italic">${escHtml(f.legal_requirement)}</blockquote>
            </div>` : ''}
          </div>` : ''}
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">現況 (Condition)</p>
            <p class="text-sm text-gray-700">${escHtml(f.condition || '')}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">準則 (Criteria)</p>
            <p class="text-sm text-gray-700">${escHtml(f.criteria || '')}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">原因 (Cause)</p>
            <p class="text-sm text-gray-700">${escHtml(f.cause || '')}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">影響 (Effect)</p>
            <p class="text-sm text-gray-700">${escHtml(f.effect || '')}</p>
          </div>
          <div class="bg-green-50 rounded-lg p-3">
            <p class="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">建議改善事項</p>
            <p class="text-sm text-green-800">${escHtml(f.recommendation || '')}</p>
          </div>
        </div>
      </details>
    </div>
    `).join('')}
  `;
}

// ─── Gov Format Findings Renderer ────────────────────────────────
export function renderGovFindings() {
  const report = S.findings;
  if (!report) return;

  if (report.executive_summary) {
    document.getElementById('exec-summary-text').textContent = report.executive_summary;
    document.getElementById('exec-summary').classList.remove('hidden');
  }

  const findings = report.findings || [];
  const container = document.getElementById('findings-list');

  if (findings.length === 0) {
    container.innerHTML = `<div class="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
      <p class="text-green-700 font-medium">未發現重大稽核缺失</p>
      <p class="text-sm text-green-600 mt-1">受稽單位的回覆均符合適用法規要求</p>
    </div>`;
    return;
  }

  const typeStyle = (t) => {
    if (t === '法規不符合') return { badge: 'bg-red-100 text-red-700 border border-red-300', bar: 'border-l-4 border-red-500' };
    if (t === '待改善缺失') return { badge: 'bg-amber-100 text-amber-700 border border-amber-300', bar: 'border-l-4 border-amber-500' };
    return { badge: 'bg-blue-100 text-blue-700 border border-blue-300', bar: 'border-l-4 border-blue-400' };
  };

  const nonComp = findings.filter(f => f.finding_type === '法規不符合').length;
  const improve = findings.filter(f => f.finding_type === '待改善缺失').length;
  const suggest = findings.filter(f => f.finding_type === '建議缺失').length;

  container.innerHTML = `
    <div class="flex flex-wrap gap-3 mb-4">
      ${nonComp ? `<span class="bg-red-100 text-red-700 text-sm font-medium px-3 py-1 rounded-full border border-red-300">法規不符合 ${nonComp} 項</span>` : ''}
      ${improve  ? `<span class="bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1 rounded-full border border-amber-300">待改善缺失 ${improve} 項</span>` : ''}
      ${suggest  ? `<span class="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full border border-blue-300">建議缺失 ${suggest} 項</span>` : ''}
    </div>
    ${findings.map((f, i) => {
      const s = typeStyle(f.finding_type || '建議缺失');
      return `
      <div class="bg-white border border-gray-200 rounded-lg overflow-hidden ${s.bar}">
        <details>
          <summary class="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 select-none list-none">
            <span class="text-sm font-bold text-gray-400 shrink-0">F${i + 1}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${s.badge}">${escHtml(f.finding_type || '')}</span>
            <span class="font-medium text-gray-900 text-sm flex-1">${escHtml(f.title || '')}</span>
            <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </summary>
          <div class="px-5 pb-5 pt-2 space-y-4 border-t border-gray-100">
            <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
              ${f.legal_basis ? `<div class="flex items-start gap-2">
                <span class="text-xs font-bold text-indigo-600 shrink-0 mt-0.5 whitespace-nowrap">⚖️ 法源依據</span>
                <p class="text-sm text-indigo-900 font-medium">${escHtml(f.legal_basis)}</p>
              </div>` : ''}
              ${f.legal_text ? `<div>
                <p class="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">應辦事項（法條原文）</p>
                <blockquote class="border-l-4 border-indigo-300 pl-3 text-sm text-indigo-800 whitespace-pre-line italic">${escHtml(f.legal_text)}</blockquote>
              </div>` : ''}
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">稽核發現說明</p>
              <p class="text-sm text-gray-700 whitespace-pre-line">${escHtml(f.finding_description || '')}</p>
            </div>
            ${f.evidence && f.evidence.length ? `
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">佐證資料</p>
              <ul class="list-disc list-inside space-y-0.5">
                ${f.evidence.map(e => `<li class="text-sm text-gray-700">${escHtml(e)}</li>`).join('')}
              </ul>
            </div>` : ''}
            <div class="bg-green-50 rounded-lg p-3">
              <p class="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">改善建議</p>
              <p class="text-sm text-green-800">${escHtml(f.recommendation || '')}</p>
            </div>
          </div>
        </details>
      </div>`;
    }).join('')}
  `;
}

// ─── 稽核歷史紀錄 ─────────────────────────────────────────────────
export function renderSessionHistory(sessions) {
  const list = document.getElementById('history-list');
  if (!sessions || sessions.length === 0) {
    list.innerHTML = `<p class="text-sm text-gray-500 text-center py-8">尚無稽核紀錄</p>`;
    return;
  }
  list.innerHTML = sessions.map(s => {
    const date = s.created_at ? s.created_at.replace('T', ' ').substring(0, 16) : '';
    const scope = s.scope ? (s.scope.length > 40 ? s.scope.substring(0, 40) + '…' : s.scope) : '（未設定稽核範圍）';
    return `
      <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
        <p class="text-sm font-medium text-gray-800">${escHtml(scope)}</p>
        <p class="text-xs text-gray-400 mt-1">${escHtml(date)}</p>
      </div>`;
  }).join('');
}

// ─── Utility ─────────────────────────────────────────────────────
export function dimensionStyle(dim) {
  const map = {
    'systemic': 'bg-indigo-100 text-indigo-800',
    'P': 'bg-blue-100 text-blue-800',
    'D': 'bg-green-100 text-green-800',
    'C': 'bg-yellow-100 text-yellow-800',
    'A': 'bg-purple-100 text-purple-800',
    '證據': 'bg-orange-100 text-orange-800',
    '例外': 'bg-red-100 text-red-800',
    '意識': 'bg-pink-100 text-pink-800',
  };
  return map[dim] || 'bg-gray-100 text-gray-700';
}

export function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
