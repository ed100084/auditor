const VERSION = '2026.05.08.1';
const API_BASE = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
  ? window.location.origin
  : 'https://secauditor.azurewebsites.net';

const DEFAULT_FRAMEWORKS = [
  { id: 'csma_core', name: '資通安全管理法', name_en: 'CSMA', description: '資通安全管理法、施行細則與機關資安治理要求', primary: true },
  { id: 'csma_classification', name: '責任等級分級辦法', name_en: 'Level Classification', description: 'A-E 級管理、技術與認知訓練要求', primary: true },
  { id: 'csma_incident', name: '事件通報及應變辦法', name_en: 'Incident Response', description: '資安事件分級、通報、應變與復原要求', primary: true },
  { id: 'csma_sharing', name: '情資分享辦法', name_en: 'Information Sharing', description: '威脅情資分享、保存與保密要求', primary: false },
  { id: 'iso27001', name: 'ISO 27001:2022', name_en: 'ISO 27001', description: '資訊安全管理制度與 Annex A 控制措施', primary: false },
  { id: 'iso27701', name: 'ISO 27701:2025', name_en: 'ISO 27701', description: '隱私資訊管理與個資控制措施', primary: false },
];

const state = {
  step: 1,
  sessionId: null,
  frameworks: DEFAULT_FRAMEWORKS.filter(item => item.primary).map(item => item.id),
  responsibilityLevel: '',
  questions: [],
  responses: {},
  findings: [],
  questionSource: '',
};

const steps = [
  ['選擇框架', 1],
  ['稽核範圍', 2],
  ['稽核問題', 3],
  ['受稽回覆', 4],
  ['稽核發現', 5],
];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('app-version').textContent = `v${VERSION}`;
  document.getElementById('user-name-input').value = localStorage.getItem('auditor_user_name') || '';
  document.getElementById('user-name-input').addEventListener('change', event => {
    localStorage.setItem('auditor_user_name', event.target.value.trim());
  });

  renderStepNav();
  renderFrameworks();
  bindEvents();
  showApiVersion();
  goToStep(1);
});

function bindEvents() {
  document.getElementById('step1-next').addEventListener('click', () => {
    state.responsibilityLevel = document.getElementById('resp-level').value;
    if (state.frameworks.length === 0) return showToast('請至少選擇一個稽核框架。');
    goToStep(2);
  });

  document.getElementById('generate-questions').addEventListener('click', generateQuestions);
  document.getElementById('add-question').addEventListener('click', () => {
    state.questions.push(makeQuestion('', '自訂問題', '手動新增', ''));
    renderQuestions();
  });
  document.getElementById('save-questions').addEventListener('click', saveQuestionsAndContinue);
  document.getElementById('generate-findings').addEventListener('click', generateFindings);
  document.getElementById('new-audit').addEventListener('click', resetAudit);

  document.querySelectorAll('[data-go-step]').forEach(button => {
    button.addEventListener('click', () => goToStep(Number(button.dataset.goStep)));
  });
}

function renderStepNav() {
  document.getElementById('step-nav').innerHTML = steps.map(([label, step]) => `
    <button type="button" class="flex shrink-0 items-center gap-2" data-nav-step="${step}">
      <span class="step-indicator flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">${step}</span>
      <span class="step-label">${esc(label)}</span>
    </button>
    ${step < steps.length ? '<div class="h-px w-10 shrink-0 bg-gray-200"></div>' : ''}
  `).join('');

  document.querySelectorAll('[data-nav-step]').forEach(button => {
    button.addEventListener('click', () => goToStep(Number(button.dataset.navStep)));
  });
}

function goToStep(step) {
  if (step === 3 && state.questions.length === 0) {
    state.questions = buildLocalQuestions(getScope(), getContext());
    state.questionSource = 'local-navigation-guard';
  }
  if (step === 4) renderResponses();
  if (step === 5) renderFindings();

  state.step = step;
  document.querySelectorAll('.step-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(`step-${step}`).classList.add('active');
  updateStepNav();
  window.scrollTo(0, 0);
}

function updateStepNav() {
  document.querySelectorAll('[data-nav-step]').forEach(button => {
    const step = Number(button.dataset.navStep);
    const dot = button.querySelector('.step-indicator');
    const label = button.querySelector('.step-label');
    dot.className = 'step-indicator flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium';
    if (step < state.step) {
      dot.classList.add('done');
      label.className = 'step-label text-gray-600';
    } else if (step === state.step) {
      dot.classList.add('current');
      label.className = 'step-label font-medium text-blue-700';
    } else {
      dot.classList.add('pending');
      label.className = 'step-label text-gray-400';
    }
  });
}

function renderFrameworks() {
  document.getElementById('framework-list').innerHTML = DEFAULT_FRAMEWORKS.map(item => {
    const checked = state.frameworks.includes(item.id);
    return `
      <label class="block cursor-pointer rounded-lg border-2 ${checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} p-4 transition hover:border-blue-300">
        <input class="framework-checkbox sr-only" type="checkbox" value="${esc(item.id)}" ${checked ? 'checked' : ''}>
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}">${checked ? '✓' : ''}</span>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium">${esc(item.name)}</span>
              <span class="text-xs text-gray-400">${esc(item.name_en)}</span>
              ${item.primary ? '<span class="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">預設</span>' : ''}
            </div>
            <p class="mt-1 text-xs text-gray-500">${esc(item.description)}</p>
          </div>
        </div>
      </label>
    `;
  }).join('');

  document.querySelectorAll('.framework-checkbox').forEach(input => {
    input.addEventListener('change', () => {
      state.frameworks = [...document.querySelectorAll('.framework-checkbox:checked')].map(item => item.value);
      renderFrameworks();
    });
  });
}

async function generateQuestions() {
  const scope = getScope();
  const context = getContext();
  if (scope.length < 10) return showToast('請輸入至少 10 字的稽核範圍。');
  if (context.length < 10) return showToast('請輸入至少 10 字的稽核情境。');

  showLoading('產生稽核問題...');
  state.responsibilityLevel = document.getElementById('resp-level').value;

  let questions = [];
  try {
    await ensureSession();
    await api('POST', `/sessions/${state.sessionId}/framework`, {
      frameworks: state.frameworks,
      responsibility_level: state.responsibilityLevel || null,
    });
    await api('POST', `/sessions/${state.sessionId}/scope`, { scope, context });
    const result = await api('POST', `/sessions/${state.sessionId}/questions/generate`);
    questions = normalizeQuestions(result.questions || []);
    state.questionSource = questions.length ? 'backend-rules' : '';
  } catch (error) {
    state.questionSource = `local-fallback: ${error.message}`;
  }

  if (questions.length === 0) {
    questions = buildLocalQuestions(scope, context);
    if (!state.questionSource) state.questionSource = 'local-fallback-empty-response';
  }

  state.questions = questions;
  state.responses = {};
  renderQuestions();
  hideLoading();
  goToStep(3);
}

function renderQuestions() {
  if (state.questions.length === 0) {
    state.questions = buildLocalQuestions(getScope(), getContext());
    state.questionSource = 'render-guard';
  }
  document.getElementById('q-count-badge').textContent = `${state.questions.length} 題`;
  document.getElementById('question-source').textContent =
    state.questionSource === 'backend-rules'
      ? '來源：後端規則題庫。可新增、刪除或編輯問題。'
      : '來源：前端規則題庫保底。可新增、刪除或編輯問題。';

  document.getElementById('question-list').innerHTML = state.questions.map((question, index) => `
    <article class="rounded-lg border border-gray-200 border-l-4 border-l-indigo-400 bg-white p-4">
      <div class="flex items-start gap-3">
        <span class="mt-2 w-7 shrink-0 text-right text-sm font-semibold text-gray-400">${index + 1}</span>
        <div class="min-w-0 flex-1">
          <textarea data-question-index="${index}" rows="4" class="question-text w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm leading-relaxed text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">${esc(question.text)}</textarea>
          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            <span class="rounded bg-gray-100 px-2 py-1 text-gray-600">${esc(question.category)}</span>
            <span class="px-2 py-1 text-gray-400">${esc(question.source_framework)}</span>
            <span class="px-2 py-1 text-blue-500">${esc(question.reference)}</span>
            <span class="rounded bg-indigo-100 px-2 py-1 font-medium text-indigo-800">系統性探詢</span>
          </div>
        </div>
        <button data-remove-question="${index}" class="rounded p-2 text-gray-300 hover:bg-red-50 hover:text-red-500" title="刪除問題">✕</button>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.question-text').forEach(textarea => {
    textarea.addEventListener('input', () => {
      state.questions[Number(textarea.dataset.questionIndex)].text = textarea.value;
    });
  });
  document.querySelectorAll('[data-remove-question]').forEach(button => {
    button.addEventListener('click', () => {
      state.questions.splice(Number(button.dataset.removeQuestion), 1);
      renderQuestions();
    });
  });
}

async function saveQuestionsAndContinue() {
  state.questions = state.questions
    .map(question => ({ ...question, text: String(question.text || '').trim() }))
    .filter(question => question.text.length > 5);

  if (state.questions.length === 0) return showToast('請至少保留一個有效問題。');

  try {
    if (state.sessionId) {
      await api('PUT', `/sessions/${state.sessionId}/questions`, { questions: state.questions });
    }
  } catch (error) {
    setStatus(`問題已留在畫面上，但後端暫時無法儲存：${error.message}`);
  }
  renderResponses();
  goToStep(4);
}

function renderResponses() {
  document.getElementById('resp-progress').textContent = `已回覆 ${answeredCount()} / ${state.questions.length}`;
  document.getElementById('response-list').innerHTML = state.questions.map((question, index) => `
    <article class="rounded-lg border border-gray-200 border-l-4 border-l-indigo-400 bg-white p-4">
      <div class="mb-3 flex items-start gap-3">
        <span class="w-8 shrink-0 text-sm font-semibold text-blue-600">Q${index + 1}</span>
        <p class="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">${esc(question.text)}</p>
      </div>
      <textarea data-response-id="${esc(question.id)}" rows="5" class="response-text w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="輸入受稽單位回覆、佐證文件、實際執行情形或缺口。">${esc(state.responses[question.id] || '')}</textarea>
    </article>
  `).join('');

  document.querySelectorAll('.response-text').forEach(textarea => {
    textarea.addEventListener('input', () => {
      state.responses[textarea.dataset.responseId] = textarea.value;
      document.getElementById('resp-progress').textContent = `已回覆 ${answeredCount()} / ${state.questions.length}`;
    });
  });
}

async function generateFindings() {
  showLoading('產生稽核發現...');
  try {
    if (state.sessionId) {
      const responses = state.questions.map(question => ({
        question_id: question.id,
        response_text: state.responses[question.id] || '',
      }));
      await api('POST', `/sessions/${state.sessionId}/responses`, { responses });
    }
  } catch (error) {
    setStatus(`回覆未寫入後端，改用本機規則產生草稿：${error.message}`);
  }

  state.findings = buildLocalFindings();
  hideLoading();
  renderFindings();
  goToStep(5);
}

function renderFindings() {
  if (!state.findings.length) state.findings = buildLocalFindings();
  document.getElementById('findings-status').textContent = '規則草稿：請依實際佐證調整風險與文字。';
  document.getElementById('findings-list').innerHTML = state.findings.map((finding, index) => `
    <article class="rounded-lg border border-gray-200 border-l-4 ${finding.level === 'High' ? 'border-l-red-500' : 'border-l-amber-500'} bg-white p-5">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-sm font-semibold text-gray-400">F${index + 1}</span>
        <span class="rounded-full ${finding.level === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} px-2.5 py-1 text-xs font-semibold">${finding.level}</span>
        <h3 class="text-sm font-semibold text-gray-900">${esc(finding.title)}</h3>
      </div>
      <div class="space-y-3 text-sm leading-relaxed text-gray-700">
        <p><strong class="text-gray-900">現況：</strong>${esc(finding.condition)}</p>
        <p><strong class="text-gray-900">準則：</strong>${esc(finding.criteria)}</p>
        <p><strong class="text-gray-900">影響：</strong>${esc(finding.effect)}</p>
        <p class="rounded-lg bg-green-50 p-3 text-green-800"><strong>建議：</strong>${esc(finding.recommendation)}</p>
      </div>
    </article>
  `).join('');
}

function buildLocalQuestions(scope, context) {
  const source = selectedFrameworkNames()[0] || '資通安全管理法';
  const focus = [scope, context].filter(Boolean).join(' ');
  const base = [
    ['治理與合規', '稽核控制要求', `請說明本次稽核範圍內，${source}相關要求如何轉換成內部制度、流程或控制措施，並提供最近一次核准或修訂紀錄。`],
    ['資產盤點', '資產與資料管理', '請說明受查單位如何盤點資訊資產、系統、資料與委外服務，並確認盤點結果符合目前業務與法規要求。'],
    ['權責分工', '資安治理', '請說明資通安全權責分工、核決層級與例外處理流程，並提供實際執行或會議追蹤紀錄。'],
    ['存取控制', '帳號權限管理', '請說明帳號、權限與特權存取如何申請、異動、定期複核與停用，並提供抽樣佐證。'],
    ['變更管理', '系統維運', '請說明系統變更、版本發布或設定調整前，如何進行風險評估、測試、核准與回復準備。'],
    ['監控與日誌', '日誌管理', '請說明日誌、監控告警與異常事件如何蒐集、檢視、分級與追蹤結案，並提供近期案例。'],
    ['事件應變', '通報及應變', '請說明資安事件通報、應變、復原與事後檢討流程，並提供最近一次演練或事件處理紀錄。'],
    ['委外管理', '委外與供應鏈管理', '請說明委外廠商或雲端服務如何納入資安要求、服務水準、稽核權與問題改善追蹤。'],
    ['備份復原', '營運持續', '請說明備份、復原、營運持續或災害復原措施如何設計與測試，並提供測試結果與改善項目。'],
    ['教育訓練', '人員認知訓練', '請說明教育訓練、政策宣導與人員遵循情形如何追蹤，並說明未完成或違規情形的處置方式。'],
  ];

  return base.map(([category, reference, text]) => makeQuestion(
    focus ? `${text}\n\n本題請聚焦：${focus}` : text,
    category,
    source,
    reference,
  ));
}

function makeQuestion(text, category, sourceFramework, reference) {
  return {
    id: crypto.randomUUID(),
    text,
    category,
    source_framework: sourceFramework,
    reference,
    dimension: 'systemic',
    generated_by: 'frontend_rules',
  };
}

function buildLocalFindings() {
  const unanswered = state.questions.filter(question => !(state.responses[question.id] || '').trim());
  const weakAnswers = state.questions.filter(question => {
    const answer = (state.responses[question.id] || '').trim();
    return answer && answer.length < 30;
  });

  const findings = [];
  if (unanswered.length) {
    findings.push({
      level: 'High',
      title: '部分稽核問題未取得受稽回覆或佐證',
      condition: `共 ${unanswered.length} 題未填寫回覆，無法確認控制措施是否已落實。`,
      criteria: '受稽單位應就稽核問題提供可驗證之制度、紀錄、佐證文件或改善說明。',
      effect: '稽核證據不足將提高控制失效未被發現的風險，也會影響後續改善追蹤。',
      recommendation: '請補齊回覆與佐證，並由權責單位確認缺口、改善期限與追蹤窗口。',
    });
  }
  if (weakAnswers.length) {
    findings.push({
      level: 'Medium',
      title: '部分回覆內容不足以支持控制有效性',
      condition: `共 ${weakAnswers.length} 題回覆過短，尚未說明實際執行方式或佐證文件。`,
      criteria: '稽核回覆應具體描述流程、責任人、執行頻率、抽樣紀錄與例外處理。',
      effect: '回覆過於概略時，稽核人員難以判斷控制是否一致執行。',
      recommendation: '請補充制度文件、執行紀錄、截圖、簽核紀錄或抽樣清單。',
    });
  }
  if (!findings.length) {
    findings.push({
      level: 'Medium',
      title: '需依回覆內容進一步抽核佐證',
      condition: '受稽單位已完成基本回覆，但仍需抽核佐證確認敘述與實際執行一致。',
      criteria: '稽核結論應建立在足夠且適切的證據上。',
      effect: '若未抽核佐證，可能高估控制成熟度。',
      recommendation: '請挑選高風險問題進行樣本抽核，並記錄抽核結果與改善事項。',
    });
  }
  return findings;
}

function normalizeQuestions(items) {
  return items.map(item => {
    const text = coerceQuestionText(item.text || item.question || item.question_text || item.content || item);
    return {
      id: item.id || crypto.randomUUID(),
      text,
      category: item.category || '治理與合規',
      source_framework: item.source_framework || item.framework || selectedFrameworkNames()[0] || '資通安全管理法',
      reference: item.reference || '',
      dimension: item.dimension || 'systemic',
      generated_by: item.generated_by || 'backend',
    };
  }).filter(item => item.text.trim().length > 0);
}

function coerceQuestionText(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(coerceQuestionText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !['id', 'category', 'source_framework', 'framework', 'reference', 'dimension', 'generated_by'].includes(key))
      .map(([, item]) => coerceQuestionText(item))
      .filter(Boolean)
      .join('\n');
  }
  return String(value).trim();
}

async function ensureSession() {
  if (state.sessionId) return;
  const created = await api('POST', '/sessions', {
    user_name: document.getElementById('user-name-input').value.trim(),
  });
  state.sessionId = created.session_id;
}

async function api(method, path, body) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未設定 API key，已改用本機規則題庫。');
  const options = { method, headers: { 'X-API-Key': apiKey } };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE}/api${path}`, options);
  if (!response.ok) throw new Error(await response.text() || `HTTP ${response.status}`);
  return response.json();
}

function getApiKey() {
  let key = localStorage.getItem('auditor_api_key') || '';
  if (!key) {
    key = prompt('請輸入 API Key；未輸入時仍可使用本機規則題庫產生問題。') || '';
    if (key) localStorage.setItem('auditor_api_key', key);
  }
  return key;
}

async function showApiVersion() {
  try {
    const response = await fetch(`${API_BASE}/api/version`, { cache: 'no-store' });
    if (!response.ok) throw new Error('version unavailable');
    const info = await response.json();
    document.getElementById('api-version').textContent = `API v${info.version} / ${info.question_generator}`;
  } catch (_) {
    document.getElementById('api-version').textContent = 'API: unavailable';
  }
}

function selectedFrameworkNames() {
  return state.frameworks
    .map(id => DEFAULT_FRAMEWORKS.find(item => item.id === id)?.name)
    .filter(Boolean);
}

function getScope() {
  return document.getElementById('scope-input').value.trim();
}

function getContext() {
  return document.getElementById('context-input').value.trim();
}

function answeredCount() {
  return state.questions.filter(question => (state.responses[question.id] || '').trim()).length;
}

function resetAudit() {
  state.sessionId = null;
  state.questions = [];
  state.responses = {};
  state.findings = [];
  document.getElementById('scope-input').value = '';
  document.getElementById('context-input').value = '';
  goToStep(1);
}

function showLoading(text) {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

function showToast(message) {
  const toast = document.getElementById('error-toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4500);
}

function setStatus(message) {
  document.getElementById('runtime-status').textContent = message;
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
