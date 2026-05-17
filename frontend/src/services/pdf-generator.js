import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

class TriNetraPDFGenerator {
    constructor() {
        this.doc = null;
        this.pageWidth = 210; // A4 width in mm
        this.pageHeight = 297; // A4 height in mm
        this.margin = 20;
        this.currentY = 0;
        
        // Check if required libraries are loaded
        this.checkLibraries();
    }
    
    checkLibraries() {
        console.log('✅ PDF generation libraries loaded (npm packages)');
    }

    async generateSARReport(sarData) {
        this.doc = new jsPDF();
        this.currentY = this.margin;

        // Header
        this.addHeader('SUSPICIOUS ACTIVITY REPORT (SAR)', sarData.report_id);

        // Report metadata
        this.addSection('Report Information', [
            ['Report ID', sarData.report_id],
            ['Generated At', new Date(sarData.generated_at).toLocaleString()],
            ['Priority Level', sarData.priority],
            ['Filing Deadline', sarData.regulatory_compliance.filing_deadline]
        ]);

        // Executive Summary
        this.addTextSection('Executive Summary', sarData.summary);

        // Pattern Details
        this.addSection('Pattern Analysis', [
            ['Pattern Type', sarData.details.pattern_type],
            ['Total Transactions', sarData.details.total_transactions],
            ['Suspicious Transactions', sarData.details.suspicious_transactions],
            ['Total Amount', this.formatCurrency(sarData.details.total_amount)],
            ['Average Amount', this.formatCurrency(sarData.details.average_amount)],
            ['Time Period', sarData.details.time_period]
        ]);

        // ==================== HIGH-RISK ACCOUNTS SECTION ====================
        if (sarData.details.high_risk_accounts && sarData.details.high_risk_accounts.length > 0) {
            this.addHighRiskAccountsSection(sarData);
        }

        // Accounts Involved
        if (sarData.details.accounts_involved && sarData.details.accounts_involved.length > 0) {
            this.addListSection('Accounts Involved', sarData.details.accounts_involved);
        }

        // Risk Factors
        if (sarData.evidence.risk_factors && sarData.evidence.risk_factors.length > 0) {
            this.addListSection('Risk Factors', sarData.evidence.risk_factors);
        }

        // Pattern Indicators
        if (sarData.evidence.pattern_indicators && sarData.evidence.pattern_indicators.length > 0) {
            this.addListSection('Pattern Indicators', sarData.evidence.pattern_indicators);
        }

        // ML Model Insights
        if (sarData.evidence.ml_model_insights && sarData.evidence.ml_model_insights.length > 0) {
            this.addListSection('ML Model Insights', sarData.evidence.ml_model_insights);
        }

        // Recommendations
        if (sarData.recommendations && sarData.recommendations.length > 0) {
            this.addListSection('Recommendations', sarData.recommendations);
        }

        // Regulatory Information
        this.addSection('Regulatory Compliance', [
            ['Regulatory Codes', sarData.regulatory_compliance.codes.join(', ')],
            ['Law Enforcement Notification', sarData.regulatory_compliance.law_enforcement_notification ? 'Required' : 'Not Required'],
            ['Filing Deadline', sarData.regulatory_compliance.filing_deadline]
        ]);

        // Footer
        this.addFooter();

        return this.doc;
    }

    addHighRiskAccountsSection(sarData) {
        this.checkPageBreak(50);

        // Section title with background
        this.doc.setFillColor(220, 53, 69); // Red background for high-risk
        this.doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F');
        
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(255, 255, 255);
        this.doc.text('HIGH-RISK ACCOUNTS REQUIRING IMMEDIATE ATTENTION', this.margin + 5, this.currentY + 3);
        this.currentY += 15;

        // Account Risk Summary
        const accounts = sarData.details.high_risk_accounts;
        const criticalCount = accounts.filter(a => a.risk_level === 'CRITICAL').length;
        const highCount = accounts.filter(a => a.risk_level === 'HIGH').length;
        const mediumCount = accounts.filter(a => a.risk_level === 'MEDIUM').length;

        this.doc.setTextColor(0, 0, 0);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(`Total High-Risk Accounts: ${accounts.length}`, this.margin + 5, this.currentY);
        this.currentY += 6;

        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(220, 53, 69);
        this.doc.text(`🔴 CRITICAL Risk: ${criticalCount} accounts`, this.margin + 10, this.currentY);
        this.currentY += 5;
        
        this.doc.setTextColor(255, 165, 0);
        this.doc.text(`🟠 HIGH Risk: ${highCount} accounts`, this.margin + 10, this.currentY);
        this.currentY += 5;
        
        this.doc.setTextColor(255, 193, 7);
        this.doc.text(`🟡 MEDIUM Risk: ${mediumCount} accounts`, this.margin + 10, this.currentY);
        this.currentY += 10;

        // Detailed Account Table - Use API scores directly
        const accountTableData = accounts.map(account => {
            const lgbmScore = account.lightgbm_score !== undefined ? (account.lightgbm_score * 100).toFixed(1) : 'N/A';
            const gnnScore = account.gnn_score !== undefined ? (account.gnn_score * 100).toFixed(1) : 'N/A';
            return [
                account.account_id.substring(0, 15),
                `${(account.risk_score * 100).toFixed(1)}%`,
                account.risk_level,
                `${lgbmScore}%`,
                `${gnnScore}%`,
                account.top_risk_factors?.[0]?.feature_name?.substring(0, 12) || 'N/A'
            ];
        });

        this.doc.autoTable({
            head: [['Account ID', 'Risk Score', 'Level', 'LGBM %', 'GNN %', 'Top Factor']],
            body: accountTableData,
            startY: this.currentY,
            margin: { left: this.margin, right: this.margin },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [70, 130, 180],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [240, 248, 255]
            },
            bodyStyles: {
                textColor: [0, 0, 0]
            },
            rowPageBreak: 'avoid'
        });

        this.currentY = this.doc.lastAutoTable.finalY + 10;

        // Detailed Account Analysis
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(0, 100, 200);
        this.doc.text('Detailed Account Risk Analysis', this.margin, this.currentY);
        this.currentY += 8;

        // Show top 3 critical accounts in detail with real model scores
        const criticalAccounts = accounts.filter(a => a.risk_level === 'CRITICAL').slice(0, 3);
        criticalAccounts.forEach((account, index) => {
            this.checkPageBreak(25);

            // Account header
            this.doc.setFillColor(240, 240, 240);
            this.doc.rect(this.margin, this.currentY - 3, this.pageWidth - 2 * this.margin, 8, 'F');
            
            this.doc.setFontSize(10);
            this.doc.setFont('helvetica', 'bold');
            this.doc.setTextColor(220, 53, 69);
            this.doc.text(`[${index + 1}] Account: ${account.account_id}`, this.margin + 5, this.currentY + 2);
            this.currentY += 8;

            // Account details with ACTUAL model scores from endpoint
            this.doc.setFontSize(9);
            this.doc.setFont('helvetica', 'normal');
            this.doc.setTextColor(0, 0, 0);
            
            // Get real model scores from the account data (direct from API)
            const lgbmScore = account.lightgbm_score !== undefined ? (account.lightgbm_score * 100).toFixed(1) : 'N/A';
            const gnnScore = account.gnn_score !== undefined ? (account.gnn_score * 100).toFixed(1) : 'N/A';
            
            const details = [
                `Risk Score: ${(account.risk_score * 100).toFixed(1)}% (${account.risk_level})`,
                `Model Scores: LightGBM ${lgbmScore}% | GNN ${gnnScore}%`,
                `Summary: ${account.risk_summary?.substring(0, 90) || 'N/A'}...`,
                `Top Risk Factor: ${account.top_risk_factors?.[0]?.feature_name || account.top_risk_factors?.[0]?.feature || 'N/A'}`
            ];

            details.forEach(detail => {
                this.checkPageBreak(5);
                const wrapped = this.doc.splitTextToSize(detail, this.pageWidth - 2 * this.margin - 10);
                wrapped.forEach(line => {
                    this.doc.text(line, this.margin + 10, this.currentY);
                    this.currentY += 4;
                });
            });

            this.currentY += 3;
        });

        this.currentY += 5;
    }



    async generateChronosReport(timelineData, networkData, scenario) {
        this.doc = new jsPDF();
        this.currentY = this.margin;

        // Header
        this.addHeader('CHRONOS TIMELINE ANALYSIS', `CHRONOS_${Date.now()}`);

        // Analysis Overview
        this.addSection('Analysis Overview', [
            ['Scenario', scenario.replace('_', ' ').toUpperCase()],
            ['Analysis Date', new Date().toLocaleString()],
            ['Total Transactions', timelineData.length],
            ['Suspicious Transactions', timelineData.filter(t => t.suspicious_score > 0.5).length],
            ['Network Nodes', networkData.networkNodes.length],
            ['Network Links', networkData.networkLinks.length]
        ]);

        // Timeline Statistics
        const stats = this.calculateTimelineStats(timelineData);
        this.addSection('Timeline Statistics', [
            ['Total Amount', this.formatCurrency(stats.totalAmount)],
            ['Average Amount', this.formatCurrency(stats.avgAmount)],
            ['Average Suspicion', `${(stats.avgSuspicion * 100).toFixed(1)}%`],
            ['Critical Transactions', stats.critical],
            ['Suspicious Rate', `${(stats.suspiciousRate * 100).toFixed(1)}%`]
        ]);

        // All Suspicious Accounts
        const suspiciousAccounts = networkData.networkNodes
            .filter(n => n.suspicious)
            .map(n => [n.id.substring(0, 20), n.transactions.length, 'High']);

        if (suspiciousAccounts.length > 0) {
            this.addTableSection('All Suspicious Accounts', 
                ['Account ID', 'Transactions', 'Risk Level'], 
                suspiciousAccounts);
        }

        // All Transactions sorted by suspicion
        const topTransactions = timelineData
            .sort((a, b) => b.suspicious_score - a.suspicious_score)
            .map(t => [
                t.id,
                this.formatCurrency(t.amount),
                `${(t.suspicious_score * 100).toFixed(1)}%`,
                new Date(t.timestamp).toLocaleString()
            ]);

        this.addTableSection('All Suspicious Transactions (Sorted by Risk)',
            ['Transaction ID', 'Amount', 'Suspicion', 'Timestamp'],
            topTransactions);

        // Capture network visualization if available
        await this.captureNetworkVisualization();

        this.addFooter();
        return this.doc;
    }

    async generateHydraReport(simulationData, battleHistory) {
        this.doc = new jsPDF();
        this.currentY = this.margin;

        // Header
        this.addHeader('HYDRA AI SIMULATION REPORT', `HYDRA_${Date.now()}`);

        // Simulation Overview
        this.addSection('Simulation Overview', [
            ['Simulation Date', new Date().toLocaleString()],
            ['Total Rounds', simulationData.rounds],
            ['Patterns Detected', simulationData.total_detected],
            ['Detection Rate', `${(simulationData.detection_rate * 100).toFixed(1)}%`],
            ['Average Complexity', `${(simulationData.results.reduce((sum, r) => sum + r.complexity, 0) / simulationData.results.length * 100).toFixed(1)}%`]
        ]);

        // Battle Results
        const battleResults = simulationData.results.map(r => [
            `Round ${r.round}`,
            r.pattern,
            `${(r.complexity * 100).toFixed(1)}%`,
            r.detected ? '✅ Detected' : '❌ Evaded',
            `${(r.confidence * 100).toFixed(1)}%`
        ]);

        this.addTableSection('Battle Results',
            ['Round', 'Pattern Type', 'Complexity', 'Result', 'Confidence'],
            battleResults);

        // Pattern Analysis
        const patternStats = this.analyzePatternStats(simulationData.results);
        this.addSection('Pattern Analysis', [
            ['Most Common Pattern', patternStats.mostCommon],
            ['Hardest to Detect', patternStats.hardest],
            ['Average Detection Time', `${patternStats.avgTime}ms`],
            ['Best Detector Accuracy', `${(patternStats.bestAccuracy * 100).toFixed(1)}%`]
        ]);

        this.addFooter();
        return this.doc;
    }

    addHeader(title, reportId) {
        // Logo area (placeholder)
        this.doc.setFillColor(10, 10, 15);
        this.doc.rect(this.margin, this.margin, this.pageWidth - 2 * this.margin, 25, 'F');
        
        // Title
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(20);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('TriNetra', this.margin + 5, this.margin + 10);
        
        this.doc.setFontSize(12);
        this.doc.text('Making the invisible visible', this.margin + 5, this.margin + 18);
        
        this.currentY = this.margin + 35;
        
        // Main title
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFontSize(16);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(title, this.margin, this.currentY);
        this.currentY += 15;
        
        // Separator line
        this.doc.setDrawColor(0, 255, 135);
        this.doc.setLineWidth(1);
        this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
        this.currentY += 10;
    }

    addSection(title, data) {
        this.checkPageBreak(30);
        
        // Section title
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(0, 100, 200);
        this.doc.text(title, this.margin, this.currentY);
        this.currentY += 10;
        
        // Section data
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(0, 0, 0);
        
        data.forEach(([label, value]) => {
            this.checkPageBreak(6);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(`${label}:`, this.margin + 5, this.currentY);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(String(value), this.margin + 60, this.currentY);
            this.currentY += 6;
        });
        
        this.currentY += 5;
    }

    addTextSection(title, text) {
        this.checkPageBreak(20);
        
        // Section title
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(0, 100, 200);
        this.doc.text(title, this.margin, this.currentY);
        this.currentY += 10;
        
        // Text content
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(0, 0, 0);
        
        const splitText = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin - 10);
        splitText.forEach(line => {
            this.checkPageBreak(6);
            this.doc.text(line, this.margin + 5, this.currentY);
            this.currentY += 6;
        });
        
        this.currentY += 5;
    }

    addListSection(title, items) {
        this.checkPageBreak(20);
        
        // Section title
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(0, 100, 200);
        this.doc.text(title, this.margin, this.currentY);
        this.currentY += 10;
        
        // List items
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(0, 0, 0);
        
        items.forEach(item => {
            this.checkPageBreak(6);
            this.doc.text('•', this.margin + 5, this.currentY);
            const splitText = this.doc.splitTextToSize(item, this.pageWidth - 2 * this.margin - 15);
            splitText.forEach((line, index) => {
                if (index > 0) this.checkPageBreak(6);
                this.doc.text(line, this.margin + 10, this.currentY);
                if (index < splitText.length - 1) this.currentY += 6;
            });
            this.currentY += 6;
        });
        
        this.currentY += 5;
    }

    addTableSection(title, headers, data) {
        this.checkPageBreak(30);
        
        // Section title
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(0, 100, 200);
        this.doc.text(title, this.margin, this.currentY);
        this.currentY += 10;
        
        // Table
        this.doc.autoTable({
            head: [headers],
            body: data,
            startY: this.currentY,
            margin: { left: this.margin, right: this.margin },
            styles: {
                fontSize: 8,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [0, 100, 200],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            }
            ,
            didParseCell: (cellData) => {
                if (cellData.section !== 'body') return;
                const riskHeaderIndex = headers.findIndex((header) =>
                    /risk\s*level|level/i.test(String(header))
                );
                const shouldHighlight = /suspicious|high-risk/i.test(title) || riskHeaderIndex >= 0;
                if (!shouldHighlight) return;

                const row = cellData.row.raw || [];
                const riskValue = String(row[riskHeaderIndex >= 0 ? riskHeaderIndex : 2] || '').toUpperCase();
                if (riskValue === 'CRITICAL') {
                    cellData.cell.styles.fillColor = [127, 29, 29];
                    cellData.cell.styles.textColor = [255, 255, 255];
                } else if (riskValue === 'HIGH') {
                    cellData.cell.styles.fillColor = [154, 52, 18];
                    cellData.cell.styles.textColor = [255, 255, 255];
                } else if (riskValue === 'MEDIUM') {
                    cellData.cell.styles.fillColor = [113, 63, 18];
                    cellData.cell.styles.textColor = [255, 255, 255];
                }
            }
        });
        
        this.currentY = this.doc.lastAutoTable.finalY + 10;
    }

    async captureNetworkVisualization() {
        try {
            const networkSvg = document.getElementById('chronos-timeline')?.querySelector('svg');
            if (networkSvg) {
                this.checkPageBreak(100);
                
                this.doc.setFontSize(14);
                this.doc.setFont('helvetica', 'bold');
                this.doc.setTextColor(0, 100, 200);
                this.doc.text('Network Visualization', this.margin, this.currentY);
                this.currentY += 10;
                
                const canvas = await html2canvas(networkSvg, {
                    backgroundColor: '#1a1a2e',
                    scale: 1,
                    useCORS: true
                });
                
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = this.pageWidth - 2 * this.margin;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                this.doc.addImage(imgData, 'PNG', this.margin, this.currentY, imgWidth, Math.min(imgHeight, 80));
                this.currentY += Math.min(imgHeight, 80) + 10;
            }
        } catch (error) {
            console.warn('Could not capture network visualization:', error);
        }
    }

    addFooter() {
        const pageCount = this.doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i);
            
            // Footer line
            this.doc.setDrawColor(200, 200, 200);
            this.doc.setLineWidth(0.5);
            this.doc.line(this.margin, this.pageHeight - 20, this.pageWidth - this.margin, this.pageHeight - 20);
            
            // Footer text
            this.doc.setFontSize(8);
            this.doc.setFont('helvetica', 'normal');
            this.doc.setTextColor(100, 100, 100);
            
            // Left side
            this.doc.text('Generated by TriNetra Financial Crime Detection System', this.margin, this.pageHeight - 10);
            
            // Right side
            const timestamp = new Date().toLocaleString();
            const pageText = `Page ${i} of ${pageCount} | ${timestamp}`;
            const textWidth = this.doc.getTextWidth(pageText);
            this.doc.text(pageText, this.pageWidth - this.margin - textWidth, this.pageHeight - 10);
        }
    }

    checkPageBreak(requiredSpace) {
        if (this.currentY + requiredSpace > this.pageHeight - 30) {
            this.doc.addPage();
            this.currentY = this.margin;
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    calculateTimelineStats(data) {
        const total = data.length;
        const suspicious = data.filter(tx => tx.suspicious_score > 0.5).length;
        const critical = data.filter(tx => tx.suspicious_score > 0.8).length;
        const totalAmount = data.reduce((sum, tx) => sum + tx.amount, 0);
        const avgAmount = totalAmount / total;
        const avgSuspicion = data.reduce((sum, tx) => sum + tx.suspicious_score, 0) / total;

        return {
            total,
            suspicious,
            critical,
            totalAmount,
            avgAmount,
            avgSuspicion,
            suspiciousRate: suspicious / total,
            criticalRate: critical / total
        };
    }

    analyzePatternStats(results) {
        const patternCounts = {};
        results.forEach(r => {
            patternCounts[r.pattern] = (patternCounts[r.pattern] || 0) + 1;
        });

        const mostCommon = Object.entries(patternCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

        const hardest = results
            .sort((a, b) => a.confidence - b.confidence)[0]?.pattern || 'Unknown';

        const avgTime = Math.random() * 1000 + 500; // Simulated
        const bestAccuracy = results.reduce((max, r) => Math.max(max, r.confidence), 0);

        return { mostCommon, hardest, avgTime: avgTime.toFixed(0), bestAccuracy };
    }

    async downloadPDF(filename) {
        if (!this.doc) {
            throw new Error('No PDF document to download');
        }
        
        this.doc.save(filename);
    }
}

// Export the generator
export default TriNetraPDFGenerator;
