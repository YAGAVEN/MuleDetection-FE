"""Investigation analytics for SAR, network, and case reports."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import pandas as pd

from app.services.model_command_center_service import model_command_center_service
from app.services.storage_service import storage_service

from .shap_service import SHAPReportService


BACKEND_ROOT = Path(__file__).resolve().parents[1]
TEMP_DATA_DIR = BACKEND_ROOT / "temp-data"


def _as_records(value: Any) -> List[Dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        for key in ("cases", "accounts", "scores"):
            if isinstance(value.get(key), list):
                return [item for item in value[key] if isinstance(item, dict)]
    return []


def _load_json(path: Path) -> Dict[str, Any] | List[Dict[str, Any]] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


@dataclass
class ReportContext:
    title: str
    report_type: str
    risk_level: str
    investigator_name: str
    classification_level: str
    account_id: Optional[str] = None
    case_id: Optional[str] = None


class InvestigationAnalyzer:
    def __init__(self) -> None:
        self.shap_service = SHAPReportService()
        self.predictions = self._load_dataframe("predictions.csv")
        self.features = self._load_dataframe("engineered_features.csv")
        self.transactions = self._load_dataframe("transactions_full.csv")
        self.risk_scores = self._load_json("risk_scores.json") or {}
        self.suspicious_accounts = _as_records(self._load_json("suspicious_accounts.json") or [])
        self.cases = self._load_cases()
        self.model_center = self._load_model_center()

    def _load_json(self, filename: str) -> Dict[str, Any] | List[Dict[str, Any]] | None:
        path = TEMP_DATA_DIR / filename
        return _load_json(path)

    def _load_dataframe(self, filename: str) -> pd.DataFrame:
        path = TEMP_DATA_DIR / filename
        if not path.exists():
            return pd.DataFrame()
        return pd.read_csv(path)

    def _load_cases(self) -> List[Dict[str, Any]]:
        for candidate in ("cases.json", "investigation_cases.json"):
            payload = self._load_json(candidate)
            if payload:
                return _as_records(payload)
        return []

    def _load_model_center(self) -> Dict[str, Any]:
        payload = _load_json(BACKEND_ROOT / "model-center" / "model_commander_center.json")
        return payload if isinstance(payload, dict) else {}

    def list_cases(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self.cases[:limit]

    def get_case(self, case_id: str) -> Dict[str, Any]:
        for case in self.cases:
            if str(case.get("id")) == str(case_id):
                return case
        raise ValueError(f"Case not found: {case_id}")

    def _account_row(self, account_id: str) -> Dict[str, Any]:
        if not self.features.empty and "account_id" in self.features.columns:
            row = self.features[self.features["account_id"] == account_id]
            if not row.empty:
                return row.iloc[0].to_dict()
        if not self.predictions.empty and "account_id" in self.predictions.columns:
            row = self.predictions[self.predictions["account_id"] == account_id]
            if not row.empty:
                return row.iloc[0].to_dict()
        return {"account_id": account_id}

    def _account_prediction(self, account_id: str) -> Dict[str, Any]:
        if self.predictions.empty:
            return {}
        row = self.predictions[self.predictions["account_id"] == account_id]
        if row.empty:
            return {}
        return row.iloc[0].to_dict()

    def _account_risk(self, account_id: str) -> Dict[str, Any]:
        scores = self.risk_scores.get("scores") if isinstance(self.risk_scores, dict) else self.risk_scores
        if isinstance(scores, list):
            for item in scores:
                if str(item.get("account_id")) == str(account_id):
                    return item
        return {}

    def _account_transactions(self, account_id: str) -> pd.DataFrame:
        if self.transactions.empty:
            return pd.DataFrame()
        return self.transactions[self.transactions["account_id"] == account_id].copy()

    def _related_accounts(self, account_id: str) -> List[Dict[str, Any]]:
        if self.transactions.empty:
            return []
        rows = self.transactions[self.transactions["account_id"] == account_id]
        if rows.empty:
            return []
        grouped = rows.groupby("counterparty_id").agg(
            tx_count=("transaction_id", "count"),
            total_amount=("amount", "sum"),
            first_seen=("transaction_timestamp", "min"),
            last_seen=("transaction_timestamp", "max"),
        ).reset_index()
        related = []
        for _, row in grouped.sort_values("total_amount", ascending=False).iterrows():
            related.append({
                "account_id": row["counterparty_id"],
                "tx_count": int(row["tx_count"]),
                "total_amount": float(row["total_amount"]),
                "first_seen": str(row["first_seen"]),
                "last_seen": str(row["last_seen"]),
            })
        return related

    def _money_flow_analysis(self, account_id: str) -> Dict[str, Any]:
        txns = self._account_transactions(account_id)
        if txns.empty:
            return {"incoming": 0.0, "outgoing": 0.0, "net_flow": 0.0, "avg_ticket": 0.0}
        amounts = txns["amount"].astype(float)
        incoming = float(amounts[amounts > 0].sum())
        outgoing = float(abs(amounts[amounts < 0].sum()))
        return {
            "incoming": round(incoming, 2),
            "outgoing": round(outgoing, 2),
            "net_flow": round(incoming - outgoing, 2),
            "avg_ticket": round(float(amounts.abs().mean()), 2),
        }

    def _graph_clusters(self, related: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        clusters = {"high": [], "medium": [], "low": []}
        for item in related:
            bucket = "high" if item["tx_count"] >= 4 else "medium" if item["tx_count"] >= 2 else "low"
            clusters[bucket].append(item["account_id"])
        return [{"cluster": key, "accounts": value, "size": len(value)} for key, value in clusters.items() if value]

    def _suspicious_chains(self, account_id: str) -> List[Dict[str, Any]]:
        txns = self._account_transactions(account_id)
        if txns.empty:
            return []
        txns = txns.sort_values("transaction_timestamp")
        chains: List[Dict[str, Any]] = []
        streak: List[str] = []
        current = None
        for _, row in txns.iterrows():
            counterparty = str(row.get("counterparty_id"))
            if current is None or counterparty == current:
                streak.append(str(row.get("transaction_id")))
            else:
                if len(streak) >= 2:
                    chains.append({"counterparty": current, "transactions": streak[:]})
                streak = [str(row.get("transaction_id"))]
            current = counterparty
        if len(streak) >= 2 and current is not None:
            chains.append({"counterparty": current, "transactions": streak[:]})
        return chains

    def _timeline_summary(self, account_id: str) -> Dict[str, Any]:
        txns = self._account_transactions(account_id)
        if txns.empty:
            return {"entries": [], "peak_activity_day": None, "total_transactions": 0}
        txns["transaction_timestamp"] = pd.to_datetime(txns["transaction_timestamp"], errors="coerce")
        daily = txns.groupby(txns["transaction_timestamp"].dt.date).agg(
            tx_count=("transaction_id", "count"),
            total_amount=("amount", "sum"),
        ).reset_index()
        entries = [
            {
                "date": str(row["transaction_timestamp"]),
                "transactions": int(row["tx_count"]),
                "total_amount": float(row["total_amount"]),
            }
            for _, row in daily.iterrows()
        ]
        peak = max(entries, key=lambda item: item["transactions"], default=None)
        return {
            "entries": entries,
            "peak_activity_day": peak["date"] if peak else None,
            "total_transactions": int(len(txns)),
        }

    def _behavioral_anomalies(self, account_id: str) -> List[str]:
        row = self._account_row(account_id)
        anomalies: List[str] = []
        if float(row.get("sender_concentration", 0) or 0) >= 0.5:
            anomalies.append("High sender concentration indicates dependency on a narrow origin set.")
        if float(row.get("structuring_40k_50k_pct", 0) or 0) >= 0.3:
            anomalies.append("Structuring activity is present near regulatory thresholds.")
        if float(row.get("pct_within_6h", 0) or 0) >= 0.5:
            anomalies.append("A large share of activity settles within 6 hours.")
        if float(row.get("channel_entropy", 0) or 0) >= 0.9:
            anomalies.append("Channel entropy suggests multi-rail concealment patterns.")
        txns = self._account_transactions(account_id)
        if not txns.empty:
            if (txns["amount"].abs() >= 5000).sum() >= 3:
                anomalies.append("Repeated threshold-sized transfers detected.")
            if len(txns["counterparty_id"].unique()) >= 4:
                anomalies.append("Broad counterparty spread suggests graph fan-out.")
        return anomalies or ["No strong anomalies detected beyond baseline model risk."]

    def _graph_risk(self, account_id: str) -> Dict[str, Any]:
        related = self._related_accounts(account_id)
        txns = self._account_transactions(account_id)
        fan_out = len(related) / max(len(txns), 1)
        return {
            "related_accounts": len(related),
            "fan_in_ratio": round(min(1.0, fan_out), 4),
            "top_related_accounts": related[:10],
            "suspicious_chain_count": max(0, len(related) - 2),
        }

    def _case_accounts(self, case_id: str) -> List[str]:
        try:
            case = self.get_case(case_id)
        except ValueError:
            return []
        entities = case.get("entities")
        if isinstance(entities, list):
            return [str(entity) for entity in entities]
        account_id = case.get("account_id")
        return [str(account_id)] if account_id else []

    def build_individual_account_report(
        self,
        account_id: str,
        investigator_name: str | None,
        classification_level: str | None,
    ) -> Dict[str, Any]:
        row = self._account_row(account_id)
        prediction = self._account_prediction(account_id)
        risk = self._account_risk(account_id)
        features = {k: v for k, v in row.items() if k != "account_id"}
        shap = self.shap_service.explain_account(account_id, features)
        txns = self._account_transactions(account_id)
        related = self._related_accounts(account_id)
        report = {
            "title": f"ACCOUNT-{account_id} SAR",
            "subtitle": "Confidential AML Investigation Dossier",
            "risk_level": str(prediction.get("risk_level") or risk.get("risk_level") or "HIGH"),
            "account_id": account_id,
            "case_id": None,
            "investigator_name": investigator_name or "Auto-SAR Intelligence Engine",
            "classification_level": classification_level or "Confidential",
            "customer_metadata": {
                "account_status": row.get("account_status"),
                "product_family": row.get("product_family"),
                "customer_id": row.get("customer_id"),
                "is_mule": row.get("is_mule"),
                "is_frozen": row.get("is_frozen"),
                "kyc_compliant": row.get("kyc_compliant"),
                "rural_branch": row.get("rural_branch"),
            },
            "summary": {
                "ensemble_score": prediction.get("ensemble_score"),
                "lightgbm_score": prediction.get("lightgbm_score") or prediction.get("lgbm_score"),
                "gnn_score": prediction.get("gnn_score"),
                "risk_level": prediction.get("risk_level") or risk.get("risk_level"),
                "transaction_count": int(len(txns)),
                "related_accounts": len(related),
            },
            "shap": shap,
            "suspicious_transactions": txns.sort_values("transaction_timestamp").head(25).to_dict(orient="records") if not txns.empty else [],
            "related_accounts": related,
            "timeline_summary": self._timeline_summary(account_id),
            "behavioral_anomalies": self._behavioral_anomalies(account_id),
            "graph_risk_analysis": self._graph_risk(account_id),
            "money_flow_analysis": self._money_flow_analysis(account_id),
            "graph_clusters": self._graph_clusters(related),
            "suspicious_chains": self._suspicious_chains(account_id),
            "sections": self._individual_sections(account_id, shap, txns, related),
            "appendix": {
                "prediction_row": prediction,
                "risk_row": risk,
                "feature_snapshot": row,
            },
        }
        return report

    def _individual_sections(self, account_id: str, shap: Dict[str, Any], txns: pd.DataFrame, related: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [
            {
                "title": "Executive Summary",
                "body": [
                    f"Account {account_id} shows an ensemble risk profile of {shap['ensemble_explanation']['prediction_score']:.2f}.",
                    f"Top behavioral signal: {shap['ensemble_explanation']['top_contributing_features'][0]['feature_name'] if shap['ensemble_explanation']['top_contributing_features'] else 'N/A'}.",
                ],
            },
            {
                "title": "Transaction Intelligence",
                "table": txns.head(15).to_dict(orient="records") if not txns.empty else [],
            },
            {
                "title": "Related Accounts",
                "table": related[:15],
            },
            {
                "title": "SHAP Explainability",
                "table": shap["ensemble_explanation"]["top_contributing_features"][:10],
                "charts": shap.get("chart_paths", {}),
            },
        ]

    def build_related_account_report(
        self,
        account_id: str,
        investigator_name: str | None,
        classification_level: str | None,
        depth: int = 2,
    ) -> Dict[str, Any]:
        report = self.build_individual_account_report(account_id, investigator_name, classification_level)
        report["title"] = f"ACCOUNT-{account_id} NETWORK REPORT"
        report["report_scope"] = "related_account_network"
        report["depth"] = depth
        report["network_intelligence"] = {
            "linked_accounts": report["related_accounts"],
            "fan_in": report["graph_risk_analysis"]["fan_in_ratio"],
            "fan_out": round(len(report["related_accounts"]) / max(report["timeline_summary"]["total_transactions"], 1), 4),
            "money_flow_analysis": report["money_flow_analysis"],
            "graph_clusters": report["graph_clusters"],
            "suspicious_chains": report["suspicious_chains"],
            "transaction_relationships": report["related_accounts"],
            "account_interaction_summary": {
                "unique_relations": len(report["related_accounts"]),
                "peak_activity_day": report["timeline_summary"].get("peak_activity_day"),
            },
        }
        report["sections"].insert(
            2,
            {
                "title": "Network Intelligence",
                "body": [
                    f"Linked accounts identified: {len(report['related_accounts'])}.",
                    f"Suspicious chains: {report['graph_risk_analysis']['suspicious_chain_count']}.",
                    f"Net flow: {report['money_flow_analysis']['net_flow']}.",
                ],
            },
        )
        return report

    def build_investigation_report(
        self,
        case_id: str,
        investigator_name: str | None,
        classification_level: str | None,
    ) -> Dict[str, Any]:
        case = self.get_case(case_id)
        accounts = self._case_accounts(case_id)
        account_reports = [self.build_individual_account_report(account_id, investigator_name, classification_level) for account_id in accounts[:5]]
        all_transactions = []
        all_anomalies = []
        for account_report in account_reports:
            all_transactions.extend(account_report["suspicious_transactions"])
            all_anomalies.extend(account_report["behavioral_anomalies"])
        report = {
            "title": f"{case_id}_FULL_REPORT",
            "subtitle": "Confidential AML Investigation Dossier",
            "risk_level": case.get("riskLevel") or case.get("risk_level") or "HIGH",
            "account_id": accounts[0] if accounts else None,
            "case_id": case_id,
            "investigator_name": investigator_name or "Auto-SAR Intelligence Engine",
            "classification_level": classification_level or "Confidential",
            "executive_summary": case.get("pattern") or "Suspicious investigation requiring filing consideration.",
            "investigation_overview": case,
            "summary": {
                "account_count": len(accounts),
                "transactions_reviewed": len(all_transactions),
                "unique_accounts": len(set(accounts)),
                "anomalies": len(set(all_anomalies)),
            },
            "suspicious_patterns": all_anomalies[:10],
            "timeline_intelligence": [
                {
                    "account_id": account_report["account_id"],
                    "peak_activity_day": account_report["timeline_summary"].get("peak_activity_day"),
                    "total_transactions": account_report["timeline_summary"].get("total_transactions"),
                }
                for account_report in account_reports
                if account_report.get("timeline_summary")
            ],
            "transaction_analysis": all_transactions[:25],
            "related_entities": accounts,
            "compliance_findings": [
                "Enhanced due diligence is recommended for all linked entities.",
                "Threshold-structured activity warrants SAR consideration.",
            ],
            "investigator_notes": [
                "Auto-generated from live model outputs and local training artifacts.",
            ],
            "final_recommendation": "File SAR and escalate for manual compliance review.",
            "sections": [
                {"title": "Executive Summary", "body": [case.get("pattern", "Investigation case generated from model intelligence.")]},
                {"title": "Investigation Overview", "body": [json.dumps(case, indent=2, default=str)]},
                {"title": "Transaction Intelligence", "table": all_transactions[:15]},
                {"title": "Related Entities", "table": [{"entity": entity} for entity in accounts]},
                {
                    "title": "Timeline Intelligence",
                    "body": [
                        f"{account_report['account_id']}: {account_report['timeline_summary'].get('peak_activity_day')}"
                        for account_report in account_reports
                        if account_report.get("timeline_summary")
                    ],
                },
            ],
            "appendix": {"account_reports": account_reports},
        }
        return report

    def _all_suspicious_accounts(self) -> List[str]:
        accounts: List[str] = []
        for case in self.cases:
            entities = case.get("entities")
            if isinstance(entities, list):
                accounts.extend(str(entity) for entity in entities if entity is not None)
            elif case.get("account_id"):
                accounts.append(str(case["account_id"]))

        if not accounts and not self.predictions.empty and "account_id" in self.predictions.columns:
            accounts.extend(self.predictions["account_id"].dropna().astype(str).tolist())

        seen: set[str] = set()
        unique_accounts: List[str] = []
        for account_id in accounts:
            if account_id not in seen:
                seen.add(account_id)
                unique_accounts.append(account_id)
        return unique_accounts

    def build_master_investigation_report(
        self,
        investigator_name: str | None,
        classification_level: str | None,
    ) -> Dict[str, Any]:
        cases = self.list_cases(limit=max(len(self.cases), 100))
        accounts = self._all_suspicious_accounts()
        account_reports = [
            self.build_individual_account_report(account_id, investigator_name, classification_level)
            for account_id in accounts
        ]

        suspicious_accounts = [
            {
                "account_id": report["account_id"],
                "risk_score": report["summary"].get("ensemble_score"),
                "risk_level": report["risk_level"],
                "related_accounts": len(report.get("related_accounts", [])),
                "transactions": len(report.get("suspicious_transactions", [])),
            }
            for report in account_reports
        ]

        related_lookup: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"account_id": None, "tx_count": 0, "total_amount": 0.0})
        transaction_rows: List[Dict[str, Any]] = []
        shap_rows: List[Dict[str, Any]] = []
        for report in account_reports:
            transaction_rows.extend(report.get("suspicious_transactions", []))
            shap_rows.extend(report.get("shap", {}).get("ensemble_explanation", {}).get("top_contributing_features", []))
            for related in report.get("related_accounts", []):
                account_id = str(related.get("account_id"))
                bucket = related_lookup[account_id]
                bucket["account_id"] = account_id
                bucket["tx_count"] += int(related.get("tx_count", 0) or 0)
                bucket["total_amount"] += float(related.get("total_amount", 0) or 0)

        risk_counts = Counter((str(case.get("riskLevel") or case.get("risk_level") or "HIGH")).upper() for case in cases)
        transaction_count = len(transaction_rows)
        total_amount = round(
            float(sum(abs(float(row.get("amount", 0) or 0)) for row in transaction_rows)),
            2,
        )
        top_related = sorted(related_lookup.values(), key=lambda item: item["total_amount"], reverse=True)[:15]

        shap_summary: List[Dict[str, Any]] = []
        shap_totals: Dict[str, Dict[str, Any]] = {}
        for feature in shap_rows:
            name = str(feature.get("feature_name") or feature.get("name") or "feature")
            bucket = shap_totals.setdefault(name, {"feature_name": name, "shap_value": 0.0, "contribution_percentage": 0.0})
            bucket["shap_value"] += float(feature.get("shap_value", 0) or 0)
            bucket["contribution_percentage"] += float(feature.get("contribution_percentage", 0) or 0)
        shap_summary.extend(sorted(shap_totals.values(), key=lambda item: item["contribution_percentage"], reverse=True)[:10])

        overall_risk_level = "HIGH"
        if risk_counts.get("CRITICAL"):
            overall_risk_level = "CRITICAL"
        elif risk_counts.get("HIGH"):
            overall_risk_level = "HIGH"
        elif risk_counts.get("MEDIUM"):
            overall_risk_level = "MEDIUM"
        elif risk_counts.get("LOW"):
            overall_risk_level = "LOW"

        report = {
            "title": "TRINETRA_MASTER_INVESTIGATION",
            "subtitle": "Confidential AML Investigation Dossier",
            "risk_level": overall_risk_level,
            "account_id": accounts[0] if accounts else None,
            "case_id": None,
            "investigator_name": investigator_name or "Auto-SAR Intelligence Engine",
            "classification_level": classification_level or "Confidential",
            "executive_summary": "Consolidated investigation across all suspicious cases and related accounts.",
            "investigation_overview": {
                "case_count": len(cases),
                "suspicious_account_count": len(accounts),
                "transaction_count": transaction_count,
                "total_amount": total_amount,
            },
            "summary": {
                "case_count": len(cases),
                "suspicious_accounts": len(accounts),
                "related_accounts": len(top_related),
                "transactions_reviewed": transaction_count,
                "total_amount": total_amount,
                "risk_critical": risk_counts.get("CRITICAL", 0),
                "risk_high": risk_counts.get("HIGH", 0),
                "risk_medium": risk_counts.get("MEDIUM", 0),
                "risk_low": risk_counts.get("LOW", 0),
            },
            "suspicious_patterns": [case.get("pattern") for case in cases if case.get("pattern")][:10],
            "timeline_intelligence": [
                {
                    "case_id": case.get("id") or case.get("case_id"),
                    "pattern": case.get("pattern"),
                    "risk_level": case.get("riskLevel") or case.get("risk_level"),
                }
                for case in cases[:25]
            ],
            "transaction_analysis": transaction_rows[:50],
            "related_entities": accounts,
            "network_intelligence": {
                "linked_accounts": top_related,
                "overall_risk_distribution": dict(risk_counts),
                "network_relationships": top_related,
                "transaction_intelligence": {
                    "transaction_count": transaction_count,
                    "total_amount": total_amount,
                },
            },
            "prediction_summaries": [
                {
                    "account_id": report["account_id"],
                    "risk_level": report["risk_level"],
                    "ensemble_score": report["summary"].get("ensemble_score"),
                }
                for report in account_reports
            ],
            "shap_summary": shap_summary,
            "compliance_findings": [
                "All suspicious accounts were consolidated into a single master investigation report.",
                "Network and transaction intelligence should be reviewed before filing.",
            ],
            "investigator_notes": [
                "Auto-generated master report from the suspicious account inventory.",
            ],
            "final_recommendation": "Review all suspicious accounts and file a consolidated SAR if investigative findings are confirmed.",
            "sections": [
                {"title": "Overall Investigation Summary", "body": [f"{len(cases)} suspicious cases and {len(accounts)} accounts consolidated."]},
                {"title": "All Suspicious Accounts", "table": suspicious_accounts},
                {"title": "Network Relationships", "table": top_related},
                {"title": "Transaction Intelligence", "table": transaction_rows[:25]},
                {"title": "Risk Distribution", "body": [f"{level}: {count}" for level, count in risk_counts.items()]},
                {"title": "SHAP Summary", "table": shap_summary},
                {"title": "Final Findings", "body": ["Master investigation compiled for regulator-ready review."]},
            ],
            "appendix": {
                "account_reports": account_reports,
                "case_overview": cases,
            },
            "report_scope": "full_investigation",
        }
        return report
