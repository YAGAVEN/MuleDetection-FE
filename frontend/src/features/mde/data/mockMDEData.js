export const KPI_CARDS = [
  { id: 'accounts', title: 'Total Accounts Processed', value: '2,481,992', trend: '+12.4%', positive: true, color: 'cyan', spark: [18, 20, 24, 26, 29, 32, 34] },
  { id: 'highRisk', title: 'High Risk Accounts', value: '1,208', trend: '+2.1%', positive: false, color: 'rose', spark: [11, 13, 12, 15, 14, 16, 17] },
  { id: 'investigations', title: 'Active Investigations', value: '164', trend: '+8.2%', positive: false, color: 'violet', spark: [42, 44, 47, 51, 54, 57, 63] },
  { id: 'suspiciousTxns', title: 'Suspicious Transactions', value: '9,493', trend: '-3.4%', positive: true, color: 'cyan', spark: [66, 64, 65, 61, 60, 58, 55] },
  { id: 'accuracy', title: 'Model Accuracy', value: '96.8%', trend: '+0.9%', positive: true, color: 'indigo', spark: [91, 92, 93, 94, 95, 96, 97] },
  { id: 'sar', title: 'SAR Reports Generated', value: '389', trend: '+17.1%', positive: true, color: 'violet', spark: [10, 12, 15, 14, 18, 21, 24] },
  { id: 'hydra', title: 'HYDRA Threat Simulation', value: '88.1', trend: '+4.7%', positive: true, color: 'cyan', spark: [62, 64, 67, 73, 74, 79, 83] },
  { id: 'realtime', title: 'Real-time Detection', value: 'ONLINE', trend: '8ms latency', positive: true, color: 'emerald', spark: [50, 53, 52, 55, 58, 59, 61] },
]

export const PIPELINE_STEPS = [
  { key: 'ingestion', label: 'Ingestion', status: 'queued' },
  { key: 'featureEngineering', label: 'Feature Engineering', status: 'queued' },
  { key: 'modelScoring', label: 'Model Scoring', status: 'queued' },
  { key: 'caseGeneration', label: 'Case Generation', status: 'queued' },
]

export const CASES = [
  { id: 'MDE-24091', riskScore: 96, riskLevel: 'Critical', pattern: 'Layering + Smurfing', accounts: 9, amount: '₹4.82 Cr', timeline: '14d', status: 'Escalated', investigator: 'R. Menon', alerts: 27, entities: ['ACC_00121', 'ACC_87199', 'ACC_23901'] },
  { id: 'MDE-24088', riskScore: 88, riskLevel: 'High', pattern: 'Round Tripping', accounts: 5, amount: '₹1.77 Cr', timeline: '9d', status: 'In Review', investigator: 'A. Kumar', alerts: 16, entities: ['ACC_55101', 'ACC_55176'] },
  { id: 'MDE-24085', riskScore: 82, riskLevel: 'High', pattern: 'Rapid Pass-through', accounts: 4, amount: '₹96.4 L', timeline: '6d', status: 'Pending SAR', investigator: 'S. Devi', alerts: 12, entities: ['ACC_10082', 'ACC_10091'] },
  { id: 'MDE-24081', riskScore: 74, riskLevel: 'Medium', pattern: 'Cash Funnel', accounts: 7, amount: '₹63.8 L', timeline: '4d', status: 'Triaged', investigator: 'D. Roy', alerts: 7, entities: ['ACC_79380', 'ACC_80411'] },
  { id: 'MDE-24080', riskScore: 69, riskLevel: 'Medium', pattern: 'Structuring', accounts: 3, amount: '₹42.9 L', timeline: '3d', status: 'Open', investigator: 'P. Shah', alerts: 5, entities: ['ACC_55580'] },
  { id: 'MDE-24077', riskScore: 61, riskLevel: 'Low', pattern: 'Unusual Velocity', accounts: 2, amount: '₹18.3 L', timeline: '2d', status: 'Monitoring', investigator: 'K. Iyer', alerts: 3, entities: ['ACC_93220'] },
]

export const CHRONOS_SERIES = [
  { time: '00:00', risk: 20, heat: 14 },
  { time: '04:00', risk: 24, heat: 18 },
  { time: '08:00', risk: 39, heat: 36 },
  { time: '12:00', risk: 68, heat: 61 },
  { time: '16:00', risk: 74, heat: 77 },
  { time: '20:00', risk: 63, heat: 58 },
  { time: '24:00', risk: 48, heat: 37 },
]

export const HYDRA_LOGS = [
  '[11:04:22] Adversarial batch #194 accepted.',
  '[11:04:39] Drift monitor: channel entropy variance +0.8σ.',
  '[11:04:51] Counterfactual mule cluster generated (24 nodes).',
  '[11:05:03] Retraining window opened: model_v31_hotfix.',
  '[11:05:19] Detection resilience post-attack: 94.2%.',
]

export const SAR_QUEUE = [
  { id: 'SAR-8821', caseId: 'MDE-24091', status: 'Generating', progress: 72, analyst: 'R. Menon' },
  { id: 'SAR-8819', caseId: 'MDE-24088', status: 'Compliance Check', progress: 95, analyst: 'A. Kumar' },
  { id: 'SAR-8815', caseId: 'MDE-24085', status: 'Ready to Export', progress: 100, analyst: 'S. Devi' },
]

export const ALERTS = [
  { id: 'AL-9001', text: 'Burst of 41 linked UPI credits detected in 22 minutes.', severity: 'critical', time: '2m ago' },
  { id: 'AL-9002', text: 'Known mule cluster overlap with 3 fresh beneficiary nodes.', severity: 'high', time: '6m ago' },
  { id: 'AL-8998', text: 'CHRONOS timeline replay flagged layering pattern drift.', severity: 'medium', time: '14m ago' },
  { id: 'AL-8993', text: 'SAR queue auto-prioritized 2 critical filings.', severity: 'low', time: '31m ago' },
]

export const SYSTEM_HEALTH = [
  { label: 'Ingestion Gateway', value: 'Healthy', pct: 99, tone: 'emerald' },
  { label: 'Feature Store', value: 'Healthy', pct: 97, tone: 'cyan' },
  { label: 'MDE Scoring API', value: 'Degraded', pct: 84, tone: 'amber' },
  { label: 'CHRONOS Render Node', value: 'Healthy', pct: 96, tone: 'violet' },
  { label: 'HYDRA Trainer', value: 'Healthy', pct: 93, tone: 'indigo' },
]

export const NETWORK_NODES = [
  { id: 'A0', position: { x: 20, y: 110 }, data: { label: 'Anchor ACC_5521', risk: 'critical' }, type: 'default' },
  { id: 'A1', position: { x: 210, y: 50 }, data: { label: 'Mule Cluster 01', risk: 'high' }, type: 'default' },
  { id: 'A2', position: { x: 210, y: 170 }, data: { label: 'Mule Cluster 02', risk: 'high' }, type: 'default' },
  { id: 'A3', position: { x: 390, y: 30 }, data: { label: 'Layer Node', risk: 'medium' }, type: 'default' },
  { id: 'A4', position: { x: 390, y: 120 }, data: { label: 'Fan-out Node', risk: 'high' }, type: 'default' },
  { id: 'A5', position: { x: 390, y: 210 }, data: { label: 'Sink ACC_7738', risk: 'critical' }, type: 'default' },
]

export const NETWORK_EDGES = [
  { id: 'e1', source: 'A0', target: 'A1', animated: true },
  { id: 'e2', source: 'A0', target: 'A2', animated: true },
  { id: 'e3', source: 'A1', target: 'A3', animated: true },
  { id: 'e4', source: 'A2', target: 'A4', animated: true },
  { id: 'e5', source: 'A4', target: 'A5', animated: true },
]
