"""SHAP explainability and chart generation for Auto-SAR."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Iterable, List

import matplotlib.pyplot as plt

from app.services.ml_models import get_model_manager

from .export_service import SHAP_DIR, logger


class SHAPReportService:
    def __init__(self) -> None:
        self.model_manager = get_model_manager()
        self.output_dir = SHAP_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def explain_account(self, account_id: str, features: Dict[str, float]) -> Dict[str, Any]:
        scores = self.model_manager.predict_mule_score(account_id, features)
        explanation = {
            "account_id": account_id,
            "prediction_scores": scores,
            "lgbm_explanation": self.model_manager.get_lgbm_explanation(account_id, features),
            "gnn_explanation": self.model_manager.get_gnn_explanation(account_id, features),
            "ensemble_explanation": self.model_manager.explain_prediction(account_id, features),
        }
        chart_paths = self._build_charts(account_id, explanation)
        explanation["chart_paths"] = chart_paths
        return explanation

    def explain_model(self, account_id: str, features: Dict[str, float]) -> Dict[str, Any]:
        return self.model_manager.generate_model_comparison_report(account_id, features)

    def _build_charts(self, account_id: str, report: Dict[str, Any]) -> Dict[str, str]:
        lgbm = report["lgbm_explanation"]["top_contributing_features"][:10]
        gnn = report["gnn_explanation"]["top_contributing_features"][:10]
        ensemble = report["ensemble_explanation"]["top_contributing_features"][:10]

        importance = self._horizontal_bar_chart(
            account_id,
            "SHAP Feature Importance",
            [(item["feature_name"], float(item["shap_value"])) for item in ensemble],
            f"{account_id}_shap_importance.png",
        )
        waterfall = self._horizontal_bar_chart(
            account_id,
            "Account-Level SHAP Waterfall",
            [(item["feature_name"], float(item["contribution_percentage"])) for item in ensemble],
            f"{account_id}_shap_waterfall.png",
        )
        comparison = self._comparison_chart(
            account_id,
            "Model Score Comparison",
            [
                ("LightGBM", float(report["lgbm_explanation"]["prediction_score"])),
                ("GNN", float(report["gnn_explanation"]["prediction_score"])),
                ("Ensemble", float(report["ensemble_explanation"]["prediction_score"])),
            ],
            f"{account_id}_model_comparison.png",
        )
        self._save_plotly_assets(account_id, lgbm, gnn, ensemble)
        return {"importance": importance, "waterfall": waterfall, "comparison": comparison}

    def _horizontal_bar_chart(
        self,
        account_id: str,
        title: str,
        items: List[tuple[str, float]],
        filename: str,
    ) -> str:
        path = self.output_dir / filename
        labels = [item[0] for item in items[:8]][::-1]
        values = [item[1] for item in items[:8]][::-1]
        fig, ax = plt.subplots(figsize=(8.5, 4.5))
        ax.barh(labels, values, color=["#67e8f9" if value >= 0 else "#fb7185" for value in values])
        ax.set_title(title, color="white")
        ax.set_facecolor("#0f172a")
        fig.patch.set_facecolor("#0f172a")
        ax.tick_params(colors="white")
        for spine in ax.spines.values():
            spine.set_color("#334155")
        ax.grid(axis="x", color="#334155", alpha=0.35)
        fig.tight_layout()
        fig.savefig(path, dpi=180, facecolor=fig.get_facecolor())
        plt.close(fig)
        logger.info("Generated SHAP chart %s for %s", path.name, account_id)
        return str(path)

    def _comparison_chart(
        self,
        account_id: str,
        title: str,
        items: List[tuple[str, float]],
        filename: str,
    ) -> str:
        path = self.output_dir / filename
        fig, ax = plt.subplots(figsize=(7.0, 4.0))
        labels = [item[0] for item in items]
        values = [item[1] for item in items]
        ax.plot(labels, values, marker="o", color="#22d3ee", linewidth=2.5)
        ax.fill_between(labels, values, color="#22d3ee", alpha=0.12)
        ax.set_ylim(0, 100)
        ax.set_title(title, color="white")
        ax.set_facecolor("#0f172a")
        fig.patch.set_facecolor("#0f172a")
        ax.tick_params(colors="white")
        for spine in ax.spines.values():
            spine.set_color("#334155")
        ax.grid(color="#334155", alpha=0.25)
        fig.tight_layout()
        fig.savefig(path, dpi=180, facecolor=fig.get_facecolor())
        plt.close(fig)
        logger.info("Generated SHAP comparison chart %s for %s", path.name, account_id)
        return str(path)

    def _save_plotly_assets(
        self,
        account_id: str,
        lgbm: List[Dict[str, Any]],
        gnn: List[Dict[str, Any]],
        ensemble: List[Dict[str, Any]],
    ) -> None:
        try:
            import plotly.graph_objects as go
        except Exception:
            return

        try:
            fig = go.Figure()
            for name, items, color in (
                ("LightGBM", lgbm, "#67e8f9"),
                ("GNN", gnn, "#a78bfa"),
                ("Ensemble", ensemble, "#34d399"),
            ):
                fig.add_trace(go.Bar(
                    name=name,
                    x=[item["feature_name"] for item in items[:6]],
                    y=[float(item["contribution_percentage"]) for item in items[:6]],
                    marker_color=color,
                ))
            fig.update_layout(
                barmode="group",
                template="plotly_dark",
                title="TriNetra SHAP Feature Comparison",
            )
            fig.write_html(str(self.output_dir / f"{account_id}_shap_interactive.html"))
        except Exception:
            logger.info("Plotly asset generation skipped for %s", account_id)
