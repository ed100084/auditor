from fastapi import APIRouter, HTTPException
from audit_templates import get_all_templates, get_template, AuditTemplate
from typing import List

router = APIRouter(tags=["templates"])


@router.get("/templates", response_model=List[AuditTemplate])
def list_templates():
    """列出所有稽核情境範本（含分類、說明及建議設定）"""
    return get_all_templates()


@router.get("/templates/{template_id}", response_model=AuditTemplate)
def get_template_detail(template_id: str):
    """取得單一範本詳情，包含建議預填的 scope/context 文字"""
    tmpl = get_template(template_id)
    if tmpl is None:
        raise HTTPException(status_code=404, detail=f"範本 '{template_id}' 不存在")
    return tmpl
