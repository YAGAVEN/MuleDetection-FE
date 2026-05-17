// TriNetra API Module
class TriNetraAPI {
    constructor() {
        this.baseURL = this.resolveBaseURL();
        this.mockHydraBattle = this.createMockHydraBattle();
        this.mockDashboardTick = 0;
        this.mockAutoSarCases = this.generateAutoSarCases();
        this.mockAutoSarReports = {};
    }

    resolveBaseURL() {
        const envBase = import.meta.env.VITE_API_BASE_URL;
        if (envBase && typeof envBase === 'string') {
            return envBase.replace(/\/$/, '');
        }

        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1';

        // Use port 8000 for FastAPI backend locally
        if (isLocal) {
            return 'http://localhost:8000/api';
        }

        return '/api';
    }

    async request(endpoint, options = {}) {
        const disableMockFallback = Boolean(options?.disableMockFallback);
        const { disableMockFallback: _omitDisableMockFallback, ...requestOptions } = options;
        const url = `${this.baseURL}${endpoint}`;
        const isMuleEndpoint = endpoint.startsWith('/mule/');
        const isFormData = requestOptions?.body instanceof FormData;
        const config = {
            headers: isFormData ? {} : {
                'Content-Type': 'application/json',
            },
            ...requestOptions
        };

        try {
            const response = await fetch(url, config);
            
            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                if (isMuleEndpoint) {
                    throw new Error(`Mule API returned non-JSON response for ${endpoint}. Verify backend/proxy is running.`);
                }
                if (disableMockFallback) {
                    throw new Error(`API returned non-JSON response for ${endpoint}.`);
                }
                console.warn(`[WARN] API endpoint ${endpoint} returned non-JSON response - using mock data`);
                return this.getMockData(endpoint, requestOptions);
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                if (isMuleEndpoint) {
                    const backendMessage = data?.message || data?.error || `HTTP ${response.status}`;
                    throw new Error(backendMessage);
                }
                if (disableMockFallback) {
                    const backendMessage = data?.message || data?.error || `HTTP ${response.status}`;
                    throw new Error(backendMessage);
                }
                console.warn(`[WARN] API error ${response.status} for ${endpoint} - using mock data`);
                return this.getMockData(endpoint, requestOptions);
            }
            
            console.log(`[SUCCESS] API Success: ${endpoint}`, data);
            return data;
        } catch (error) {
            console.error(`[ERROR] API request failed for ${endpoint}:`, error.message);
            if (isMuleEndpoint) {
                throw error;
            }
            if (disableMockFallback) {
                throw error;
            }
            console.warn(`[WARN] Using mock data for ${endpoint} due to error: ${error.message}`);
            return this.getMockData(endpoint, requestOptions);
        }
    }

    isDeployedEnvironment() {
        // Check if we're running on Vercel or other deployment platforms
        return window.location.hostname.includes('vercel.app') || 
               window.location.hostname.includes('netlify.app') ||
               window.location.hostname.includes('herokuapp.com') ||
               (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
    }

    getMockData(endpoint, requestOptions = {}) {
        // Return appropriate mock data based on endpoint
        if (endpoint.includes('/chronos/timeline')) {
            const data = this.generateSampleTransactions();
            return {
                status: 'success',
                data: data,
                total_transactions: data.length,
                time_quantum: '1m',
                date_range: {
                    start: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
                    end: new Date().toISOString()
                },
                layering_summary: this.generateLayeringSummary(data),
                message: "Demo mode - Using enhanced sample data"
            };
        }
        
        if (endpoint.includes('/chronos/search')) {
            const allResults = this.generateSampleTransactions();
            return {
                status: 'success',
                results: allResults,
                total_matches: allResults.length,
                search_term: 'demo',
                search_type: 'all',
                message: "Demo mode - All search results"
            };
        }
        
        if (endpoint.includes('/hydra/generate')) {
            return {
                status: "success",
                data: {
                    pattern_id: `PATTERN_${Date.now()}`,
                    pattern_type: "layering_scheme",
                    attack_type: "layering_scheme",
                    complexity_score: Math.random() * 0.3 + 0.6, // 0.6-0.9
                    complexity: Math.random() * 0.3 + 0.6,
                    evasion_score: Math.random() * 0.4 + 0.6,
                    description: "Demo adversarial pattern - Complex layering with multiple intermediaries",
                    transactions: this.generateAdversarialPattern(),
                    timestamp: new Date().toISOString()
                },
                message: "Demo mode - Generated sample adversarial pattern"
            };
        }
        
        if (endpoint.includes('/hydra/detect')) {
            return {
                status: "success",
                detection_result: {
                    detected: Math.random() > 0.3,
                    confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
                    detection_time_ms: Math.floor(Math.random() * 200) + 50,
                    alerts: ["Unusual transaction pattern", "High velocity transfers"]
                },
                message: "Demo mode - Simulated detection result"
            };
        }

        if (endpoint.includes('/hydra/battle/start')) {
            let rounds = 20;
            let intervalSeconds = 2;
            try {
                const payload = JSON.parse(requestOptions?.body || '{}');
                rounds = Math.max(1, Number(payload?.rounds) || 20);
                intervalSeconds = Math.max(1, Number(payload?.interval_seconds) || 2);
            } catch {
                // Keep default demo values when request payload is malformed.
            }

            this.mockHydraBattle = {
                ...this.mockHydraBattle,
                training_status: 'running',
                active_attack_type: 'layering_scheme',
                is_running: true,
                round: 0,
                rounds_target: rounds,
                interval_seconds: intervalSeconds,
                last_tick_at: Date.now(),
            };

            return {
                status: "success",
                battle: this.generateMockHydraBattleStatus(),
            };
        }

        if (endpoint.includes('/hydra/battle/stop')) {
            this.mockHydraBattle = {
                ...this.mockHydraBattle,
                training_status: 'idle',
                active_attack_type: 'none',
                is_running: false,
                last_tick_at: Date.now(),
            };
            return {
                status: "success",
                battle: { ...this.mockHydraBattle },
            };
        }

        if (endpoint.includes('/hydra/battle/status')) {
            return {
                status: "success",
                battle: this.generateMockHydraBattleStatus(),
            };
        }
        
        if (endpoint.includes('/hydra/')) {
            return {
                status: "success",
                message: "Demo mode - HYDRA service available",
                data: []
            };
        }
        
        if (endpoint.includes('/autosar/generate')) {
            return {
                status: "success",
                sar_report: {
                    report_id: `SAR_${Date.now()}`,
                    title: "Suspicious Layering Activity Report",
                    priority: ["LOW", "MEDIUM", "HIGH"][Math.floor(Math.random() * 3)],
                    generated_at: new Date().toISOString(),
                    report_content: this.generateSampleSARReport(),
                    confidence_score: Math.random() * 0.3 + 0.7, // 0.7-1.0
                    suspicious_transactions: Math.floor(Math.random() * 10) + 5,
                    risk_level: ["LOW", "MEDIUM", "HIGH"][Math.floor(Math.random() * 3)],
                    summary: "Multiple structured transactions detected involving potential money laundering scheme.",
                    details: {
                        pattern_type: "Layering & Structuring",
                        total_transactions: Math.floor(Math.random() * 50) + 20,
                        suspicious_transactions: Math.floor(Math.random() * 10) + 5,
                        total_amount: Math.random() * 500000 + 100000,
                        average_amount: Math.random() * 15000 + 5000,
                        time_period: "30 days",
                        accounts_involved: [
                            "ACC_001_DEMO", "ACC_002_DEMO", "ACC_003_DEMO", 
                            "ACC_004_DEMO", "ACC_005_DEMO", "SHELL_001", 
                            "SHELL_002", "TARGET_ACC"
                        ]
                    },
                    evidence: {
                        risk_factors: [
                            "Multiple cash deposits just under $10,000 reporting threshold",
                            "Rapid movement of funds between multiple accounts",
                            "Transactions with no apparent business purpose",
                            "Pattern consistent with layering money laundering technique"
                        ],
                        regulatory_flags: [
                            "BSA_STRUCTURING",
                            "AML_SUSPICIOUS_PATTERN",
                            "CTR_AVOIDANCE"
                        ],
                        suspicious_patterns: [
                            "Structured deposits",
                            "Rapid fund transfers",
                            "Shell account usage"
                        ],
                        pattern_indicators: [
                            "High frequency transactions",
                            "Just-below-threshold amounts",
                            "Multiple account usage",
                            "Rapid fund movement"
                        ],
                        transaction_ids: [
                            "TXN_001_DEMO", "TXN_002_DEMO", "TXN_003_DEMO", 
                            "TXN_004_DEMO", "TXN_005_DEMO", "TXN_006_DEMO",
                            "TXN_007_DEMO", "TXN_008_DEMO"
                        ]
                    },
                    regulatory_compliance: {
                        filing_deadline: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                        required_fields: ["completed"],
                        validation_status: "PASSED",
                        codes: ["BSA_314B", "AML_CTR", "SAR_031"],
                        law_enforcement_notification: true
                    },
                    attachments: {
                        "Transaction Log": "txn_log.csv",
                        "Account Analysis": "account_analysis.pdf",
                        "Risk Assessment": "risk_assessment.pdf"
                    },
                    recommendations: [
                        "File SAR report with FinCEN within 30 days",
                        "Implement enhanced monitoring for identified accounts",
                        "Review and update transaction monitoring thresholds",
                        "Conduct additional due diligence on high-risk customers",
                        "Consider account closure or restrictions if activity continues"
                    ]
                },
                message: "Demo mode - Generated sample SAR report"
            };
        }
        
        if (endpoint.includes('/cases')) {
            return {
                status: 'success',
                cases: this.mockAutoSarCases,
            };
        }

        if (endpoint.includes('/report/generate/account/')) {
            const accountId = endpoint.split('/report/generate/account/')[1].split('?')[0];
            return {
                status: 'success',
                ...this.generateAutoSarReport({
                    report_type: 'individual_account',
                    account_id: accountId,
                    report_id: `ACCOUNT_${accountId}_${Date.now()}`,
                    investigator_name: 'Auto-SAR Intelligence Engine',
                }),
            };
        }

        if (endpoint.includes('/report/generate/full-investigation')) {
            return {
                status: 'success',
                ...this.generateAutoSarReport({
                    report_type: 'full_investigation',
                    report_id: `FULL_INVESTIGATION_${Date.now()}`,
                    investigator_name: 'Auto-SAR Intelligence Engine',
                }),
            };
        }

        if (endpoint.includes('/report/generate/all-cases')) {
            return {
                status: 'success',
                ...this.generateAutoSarReport({
                    report_type: 'all_cases',
                    report_id: `ALL_CASES_${Date.now()}`,
                    investigator_name: 'Auto-SAR Intelligence Engine',
                }),
            };
        }

        if (endpoint.includes('/report/generate/hydra')) {
            return {
                status: 'success',
                ...this.generateAutoSarReport({
                    report_type: 'hydra_training',
                    report_id: `HYDRA_TRAINING_${Date.now()}`,
                    investigator_name: 'Auto-SAR Intelligence Engine',
                }),
            };
        }

        if (endpoint.includes('/case/')) {
            const caseId = endpoint.split('/').pop();
            return {
                status: 'success',
                case: this.generateAutoSarCaseDetail(caseId),
            };
        }

        if (endpoint.includes('/report/generate')) {
            try {
                const payload = JSON.parse(requestOptions?.body || '{}');
                return {
                    status: 'success',
                    ...this.generateAutoSarReport(payload),
                };
            } catch {
                return {
                    status: 'failed',
                    detail: 'Unable to parse report request',
                };
            }
        }

        if (endpoint.includes('/report/download/')) {
            return {
                status: 'success',
                download_url: endpoint,
            };
        }

        if (endpoint.includes('/report/') && !endpoint.includes('/hydra/report') && !endpoint.includes('/model/report')) {
            const reportId = endpoint.split('/').pop();
            return {
                status: 'success',
                ...(this.mockAutoSarReports[reportId] || this.generateAutoSarReport({
                    report_type: 'prediction_model',
                    report_id: reportId,
                })),
            };
        }

        if (endpoint.includes('/hydra/report')) {
            return {
                status: 'success',
                report: this.generateAutoSarReport({
                    report_type: 'hydra_training',
                    investigator_name: 'Auto-SAR Intelligence Engine',
                }),
            };
        }

        if (endpoint.includes('/model/report')) {
            return {
                status: 'success',
                report: this.generateAutoSarReport({
                    report_type: 'prediction_model',
                    investigator_name: 'Auto-SAR Intelligence Engine',
                }),
            };
        }

        if (endpoint.includes('/autosar/')) {
            return {
                status: "success",
                message: "Demo mode - Auto-SAR service available",
                data: []
            };
        }
        
        if (endpoint.includes('/mule/mule-risk/') || endpoint.includes('/mule/explain-risk/')) {
            const accountId = endpoint.split('/').pop();
            return {
                status: "success",
                account_id: accountId,
                risk_score: Math.floor(Math.random() * 100),
                risk_level: ['LOW','MEDIUM','HIGH','CRITICAL'][Math.floor(Math.random()*4)],
                behavioral_score: Math.random(),
                network_score: Math.random(),
                layering_score: Math.random(),
                velocity_score: Math.random(),
                timestamp: new Date().toISOString()
            };
        }

        if (endpoint.includes('/mule/network-metrics/')) {
            return {
                status: "success",
                account_id: endpoint.split('/').pop(),
                network_risk_score: Math.random() * 0.9,
                centrality_score: Math.random(),
                hub_score: Math.random(),
                funnel_score: Math.random(),
                connected_accounts: Math.floor(Math.random() * 20) + 2,
                community_size: Math.floor(Math.random() * 15) + 1
            };
        }

        if (endpoint.includes('/mule/layering-detection/')) {
            return {
                status: "success",
                account_id: endpoint.split('/').pop(),
                layering_risk_score: Math.random(),
                smurfing_detected: Math.random() > 0.5,
                round_tripping: Math.random() > 0.6,
                layering_chains: Math.floor(Math.random() * 5)
            };
        }

        if (endpoint.includes('/mule/high-risk-accounts')) {
            return {
                status: "success",
                accounts: Array.from({ length: 5 }, (_, i) => ({
                    account_id: `DEMO_ACC_${String(i+1).padStart(3,'0')}`,
                    risk_score: 70 + Math.random() * 30
                }))
            };
        }

        if (endpoint.includes('/mule/')) {
            return { status: "success", message: "Demo mode - Mule service available" };
        }

        if (endpoint.includes('/v1/ml/explain')) {
            return {
                status: "success",
                account_id: "ACC_DEMO_001",
                prediction_score: Math.random() * 100,
                risk_level: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
                base_value: 45.2,
                feature_contributions: [
                    {
                        feature_name: "transaction_velocity",
                        shap_value: Math.random() * 20 - 10,
                        base_value: 45.2,
                        contribution_percentage: Math.random() * 20 + 5
                    },
                    {
                        feature_name: "account_age_days",
                        shap_value: Math.random() * 15 - 7,
                        base_value: 45.2,
                        contribution_percentage: Math.random() * 15 + 3
                    },
                    {
                        feature_name: "unique_counterparties",
                        shap_value: Math.random() * 25 - 12,
                        base_value: 45.2,
                        contribution_percentage: Math.random() * 25 + 8
                    },
                    {
                        feature_name: "structuring_pattern",
                        shap_value: Math.random() * 30 - 15,
                        base_value: 45.2,
                        contribution_percentage: Math.random() * 30 + 10
                    },
                    {
                        feature_name: "geographic_risk",
                        shap_value: Math.random() * 18 - 9,
                        base_value: 45.2,
                        contribution_percentage: Math.random() * 18 + 4
                    }
                ],
                top_positive_features: [
                    {
                        feature_name: "structuring_pattern",
                        shap_value: 15.5,
                        base_value: 45.2,
                        contribution_percentage: 28.4
                    },
                    {
                        feature_name: "unique_counterparties",
                        shap_value: 12.3,
                        base_value: 45.2,
                        contribution_percentage: 22.1
                    },
                    {
                        feature_name: "transaction_velocity",
                        shap_value: 10.8,
                        base_value: 45.2,
                        contribution_percentage: 19.5
                    }
                ],
                top_negative_features: [
                    {
                        feature_name: "account_age_days",
                        shap_value: -8.5,
                        base_value: 45.2,
                        contribution_percentage: 15.3
                    },
                    {
                        feature_name: "compliance_score",
                        shap_value: -6.2,
                        base_value: 45.2,
                        contribution_percentage: 11.2
                    }
                ],
                model_used: "Ensemble (LightGBM + GNN)",
                explanation_timestamp: new Date().toISOString(),
                message: "Demo mode - SHAP explanation generated"
            };
        }

        if (endpoint.includes('/v1/ml/predict')) {
            return {
                status: "success",
                account_id: "ACC_DEMO_001",
                lgbm_score: Math.random() * 100,
                gnn_score: Math.random() * 100,
                ensemble_score: Math.random() * 100,
                prediction_timestamp: new Date().toISOString(),
                model_versions: {
                    lgbm: "1.2.3",
                    gnn: "2.1.0",
                    ensemble: "1.0.5"
                },
                message: "Demo mode - Prediction generated"
            };
        }

        return {
            status: "mock",
            message: "Demo mode - Backend API not available"
        };
    }

    generateSampleTransactions() {
        const transactions = [];
        const accounts = ['ACC_001', 'ACC_002', 'ACC_003', 'ACC_004', 'ACC_005', 'ACC_006', 'ACC_007', 'ACC_008', 'ACC_009', 'ACC_010', 'SHELL_001', 'SHELL_002', 'TARGET_ACC'];
        const types = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Wire Transfer', 'Cryptocurrency', 'Hawala'];
        const suspicionLevels = [0.1, 0.3, 0.5, 0.7, 0.9];
        const scenarios = ['terrorist_financing', 'crypto_sanctions', 'human_trafficking'];
        const patternTypes = ['rapid_sequence', 'smurfing', 'layering', 'structuring'];
        
        // Indian locations
        const locations = [
            { city: 'Mumbai', state: 'Maharashtra', country: 'India', region: 'Western' },
            { city: 'Delhi', state: 'Delhi', country: 'India', region: 'Northern' },
            { city: 'Bangalore', state: 'Karnataka', country: 'India', region: 'Southern' },
            { city: 'Chennai', state: 'Tamil Nadu', country: 'India', region: 'Southern' },
            { city: 'Kolkata', state: 'West Bengal', country: 'India', region: 'Eastern' },
            { city: 'Dubai', state: 'Dubai', country: 'UAE', region: 'Middle East' },
            { city: 'Karachi', state: 'Karachi', country: 'Pakistan', region: 'South Asia' }
        ];
        
        const banks = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank'];
        
        const baseTime = new Date('2024-01-01').getTime();
        
        const txnCount = 200;
        for (let i = 0; i < txnCount; i++) {
            const timestamp = new Date(baseTime + (i * 24 * 60 * 60 * 1000 * Math.random() * 90));
            const amount = Math.random() * 49900 + 100; // $100 to $50,000
            const fromAccount = accounts[Math.floor(Math.random() * accounts.length)];
            let toAccount = accounts[Math.floor(Math.random() * accounts.length)];
            while (toAccount === fromAccount) {
                toAccount = accounts[Math.floor(Math.random() * accounts.length)];
            }
            
            const suspicionScore = suspicionLevels[Math.floor(Math.random() * suspicionLevels.length)];
            const location = locations[Math.floor(Math.random() * locations.length)];
            const transactionMethod = types[Math.floor(Math.random() * types.length)];
            
            // Generate layering analysis
            const layeringAnalysis = this.generateLayeringAnalysis(suspicionScore, amount);
            
            // Country risk assessment
            const countryRiskLevel = this.getCountryRiskLevel(location.country);
            
            transactions.push({
                id: `TXN_${String(i + 1).padStart(3, '0')}`,
                transaction_id: `TXN_${String(i + 1).padStart(3, '0')}`,
                timestamp: timestamp.toISOString(),
                from_account: fromAccount,
                to_account: toAccount,
                amount: Math.round(amount * 100) / 100,
                transaction_type: transactionMethod,
                suspicious_score: suspicionScore,
                scenario: scenarios[Math.floor(Math.random() * scenarios.length)],
                pattern_type: patternTypes[Math.floor(Math.random() * patternTypes.length)],
                
                // Enhanced fields
                aadhar_location: {
                    ...location,
                    lat: this.getLocationCoordinates(location.city).lat,
                    lng: this.getLocationCoordinates(location.city).lng
                },
                layering_analysis: layeringAnalysis,
                country_risk_level: countryRiskLevel,
                transaction_method: transactionMethod,
                bank_details: {
                    bank_name: banks[Math.floor(Math.random() * banks.length)],
                    branch_code: `BR${Math.floor(Math.random() * 9000) + 1000}`,
                    ifsc_code: `SBIN${Math.floor(Math.random() * 900000) + 100000}`,
                    swift_code: `SWIFT${Math.floor(Math.random() * 90000) + 10000}`
                },
                
                description: `Sample transaction ${i + 1}`,
                flags: Math.random() > 0.7 ? ['large_amount'] : []
            });
        }
        
        return transactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    generateAdversarialPattern() {
        const pattern = [];
        const accounts = ['SHELL_001', 'SHELL_002', 'SHELL_003', 'TARGET_ACC'];
        
        // Generate a complex layering pattern
        for (let i = 0; i < 8; i++) {
            const baseAmount = 10000;
            const amount = baseAmount + (Math.random() * 1000 - 500); // Small variations
            
            pattern.push({
                step: i + 1,
                from_account: accounts[i % (accounts.length - 1)],
                to_account: accounts[(i + 1) % accounts.length],
                amount: Math.round(amount * 100) / 100,
                delay_minutes: Math.floor(Math.random() * 60) + 5,
                technique: i < 4 ? "structuring" : "layering"
            });
        }
        
        return pattern;
    }

    generateSampleSARReport() {
        const reportContent = `
SUSPICIOUS ACTIVITY REPORT (SAR)
================================

Report ID: SAR_${Date.now()}
Date Generated: ${new Date().toLocaleDateString()}
Institution: Demo Financial Institution

SUSPICIOUS ACTIVITY SUMMARY:
----------------------------
Multiple structured transactions detected involving potential money laundering scheme.

PARTIES INVOLVED:
----------------
Primary Subject: John Doe (DOB: 01/01/1980)
Account: ACC_001
SSN: XXX-XX-1234

TRANSACTION DETAILS:
-------------------
Date Range: ${new Date(Date.now() - 30*24*60*60*1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}
Total Amount: $${(Math.random() * 100000 + 50000).toFixed(2)}
Number of Transactions: ${Math.floor(Math.random() * 20) + 10}

SUSPICIOUS INDICATORS:
---------------------
• Multiple cash deposits just under $10,000 reporting threshold
• Rapid movement of funds between multiple accounts
• Transactions with no apparent business purpose
• Pattern consistent with layering money laundering technique

NARRATIVE:
----------
Subject has engaged in a pattern of financial activity that appears designed to evade 
Bank Secrecy Act reporting requirements. Transactions show characteristics of 
structured deposits followed by rapid fund transfers to obscure the money trail.

AI ANALYSIS CONFIDENCE: ${(Math.random() * 30 + 70).toFixed(1)}%

Generated by TriNetra Auto-SAR System (Demo Mode)
        `.trim();
        
        return reportContent;
    }

    generateAutoSarCases() {
        const baseCases = [
            {
                id: 'CASE-2045',
                riskScore: 96,
                riskLevel: 'Critical',
                pattern: 'Layering + Smurfing',
                accounts: 9,
                amount: '₹4.82 Cr',
                timeline: '14d',
                status: 'Escalated',
                investigator: 'R. Menon',
                alerts: 27,
                entities: ['MLACC00004', 'MLACC00011', 'MLACC00018'],
            },
            {
                id: 'CASE-2044',
                riskScore: 88,
                riskLevel: 'High',
                pattern: 'Round Tripping',
                accounts: 5,
                amount: '₹1.77 Cr',
                timeline: '9d',
                status: 'In Review',
                investigator: 'A. Kumar',
                alerts: 16,
                entities: ['MLACC00023', 'MLACC00030'],
            },
            {
                id: 'CASE-2043',
                riskScore: 82,
                riskLevel: 'High',
                pattern: 'Rapid Pass-through',
                accounts: 4,
                amount: '₹96.4 L',
                timeline: '6d',
                status: 'Pending SAR',
                investigator: 'S. Devi',
                alerts: 12,
                entities: ['MLACC00046', 'MLACC00047'],
            },
            {
                id: 'CASE-2042',
                riskScore: 74,
                riskLevel: 'Medium',
                pattern: 'Cash Funnel',
                accounts: 7,
                amount: '₹63.8 L',
                timeline: '4d',
                status: 'Triaged',
                investigator: 'D. Roy',
                alerts: 7,
                entities: ['MLACC00050', 'MLACC00052'],
            },
            {
                id: 'CASE-2041',
                riskScore: 69,
                riskLevel: 'Medium',
                pattern: 'Structuring',
                accounts: 3,
                amount: '₹42.9 L',
                timeline: '3d',
                status: 'Open',
                investigator: 'P. Shah',
                alerts: 5,
                entities: ['MLACC00053'],
            },
            {
                id: 'CASE-2040',
                riskScore: 61,
                riskLevel: 'Low',
                pattern: 'Unusual Velocity',
                accounts: 2,
                amount: '₹18.3 L',
                timeline: '2d',
                status: 'Monitoring',
                investigator: 'K. Iyer',
                alerts: 3,
                entities: ['MLACC00061'],
            },
        ];

        return baseCases.map((item) => ({
            ...item,
            generatedReports: ['SAR', 'Investigation'],
        }));
    }

    generateAutoSarCaseDetail(caseId) {
        const selected = this.mockAutoSarCases.find((item) => item.id === caseId) || this.mockAutoSarCases[0];
        const entities = selected?.entities || [];
        const primaryAccount = entities[0] || 'MLACC00004';
        const transactions = this.generateSampleTransactions()
            .filter((txn) => txn.from_account === primaryAccount || txn.to_account === primaryAccount)
            .slice(0, 6);
        const relatedAccounts = entities.slice(1).map((entity, index) => ({
            account_id: entity,
            tx_count: 2 + index,
            total_amount: 120000 + index * 45000,
            risk_level: index % 2 === 0 ? 'HIGH' : 'MEDIUM',
        }));

        return {
            ...selected,
            account_summary: {
                account_id: primaryAccount,
                customer_name: `Customer ${primaryAccount.slice(-4)}`,
                customer_segment: 'Retail',
                customer_type: 'Individual',
                risk_score: selected.riskScore,
                risk_level: selected.riskLevel,
            },
            customer_metadata: {
                account_status: 'Active',
                product_family: 'Savings',
                customer_id: `CUST-${primaryAccount.slice(-4)}`,
                kyc_compliant: true,
                is_frozen: false,
                rural_branch: false,
            },
            risk_score: selected.riskScore,
            suspicious_transactions: transactions.map((txn, index) => ({
                ...txn,
                sequence: index + 1,
                risk_score: Math.max(45, selected.riskScore - index * 5),
            })),
            related_accounts: relatedAccounts,
            timeline_summary: {
                peak_activity_day: '2026-05-12',
                total_transactions: transactions.length,
                total_amount: transactions.reduce((sum, txn) => sum + Math.abs(txn.amount || 0), 0),
            },
            graph_risk_analysis: {
                related_accounts: relatedAccounts.length,
                fan_in_ratio: 0.74,
                top_related_accounts: relatedAccounts,
                suspicious_chain_count: Math.max(0, relatedAccounts.length - 1),
            },
            behavioral_anomalies: [
                'High sender concentration indicates dependency on a narrow origin set.',
                'Structuring activity is present near regulatory thresholds.',
            ],
            generatedReports: ['Individual Report', 'Related Network Report'],
        };
    }

    generateAutoSarReport(payload = {}) {
        const reportType = payload.report_type || 'prediction_model';
        const reportId = payload.report_id || `${reportType.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now()}`;
        const generatedAt = new Date().toISOString();
        const shapFeatures = [
            { feature_name: 'structuring_40k_50k_pct', shap_value: 14.8, contribution_percentage: 24.6 },
            { feature_name: 'sender_concentration', shap_value: 12.4, contribution_percentage: 20.7 },
            { feature_name: 'pct_within_6h', shap_value: 9.7, contribution_percentage: 16.1 },
            { feature_name: 'channel_entropy', shap_value: 8.1, contribution_percentage: 13.5 },
            { feature_name: 'fan_in_ratio', shap_value: 6.2, contribution_percentage: 10.3 },
        ];

        const common = {
            report_id: reportId,
            report_type: reportType,
            generated_at: generatedAt,
            pdf_path: `/reports/generated/${reportId}.pdf`,
            json_path: `/reports/generated/${reportId}.json`,
        };

        let report;
        if (reportType === 'individual_account') {
            const accountId = payload.account_id || 'MLACC00004';
            const caseDetail = this.generateAutoSarCaseDetail(payload.case_id || 'CASE-2045');
            report = {
                ...common,
                title: `ACCOUNT-${accountId} SAR`,
                risk_level: 'HIGH',
                account_id: accountId,
                case_id: null,
                summary: {
                    ensemble_score: 91.4,
                    lightgbm_score: 88.1,
                    gnn_score: 94.2,
                    risk_level: 'HIGH',
                    transaction_count: caseDetail.timeline_summary.total_transactions,
                    related_accounts: caseDetail.related_accounts.length,
                },
                customer_metadata: caseDetail.customer_metadata,
                suspicious_transactions: caseDetail.suspicious_transactions,
                related_accounts: caseDetail.related_accounts,
                timeline_summary: caseDetail.timeline_summary,
                graph_risk_analysis: caseDetail.graph_risk_analysis,
                behavioral_anomalies: caseDetail.behavioral_anomalies,
                shap: {
                    lgbm_explanation: { top_contributing_features: shapFeatures },
                    gnn_explanation: { top_contributing_features: shapFeatures.slice(0, 4) },
                    ensemble_explanation: { top_contributing_features: shapFeatures },
                    chart_paths: {},
                },
                sections: [
                    { title: 'Executive Summary', body: ['Account exhibits elevated mule risk and rapid pass-through behavior.'] },
                    { title: 'Transaction Intelligence', table: caseDetail.suspicious_transactions },
                    { title: 'Related Accounts', table: caseDetail.related_accounts },
                ],
                appendix: {
                    prediction_row: { account_id: accountId, ensemble_score: 91.4 },
                },
            };
        } else if (reportType === 'related_account_network') {
            const accountId = payload.account_id || 'MLACC00004';
            const caseDetail = this.generateAutoSarCaseDetail(payload.case_id || 'CASE-2045');
            report = {
                ...common,
                title: `ACCOUNT-${accountId} NETWORK REPORT`,
                risk_level: 'HIGH',
                account_id: accountId,
                summary: {
                    linked_accounts: caseDetail.related_accounts.length,
                    fan_in: 0.72,
                    fan_out: 0.58,
                    suspicious_chains: 2,
                },
                related_accounts: caseDetail.related_accounts,
                money_flow_analysis: {
                    incoming: 1245000,
                    outgoing: 1102000,
                    net_flow: 143000,
                    avg_ticket: 18500,
                },
                graph_clusters: [
                    { cluster: 'high', accounts: ['MLACC00011', 'MLACC00018'], size: 2 },
                    { cluster: 'medium', accounts: ['MLACC00004'], size: 1 },
                ],
                suspicious_chains: [
                    { counterparty: 'CPL_0001_0', transactions: ['TXN001', 'TXN002'] },
                ],
                account_interaction_summary: {
                    unique_relations: 4,
                    peak_activity_day: '2026-05-12',
                },
                sections: [
                    { title: 'Network Intelligence', body: ['Fan-in and fan-out activity indicates intermediary layering.'] },
                    { title: 'Related Accounts', table: caseDetail.related_accounts },
                ],
                shap: {
                    ensemble_explanation: { top_contributing_features: shapFeatures },
                    chart_paths: {},
                },
            };
        } else if (reportType === 'all_cases') {
            const cases = this.mockAutoSarCases.map((item, index) => ({
                case_id: item.id || item.caseId || `CASE-${index + 1}`,
                account_id: item.entities?.[0] || item.account_id || `MLACC${String(index + 1).padStart(5, '0')}`,
                risk_level: item.riskLevel || item.risk_level || 'HIGH',
                risk_score: item.riskScore ?? item.risk_score ?? 0,
                pattern: item.pattern || 'Uploaded data risk scoring',
                accounts: item.accounts || 1,
                alerts: item.alerts || 1,
                investigator: item.investigator || 'Auto-assigned',
            }));
            const riskCounts = cases.reduce((acc, item) => {
                const key = String(item.risk_level || 'HIGH').toUpperCase();
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            report = {
                ...common,
                title: 'TRINETRA_ALL_CASES_REPORT',
                risk_level: 'HIGH',
                account_id: null,
                case_id: null,
                report_scope: 'all_cases',
                summary: {
                    case_count: cases.length,
                    critical_cases: riskCounts.CRITICAL || 0,
                    high_cases: riskCounts.HIGH || 0,
                    medium_cases: riskCounts.MEDIUM || 0,
                    low_cases: riskCounts.LOW || 0,
                },
                investigation_overview: {
                    case_count: cases.length,
                    critical_cases: riskCounts.CRITICAL || 0,
                    high_cases: riskCounts.HIGH || 0,
                    medium_cases: riskCounts.MEDIUM || 0,
                    low_cases: riskCounts.LOW || 0,
                },
                sections: [
                    {
                        title: 'Executive Summary',
                        body: [
                            `${cases.length} cases are included in this all-cases report.`,
                            'Each case is listed with its account, risk level, and risk score.',
                        ],
                    },
                    {
                        title: 'Case Inventory',
                        table: cases,
                    },
                    {
                        title: 'Risk Distribution',
                        body: Object.entries(riskCounts).map(([level, count]) => `${level}: ${count}`),
                    },
                ],
                appendix: {
                    case_inventory: cases,
                },
            };
        } else if (reportType === 'full_investigation' || reportType === 'entire_investigation') {
            const caseId = payload.case_id || 'CASE-2045';
            const caseDetail = this.generateAutoSarCaseDetail(caseId);
            report = {
                ...common,
                title: `${caseId}_FULL_REPORT`,
                risk_level: 'CRITICAL',
                case_id: caseId,
                summary: {
                    account_count: 3,
                    transactions_reviewed: 12,
                    unique_accounts: 3,
                    anomalies: 4,
                },
                executive_summary: 'Multiple linked accounts show structuring, layer transfer, and rapid pass-through activity.',
                investigation_overview: caseDetail,
                suspicious_patterns: ['Structured deposits', 'Rapid fund transfers'],
                timeline_intelligence: [
                    { account_id: 'MLACC00004', peak_activity_day: '2026-05-11', total_transactions: 4 },
                ],
                transaction_analysis: caseDetail.suspicious_transactions,
                related_entities: ['MLACC00004', 'MLACC00011', 'MLACC00018'],
                compliance_findings: ['Enhanced due diligence required', 'SAR filing recommended'],
                investigator_notes: ['Auto-generated for compliance review.'],
                final_recommendation: 'File SAR and escalate for manual compliance review.',
                sections: [
                    { title: 'Executive Summary', body: ['Case linked to multiple high-risk entities.'] },
                    { title: 'Investigation Overview', body: ['Network activity spans several accounts and channels.'] },
                    { title: 'Transaction Intelligence', table: caseDetail.suspicious_transactions },
                ],
                appendix: {
                    account_reports: [],
                },
            };
        } else if (reportType === 'hydra_training') {
            report = {
                ...common,
                title: 'HYDRA_TRAINING_REPORT',
                risk_level: 'INFO',
                summary: {
                    attacker_score: 83.6,
                    defender_score: 16.4,
                    resilience_score: 92.2,
                    synthetic_patterns_generated: 1568,
                    detected_patterns: 1257,
                    attack_success_rate: 0.0625,
                    adversarial_accuracy: 0.9375,
                },
                attacker_vs_defender: {
                    attacker_score: 83.6,
                    defender_score: 16.4,
                    resilience_score: 92.2,
                },
                defense_adaptation_metrics: {
                    current_model_version: 'ensemble_adapted_20260516_170432',
                    gnn_model_version: 'gnn_adapted_20260516_170432',
                    updated_weights: { lgbm: 0.55, gnn: 0.45 },
                    attack_source: 'mock',
                },
                adversarial_graph_insights: {
                    active_attack_type: 'smurfing_burst',
                    detection_threshold: 15,
                    confusion_matrix: { true_positive: 18, true_negative: 65, false_positive: 8, false_negative: 5 },
                },
                model_evolution_timeline: ['Round 48', 'Training status: stopped', 'Updated at: 2026-05-16T17:05:01Z'],
                sections: [
                    { title: 'Attacker vs Defender', body: ['Resilience improved after adaptive training.'] },
                    { title: 'Defense Adaptation', table: [{ metric: 'lgbm', value: 0.55 }, { metric: 'gnn', value: 0.45 }] },
                ],
                chart_paths: {},
            };
        } else {
            report = {
                ...common,
                title: 'MODEL_INTELLIGENCE_REPORT',
                risk_level: 'INFO',
                summary: {
                    ensemble_model: 'ensemble_v1.0-runtime',
                    gnn_model: 'gnn_v1.0-runtime',
                    lgbm_model: 'lgbm_v1.0-trained',
                    accuracy: 0.364583,
                    precision: 0.617647,
                    recall: 0.9375,
                    f1_score: 0.763636,
                    resilience_score: 92.19,
                    attack_success_rate: 0.0625,
                },
                lightgbm_metrics: { version: 'lgbm_v1.0-trained', risk_threshold: 50 },
                gnn_metrics: { version: 'gnn_v1.0-runtime', status: 'stable' },
                ensemble_metrics: { version: 'ensemble_v1.0-runtime', weights: { lgbm: 0.6, gnn: 0.4 } },
                prediction_distribution: {
                    buckets: { LOW: 34, MEDIUM: 34, HIGH: 23, CRITICAL: 11 },
                    top_accounts: this.mockAutoSarCases.slice(0, 5).map((item) => ({ account_id: item.entities[0], ensemble_score: item.riskScore })),
                },
                model_drift_indicators: [
                    'Training status: stopped',
                    'Hydra resilience: 92.19',
                    'Attack success rate: 0.0625',
                ],
                top_risk_features: shapFeatures,
                shap_summaries: [
                    'SHAP highlights structuring and network concentration signals.',
                    'Ensemble confidence remains stable across monitored accounts.',
                ],
                confusion_matrix: { true_positive: 18, true_negative: 65, false_positive: 8, false_negative: 5 },
                sections: [
                    { title: 'Executive Summary', body: ['Model intelligence indicates stable but actively monitored risk signals.'] },
                    { title: 'Model Metrics', table: [{ metric: 'accuracy', value: 0.364583 }, { metric: 'f1_score', value: 0.763636 }] },
                ],
                chart_paths: {},
            };
        }

        this.mockAutoSarReports[reportId] = report;
        return report;
    }

    // Helper methods for enhanced mock data
    generateLayeringAnalysis(suspicionScore, amount) {
        const layeringAnalysis = {
            layer_1_extraction: {
                description: 'Transaction data extraction and basic pattern identification',
                patterns_detected: [],
                risk_indicators: []
            },
            layer_2_processing: {
                description: 'Advanced pattern analysis and relationship mapping',
                connected_accounts: Math.floor(Math.random() * 13) + 2,
                temporal_patterns: [],
                amount_patterns: []
            },
            layer_3_integration: {
                description: 'Cross-reference with known threat patterns and geolocation',
                threat_level: 'LOW',
                geolocation_risk: 'NORMAL',
                pattern_match_confidence: 0.0
            }
        };
        
        // Layer 1: Basic pattern detection
        if (amount < 10000) {
            layeringAnalysis.layer_1_extraction.patterns_detected.push('Small value transaction');
        } else if (amount > 500000) {
            layeringAnalysis.layer_1_extraction.patterns_detected.push('Large value transaction');
            layeringAnalysis.layer_1_extraction.risk_indicators.push('High amount alert');
        }
        
        // Layer 2: Advanced processing
        if (suspicionScore > 0.7) {
            layeringAnalysis.layer_2_processing.temporal_patterns.push('Suspicious timing patterns');
            layeringAnalysis.layer_2_processing.amount_patterns.push('Irregular amount structure');
        }
        
        // Layer 3: Integration and final assessment
        if (suspicionScore > 0.8) {
            layeringAnalysis.layer_3_integration.threat_level = 'CRITICAL';
            layeringAnalysis.layer_3_integration.pattern_match_confidence = suspicionScore;
        } else if (suspicionScore > 0.5) {
            layeringAnalysis.layer_3_integration.threat_level = 'MEDIUM';
            layeringAnalysis.layer_3_integration.pattern_match_confidence = suspicionScore;
        }
        
        return layeringAnalysis;
    }

    getCountryRiskLevel(country) {
        const highRiskCountries = ['Pakistan', 'Afghanistan', 'North Korea', 'Iran'];
        const mediumRiskCountries = ['UAE', 'Malaysia', 'Thailand', 'Myanmar'];
        
        if (highRiskCountries.includes(country)) {
            return { level: 3, description: 'High Risk Country', color: '#ff4444' };
        } else if (mediumRiskCountries.includes(country)) {
            return { level: 2, description: 'Medium Risk Country', color: '#ffaa00' };
        } else {
            return { level: 1, description: 'Low Risk Country', color: '#44ff44' };
        }
    }

    getLocationCoordinates(city) {
        const coordinates = {
            'Mumbai': { lat: 19.0760, lng: 72.8777 },
            'Delhi': { lat: 28.6139, lng: 77.2090 },
            'Bangalore': { lat: 12.9716, lng: 77.5946 },
            'Chennai': { lat: 13.0827, lng: 80.2707 },
            'Kolkata': { lat: 22.5726, lng: 88.3639 },
            'Dubai': { lat: 25.2048, lng: 55.2708 },
            'Karachi': { lat: 24.8607, lng: 67.0011 }
        };
        
        return coordinates[city] || { lat: 0, lng: 0 };
    }

    generateLayeringSummary(transactions) {
        const totalTransactions = transactions.length;
        const highRisk = transactions.filter(tx => tx.suspicious_score > 0.8).length;
        const mediumRisk = transactions.filter(tx => tx.suspicious_score > 0.5 && tx.suspicious_score <= 0.8).length;
        const lowRisk = totalTransactions - highRisk - mediumRisk;
        
        return {
            total_transactions: totalTransactions,
            risk_distribution: {
                critical: highRisk,
                medium: mediumRisk,
                low: lowRisk
            },
            layering_effectiveness: {
                layer_1_detection_rate: Math.random() * 0.1 + 0.85,
                layer_2_processing_rate: Math.random() * 0.15 + 0.75,
                layer_3_integration_rate: Math.random() * 0.2 + 0.60
            }
        };
    }

    createMockHydraBattle() {
        return {
            training_status: 'idle',
            attacker_score: 74,
            defender_score: 81,
            resilience_score: 89,
            attacks_evaluated: 0,
            attack_success_rate: 0.21,
            detection_rate: 0.79,
            adversarial_accuracy: 0.79,
            baseline_detection_rate: 0.34,
            model_accuracy: 0.86,
            baseline_samples: 96,
            active_attack_type: 'none',
            gnn_status: 'stable',
            ensemble_status: 'stable',
            synthetic_patterns_generated: 0,
            detected_patterns: 0,
            round: 0,
            rounds_target: 20,
            interval_seconds: 2,
            is_running: false,
            attack_source: 'mock',
            current_model_version: 'ensemble_v1.0-runtime',
            gnn_model_version: 'gnn_v1.0-runtime',
            updated_weights: { lgbm: 0.6, gnn: 0.4 },
            confusion_matrix: {
                true_positive: 18,
                true_negative: 65,
                false_positive: 8,
                false_negative: 5,
            },
            last_tick_at: Date.now(),
        };
    }

    generateMockHydraBattleStatus() {
        const attackTypes = ['layering_scheme', 'smurfing', 'round_tripping', 'velocity_burst'];
        const battle = { ...this.mockHydraBattle };

        if (battle.is_running) {
            const now = Date.now();
            const elapsedTicks = Math.max(
                1,
                Math.floor((now - battle.last_tick_at) / (battle.interval_seconds * 1000)),
            );

            battle.round = Math.min(battle.round + elapsedTicks, battle.rounds_target);
            const generated = elapsedTicks * (8 + Math.floor(Math.random() * 8));
            const detected = Math.max(1, Math.floor(generated * (0.72 + Math.random() * 0.18)));
            battle.synthetic_patterns_generated += generated;
            battle.detected_patterns += detected;
            battle.attacks_evaluated += generated;
            battle.attacker_score = Math.max(
                55,
                Math.min(99, battle.attacker_score + (Math.random() * 4 - 1.5)),
            );
            battle.defender_score = Math.max(
                60,
                Math.min(99, battle.defender_score + (Math.random() * 4 - 1.2)),
            );
            battle.resilience_score = Math.max(
                70,
                Math.min(99.9, battle.defender_score - (battle.attacker_score - 72) * 0.35),
            );
            battle.detection_rate = Math.min(0.99, battle.detected_patterns / Math.max(1, battle.synthetic_patterns_generated));
            battle.adversarial_accuracy = battle.detection_rate;
            battle.attack_success_rate = Math.max(0.01, 1 - battle.detection_rate);
            battle.model_accuracy = Math.min(0.97, battle.model_accuracy + elapsedTicks * 0.006);
            battle.baseline_detection_rate = Math.min(0.95, battle.baseline_detection_rate + elapsedTicks * 0.004);
            battle.updated_weights = {
                lgbm: Number(Math.max(0.35, 0.6 - battle.round * 0.003).toFixed(4)),
                gnn: Number(Math.min(0.65, 0.4 + battle.round * 0.003).toFixed(4)),
            };
            battle.current_model_version = `ensemble_adapted_demo_${String(battle.round).padStart(2, '0')}`;
            battle.gnn_model_version = `gnn_adapted_demo_${String(battle.round).padStart(2, '0')}`;
            battle.ensemble_status = 'updated';
            battle.gnn_status = 'stable';
            battle.attack_source = 'mock';
            battle.active_attack_type = attackTypes[battle.round % attackTypes.length];
            battle.training_status = battle.round >= battle.rounds_target ? 'completed' : 'running';
            battle.is_running = battle.round < battle.rounds_target;
            battle.last_tick_at = now;

            if (!battle.is_running) {
                battle.active_attack_type = 'none';
            }
        } else {
            battle.resilience_score = Math.max(
                70,
                Math.min(99.9, battle.resilience_score + (Math.random() * 0.6 - 0.2)),
            );
        }

        this.mockHydraBattle = battle;
        return {
            ...battle,
            attacker_score: Number(battle.attacker_score.toFixed(2)),
            defender_score: Number(battle.defender_score.toFixed(2)),
            resilience_score: Number(battle.resilience_score.toFixed(2)),
            attack_success_rate: Number(battle.attack_success_rate.toFixed(4)),
            detection_rate: Number(battle.detection_rate.toFixed(4)),
            adversarial_accuracy: Number(battle.adversarial_accuracy.toFixed(4)),
            baseline_detection_rate: Number(battle.baseline_detection_rate.toFixed(4)),
            model_accuracy: Number(battle.model_accuracy.toFixed(4)),
        };
    }

    generateMockDashboardSummary() {
        const healthProfiles = [
            { label: 'Ingestion Gateway', base: 97, amp: 2.5 },
            { label: 'Feature Store', base: 94, amp: 3.2 },
            { label: 'MDE Scoring API', base: 91, amp: 5.5 },
            { label: 'CHRONOS Render Node', base: 95, amp: 3.1 },
            { label: 'HYDRA Trainer', base: this.mockHydraBattle.is_running ? 88 : 93, amp: 6.2 },
        ];

        const systemHealth = healthProfiles.map((service, idx) => {
            const wave = Math.sin((this.mockDashboardTick + idx) / 2.4) * service.amp;
            const noise = (Math.random() - 0.5) * 1.8;
            const pct = Math.max(72, Math.min(100, Math.round(service.base + wave + noise)));
            const value = pct >= 95 ? 'Healthy' : pct >= 86 ? 'Degraded' : 'Warning';
            const tone = pct >= 95 ? 'emerald' : pct >= 86 ? 'amber' : 'rose';
            return {
                label: service.label,
                value,
                pct,
                tone,
            };
        });

        return {
            generated_at: new Date().toISOString(),
            online: true,
            kpis: [
                {
                    id: 'uptime',
                    title: 'System Uptime',
                    value: `${(99.1 + Math.random() * 0.8).toFixed(2)}%`,
                    trend: 'Live',
                    positive: true,
                    color: 'emerald',
                    spark: [95, 96, 96, 97, 97, 98, 98],
                },
                {
                    id: 'hydraRound',
                    title: 'HYDRA Battle Round',
                    value: `${this.mockHydraBattle.round}/${this.mockHydraBattle.rounds_target}`,
                    trend: this.mockHydraBattle.is_running ? 'Running' : 'Idle',
                    positive: true,
                    color: 'violet',
                    spark: [20, 25, 31, 38, 46, 55, 64],
                },
            ],
            alerts: [
                {
                    id: `AL-MOCK-${this.mockDashboardTick}`,
                    text: this.mockHydraBattle.is_running
                        ? 'HYDRA battle simulation active with adaptive defenses.'
                        : 'HYDRA battle orchestration idle.',
                    severity: this.mockHydraBattle.is_running ? 'medium' : 'low',
                    time: 'just now',
                },
            ],
            system_health: systemHealth,
        };
    }

    // CHRONOS API calls
    async getTimelineData(scenario = 'all', timeQuantum = '1m') {
        return this.request(`/chronos/timeline?scenario=${scenario}&time_quantum=${timeQuantum}`);
    }

    async getPatternAnalysis() {
        return this.request('/chronos/patterns');
    }

    async searchTransactions(searchTerm, searchType = 'all') {
        return this.request('/chronos/search', {
            method: 'POST',
            body: JSON.stringify({
                term: searchTerm,
                type: searchType
            })
        });
    }

    // HYDRA API calls
    async generateAdversarialPattern() {
        return this.request('/hydra/generate', {
            method: 'POST',
            disableMockFallback: true
        });
    }

    async testDetection(patternData) {
        return this.request('/hydra/detect', {
            method: 'POST',
            body: JSON.stringify(patternData),
            disableMockFallback: true
        });
    }

    async runHydraSimulation(rounds = 10) {
        return this.request(`/hydra/simulation?rounds=${rounds}`, { disableMockFallback: true });
    }

    async startHydraBattle(rounds = 20, intervalSeconds = 2) {
        return this.request('/hydra/battle/start', {
            method: 'POST',
            body: JSON.stringify({ rounds, interval_seconds: intervalSeconds })
        });
    }

    async stopHydraBattle() {
        return this.request('/hydra/battle/stop', {
            method: 'POST'
        });
    }

    async getHydraBattleStatus() {
        return this.request('/hydra/battle/status');
    }

    // Auto-SAR API calls
    async getAutoSarCases(limit = 100) {
        return this.request(`/cases?limit=${limit}`);
    }

    async getAutoSarCase(caseId) {
        return this.request(`/case/${caseId}`);
    }

    async generateAutoSarAccountReport(accountId, options = {}) {
        const params = new URLSearchParams({
            investigator_name: options.investigator_name || 'Auto-SAR Intelligence Engine',
            classification_level: options.classification_level || 'Confidential',
        });
        return this.request(`/report/generate/account/${accountId}?${params.toString()}`, {
            method: 'POST',
        });
    }

    async generateAutoSarFullInvestigationReport(options = {}) {
        const params = new URLSearchParams({
            investigator_name: options.investigator_name || 'Auto-SAR Intelligence Engine',
            classification_level: options.classification_level || 'Confidential',
        });
        return this.request(`/report/generate/full-investigation?${params.toString()}`, {
            method: 'POST',
        });
    }

    async generateAutoSarAllCasesReport(options = {}) {
        const params = new URLSearchParams({
            investigator_name: options.investigator_name || 'Auto-SAR Intelligence Engine',
            classification_level: options.classification_level || 'Confidential',
        });
        return this.request(`/report/generate/all-cases?${params.toString()}`, {
            method: 'POST',
        });
    }

    async generateAutoSarHydraReport(options = {}) {
        const params = new URLSearchParams({
            investigator_name: options.investigator_name || 'Auto-SAR Intelligence Engine',
            classification_level: options.classification_level || 'Confidential',
        });
        return this.request(`/report/generate/hydra?${params.toString()}`, {
            method: 'POST',
        });
    }

    async generateAutoSarReport(payload) {
        return this.request('/report/generate', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
    }

    async getAutoSarReport(reportId) {
        return this.request(`/report/${reportId}`);
    }

    async getHydraReport() {
        return this.request('/hydra/report');
    }

    async getModelReport(accountId = null) {
        const query = accountId ? `?account_id=${accountId}` : '';
        return this.request(`/model/report${query}`);
    }

    async downloadAutoSarReport(reportId) {
        const url = `${this.baseURL}/report/download/${reportId}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Download failed (${response.status})`);
            }
            const blob = await response.blob();
            return {
                blob,
                size: blob.size,
                url: URL.createObjectURL(blob),
                filename: `${reportId}.pdf`,
            };
        } catch (error) {
            if (this.mockAutoSarReports[reportId]) {
                const fallback = new Blob(
                    [JSON.stringify(this.mockAutoSarReports[reportId], null, 2)],
                    { type: 'application/json' },
                );
                return {
                    blob: fallback,
                    size: fallback.size,
                    url: URL.createObjectURL(fallback),
                    filename: `${reportId}.json`,
                };
            }
            throw error;
        }
    }

    async previewAutoSarReport(reportId) {
        return this.getAutoSarReport(reportId);
    }

    async generateSARReport(patternData) {
        return this.request('/autosar/generate', {
            method: 'POST',
            body: JSON.stringify({ pattern: patternData })
        });
    }

    async getSARTemplates() {
        return this.request('/autosar/templates');
    }

    // Mule Detection API calls
    async getMuleRisk(accountId) {
        return this.request(`/mule/mule-risk/${accountId}`);
    }

    async getNetworkMetrics(accountId) {
        return this.request(`/mule/network-metrics/${accountId}`);
    }

    async getLayeringDetection(accountId) {
        return this.request(`/mule/layering-detection/${accountId}`);
    }

    async explainRisk(accountId) {
        return this.request(`/mule/explain-risk/${accountId}`);
    }

    async generateMuleSAR(accountId, riskData = {}) {
        return this.request(`/mule/generate-mule-sar/${accountId}`, {
            method: 'POST',
            body: JSON.stringify(riskData)
        });
    }

    async getHighRiskAccounts(threshold = 70) {
        return this.request(`/mule/high-risk-accounts?threshold=${threshold}`);
    }

    async uploadIngestion(files, onProgress) {
        const url = `${this.baseURL}/ingestion/upload`;
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file, file.name));

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && typeof onProgress === 'function') {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    onProgress(progress);
                }
            };

            xhr.onload = () => {
                const raw = xhr.responseText || '{}';
                let parsed;
                try {
                    parsed = JSON.parse(raw);
                } catch {
                    reject(new Error('Invalid backend response received'));
                    return;
                }

                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(parsed);
                    return;
                }

                const details = parsed?.detail;
                const message = details?.message || parsed?.message || `Upload failed (${xhr.status})`;
                const error = new Error(message);
                error.details = details || parsed;
                reject(error);
            };

            xhr.onerror = () => reject(new Error('Upload request failed'));
            xhr.send(formData);
        });
    }

    async getIngestionStatus() {
        return this.request('/ingestion/status');
    }

    async getPipelineStatus() {
        return this.request('/pipeline/status');
    }

    async getPipelineResults() {
        return this.request('/pipeline/results');
    }

    async getDashboardSummary() {
        return this.request('/dashboard/summary');
    }

    async getModelInfo() {
        return this.request('/model-command-center/details', { disableMockFallback: true });
    }

    async getIngestionSummary() {
        return this.request('/ingestion/summary');
    }

    async clearIngestion() {
        return this.request('/ingestion/clear', { method: 'DELETE' });
    }

    // Health check
    async healthCheck() {
        return this.request('/v1/health');
    }

    // ML/SHAP API calls
    async generateSHAPExplanation(request) {
        return this.request('/v1/ml/explain', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    async generateBatchSHAPExplanations(request) {
        return this.request('/v1/ml/explain-batch', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    async predictMuleScore(request) {
        return this.request('/v1/ml/predict', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    async batchPredictMuleScore(request) {
        return this.request('/v1/ml/predict-batch', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }
}

// Export singleton instance
const api = new TriNetraAPI();
export default api;
