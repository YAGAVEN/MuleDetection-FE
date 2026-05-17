"""PDF generation for Auto-SAR reports."""

from __future__ import annotations

from pathlib import Path
import math
from typing import Any, Dict, Iterable, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .export_service import ensure_directories


class PDFBuilder:
    def __init__(self) -> None:
        ensure_directories()

    def build_pdf(self, report: Dict[str, Any], output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            leftMargin=0.6 * inch,
            rightMargin=0.6 * inch,
            topMargin=0.65 * inch,
            bottomMargin=0.55 * inch,
        )
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            "AutoSARSectionTitle",
            parent=styles["Heading2"],
            fontSize=14,
            leading=16,
            textColor=colors.HexColor("#dbeafe"),
            spaceAfter=8,
            spaceBefore=6,
        ))
        styles.add(ParagraphStyle(
            "AutoSARAppendixTitle",
            parent=styles["Heading2"],
            fontSize=13,
            leading=15,
            textColor=colors.HexColor("#67e8f9"),
            spaceAfter=8,
            spaceBefore=6,
        ))
        styles.add(ParagraphStyle(
            "AutoSARBody",
            parent=styles["BodyText"],
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#e2e8f0"),
        ))
        elements: List[Any] = []
        self._append_cover(elements, styles, report)
        elements.append(PageBreak())
        for section in report.get("sections", []):
            self._append_section(elements, styles, section)
        self._append_appendix(elements, styles, report)
        doc.build(elements, onFirstPage=lambda c, d: self._decorate(c, report), onLaterPages=lambda c, d: self._decorate(c, report))
        return output_path

    def _decorate(self, canvas, report: Dict[str, Any]) -> None:
        canvas.setStrokeColor(colors.HexColor("#1d4ed8"))
        canvas.setFillColor(colors.HexColor("#08111f"))
        canvas.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#67e8f9"))
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawRightString(letter[0] - 36, 22, f"{report.get('title', 'TRINETRA AUTO-SAR')} | {report.get('risk_level', 'INFO')}")

    def _append_cover(self, elements: List[Any], styles, report: Dict[str, Any]) -> None:
        title = ParagraphStyle(
            "CoverTitle",
            parent=styles["Title"],
            fontSize=24,
            textColor=colors.HexColor("#67e8f9"),
            alignment=TA_CENTER,
            spaceAfter=8,
        )
        subtitle = ParagraphStyle(
            "CoverSubtitle",
            parent=styles["Normal"],
            fontSize=11,
            textColor=colors.HexColor("#cbd5e1"),
            alignment=TA_CENTER,
            spaceAfter=20,
        )
        elements.append(Spacer(1, 0.55 * inch))
        elements.append(Paragraph("TRINETRA AUTO-SAR", title))
        elements.append(Paragraph("AI-Powered Financial Crime Intelligence Report", subtitle))
        elements.append(Paragraph(report.get("subtitle", "Confidential AML Investigation Dossier"), subtitle))
        cover_rows = [
            ["Case / Account", report.get("case_id") or report.get("account_id") or "GLOBAL"],
            ["Risk Level", report.get("risk_level", "INFO")],
            ["Report Scope", report.get("report_scope", report.get("report_type", "auto-sar"))],
            ["Timestamp", report.get("generated_at", "N/A")],
            ["Investigator", report.get("investigator_name", "Auto-SAR Intelligence Engine")],
            ["Classification", report.get("classification_level", "Confidential")],
            ["Report Type", report.get("report_type", "auto-sar")],
        ]
        table = Table(cover_rows, colWidths=[2.1 * inch, 3.8 * inch])
        table.setStyle(self._table_style())
        elements.append(table)
        elements.append(Spacer(1, 0.25 * inch))
        summary = report.get("summary", {})
        summary_rows = [[str(k).replace("_", " ").title(), self._stringify(v)] for k, v in list(summary.items())[:8]]
        if summary_rows:
            elements.append(Paragraph("Executive Snapshot", styles["AutoSARSectionTitle"]))
            summary_table = Table(summary_rows, colWidths=[2.4 * inch, 3.5 * inch])
            summary_table.setStyle(self._table_style())
            elements.append(summary_table)

    def _append_section(self, elements: List[Any], styles, section: Dict[str, Any]) -> None:
        elements.append(Spacer(1, 0.18 * inch))
        elements.append(Paragraph(section.get("title", "Section"), styles["AutoSARSectionTitle"]))
        body = section.get("body")
        if body:
            if isinstance(body, dict):
                body = [f"{k}: {self._stringify(v)}" for k, v in body.items()]
            for item in body:
                elements.append(Paragraph(f"• {self._stringify(item)}", styles["AutoSARBody"]))
        table = section.get("table")
        if table:
            rows = self._table_rows(table)
            if rows:
                t = Table(rows, repeatRows=1)
                t.setStyle(self._table_style())
                t.setStyle(self._risk_table_style(table, rows))
                elements.append(t)
        charts = section.get("charts")
        if isinstance(charts, dict):
            for path in charts.values():
                img = self._image(path)
                if img:
                    elements.append(img)

    def _append_appendix(self, elements: List[Any], styles, report: Dict[str, Any]) -> None:
        appendix = report.get("appendix")
        if not appendix:
            return
        elements.append(Spacer(1, 0.2 * inch))
        elements.append(Paragraph("Appendix", styles["AutoSARAppendixTitle"]))
        if isinstance(appendix, dict):
            appendix_rows = [[k, self._stringify(v)] for k, v in list(appendix.items())[:10]]
            appendix_table = Table(appendix_rows, colWidths=[2.1 * inch, 3.9 * inch])
            appendix_table.setStyle(self._table_style())
            appendix_table.setStyle(self._risk_table_style(appendix, appendix_rows))
            elements.append(appendix_table)

    def _image(self, path: Any) -> Any:
        if not path:
            return None
        candidate = Path(path)
        if not candidate.exists():
            return None
        return Image(str(candidate), width=6.5 * inch, height=3.5 * inch)

    def _table_rows(self, rows: Any) -> List[List[str]]:
        if not isinstance(rows, list) or not rows:
            return []
        if isinstance(rows[0], dict):
            headers = list(rows[0].keys())
            data = [headers]
            for row in rows[:20]:
                data.append([self._stringify(row.get(header, "")) for header in headers])
            return data
        return [[self._stringify(item) for item in row] for row in rows]

    def _table_style(self) -> TableStyle:
        return TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#67e8f9")),
            ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#334155")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("LEADING", (0, 0), (-1, -1), 10),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#e2e8f0")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])

    def _risk_table_style(self, source: Any, rows: List[List[str]]) -> TableStyle:
        commands: List[tuple[Any, ...]] = []

        if isinstance(source, list) and source and isinstance(source[0], dict):
            for index, row in enumerate(source[:20], start=1):
                level = str(row.get("risk_level") or row.get("riskLevel") or row.get("level") or "").upper()
                if level == "CRITICAL":
                    commands.extend([
                        ("BACKGROUND", (0, index), (-1, index), colors.HexColor("#7f1d1d")),
                        ("TEXTCOLOR", (0, index), (-1, index), colors.white),
                    ])
                elif level == "HIGH":
                    commands.extend([
                        ("BACKGROUND", (0, index), (-1, index), colors.HexColor("#9a3412")),
                        ("TEXTCOLOR", (0, index), (-1, index), colors.white),
                    ])
                elif level == "MEDIUM":
                    commands.extend([
                        ("BACKGROUND", (0, index), (-1, index), colors.HexColor("#713f12")),
                        ("TEXTCOLOR", (0, index), (-1, index), colors.white),
                    ])
        elif rows and len(rows[0]) >= 3:
            level_index = None
            if isinstance(rows[0][0], str):
                header_row = [str(cell).lower() for cell in rows[0]]
                for candidate in ("risk level", "level"):
                    if candidate in header_row:
                        level_index = header_row.index(candidate)
                        break
            if level_index is not None:
                for index, row in enumerate(rows[1:21], start=1):
                    level = str(row[level_index]).upper()
                    if level == "CRITICAL":
                        commands.extend([
                            ("BACKGROUND", (0, index), (-1, index), colors.HexColor("#7f1d1d")),
                            ("TEXTCOLOR", (0, index), (-1, index), colors.white),
                        ])
                    elif level == "HIGH":
                        commands.extend([
                            ("BACKGROUND", (0, index), (-1, index), colors.HexColor("#9a3412")),
                            ("TEXTCOLOR", (0, index), (-1, index), colors.white),
                        ])
                    elif level == "MEDIUM":
                        commands.extend([
                            ("BACKGROUND", (0, index), (-1, index), colors.HexColor("#713f12")),
                            ("TEXTCOLOR", (0, index), (-1, index), colors.white),
                        ])

        return TableStyle(commands)

    def _stringify(self, value: Any) -> str:
        if value is None:
            return "N/A"
        if isinstance(value, (dict, list)):
            return str(value)
        if isinstance(value, float) and not math.isfinite(value):
            return "N/A"
        if hasattr(value, "item") and not isinstance(value, (str, bytes)):
            try:
                return self._stringify(value.item())
            except Exception:
                pass
        return str(value)
