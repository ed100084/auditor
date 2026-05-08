const VERSION = '2026.05.08.15';
const API_BASE = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
  ? window.location.origin
  : 'https://secauditor.azurewebsites.net';
const AUTOSAVE_DELAY = 900;
const DEFAULT_FINDING_FORMAT = 'gov';

const CORE_FRAMEWORK_IDS = new Set([
  'csma_core',
  'csma_classification',
  'csma_incident',
  'csma_sharing',
  'iso27001',
  'iso27701',
]);

const FRAMEWORKS = [
  { id: 'csma_core', group: '台灣法規', name: '資通安全管理法', name_en: 'CSMA', description: '資安治理、維護計畫、稽核、委外與事件管理。', primary: true },
  { id: 'csma_classification', group: '台灣法規', name: '責任等級分級辦法', name_en: 'Level Classification', description: 'A-E 級控制要求、技術面與管理面基準。', primary: true },
  { id: 'csma_incident', group: '台灣法規', name: '事件通報及應變辦法', name_en: 'Incident Response', description: '事件分級、通報時限、應變、復原與演練。', primary: true },
  { id: 'csma_sharing', group: '台灣法規', name: '情資分享辦法', name_en: 'Information Sharing', description: '威脅情資分享、保存、保密與通報協作。', primary: false },
  { id: 'iso27001', group: '國際標準', name: 'ISO 27001:2022', name_en: 'ISO 27001', description: 'ISMS 與 Annex A 控制措施。', primary: false },
  { id: 'iso27701', group: '國際標準', name: 'ISO 27701:2025', name_en: 'ISO 27701', description: 'PIMS、個資、隱私與處理者控制措施。', primary: false },
  { id: 'health_his', group: '醫療情境', name: 'HIS / PACS / LIS', name_en: 'Healthcare Systems', description: '醫療核心系統、病歷資料、介接與可用性。', primary: false },
  { id: 'health_iomt', group: '醫療情境', name: 'IoMT 醫療設備', name_en: 'IoMT', description: '醫療設備網段、修補、資產盤點與供應商維護。', primary: false },
  { id: 'health_supply_chain', group: '醫療情境', name: '醫療供應鏈', name_en: 'Supply Chain', description: '藥品、耗材、EDI/API、第三方連線與營運中斷。', primary: false },
  { id: 'it_access_control', group: 'IT 控制', name: '存取控制', name_en: 'Access Control', description: '帳號、權限、特權、複核與離職停用。', primary: false },
  { id: 'it_network_security', group: 'IT 控制', name: '網路安全', name_en: 'Network Security', description: '網段隔離、防火牆、VPN、IDS/IPS 與遠端存取。', primary: false },
  { id: 'it_backup_recovery', group: 'IT 控制', name: '備份復原', name_en: 'Backup / DR', description: '備份策略、不可變備份、還原測試、RTO/RPO。', primary: false },
  { id: 'it_vulnerability_mgmt', group: 'IT 控制', name: '弱點管理', name_en: 'Vulnerability', description: '弱掃、修補、例外、風險接受與追蹤。', primary: false },
  { id: 'it_cloud_security', group: 'IT 控制', name: '雲端安全', name_en: 'Cloud Security', description: 'CSPM、IAM、公開儲存、雲端日誌與 SaaS。', primary: false },
  { id: 'it_security_awareness', group: 'IT 控制', name: '教育訓練', name_en: 'Awareness', description: '資安認知、釣魚演練、訓練追蹤與違規處置。', primary: false },
];

const TEMPLATES = [
  {
    id: 'strategy',
    name: '策略面',
    category: '衛福部所屬醫院',
    frameworks: ['csma_core', 'csma_classification', 'csma_incident'],
    context: '衛福部所屬醫院資安稽核策略面，重點確認院層級治理、資源投入、關鍵醫療服務辨識、維護計畫績效與改善管考是否能支撐醫療營運韌性。',
    items: [
      ['governance', '院層級資安治理、資安長或權責主管支持、資安推動組織及跨單位協調機制。'],
      ['policy', '資安政策、資通安全維護計畫、年度資安目標與醫院營運目標之連結。'],
      ['critical_services', '門診、急診、住院、檢驗、影像、藥事等關鍵醫療服務及可容忍中斷時間辨識。'],
      ['resources', '資安人力、預算、工具、外部服務與教育訓練資源配置。'],
      ['risk_appetite', '醫療服務、病歷個資、醫療設備、委外供應鏈之主要資安風險與風險接受決策。'],
      ['performance', '資安維護計畫實施情形、稽核缺失、弱點改善、事件檢討之績效管考。'],
      ['ci_alignment', '關鍵基礎設施或重要醫療服務之主管機關要求、聯防、通報與演練配合情形。'],
      ['board_reporting', '資安風險、重大事件、改善進度是否定期向院長室或管理會議回報。'],
    ],
  },
  {
    id: 'management',
    name: '管理面',
    category: '衛福部所屬醫院',
    frameworks: ['csma_core', 'csma_classification', 'csma_incident', 'iso27701'],
    context: '衛福部所屬醫院資安稽核管理面，重點確認制度、流程、紀錄、責任分工、委外監督、事件通報與營運持續管理是否落實到日常作業。',
    items: [
      ['maintenance_plan', '資通安全維護計畫訂定、修正、執行紀錄、差異檢討與年度提報。'],
      ['asset_inventory', '資訊資產、醫療系統、伺服器、端點、網路設備、醫療設備與雲端資源盤點。'],
      ['risk_assessment', '資產風險評鑑、控制措施選擇、高風險項目追蹤與風險接受核准。'],
      ['account_access', 'HIS、EMR、PACS、LIS、AD/LDAP、特權帳號、共用帳號、離職停用與定期複核。'],
      ['medical_record_privacy', '病歷查閱、個資存取、異常查詢、資料匯出、目的外使用與留痕管理。'],
      ['outsourcing', '醫療資訊系統委外、維護合約、資安條款、廠商佐證、服務水準與稽核權。'],
      ['remote_maintenance', '第三方遠端維護申請、臨時帳號、MFA、連線核准、操作紀錄、錄影與權限回收。'],
      ['incident_response', '資安事件分級、通報、應變、復原、事後檢討、改善報告與主管機關回報。'],
      ['business_continuity', 'BCP、DRP、替代作業、關鍵醫療服務演練、RTO/RPO 與復原驗證紀錄。'],
      ['awareness', '醫護、行政、資訊、委外人員資安教育訓練、釣魚演練、未完成追蹤與高風險人員輔導。'],
    ],
  },
  {
    id: 'technical',
    name: '技術面',
    category: '衛福部所屬醫院',
    frameworks: ['csma_core', 'csma_classification', 'it_network_security', 'it_backup_recovery', 'it_vulnerability_mgmt'],
    context: '衛福部所屬醫院資安稽核技術面，重點確認醫療核心系統、網路、端點、醫療設備、弱點修補、監控告警、備份復原及外部曝險防護是否有效。',
    items: [
      ['core_systems', 'HIS、EMR、PACS、LIS、RIS、藥局、掛號、批價、住院、急診等醫療核心系統防護。'],
      ['network_segmentation', '醫療設備網、行政網、伺服器區、DMZ、無線網路、VPN 與防火牆規則隔離。'],
      ['vulnerability', '弱點掃描、滲透測試、修補時限、例外接受、複掃驗證與高風險弱點追蹤。'],
      ['monitoring', '系統日誌、病歷查閱紀錄、特權操作、SIEM/SOC、告警規則、事件工單與保存期限。'],
      ['endpoint', '端點防毒/EDR、作業系統修補、硬碟加密、USB 控管、本機管理員與組態基準。'],
      ['backup_recovery', 'HIS/PACS/LIS 備份、不可變備份、離線備份、還原測試、勒索軟體復原劇本。'],
      ['iomt', 'IoMT 與醫療設備資產盤點、預設密碼、修補限制、網段隔離、廠商維護與汰換計畫。'],
      ['external_exposure', '網際網路曝險服務、遠端入口、公開系統、憑證、DNS、WAF 與外部曝險檢測。'],
      ['cloud_saas', '雲端、SaaS、AI 服務、公開儲存、IAM、日誌、資料輸入限制與供應商安全設定。'],
      ['threat_intel', '資安情資接收、弱點通告、IOC 封鎖、聯防通報與技術改善追蹤。'],
    ],
  },
];

const DIMENSIONS = [
  { id: 'governance', label: '治理制度' },
  { id: 'process', label: '流程執行' },
  { id: 'technical', label: '技術控制' },
  { id: 'evidence', label: '佐證文件' },
  { id: 'exception', label: '例外改善' },
];

const state = {
  step: 1,
  sessionId: null,
  frameworks: FRAMEWORKS.filter(item => item.primary).map(item => item.id),
  responsibilityLevel: '',
  questions: [],
  responses: {},
  findings: [],
  findingFormat: DEFAULT_FINDING_FORMAT,
  findingSummary: '',
  questionSource: '',
  activeTemplate: '',
  templateSelections: {},
  isLoadingSession: false,
};

let autosaveTimer = null;

const steps = [
  ['選擇框架', 1],
  ['稽核範圍', 2],
  ['稽核問題', 3],
  ['受稽回覆', 4],
  ['稽核發現', 5],
];

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('app-version').textContent = `v${VERSION}`;
  document.getElementById('user-name-input').value = localStorage.getItem('auditor_user_name') || '';
  document.getElementById('user-name-input').addEventListener('change', event => {
    localStorage.setItem('auditor_user_name', event.target.value.trim());
    schedulePersist('user');
  });

  renderStepNav();
  renderFrameworks();
  renderTemplates();
  renderDimensions();
  bindEvents();
  setFindingFormatSelection(state.findingFormat);
  showApiVersion();
  await restoreCurrentSession();
  if (!state.sessionId) goToStep(1);
});

function bindEvents() {
  document.getElementById('step1-next').addEventListener('click', () => {
    state.responsibilityLevel = document.getElementById('resp-level').value;
    if (state.frameworks.length === 0) return showToast('請至少選擇一個稽核框架。');
    schedulePersist('framework');
    goToStep(2);
  });
  document.getElementById('clear-template').addEventListener('click', clearTemplate);
  document.getElementById('scope-input').addEventListener('input', () => schedulePersist('scope'));
  document.getElementById('context-input').addEventListener('input', () => schedulePersist('scope'));
  document.getElementById('generate-questions').addEventListener('click', generateQuestions);
  document.getElementById('regenerate-questions').addEventListener('click', () => {
    state.questions = adaptQuestionsToSettings([]);
    state.questionSource = currentTemplate() ? 'template-settings' : 'frontend-settings';
    renderQuestions(false);
    schedulePersist('questions');
  });
  document.getElementById('add-question').addEventListener('click', () => {
    state.questions.push(makeQuestion('', '自訂問題', '手動新增', '', '自訂'));
    renderQuestions(false);
    schedulePersist('questions');
  });
  document.getElementById('save-questions').addEventListener('click', saveQuestionsAndContinue);
  document.getElementById('prepare-findings').addEventListener('click', () => {
    renderResponses();
    state.findings = buildLocalFindings();
    state.findingFormat = 'local';
    state.findingSummary = '';
    renderFindings();
    saveFindingsOnly();
    goToStep(5);
  });
  document.getElementById('generate-findings').addEventListener('click', generateFindings);
  document.getElementById('new-audit').addEventListener('click', resetAudit);
  document.getElementById('open-history').addEventListener('click', openHistory);
  document.getElementById('close-history').addEventListener('click', closeHistory);
  document.getElementById('history-overlay').addEventListener('click', closeHistory);
  document.getElementById('new-session').addEventListener('click', resetAudit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistNow('hidden');
  });

  document.querySelectorAll('[data-go-step]').forEach(button => {
    button.addEventListener('click', () => goToStep(Number(button.dataset.goStep)));
  });
  document.querySelectorAll('input[name="finding-format"]').forEach(radio => {
    radio.addEventListener('change', syncFindingFormatCards);
  });
}

async function openHistory() {
  document.getElementById('history-overlay').classList.add('open');
  document.getElementById('history-panel').classList.add('open');
  await loadHistory();
}

function closeHistory() {
  document.getElementById('history-overlay').classList.remove('open');
  document.getElementById('history-panel').classList.remove('open');
}

async function loadHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '<p class="text-sm text-gray-500">讀取中...</p>';
  try {
    const user = document.getElementById('user-name-input').value.trim();
    const sessions = await api('GET', `/sessions${user ? `?user=${encodeURIComponent(user)}` : ''}`);
    if (!sessions.length) {
      list.innerHTML = '<p class="text-sm text-gray-500">尚無紀錄。</p>';
      return;
    }
    list.innerHTML = sessions.map(session => {
      const active = session.session_id === state.sessionId;
      const title = session.scope || '未命名稽核紀錄';
      const updated = session.updated_at
        ? new Date(session.updated_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '';
      return `
        <div class="rounded-lg border ${active ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'} p-3 hover:border-blue-300 hover:bg-blue-50">
          <div class="flex items-start gap-3">
            <button type="button" data-load-session="${esc(session.session_id)}" class="min-w-0 flex-1 text-left">
              <p class="text-sm font-medium text-gray-800">${esc(title.length > 54 ? `${title.slice(0, 54)}...` : title)}</p>
              <p class="mt-1 text-xs text-gray-400">#${esc(session.session_id)} ${esc(updated)} ${session.user_name ? `· ${esc(session.user_name)}` : ''}</p>
            </button>
            <button type="button" data-delete-session="${esc(session.session_id)}" class="shrink-0 rounded-md border border-red-100 px-2 py-1 text-xs text-red-600 hover:bg-red-50">刪除</button>
          </div>
        </div>
      `;
    }).join('');
    document.querySelectorAll('[data-load-session]').forEach(button => {
      button.addEventListener('click', async () => {
        await loadSession(button.dataset.loadSession);
        closeHistory();
      });
    });
    document.querySelectorAll('[data-delete-session]').forEach(button => {
      button.addEventListener('click', async () => deleteHistorySession(button.dataset.deleteSession));
    });
  } catch (error) {
    list.innerHTML = `<p class="text-sm text-red-600">讀取紀錄失敗：${esc(error.message)}</p>`;
  }
}

async function deleteHistorySession(sessionId) {
  if (!sessionId || !confirm(`確定刪除稽核紀錄 #${sessionId}？刪除後無法復原。`)) return;
  try {
    await api('DELETE', `/sessions/${sessionId}`);
    if (sessionId === state.sessionId) {
      resetAudit();
      showToast('已刪除目前稽核紀錄。');
      return;
    }
    await loadHistory();
    showToast('已刪除稽核紀錄。');
  } catch (error) {
    showToast(`刪除紀錄失敗：${error.message}`);
  }
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
    state.questions = adaptQuestionsToSettings([]);
    state.questionSource = 'navigation-guard';
    renderQuestions();
  }
  if (step === 4) renderResponses();
  if (step === 5) {
    if (!state.findings.length) state.findings = buildLocalFindings();
    renderFindings();
  }

  state.step = step;
  document.querySelectorAll('.step-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(`step-${step}`).classList.add('active');
  updateStepNav();
  refreshVisibleTextareas();
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
  const groups = [...new Set(FRAMEWORKS.map(item => item.group))];
  document.getElementById('framework-list').innerHTML = groups.map(group => `
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <h3 class="mb-3 text-sm font-semibold text-gray-700">${esc(group)}</h3>
      <div class="space-y-2">
        ${FRAMEWORKS.filter(item => item.group === group).map(item => frameworkCard(item)).join('')}
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.framework-checkbox').forEach(input => {
    input.addEventListener('change', () => {
      state.frameworks = [...document.querySelectorAll('.framework-checkbox:checked')].map(item => item.value);
      renderFrameworks();
      schedulePersist('framework');
    });
  });
}

function frameworkCard(item) {
  const checked = state.frameworks.includes(item.id);
  return `
    <label class="block cursor-pointer rounded-lg border ${checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'} p-3 transition hover:border-blue-300">
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
}

function renderTemplates() {
  const active = TEMPLATES.find(item => item.id === state.activeTemplate) || TEMPLATES[0];
  const selected = selectedTemplateItemIds(active);
  document.getElementById('template-list').innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-2">
        ${TEMPLATES.map(template => `
          <button type="button" data-template-tab="${esc(template.id)}"
            class="rounded-lg border px-3 py-2 text-sm font-semibold ${active.id === template.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50'}">
            ${esc(template.name)}
          </button>
        `).join('')}
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-800">${esc(active.name)}稽核範圍</p>
            <p class="mt-1 text-xs text-gray-500">預設涵蓋本面向所需範圍，取消不納入本次稽核的項目。</p>
          </div>
          <button type="button" data-apply-template="${esc(active.id)}" class="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">套用目前範圍</button>
        </div>
        <div class="grid gap-2 md:grid-cols-2">
          ${active.items.map(([id, text]) => `
            <label class="flex cursor-pointer items-start gap-2 rounded-md border ${selected.includes(id) ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'} p-3 text-sm">
              <input type="checkbox" class="template-item mt-1 accent-blue-600" data-template-item="${esc(id)}" ${selected.includes(id) ? 'checked' : ''}>
              <span class="leading-relaxed text-gray-700">${esc(text)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  document.querySelectorAll('[data-template-tab]').forEach(button => {
    button.addEventListener('click', () => applyTemplate(button.dataset.templateTab));
  });
  document.querySelectorAll('[data-apply-template]').forEach(button => {
    button.addEventListener('click', () => syncTemplateInputs(button.dataset.applyTemplate));
  });
  document.querySelectorAll('[data-template-item]').forEach(input => {
    input.addEventListener('change', () => updateTemplateSelection(active.id));
  });
}

function selectedTemplateItemIds(template) {
  const saved = state.templateSelections[template.id];
  if (Array.isArray(saved) && saved.length) return saved;
  return template.items.map(([id]) => id);
}

function updateTemplateSelection(templateId) {
  const template = TEMPLATES.find(item => item.id === templateId);
  if (!template) return;
  state.activeTemplate = template.id;
  const selected = [...document.querySelectorAll('[data-template-item]:checked')].map(input => input.dataset.templateItem);
  if (!selected.length) {
    showToast('至少保留一個稽核範圍。');
    state.templateSelections[template.id] = template.items.map(([id]) => id);
  } else {
    state.templateSelections[template.id] = selected;
  }
  syncTemplateInputs(template.id);
  renderTemplates();
}

function selectedTemplateItems(template = currentTemplate()) {
  if (!template?.items) return [];
  const selected = selectedTemplateItemIds(template);
  return template.items.filter(([itemId]) => selected.includes(itemId));
}

function questionFocusPayload() {
  const template = currentTemplate();
  const selected = selectedTemplateItems(template);
  return {
    template_id: template?.id || '',
    template_name: template?.name || '',
    selected_items: selected.map(([id, text]) => ({ id, text })),
    question_count: getQuestionCount(),
    question_depth: document.getElementById('question-depth')?.value || 'standard',
  };
}

function applyTemplate(id) {
  const template = TEMPLATES.find(item => item.id === id);
  if (!template) return;
  state.activeTemplate = id;
  syncTemplateInputs(id);
  renderTemplates();
}

function syncTemplateInputs(id = state.activeTemplate) {
  const template = TEMPLATES.find(item => item.id === id);
  if (!template) return;
  state.activeTemplate = template.id;
  state.frameworks = [...new Set([...state.frameworks, ...template.frameworks])];
  const selected = selectedTemplateItemIds(template);
  const selectedItems = template.items.filter(([itemId]) => selected.includes(itemId));
  document.getElementById('scope-input').value = [
    `衛福部所屬醫院資安稽核 - ${template.name}`,
    ...selectedItems.map(([, text]) => `- ${text}`),
  ].join('\n');
  document.getElementById('context-input').value = [
    template.context,
    `本次先納入 ${selectedItems.length} 項${template.name}稽核範圍，未勾選項目視為本次不查或另案追蹤。`,
  ].join('\n\n');
  renderFrameworks();
  schedulePersist('template');
}

function clearTemplate() {
  state.activeTemplate = '';
  state.templateSelections = {};
  document.getElementById('scope-input').value = '';
  document.getElementById('context-input').value = '';
  renderTemplates();
  schedulePersist('template');
}

function renderDimensions() {
  document.getElementById('dimension-options').innerHTML = DIMENSIONS.map((item, index) => `
    <label class="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs">
      <input type="checkbox" class="dimension-checkbox accent-blue-600" value="${esc(item.id)}" ${index < 4 ? 'checked' : ''}>
      ${esc(item.label)}
    </label>
  `).join('');
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
      frameworks: backendFrameworks(),
      responsibility_level: state.responsibilityLevel || null,
    });
    await api('POST', `/sessions/${state.sessionId}/scope`, { scope, context });
    const result = await api('POST', `/sessions/${state.sessionId}/questions/generate`, questionFocusPayload());
    questions = normalizeQuestions(result.questions || []);
    state.questionSource = questions.length ? (result.source || 'backend-rules') : '';
  } catch (error) {
    state.questionSource = `frontend-fallback: ${error.message}`;
  }

  if (questions.length === 0) {
    questions = adaptQuestionsToSettings([]);
    if (!state.questionSource) state.questionSource = 'frontend-empty-response';
  } else {
    questions = adaptQuestionsToSettings(questions, { preferProvided: true });
    if (currentTemplate(scope, context) && state.questionSource === 'rules') state.questionSource = 'template-backend-rules';
  }

  state.questions = questions;
  state.responses = {};
  renderQuestions();
  await persistNow('questions');
  hideLoading();
  goToStep(3);
}

function adaptQuestionsToSettings(questions, options = {}) {
  const count = getQuestionCount();
  const local = buildLocalQuestions(getScope(), getContext());
  const merged = options.preferProvided
    ? [...questions, ...local].slice(0, count)
    : [...local, ...questions].slice(0, count);
  return merged.map((question, index) => enrichQuestion(question, selectedDimensions()[index % selectedDimensions().length]));
}

function renderQuestions(useGuard = true) {
  if (useGuard && state.questions.length === 0) {
    state.questions = adaptQuestionsToSettings([]);
    state.questionSource = 'render-guard';
  }
  state.questions = state.questions.map(question => ({
    ...question,
    text: normalizeQuestionText(question.text),
  }));
  document.getElementById('q-count-badge').textContent = `${state.questions.length} 題`;
  document.getElementById('question-source').textContent =
    state.questionSource === 'loaded-session'
      ? '來源：已載入先前同步紀錄。'
      : state.questionSource === 'llm-focus'
      ? '來源：LLM 已依勾選範圍挑選高風險稽核重點。'
      : state.questionSource === 'rules-focus'
      ? '來源：後端規則已依勾選範圍逐項聚焦。'
      : state.questionSource === 'template-backend-rules'
      ? '來源：已優先依常用範本產生，並補入後端規則題庫。'
      : state.questionSource === 'template-settings'
      ? '來源：已依常用範本、深度與面向重新產生。'
      : state.questionSource === 'backend-rules'
      ? '來源：後端規則題庫，已依深度與面向補強。'
      : '來源：前端規則題庫保底，已依深度與面向產生。';

  if (state.questions.length === 0) {
    document.getElementById('question-list').innerHTML = '<div class="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-500">尚未產生稽核問題。</div>';
    return;
  }

  document.getElementById('question-list').innerHTML = state.questions.map((question, index) => `
    <article class="audit-question-card rounded-lg border border-gray-200 border-l-4 border-l-indigo-400 bg-white p-4">
      <div class="question-row flex items-start gap-3">
        <span class="question-number mt-2 w-7 shrink-0 text-right text-sm font-semibold text-gray-400">${index + 1}</span>
        <div class="min-w-0 flex-1">
          <textarea data-question-index="${index}" rows="4" class="question-text auto-grow-textarea w-full rounded-md border border-gray-200 px-3 py-2 text-sm leading-relaxed text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">${esc(question.text)}</textarea>
          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            <span class="rounded bg-gray-100 px-2 py-1 text-gray-600">${esc(question.category)}</span>
            <span class="px-2 py-1 text-gray-400">${esc(question.source_framework)}</span>
            <span class="px-2 py-1 text-blue-500">${esc(question.reference)}</span>
            <span class="rounded bg-indigo-100 px-2 py-1 font-medium text-indigo-800">${esc(question.dimension_label || '系統性探詢')}</span>
          </div>
        </div>
        <button data-remove-question="${index}" class="remove-question rounded p-2 text-gray-300 hover:bg-red-50 hover:text-red-500" title="刪除問題">✕</button>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.question-text').forEach(textarea => {
    autoGrow(textarea);
    textarea.addEventListener('input', () => {
      state.questions[Number(textarea.dataset.questionIndex)].text = textarea.value;
      autoGrow(textarea);
      schedulePersist('questions');
    });
  });
  document.querySelectorAll('[data-remove-question]').forEach(button => {
    button.addEventListener('click', () => {
      state.questions.splice(Number(button.dataset.removeQuestion), 1);
      renderQuestions();
      schedulePersist('questions');
    });
  });
}

async function saveQuestionsAndContinue() {
  state.questions = state.questions
    .map(question => ({ ...question, text: String(question.text || '').trim() }))
    .filter(question => question.text.length > 5);

  if (state.questions.length === 0) return showToast('請至少保留一個有效問題。');

  try {
    await persistNow('questions');
  } catch (error) {
    setStatus(`問題已留在畫面上，但後端暫時無法儲存：${error.message}`);
  }
  renderResponses();
  goToStep(4);
}

function renderResponses() {
  document.getElementById('resp-progress').textContent = `已回覆 ${answeredCount()} / ${state.questions.length}`;
  document.getElementById('response-list').innerHTML = state.questions.map((question, index) => `
    <article class="audit-response-card rounded-lg border border-gray-200 border-l-4 border-l-indigo-400 bg-white p-4">
      <div class="response-question mb-3 flex items-start gap-3">
        <span class="response-number w-8 shrink-0 text-sm font-semibold text-blue-600">Q${index + 1}</span>
        <p class="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">${esc(question.text)}</p>
      </div>
      <div class="mb-2 flex flex-wrap gap-2">
        ${responseSnippets().map(snippet => `<button type="button" data-response-snippet="${esc(snippet)}" data-response-id="${esc(question.id)}" class="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:border-blue-300 hover:bg-blue-50">${esc(snippet)}</button>`).join('')}
      </div>
      <textarea data-response-id="${esc(question.id)}" rows="3" class="response-text auto-grow-textarea w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="可輸入：目前作法、佐證文件、抽樣結果、例外情形、改善計畫。">${esc(state.responses[question.id] || '')}</textarea>
    </article>
  `).join('');

  document.querySelectorAll('.response-text').forEach(textarea => {
    autoGrow(textarea);
    textarea.addEventListener('input', () => {
      state.responses[textarea.dataset.responseId] = textarea.value;
      autoGrow(textarea);
      updateResponseProgress();
      schedulePersist('responses');
    });
  });
  document.querySelectorAll('[data-response-snippet]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.responseId;
      const textarea = document.querySelector(`textarea[data-response-id="${cssEscape(id)}"]`);
      const prefix = textarea.value.trim() ? '\n' : '';
      textarea.value += `${prefix}${button.dataset.responseSnippet}：`;
      state.responses[id] = textarea.value;
      autoGrow(textarea);
      textarea.focus();
      updateResponseProgress();
      schedulePersist('responses');
    });
  });
}

function updateResponseProgress() {
  document.getElementById('resp-progress').textContent = `已回覆 ${answeredCount()} / ${state.questions.length}`;
}

async function generateFindings() {
  const format = selectedFindingFormat();
  showLoading(format === 'local' ? '產生規則草稿...' : '呼叫 LLM 產生稽核發現...');

  if (format === 'local') {
    state.findings = buildLocalFindings();
    state.findingFormat = 'local';
    state.findingSummary = '';
    await saveFindingsOnly();
    hideLoading();
    renderFindings();
    return;
  }

  try {
    await ensureBackendReadyForFindings();
    const report = await streamFindingReport(format);
    const findings = normalizeFindings(report, format);
    state.findings = findings.length ? findings : buildLocalFindings();
    state.findingFormat = findings.length ? format : 'local';
    state.findingSummary = findings.length ? (report.executive_summary || '') : '';
    document.getElementById('findings-status').textContent = findings.length
      ? `LLM 已產生 ${format === 'gov' ? '衛福部/數位部 CI 格式' : 'IIA 5C 格式'}草稿。`
      : 'LLM 回傳內容沒有可用發現，已改用規則草稿。';
  } catch (error) {
    state.findings = buildLocalFindings();
    state.findingFormat = 'local';
    state.findingSummary = '';
    document.getElementById('findings-status').textContent = `LLM 產生失敗，已改用規則草稿：${error.message}`;
  } finally {
    await saveFindingsOnly();
    hideLoading();
    renderFindings();
  }
}

async function ensureBackendReadyForFindings() {
  const apiKey = getApiKey(true);
  if (!apiKey) throw new Error('未設定 API key');
  await ensureSession();
  await api('POST', `/sessions/${state.sessionId}/framework`, {
    frameworks: backendFrameworks(),
    responsibility_level: state.responsibilityLevel || document.getElementById('resp-level').value || null,
  });
  await api('POST', `/sessions/${state.sessionId}/scope`, {
    scope: getScope() || '本次稽核範圍由稽核問題與受稽回覆補充說明。',
    context: getContext() || '請依目前稽核問題與受稽單位回覆產生稽核發現草稿。',
  });
  await api('PUT', `/sessions/${state.sessionId}/questions`, backendQuestionPayload());
  await saveResponsesOnly();
}

async function saveResponsesOnly() {
  try {
    if (!state.sessionId) return;
    const responses = state.questions.map(question => ({
      question_id: question.id,
      response_text: state.responses[question.id] || '',
    }));
    await api('POST', `/sessions/${state.sessionId}/responses`, { responses });
  } catch (error) {
    setStatus(`回覆未寫入後端：${error.message}`);
  }
}

async function saveFindingsOnly() {
  try {
    if (!state.sessionId || !getApiKey(false)) return;
    await api('PUT', `/sessions/${state.sessionId}/findings`, {
      findings: {
        format: state.findingFormat,
        summary: state.findingSummary,
        items: state.findings,
      },
    });
    markSynced();
  } catch (error) {
    setStatus(`稽核發現未寫入後端：${error.message}`);
  }
}

function streamFindingReport(format) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/api/sessions/${state.sessionId}/findings/stream?format=${format}&api_key=${encodeURIComponent(getApiKey(false))}`;
    const source = new EventSource(url);
    let buffer = '';
    source.onmessage = event => {
      if (event.data === '[DONE]') {
        source.close();
        try {
          resolve(JSON.parse(stripCodeFence(buffer)));
        } catch (error) {
          reject(error);
        }
        return;
      }
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.repair) buffer = parsed.repair;
        else buffer += parsed.chunk || '';
      } catch (_) {
        buffer += event.data || '';
      }
    };
    source.onerror = () => {
      source.close();
      reject(new Error('LLM 串流中斷'));
    };
  });
}

function renderFindings() {
  if (!state.findings.length) state.findings = buildLocalFindings();
  if (state.findingFormat === 'gov' && state.findings.some(finding => finding.finding_type)) {
    renderGovFindings();
    return;
  }
  const summary = state.findingSummary
    ? `<section class="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">${esc(state.findingSummary)}</section>`
    : '';
  document.getElementById('findings-list').innerHTML = summary + state.findings.map((finding, index) => `
    <article class="rounded-lg border border-gray-200 border-l-4 ${finding.level === 'High' ? 'border-l-red-500' : finding.level === 'Low' ? 'border-l-blue-500' : 'border-l-amber-500'} bg-white p-5">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-sm font-semibold text-gray-400">F${index + 1}</span>
        <span class="rounded-full ${finding.level === 'High' ? 'bg-red-100 text-red-700' : finding.level === 'Low' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'} px-2.5 py-1 text-xs font-semibold">${esc(finding.level)}</span>
        <h3 class="text-sm font-semibold text-gray-900">${esc(finding.title)}</h3>
      </div>
      <div class="space-y-3 text-sm leading-relaxed text-gray-700">
        <p><strong class="text-gray-900">現況：</strong>${esc(finding.condition)}</p>
        <p><strong class="text-gray-900">準則：</strong>${esc(finding.criteria)}</p>
        ${finding.cause ? `<p><strong class="text-gray-900">原因：</strong>${esc(finding.cause)}</p>` : ''}
        <p><strong class="text-gray-900">影響：</strong>${esc(finding.effect)}</p>
        <p class="rounded-lg bg-green-50 p-3 text-green-800"><strong>建議：</strong>${esc(finding.recommendation)}</p>
      </div>
    </article>
  `).join('');
}

function renderGovFindings() {
  const typeStyle = type => {
    if (type === '法規不符合') return { badge: 'bg-red-100 text-red-700 border-red-300', bar: 'border-l-red-500' };
    if (type === '待改善缺失') return { badge: 'bg-amber-100 text-amber-700 border-amber-300', bar: 'border-l-amber-500' };
    return { badge: 'bg-blue-100 text-blue-700 border-blue-300', bar: 'border-l-blue-500' };
  };
  const counts = {
    nonCompliance: state.findings.filter(finding => finding.finding_type === '法規不符合').length,
    improvement: state.findings.filter(finding => finding.finding_type === '待改善缺失').length,
    suggestion: state.findings.filter(finding => finding.finding_type === '建議缺失').length,
  };
  const summary = state.findingSummary
    ? `<section class="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">${esc(state.findingSummary)}</section>`
    : '';
  const badges = `
    <div class="flex flex-wrap gap-2">
      ${counts.nonCompliance ? `<span class="rounded-full border border-red-300 bg-red-100 px-3 py-1 text-sm font-medium text-red-700">法規不符合 ${counts.nonCompliance} 項</span>` : ''}
      ${counts.improvement ? `<span class="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">待改善缺失 ${counts.improvement} 項</span>` : ''}
      ${counts.suggestion ? `<span class="rounded-full border border-blue-300 bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">建議缺失 ${counts.suggestion} 項</span>` : ''}
    </div>
  `;
  document.getElementById('findings-list').innerHTML = summary + badges + state.findings.map((finding, index) => {
    const style = typeStyle(finding.finding_type || '建議缺失');
    const evidence = Array.isArray(finding.evidence) ? finding.evidence : [];
    return `
      <article class="rounded-lg border border-gray-200 border-l-4 ${style.bar} bg-white p-5">
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold text-gray-400">F${index + 1}</span>
          <span class="rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}">${esc(finding.finding_type || '')}</span>
          <h3 class="text-sm font-semibold text-gray-900">${esc(finding.title || '')}</h3>
        </div>
        <div class="space-y-4 text-sm leading-relaxed text-gray-700">
          <div class="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
            ${finding.legal_basis ? `<p><strong class="text-indigo-900">法源依據：</strong>${esc(finding.legal_basis)}</p>` : ''}
            ${finding.legal_text ? `<div class="mt-2"><p class="mb-1 text-xs font-semibold text-indigo-600">應辦事項（法條原文）</p><blockquote class="border-l-4 border-indigo-300 pl-3 whitespace-pre-wrap text-indigo-900">${esc(finding.legal_text)}</blockquote></div>` : ''}
          </div>
          <div>
            <p class="mb-1 text-xs font-semibold text-gray-500">稽核發現說明</p>
            <p class="whitespace-pre-wrap">${esc(finding.finding_description || '')}</p>
          </div>
          ${evidence.length ? `<div><p class="mb-1 text-xs font-semibold text-gray-500">佐證資料</p><ul class="list-inside list-disc space-y-1">${evidence.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>` : ''}
          <p class="rounded-lg bg-green-50 p-3 text-green-800"><strong>改善建議：</strong>${esc(finding.recommendation || '')}</p>
        </div>
      </article>
    `;
  }).join('');
}

function buildLocalQuestions(scope, context) {
  const template = currentTemplate(scope, context);
  if (template) return buildTemplateQuestions(template, scope, context);

  const source = selectedFrameworkNames()[0] || '稽核框架';
  const focus = [scope, context].filter(Boolean).join(' ');
  const dimensions = selectedDimensions();
  const count = getQuestionCount();
  const base = [
    ['日常作業', '實際流程', '這件事平常是誰在做？從提出需求到完成紀錄，實際流程通常怎麼走？請用最近一次案例說明。'],
    ['責任分工', '角色與交接', '哪些角色會參與這個流程？如果主要負責人請假或離職，誰接手、怎麼確認不中斷？'],
    ['資料來源', '清冊與母體', '你們用哪一份清冊或系統當作管理母體？它多久更新一次，誰負責確認內容是最新的？'],
    ['抽樣佐證', '抽樣方式', '如果我要抽 5 筆樣本，你建議從哪裡抽？每一筆可以看到哪些申請、核准、執行與覆核紀錄？'],
    ['例外處理', '例外與逾期', '最近一年有沒有例外、逾期或做不到標準流程的情況？當時怎麼核准、補救與追蹤？'],
    ['權限與存取', '最小權限', '誰可以異動資料、設定或流程狀態？高權限操作有沒有留下可追溯紀錄？'],
    ['監控告警', '異常發現', '如果流程失敗、資料異常或有人未依規定操作，你們通常怎麼發現？誰會收到通知？'],
    ['改善追蹤', '缺失管理', '上次發現問題後，改善項目怎麼列管？誰確認已完成，怎麼避免同樣問題再發生？'],
    ['委外協作', '第三方作業', '如果有廠商或其他單位參與，他們能做什麼、不能做什麼？維護或交付結果怎麼驗收？'],
    ['資料保護', '資料流向', '這個流程會接觸哪些個資、機敏資料或重要資料？資料從哪裡來、到哪裡去、誰可以匯出？'],
    ['營運中斷', '備援處理', '如果系統或人員暫時不可用，業務怎麼繼續？最近一次演練或實際中斷後有沒有調整作法？'],
    ['管理回報', '管理監督', '主管平常看哪些報表或指標來判斷這件事有沒有做好？異常會不會被帶到會議追蹤？'],
    ['工具設定', '系統控制', '有哪些檢核是靠系統自動做的？哪些仍靠人工判斷？人工判斷有沒有留下理由與覆核紀錄？'],
    ['教育認知', '人員落實', '實際操作的人怎麼知道要照這套方式做？新人、外包或輪調人員怎麼被訓練？'],
    ['歷史事件', '近一年案例', '請挑一個近一年最有代表性的案例，說明從發現、處理、核准、結案到追蹤的完整過程。'],
    ['風險判斷', source, `就本次選定的 ${source} 來看，現場最擔心哪三個失控情境？目前各自靠什麼控制降低風險？`],
    ['邊界確認', '範圍界線', '有哪些系統、流程、資料或單位容易被誤以為有納管，但實際上不在這次管理範圍內？'],
    ['稽核切入', '可驗證性', '如果只能花一天抽核，你會建議我優先看哪三個證據點，最能判斷控制是否真的有運作？'],
  ];
  return base.slice(0, count).map(([category, reference, text], index) => {
    const dimension = dimensions[index % dimensions.length];
    const focused = focus ? `${text}\n\n本題聚焦場景：${focus}` : text;
    return makeQuestion(focused, category, source, reference, dimension.label);
  });
}

function currentTemplate(scope = getScope(), context = getContext()) {
  if (state.activeTemplate) {
    const selected = TEMPLATES.find(item => item.id === state.activeTemplate);
    if (selected) return selected;
  }
  return TEMPLATES.find(item => item.scope === scope && item.context === context) || null;
}

function buildTemplateQuestions(template, scope, context) {
  const dimensions = selectedDimensions();
  const count = getQuestionCount();
  const frameworkNames = template.frameworks
    .map(id => FRAMEWORKS.find(item => item.id === id)?.name || id)
    .filter(Boolean);
  const source = frameworkNames[0] || selectedFrameworkNames()[0] || '稽核框架';
  const contextText = context || template.context;
  const target = `${template.name}（${template.category}）`;
  const selectedItems = selectedTemplateItems(template).slice(0, count);
  const prompts = [
    ['現場流程', '請用最近一次實際案例說明「{item}」如何執行，包含提出、核准、執行、覆核與結案。'],
    ['責任分工', '針對「{item}」，誰是主要負責人、覆核人與備援人員？例外或爭議由誰核准？'],
    ['母體清冊', '「{item}」目前以哪份清冊、系統或報表作為抽核母體？誰維護，多久更新一次？'],
    ['抽核佐證', '如果現在抽核「{item}」，可從哪裡取得樣本、紀錄位置與判斷標準？'],
    ['例外追蹤', '「{item}」最近一年是否有例外、逾期、未落實或緊急處理？請挑一案說明原因、核准與改善追蹤。'],
    ['管理監督', '主管如何知道「{item}」有持續運作？是否有指標、報表、會議紀錄或改善追蹤紀錄？'],
    ['系統控制', '「{item}」哪些控制靠系統自動執行，哪些仍靠人工判斷？人工處理是否留下理由與覆核紀錄？'],
    ['風險判斷', '就「{item}」來看，最可能影響醫療服務、病歷個資或關鍵系統可用性的失控情境是什麼？目前怎麼防？'],
  ];

  return selectedItems.map(([itemId, itemText], index) => {
    const dimension = dimensions[index % dimensions.length];
    const [category, prompt] = prompts[index % prompts.length];
    const reference = itemText.split('、')[0].replace('。', '').slice(0, 24) || itemId;
    const focused = [
      prompt.replace('{item}', itemText),
      `情境背景：${contextText}`,
      `本題範圍：${itemText}`,
    ].join('\n\n');
    return makeQuestion(focused, `${template.name}-${category}`, target || source, reference, dimension.label);
  });
}

function enrichQuestion(question, dimension) {
  const depth = document.getElementById('question-depth')?.value || 'standard';
  const suffix = [];
  if (dimension?.id === 'governance') suffix.push('追問重點：誰負責、誰覆核、誰能核准例外，以及主管怎麼知道這件事有做好。');
  if (dimension?.id === 'process') suffix.push('追問重點：請受稽單位用一筆近期案例走一次流程，指出卡點與人工判斷處。');
  if (dimension?.id === 'technical') suffix.push('追問重點：哪些地方靠系統自動控制，哪些地方仍靠人工，日誌能不能回放操作過程。');
  if (dimension?.id === 'evidence') suffix.push('追問重點：請直接指出可抽核的母體、樣本、紀錄位置與判斷標準。');
  if (dimension?.id === 'exception') suffix.push('追問重點：找出最近一次例外或逾期，確認原因、核准、補救與後續追蹤。');
  if (depth === 'deep') suffix.push('深入追問：請比較「制度寫法」與「現場實際作法」的落差，並說明目前最大的未解風險。');
  if (depth === 'evidence') suffix.push('佐證追問：請列出最適合抽核的三類證據，以及每類證據可以證明或不能證明什麼。');
  return {
    ...question,
    text: normalizeQuestionText([stripQuestionHints(question.text), ...suffix].join('\n')),
    dimension_label: dimension?.label || question.dimension_label || '系統性探詢',
  };
}

function stripQuestionHints(text = '') {
  return String(text)
    .split('\n')
    .filter(line => !/^\s*(追問重點|深入追問|佐證追問)：/.test(line))
    .join('\n')
    .trim();
}

function normalizeQuestionText(text = '') {
  const seenHintLines = new Set();
  const lines = String(text).split('\n');
  const normalized = [];
  for (const line of lines) {
    const key = line.trim();
    if (/^(追問重點|深入追問|佐證追問)：/.test(key)) {
      if (seenHintLines.has(key)) continue;
      seenHintLines.add(key);
    }
    if (key && normalized[normalized.length - 1]?.trim() === key) continue;
    normalized.push(line);
  }
  return normalized.join('\n').trim();
}

function makeQuestion(text, category, sourceFramework, reference, dimensionLabel) {
  return {
    id: crypto.randomUUID(),
    text,
    category,
    source_framework: sourceFramework,
    reference,
    dimension: 'systemic',
    dimension_label: dimensionLabel || '系統性探詢',
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
      cause: '受稽單位尚未彙整足夠證據或回覆窗口未完成資料蒐集。',
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
      cause: '回覆偏向結論，缺少制度、執行紀錄或抽樣證據支撐。',
      effect: '回覆過於概略時，稽核人員難以判斷控制是否一致執行。',
      recommendation: '請補充制度文件、執行紀錄、截圖、簽核紀錄或抽樣清單。',
    });
  }
  if (!findings.length) {
    findings.push({
      level: 'Low',
      title: '需依回覆內容進一步抽核佐證',
      condition: '受稽單位已完成基本回覆，但仍需抽核佐證確認敘述與實際執行一致。',
      criteria: '稽核結論應建立在足夠且適切的證據上。',
      cause: '目前仍屬文字回覆，尚未完成佐證抽核。',
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
      dimension_label: item.dimension_label || '系統性探詢',
      generated_by: item.generated_by || 'backend',
    };
  }).filter(item => item.text.trim().length > 0);
}

function backendQuestionPayload() {
  return {
    questions: state.questions.map(question => ({
      id: question.id,
      text: question.text,
      category: question.category || '稽核問題',
      source_framework: question.source_framework || selectedFrameworkNames()[0] || '資通安全管理法',
      reference: question.reference || '',
      dimension: question.dimension || 'systemic',
      bank_id: question.bank_id || '',
    })).filter(question => question.text.trim().length > 0),
  };
}

function normalizeFindings(report, format) {
  const items = Array.isArray(report?.findings) ? report.findings : [];
  if (format === 'gov') {
    return items.map(item => ({
      finding_type: item.finding_type || '建議缺失',
      title: item.title || item.finding_type || '稽核發現',
      legal_basis: item.legal_basis || '',
      legal_text: item.legal_text || '',
      finding_description: item.finding_description || '',
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
      recommendation: item.recommendation || '',
    })).filter(item => item.title || item.condition);
  }
  return items.map(item => ({
    level: item.risk_level || 'Medium',
    title: item.title || '稽核發現',
    condition: item.condition || '',
    criteria: item.criteria || item.legal_basis || '',
    cause: item.cause || '',
    effect: item.effect || '',
    recommendation: item.recommendation || '',
  })).filter(item => item.title || item.condition);
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
  rememberSession(state.sessionId);
}

async function restoreCurrentSession() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session') || localStorage.getItem('auditor_session_id');
  if (!sessionId) {
    updateSessionLink();
    return;
  }
  try {
    await loadSession(sessionId);
  } catch (error) {
    localStorage.removeItem('auditor_session_id');
    updateSessionLink();
    setStatus(`無法載入先前紀錄：${error.message}`);
  }
}

async function loadSession(sessionId) {
  state.isLoadingSession = true;
  try {
    const session = await api('GET', `/sessions/${sessionId}`);
    state.sessionId = session.session_id;
    state.frameworks = Array.isArray(session.frameworks) && session.frameworks.length
      ? session.frameworks
      : FRAMEWORKS.filter(item => item.primary).map(item => item.id);
    state.responsibilityLevel = session.responsibility_level || '';
    state.questions = normalizeQuestions(session.questions || []);
    state.responses = responsesToMap(session.responses || []);
    state.questionSource = state.questions.length ? 'loaded-session' : '';
    restoreFindings(session.findings);

    document.getElementById('user-name-input').value = session.user_name || localStorage.getItem('auditor_user_name') || '';
    document.getElementById('resp-level').value = state.responsibilityLevel;
    document.getElementById('scope-input').value = session.scope || '';
    document.getElementById('context-input').value = session.context || '';

    rememberSession(state.sessionId);
    renderFrameworks();
    renderTemplates();
    renderQuestions(false);
    renderResponses();
    if (state.findings.length) renderFindings();
    else document.getElementById('findings-list').innerHTML = '';
    markSynced(session.updated_at);

    if (state.findings.length) goToStep(5);
    else if (state.questions.length && answeredCount() > 0) goToStep(4);
    else if (state.questions.length) goToStep(3);
    else if (session.scope || session.context) goToStep(2);
    else goToStep(1);
  } finally {
    state.isLoadingSession = false;
  }
}

function restoreFindings(saved) {
  if (!saved) {
    state.findings = [];
    state.findingFormat = DEFAULT_FINDING_FORMAT;
    state.findingSummary = '';
    setFindingFormatSelection(state.findingFormat);
    return;
  }
  if (Array.isArray(saved)) {
    state.findings = saved;
    state.findingFormat = DEFAULT_FINDING_FORMAT;
    state.findingSummary = '';
    setFindingFormatSelection(state.findingFormat);
    return;
  }
  state.findings = Array.isArray(saved.items) ? saved.items : [];
  state.findingFormat = saved.format || DEFAULT_FINDING_FORMAT;
  state.findingSummary = saved.summary || '';
  setFindingFormatSelection(state.findingFormat);
}

function responsesToMap(items) {
  if (!Array.isArray(items)) return {};
  return items.reduce((acc, item) => {
    if (item?.question_id) acc[item.question_id] = item.response_text || '';
    return acc;
  }, {});
}

function schedulePersist(reason = 'auto') {
  if (state.isLoadingSession) return;
  if (!getApiKey(false)) {
    document.getElementById('sync-status').textContent = '未設定同步';
    return;
  }
  document.getElementById('sync-status').textContent = '待同步';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => persistNow(reason), AUTOSAVE_DELAY);
}

async function persistNow(reason = 'auto') {
  if (state.isLoadingSession || !getApiKey(false)) return;
  clearTimeout(autosaveTimer);
  try {
    await ensureSession();
    await api('POST', `/sessions/${state.sessionId}/framework`, {
      frameworks: backendFrameworks(),
      responsibility_level: state.responsibilityLevel || document.getElementById('resp-level').value || null,
    });
    await api('POST', `/sessions/${state.sessionId}/scope`, {
      scope: getScope(),
      context: getContext(),
    });
    if (state.questions.length) {
      await api('PUT', `/sessions/${state.sessionId}/questions`, backendQuestionPayload());
      await saveResponsesOnly();
    }
    if (state.findings.length) await saveFindingsOnly();
    markSynced();
  } catch (error) {
    document.getElementById('sync-status').textContent = '同步失敗';
    setStatus(`自動同步失敗：${error.message}`);
  }
}

function rememberSession(sessionId) {
  if (!sessionId) return;
  localStorage.setItem('auditor_session_id', sessionId);
  window.history.replaceState({}, '', sessionUrl(sessionId));
  updateSessionLink();
}

function updateSessionLink() {
  const input = document.getElementById('session-link');
  if (!input) return;
  input.value = state.sessionId ? sessionUrl(state.sessionId) : '尚未建立';
}

function sessionUrl(sessionId) {
  let pathname = window.location.pathname;
  if (pathname.endsWith('/index.html')) pathname = pathname.slice(0, -'index.html'.length);
  const url = new URL(`${window.location.origin}${pathname}`);
  url.searchParams.set('session', sessionId);
  return url.toString();
}

function markSynced(timestamp) {
  const raw = timestamp ? new Date(timestamp) : new Date();
  const label = raw.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('sync-status').textContent = `已同步 ${label}`;
  updateSessionLink();
}

async function api(method, path, body) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未設定 API key。');
  const options = { method, headers: { 'X-API-Key': apiKey } };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE}/api${path}`, options);
  if (!response.ok) throw new Error(await response.text() || `HTTP ${response.status}`);
  return response.json();
}

function getApiKey(promptIfMissing = true) {
  let key = localStorage.getItem('auditor_api_key') || '';
  if (!key && promptIfMissing) {
    key = prompt('請輸入 API Key；未輸入時仍可使用規則題庫與規則草稿。') || '';
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
    .map(id => FRAMEWORKS.find(item => item.id === id)?.name)
    .filter(Boolean);
}

function backendFrameworks() {
  const selected = state.frameworks.filter(id => CORE_FRAMEWORK_IDS.has(id));
  return selected.length ? selected : ['csma_core'];
}

function selectedDimensions() {
  const selected = [...document.querySelectorAll('.dimension-checkbox:checked')]
    .map(input => DIMENSIONS.find(item => item.id === input.value))
    .filter(Boolean);
  return selected.length ? selected : DIMENSIONS.slice(0, 3);
}

function getQuestionCount() {
  const value = Number(document.getElementById('question-count')?.value || 12);
  return Math.min(18, Math.max(6, value));
}

function selectedFindingFormat() {
  return document.querySelector('input[name="finding-format"]:checked')?.value || DEFAULT_FINDING_FORMAT;
}

function setFindingFormatSelection(format = DEFAULT_FINDING_FORMAT) {
  const selected = format || DEFAULT_FINDING_FORMAT;
  document.querySelectorAll('input[name="finding-format"]').forEach(input => {
    input.checked = input.value === selected;
  });
  syncFindingFormatCards();
}

function syncFindingFormatCards() {
  document.querySelectorAll('input[name="finding-format"]').forEach(input => {
    const label = input.closest('label');
    label.className = input.checked
      ? 'rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm'
      : 'rounded-lg border border-gray-200 bg-white p-3 text-sm';
  });
}

function responseSnippets() {
  return ['目前作法', '佐證文件', '抽樣結果', '例外情形', '改善計畫', '負責窗口'];
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
  clearTimeout(autosaveTimer);
  state.sessionId = null;
  state.questions = [];
  state.responses = {};
  state.findings = [];
  state.findingFormat = DEFAULT_FINDING_FORMAT;
  state.findingSummary = '';
  state.activeTemplate = '';
  state.templateSelections = {};
  state.questionSource = '';
  localStorage.removeItem('auditor_session_id');
  const url = new URL(window.location.href);
  url.searchParams.delete('session');
  window.history.replaceState({}, '', url);
  document.getElementById('scope-input').value = '';
  document.getElementById('context-input').value = '';
  document.getElementById('resp-level').value = '';
  document.getElementById('sync-status').textContent = '尚未同步';
  updateSessionLink();
  renderTemplates();
  renderFrameworks();
  setFindingFormatSelection(state.findingFormat);
  closeHistory();
  goToStep(1);
}

function stripCodeFence(value) {
  return String(value || '').trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
}

function cssEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function autoGrow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight + 2}px`;
}

function refreshVisibleTextareas() {
  requestAnimationFrame(() => {
    document.querySelectorAll('.step-panel.active textarea.auto-grow-textarea').forEach(autoGrow);
  });
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
