import { S } from './state.js?v=20260507h';
import { getApiKey, getUserName, setUserName, api, apiUpload, openSSE, fetchTemplates } from './api.js?v=20260507h';
import {
  showLoading, hideLoading, showError,
  updateNavBar,
  renderFrameworks, renderTemplates, highlightSelectedTemplate,
  renderQuestions, renderResponses, updateRespProgress,
  setReportFormat, renderFindings, renderGovFindings,
  renderSessionHistory,
} from './ui.js?v=20260507h';

// Textarea auto-resize helper（供 renderQuestions oninput 呼叫）
window._autoResizeTA = function(el) {
  el.style.height = '0';
  el.style.height = el.scrollHeight + 'px';
};

let allFrameworks = [];
let allTemplates = [];
let selectedTemplate = null;

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  getApiKey();  // 確保 key 存在

  // 初始化使用者名稱欄位
  const unameEl = document.getElementById('user-name-input');
  if (unameEl) {
    unameEl.value = getUserName();
    unameEl.addEventListener('change', () => setUserName(unameEl.value));
  }

  await Promise.all([loadFrameworks(), loadTemplates()]);
  setupCharCounters();
});

// ─── Step Navigation ─────────────────────────────────────────────
function goToStep(n) {
  document.querySelectorAll('.step-panel').forEach(el => el.classList.remove('active'));
  document.getElementById(`step-${n}`).classList.add('active');
  S.currentStep = n;
  updateNavBar(n);
  window.scrollTo(0, 0);
}

// ─── Templates ───────────────────────────────────────────────────
async function loadTemplates() {
  allTemplates = await fetchTemplates();
  renderTemplates(allTemplates);
}

function toggleTemplatePanel() {
  const panel = document.getElementById('template-panel');
  const arrow = document.getElementById('template-arrow');
  const isHidden = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !isHidden);
  arrow.style.transform = isHidden ? 'rotate(180deg)' : '';
}

function selectTemplate(id) {
  const tmpl = allTemplates.find(t => t.id === id);
  if (!tmpl) return;

  selectedTemplate = tmpl;

  // 更新框架選擇：先全部取消，再勾選範本建議的框架
  try {
    allFrameworks.forEach(fw => {
      const cb = document.querySelector(`.framework-checkbox[value="${fw.id}"]`);
      if (cb) {
        const shouldCheck = tmpl.suggested_frameworks.includes(fw.id);
        if (cb.checked !== shouldCheck) {
          cb.checked = shouldCheck;
          onFrameworkChange(fw.id, shouldCheck);
        }
      }
    });
  } catch (e) {
    console.error('selectTemplate framework update error:', e);
  }

  // 更新責任等級
  const respEl = document.getElementById('resp-level');
  if (tmpl.responsibility_levels.length > 0) {
    respEl.value = tmpl.responsibility_levels[0];
  } else {
    respEl.value = '';
  }

  // 預填步驟 2 的範圍與情境
  const scopeEl = document.getElementById('scope-input');
  const contextEl = document.getElementById('context-input');
  const scopeCount = document.getElementById('scope-count');
  const contextCount = document.getElementById('context-count');
  if (scopeEl) {
    scopeEl.value = tmpl.scope;
    if (scopeCount) scopeCount.textContent = tmpl.scope.length + ' 字';
  }
  if (contextEl) {
    contextEl.value = tmpl.context;
    if (contextCount) contextCount.textContent = tmpl.context.length + ' 字';
  }

  highlightSelectedTemplate(id);

  // 更新 banner 顯示範本名稱
  const nameEl = document.getElementById('template-applied-name');
  if (nameEl) nameEl.textContent = tmpl.name;
}

// ─── STEP 1: Framework ───────────────────────────────────────────
async function loadFrameworks() {
  try {
    allFrameworks = await api('GET', '/frameworks');
  } catch (e) {
    allFrameworks = [
      { id: 'csma_core', name: '資通安全管理法', name_en: 'CSMA', description: '資通安全管理法及施行細則', primary: true },
      { id: 'csma_classification', name: '責任等級分級辦法', name_en: 'Level Classification', description: 'A-E 等級管理、技術、人員控制要求', primary: true },
      { id: 'csma_incident', name: '事件通報及應變辦法', name_en: 'Incident Response', description: '1小時通報SLA、事件分級、應變程序', primary: true },
      { id: 'csma_sharing', name: '情資分享辦法', name_en: 'Info Sharing', description: '威脅情資分享義務與保密規定', primary: false },
      { id: 'iso27001', name: 'ISO 27001:2022', name_en: 'ISO 27001', description: 'Annex A 93 項控制措施', primary: false },
      { id: 'iso27701', name: 'ISO 27701:2025', name_en: 'ISO 27701', description: '隱私資訊管理系統控制措施', primary: false },
    ];
  }
  renderFrameworks(allFrameworks);
}

function onFrameworkChange(id, checked) {
  const box = document.querySelector(`.fw-check-${id}`);
  if (!box) return;
  const card = box.closest('.card-body');
  if (checked) {
    S.frameworks.push(id);
    box.classList.replace('border-gray-300', 'border-blue-600');
    box.classList.add('bg-blue-600');
    box.innerHTML = '<svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>';
    card.classList.add('border-blue-500', 'bg-blue-50');
    card.classList.remove('border-gray-200');
  } else {
    S.frameworks = S.frameworks.filter(f => f !== id);
    box.classList.replace('border-blue-600', 'border-gray-300');
    box.classList.remove('bg-blue-600');
    box.innerHTML = '';
    card.classList.remove('border-blue-500', 'bg-blue-50');
    card.classList.add('border-gray-200');
  }
}

function onCustomToggle(checked) {
  const section = document.getElementById('custom-upload-section');
  onFrameworkChange('custom', checked);
  if (checked) {
    section.classList.remove('hidden');
    const box = document.querySelector('.fw-check-custom');
    const card = box.closest('.card-body');
    box.classList.replace('border-gray-300', 'border-blue-600');
    box.classList.add('bg-blue-600');
    box.innerHTML = '<svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>';
    card.classList.add('border-blue-400');
    card.classList.remove('border-gray-300');
  } else {
    section.classList.add('hidden');
  }
}

async function goStep1Next() {
  if (S.frameworks.length === 0) { showError('請至少選擇一個法規框架'); return; }

  showLoading('建立稽核工作階段...');
  try {
    if (!S.sessionId) {
      const userName = getUserName();
      const res = await api('POST', '/sessions', { user_name: userName });
      S.sessionId = res.session_id;
    }

    const fileInput = document.getElementById('custom-file');
    if (S.frameworks.includes('custom') && fileInput.files.length > 0) {
      showLoading('上傳自訂文件...');
      await apiUpload(`/sessions/${S.sessionId}/upload`, fileInput.files[0]);
    }

    S.responsibilityLevel = document.getElementById('resp-level').value || null;
    await api('POST', `/sessions/${S.sessionId}/framework`, {
      frameworks: S.frameworks.filter(f => f !== 'custom'),
      responsibility_level: S.responsibilityLevel,
    });

    goToStep(2);
  } catch (e) {
    showError('發生錯誤：' + e.message);
  } finally {
    hideLoading();
  }
}

// ─── STEP 2: Scope ────────────────────────────────────────────────
function setupCharCounters() {
  ['scope', 'context'].forEach(id => {
    const el = document.getElementById(`${id}-input`);
    const cnt = document.getElementById(`${id}-count`);
    if (el && cnt) {
      el.addEventListener('input', () => { cnt.textContent = el.value.length + ' 字'; });
    }
  });
}

async function goStep2Next() {
  const scope = document.getElementById('scope-input').value.trim();
  const context = document.getElementById('context-input').value.trim();
  if (scope.length < 10) { showError('請輸入至少 10 字的稽核範圍'); return; }
  if (context.length < 10) { showError('請輸入至少 10 字的稽核情境'); return; }

  showLoading('AI 正在產生稽核問題...');
  try {
    await api('POST', `/sessions/${S.sessionId}/scope`, { scope, context });
    const res = await api('POST', `/sessions/${S.sessionId}/questions/generate`);
    S.questions = normalizeQuestions(res.questions || []);
    renderQuestions();
    goToStep(3);
  } catch (e) {
    showError('產生問題失敗：' + e.message);
  } finally {
    hideLoading();
  }
}

// ─── STEP 3: Questions ────────────────────────────────────────────
function updateQuestionText(id, text) {
  const q = S.questions.find(q => q.id === id);
  if (q) q.text = text;
}

function normalizeQuestions(questions) {
  return questions.map(q => {
    const text = questionText(q);
    return {
      ...q,
      id: q.id || crypto.randomUUID(),
      text,
      category: q.category || '治理與合規',
      source_framework: q.source_framework || q.framework || '',
      reference: q.reference || '',
      dimension: q.dimension || 'systemic',
    };
  }).filter(q => q.text.trim().length > 0);
}

function questionText(q) {
  if (!q) return '';
  const keys = [
    'text',
    'question',
    'question_text',
    'content',
    'prompt',
    'audit_question',
    'main_question',
    'control_question',
    'question_content',
    'question_description',
  ];
  for (const key of keys) {
    const value = coerceQuestionText(q[key]);
    if (value) return value;
  }

  const parts = [];
  if (q.title || q.topic) parts.push(q.title || q.topic);
  const subQuestions = q.questions || q.items || q.sub_questions || q.prompts;
  if (Array.isArray(subQuestions)) parts.push(subQuestions.join('\n'));
  else if (subQuestions) parts.push(String(subQuestions));
  const evidence = q.evidence || q.evidence_request || q.documents;
  if (Array.isArray(evidence)) parts.push('★ 請提供：' + evidence.join('、'));
  else if (evidence) parts.push(String(evidence));
  const structured = parts.map(coerceQuestionText).filter(Boolean).join('\n');
  if (structured) return structured;

  return coerceQuestionText(q) || JSON.stringify(q, null, 2);
}

function coerceQuestionText(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.map(coerceQuestionText).filter(Boolean).join('\n');
  }
  if (typeof value === 'object') {
    const skip = new Set(['id', 'category', 'source_framework', 'framework', 'reference', 'dimension']);
    return Object.entries(value)
      .filter(([key, item]) => !skip.has(key) && item !== null && item !== undefined)
      .map(([, item]) => coerceQuestionText(item))
      .filter(Boolean)
      .join('\n');
  }
  return String(value).trim();
}

function removeQuestion(id) {
  S.questions = S.questions.filter(q => q.id !== id);
  renderQuestions();
}

function addQuestion() {
  S.questions.push({
    id: crypto.randomUUID(),
    text: '',
    category: '治理與合規',
    source_framework: '自訂',
    reference: '',
  });
  renderQuestions();
  const textareas = document.querySelectorAll('#question-list textarea');
  if (textareas.length) textareas[textareas.length - 1].focus();
}

async function goStep3Next() {
  const valid = S.questions.filter(q => q.text.trim().length > 5);
  if (valid.length === 0) { showError('請至少保留一個有效問題'); return; }

  showLoading('儲存問題清單...');
  try {
    await api('PUT', `/sessions/${S.sessionId}/questions`, { questions: valid });
    S.questions = valid;
    renderResponses();
    goToStep(4);
  } catch (e) {
    showError('儲存失敗：' + e.message);
  } finally {
    hideLoading();
  }
}

// ─── STEP 4: Responses ────────────────────────────────────────────
function updateResponse(id, text) {
  S.responses[id] = text;
  updateRespProgress();
}

async function goStep4Next() {
  const responses = S.questions.map(q => ({
    question_id: q.id,
    response_text: S.responses[q.id] || '',
  }));

  showLoading('儲存回覆並產生稽核發現...');
  try {
    await api('POST', `/sessions/${S.sessionId}/responses`, { responses });
  } catch (e) {
    hideLoading();
    showError('儲存回覆失敗：' + e.message);
    return;
  }

  goToStep(5);
  document.getElementById('findings-list').innerHTML = `
    <div class="text-center py-12">
      <div class="spinner mx-auto mb-4"></div>
      <p class="text-gray-600 font-medium">AI 正在分析問答紀錄，產生稽核發現...</p>
      <p class="text-sm text-gray-400 mt-1">此步驟約需 15–30 秒</p>
    </div>
  `;
  document.getElementById('exec-summary').classList.add('hidden');
  hideLoading();

  document.getElementById('findings-format-label').textContent =
    S.reportFormat === 'gov'
      ? '政府機關格式（法規不符合・待改善缺失・建議缺失），含應辦事項法條原文'
      : '依 IIA 5C 格式呈現，含法源依據及應辦事項';

  let buffer = '';
  openSSE(S.sessionId, S.reportFormat, {
    onChunk: (chunk) => { buffer += chunk; },
    onRepair: (repaired) => { buffer = repaired; },
    onDone: () => {
      try {
        const cleaned = buffer.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        S.findings = JSON.parse(cleaned);
        if (S.reportFormat === 'gov') renderGovFindings();
        else renderFindings();
      } catch (err) {
        document.getElementById('findings-list').innerHTML = `
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            解析稽核發現時發生錯誤：${err.message}<br>
            <button onclick="goStep4Next()" class="mt-2 underline">重新產生</button>
          </div>`;
      }
    },
    onError: () => {
      document.getElementById('findings-list').innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          連線中斷，請重新產生。
          <button onclick="goStep4Next()" class="mt-2 underline">重試</button>
        </div>`;
    },
  });
}

// ─── 清除範本選擇 ─────────────────────────────────────────────────
function clearTemplate() {
  selectedTemplate = null;
  highlightSelectedTemplate(null);
  document.getElementById('scope-input').value = '';
  document.getElementById('context-input').value = '';
  document.getElementById('scope-count').textContent = '0 字';
  document.getElementById('context-count').textContent = '0 字';
}

// ─── 稽核歷史紀錄 ─────────────────────────────────────────────────
async function showMyAudits() {
  const userName = getUserName();
  if (!userName) {
    showError('請先在右上角輸入使用者名稱');
    return;
  }
  document.getElementById('history-overlay').classList.add('open');
  document.getElementById('history-panel').classList.add('open');
  document.getElementById('history-user-label').textContent = `${userName} 的稽核紀錄`;
  document.getElementById('history-list').innerHTML = `<p class="text-sm text-gray-400 text-center py-8">載入中...</p>`;
  try {
    const sessions = await api('GET', `/sessions?user=${encodeURIComponent(userName)}`);
    renderSessionHistory(sessions);
  } catch (e) {
    document.getElementById('history-list').innerHTML = `<p class="text-sm text-red-500 text-center py-8">載入失敗：${e.message}</p>`;
  }
}

function closeHistory() {
  document.getElementById('history-overlay').classList.remove('open');
  document.getElementById('history-panel').classList.remove('open');
}

// ─── Reset ────────────────────────────────────────────────────────
function startNewAudit() {
  S.sessionId = null;
  S.frameworks = [];
  S.questions = [];
  S.responses = {};
  S.findings = null;
  S.reportFormat = 'iia5c';
  selectedTemplate = null;
  setReportFormat('iia5c');
  document.querySelectorAll('input[name="report-format"]').forEach(r => { r.checked = r.value === 'iia5c'; });
  document.getElementById('scope-input').value = '';
  document.getElementById('context-input').value = '';
  document.getElementById('scope-count').textContent = '0 字';
  document.getElementById('context-count').textContent = '0 字';
  document.getElementById('resp-level').value = '';
  highlightSelectedTemplate(null);
  renderFrameworks(allFrameworks);
  goToStep(1);
}

// ─── Expose globals for HTML onclick attributes ───────────────────
window.goToStep         = goToStep;
window.goStep1Next      = goStep1Next;
window.goStep2Next      = goStep2Next;
window.goStep3Next      = goStep3Next;
window.goStep4Next      = goStep4Next;
window.onFrameworkChange = onFrameworkChange;
window.onCustomToggle   = onCustomToggle;
window.addQuestion      = addQuestion;
window.removeQuestion   = removeQuestion;
window.updateQuestionText = updateQuestionText;
window.updateResponse   = updateResponse;
window.setReportFormat      = setReportFormat;
window.startNewAudit        = startNewAudit;
window.showMyAudits         = showMyAudits;
window.closeHistory         = closeHistory;
window.toggleTemplatePanel  = toggleTemplatePanel;
window.selectTemplate       = selectTemplate;
window.clearTemplate        = clearTemplate;
