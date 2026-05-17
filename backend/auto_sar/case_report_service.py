"""Case listing and case detail services."""

from __future__ import annotations

from typing import Any, Dict, List

from .investigation_analyzer import InvestigationAnalyzer


class CaseReportService:
    def __init__(self, analyzer: InvestigationAnalyzer) -> None:
        self.analyzer = analyzer

    def list_cases(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self.analyzer.list_cases(limit=limit)

    def get_case(self, case_id: str) -> Dict[str, Any]:
        case = self.analyzer.get_case(case_id)
        case_accounts = self.analyzer._case_accounts(case_id)
        return {
            "case": case,
            "related_accounts": case_accounts,
            "case_count": len(case_accounts),
            "risk_level": case.get("riskLevel") or case.get("risk_level") or "HIGH",
        }

