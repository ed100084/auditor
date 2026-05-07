import uuid

from frameworks import FRAMEWORK_REGISTRY
from question_bank import QUESTION_BANK


DEFAULT_TARGET_COUNT = 10


def generate_rule_questions(
    framework_ids: list[str],
    scope: str,
    context: str = "",
    responsibility_level: str | None = None,
    custom_text: str = "",
    target_count: int = DEFAULT_TARGET_COUNT,
) -> list[dict]:
    selected_ids = [fid for fid in framework_ids if fid in FRAMEWORK_REGISTRY]
    selected = _select_bank_items(selected_ids, bool(custom_text), target_count)

    questions = []
    for item in selected[:target_count]:
        questions.append(_build_question(item, selected_ids, scope, context, responsibility_level))
    return questions


def _select_bank_items(framework_ids: list[str], has_custom_text: bool, target_count: int) -> list[dict]:
    selected = [
        item
        for item in QUESTION_BANK
        if not framework_ids or set(item["framework_ids"]) & set(framework_ids)
    ]
    if has_custom_text:
        selected.insert(0, _custom_reference_item())

    if not selected:
        selected = list(QUESTION_BANK)

    result = []
    seen = set()
    for item in selected + QUESTION_BANK:
        if item["id"] in seen:
            continue
        result.append(item)
        seen.add(item["id"])
        if len(result) >= target_count:
            break
    return result


def _build_question(
    item: dict,
    framework_ids: list[str],
    scope: str,
    context: str,
    responsibility_level: str | None,
) -> dict:
    prompts = list(item["prompts"])
    if responsibility_level:
        prompts.insert(
            1,
            f"請說明此控制如何符合責任等級 {responsibility_level} 級的適用要求。",
        )

    context_note = ""
    if context:
        context_note = f"\n稽核背景：{_shorten(context, 90)}"

    text = "\n".join([
        f"【{item['category']}】{item['title']}",
        f"稽核範圍：{_shorten(scope, 90)}{context_note}",
        *[f"({idx}) {prompt}" for idx, prompt in enumerate(prompts, 1)],
        "★ 請提供：" + "、".join(item["evidence"]),
    ])

    return {
        "id": str(uuid.uuid4()),
        "text": text,
        "category": item["category"],
        "source_framework": _source_framework(item, framework_ids),
        "reference": item["reference"],
        "dimension": "systemic",
        "generated_by": "rules",
    }


def _source_framework(item: dict, framework_ids: list[str]) -> str:
    for fid in item["framework_ids"]:
        if fid in framework_ids and fid in FRAMEWORK_REGISTRY:
            return FRAMEWORK_REGISTRY[fid]["name"]
    if not item["framework_ids"]:
        return "自訂文件"
    first = item["framework_ids"][0]
    return FRAMEWORK_REGISTRY.get(first, {}).get("name", "內建題庫")


def _shorten(value: str, limit: int) -> str:
    value = " ".join((value or "").split())
    if len(value) <= limit:
        return value
    return value[: limit - 1] + "…"


def _custom_reference_item() -> dict:
    return {
        "id": "custom_reference",
        "framework_ids": [],
        "category": "治理與合規",
        "reference": "自訂文件",
        "title": "自訂法規或內部文件要求的適用性",
        "prompts": [
            "請說明自訂文件中哪些條文或要求適用於本次稽核範圍。",
            "請說明受稽單位如何將文件要求轉換為內部程序、控制或紀錄。",
            "請提供最近一次依該文件執行檢核或改善追蹤的結果。",
            "例外情境：若文件要求與現行作業不一致，如何評估差距並提出改善計畫？",
        ],
        "evidence": ["自訂文件", "適用性分析", "內部程序", "檢核或改善紀錄"],
    }
