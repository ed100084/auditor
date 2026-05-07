"""
題庫過濾／評分／多樣化選題

呼叫方式
─────────
    questions = select_questions(
        framework_ids=["csma_core"],
        scope="醫院 HIS 系統年度合規稽核",
        context="重點查核存取控制與委外管理",
        responsibility_level="A",
    )

選題演算法（三段）
─────────
1. 硬過濾：必須命中至少一個選定的框架；若有指定責任等級，題目的
   applicable_levels 為空（適用所有）或包含該等級才入選。
2. 評分：base weight + scope/context 命中的 scope_tags 數量 × 5。
3. 多樣化：第一輪每個 category 取最高分一題，再依分數補滿目標數量。

特性
─────
- 純 Python，零 LLM 呼叫，<10ms 完成。
- 同樣輸入永遠產生同樣輸出（可重現、可審核）。
- 無外部依賴，可單元測試。
"""

from __future__ import annotations

import uuid
from typing import List, Optional

from question_bank import BANK


DEFAULT_TARGET = 12
KEYWORD_BONUS = 5  # 每命中一個 scope_tag 加分


def select_questions(
    framework_ids: List[str],
    scope: str = "",
    context: str = "",
    responsibility_level: Optional[str] = None,
    target_count: int = DEFAULT_TARGET,
) -> List[dict]:
    """從題庫挑選一組稽核問題，回傳前端可直接使用的 dict 清單。"""

    # ── 1. 硬過濾 ─────────────────────────────────────────────
    fw_set = set(framework_ids or [])
    candidates = []
    for q in BANK:
        # 框架交集（若呼叫者沒選任何框架，仍回傳全部）
        if fw_set and not (set(q["framework_ids"]) & fw_set):
            continue
        # 責任等級（題目未限定 = 適用所有等級）
        levels = q.get("applicable_levels") or []
        if responsibility_level and levels and responsibility_level not in levels:
            continue
        candidates.append(q)

    if not candidates:
        # Fallback：完全不符合任何條件時，至少回傳所有題目讓使用者編輯
        candidates = list(BANK)

    # ── 2. 評分 ───────────────────────────────────────────────
    haystack = (scope + " " + context).lower()
    scored = []
    for q in candidates:
        score = q.get("weight", 5)
        for tag in q.get("scope_tags", []):
            if tag.lower() in haystack:
                score += KEYWORD_BONUS
        scored.append((score, q))

    scored.sort(key=lambda x: -x[0])

    # ── 3. 多樣化選擇 ────────────────────────────────────────
    selected: List[dict] = []
    cat_count: dict = {}

    # Pass A：每個 category 至少先取一題（按分數高低）
    for _, q in scored:
        if len(selected) >= target_count:
            break
        cat = q["category"]
        if cat_count.get(cat, 0) == 0:
            selected.append(q)
            cat_count[cat] = 1

    # Pass B：依分數補足，每個 category 最多 2 題
    if len(selected) < target_count:
        for _, q in scored:
            if len(selected) >= target_count:
                break
            if q in selected:
                continue
            cat = q["category"]
            if cat_count.get(cat, 0) < 2:
                selected.append(q)
                cat_count[cat] = cat_count.get(cat, 0) + 1

    # Pass C：仍不足則放寬上限
    if len(selected) < target_count:
        for _, q in scored:
            if len(selected) >= target_count:
                break
            if q not in selected:
                selected.append(q)

    return [_to_question(q) for q in selected]


def _to_question(bank_item: dict) -> dict:
    """將題庫物件轉成前端期待的 Question 格式（每次新 UUID 以利編輯）。"""
    from frameworks import FRAMEWORK_REGISTRY

    # 主要 source_framework：第一個有效的 framework_id 對應名稱
    source_framework = ""
    for fid in bank_item["framework_ids"]:
        if fid in FRAMEWORK_REGISTRY:
            source_framework = FRAMEWORK_REGISTRY[fid]["name"]
            break

    return {
        "id": str(uuid.uuid4()),
        "text": bank_item["text"],
        "category": bank_item["category"],
        "source_framework": source_framework,
        "reference": bank_item["reference"],
        "dimension": "systemic",
        "bank_id": bank_item["id"],  # 保留可追溯來源
    }
