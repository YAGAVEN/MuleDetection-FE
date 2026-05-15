// CHRONOS Timeline Visualization Module
import * as d3 from 'd3';
import api from './api.js';
import { showLoading, hideLoading, formatCurrency, formatDateTime, getSuspicionColor, parseTransactionData, showNotification } from './utils.js';
import TriNetraPDFGenerator from './pdf-generator.js';

class ChronosTimeline {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.svg = null;
        this.width = 0;
        this.height = 400;
        this.margin = { top: 20, right: 30, bottom: 40, left: 50 };
        this.data = [];
        this.riskScores = {}; // Map account_id to risk data
        this.currentScenario = 'all';
        this.timeQuantum = '1m'; // New time quantum selection
        this.isPlaying = false;
        this.speed = 10;
        this.currentFrame = 0;
        this.animationId = null;
        this.viewMode = 'timeline'; // 'timeline' or 'network'
        this.networkRiskFilter = 'all'; // all | low | high
        this.selectedNode = null;
        this.networkNodes = [];
        this.networkLinks = [];
        this.searchResults = []; // Store search results
        this.searchModal = null; // Search results modal
        
        this.setupTimeline();
        this.setupControls();
        this.setupSearchModal();
        this.setupNetworkOverview();
    }

    /**
     * Set risk scores from GNN prediction pipeline
     * @param {Array} scores - Array of account risk data with account_id, ensemble_score, risk_level
     */
    setRiskScores(scores) {
        if (!Array.isArray(scores)) return;
        
        // Create lookup map for O(1) access
        this.riskScores = {};
        scores.forEach(score => {
            if (score.account_id) {
                this.riskScores[score.account_id] = score;
            }
        });
        
        console.log(`[CHRONOS] Loaded risk scores for ${Object.keys(this.riskScores).length} accounts`);
    }

    /**
     * Get color for risk level
     * @param {string} riskLevel - 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
     * @returns {string} Color hex code
     */
    getRiskColor(riskLevel) {
        const colors = {
            'LOW': '#4ade80',        // Green
            'MEDIUM': '#fbbf24',     // Amber
            'HIGH': '#f87171',       // Red
            'CRITICAL': '#dc2626',   // Dark Red
        };
        return colors[riskLevel] || '#9ca3af'; // Gray default
    }

    /**
     * Get risk data for an account
     * @param {string} accountId - Account ID
     * @returns {Object|null} Risk data or null
     */
    getAccountRiskData(accountId) {
        return this.riskScores[accountId] || null;
    }

    /**
     * Update visualization with risk highlighting
     */
    updateVisualization() {
        if (Object.keys(this.riskScores).length === 0) return;
        
        // Re-render the current visualization with risk colors
        if (this.viewMode === 'timeline') {
            this.updateTimelineWithRiskHighlighting();
        } else if (this.viewMode === 'network') {
            this.updateNetworkWithRiskHighlighting();
        }
    }

    /**
     * Update timeline visualization with risk colors for high-risk accounts
     */
    updateTimelineWithRiskHighlighting() {
        const criticalAccounts = Object.values(this.riskScores)
            .filter(r => r.risk_level === 'CRITICAL' || r.risk_level === 'HIGH')
            .map(r => r.account_id);
        
        if (criticalAccounts.length === 0) return;
        
        // Highlight transactions from high-risk accounts
        this.g.selectAll('circle.transaction-point').each(function() {
            const d = d3.select(this).datum();
            if (d && criticalAccounts.includes(d.account_id)) {
                d3.select(this)
                    .attr('r', 6)
                    .style('stroke', '#dc2626')
                    .style('stroke-width', 3)
                    .style('filter', 'drop-shadow(0 0 6px #dc2626)');
            }
        });
    }

    /**
     * Update network visualization with risk highlighting
     */
    updateNetworkWithRiskHighlighting() {
        // Color nodes by risk level
        this.networkNodes.forEach((node, idx) => {
            const riskData = this.getAccountRiskData(node.id);
            if (riskData) {
                node.riskLevel = riskData.risk_level;
                node.riskScore = riskData.ensemble_score;
                node.color = this.getRiskColor(riskData.risk_level);
            }
        });
        
        // Re-render network with new colors
        this.renderNetwork?.();
    }

    setupTimeline() {
        // Clear existing content
        d3.select(`#${this.containerId}`).selectAll('*').remove();
        
        // Add explanation panel first
        const container = d3.select(`#${this.containerId}`);
        
        // Add status bar with risk score info
        const statusHtml = Object.keys(this.riskScores).length > 0 
            ? `
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="status-item bg-dark/40 rounded-xl p-4 text-center border border-secondary/20">
                        <div class="text-secondary font-bold text-2xl mb-1" id="total-count">0</div>
                        <div class="text-gray-300 text-sm">Total Transactions</div>
                    </div>
                    <div class="status-item bg-dark/40 rounded-xl p-4 text-center border border-red-400/20">
                        <div class="text-red-400 font-bold text-2xl mb-1" id="suspicious-count">0</div>
                        <div class="text-gray-300 text-sm">Suspicious Patterns</div>
                    </div>
                    <div class="status-item bg-dark/40 rounded-xl p-4 text-center border border-orange-400/20">
                        <div class="font-bold text-2xl mb-1" id="risk-level">LOW</div>
                        <div class="text-gray-300 text-sm">Risk Assessment</div>
                    </div>
                    <div class="status-item bg-dark/40 rounded-xl p-4 text-center border border-yellow-400/20">
                        <div class="text-yellow-400 font-bold text-2xl mb-1" id="gnn-risk-count">0</div>
                        <div class="text-gray-300 text-sm">High-Risk (GNN)</div>
                    </div>
                </div>
            `
            : `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="status-item bg-dark/40 rounded-xl p-4 text-center border border-secondary/20">
                        <div class="text-secondary font-bold text-2xl mb-1" id="total-count">0</div>
                        <div class="text-gray-300 text-sm">Total Transactions</div>
                    </div>
                    <div class="status-item bg-dark/40 rounded-xl p-4 text-center border border-red-400/20">
                        <div class="text-red-400 font-bold text-2xl mb-1" id="suspicious-count">0</div>
                        <div class="text-gray-300 text-sm">Suspicious Patterns</div>
                    </div>
                    <div class="status-item bg-dark/40 rounded-xl p-4 text-center border border-orange-400/20">
                        <div class="font-bold text-2xl mb-1" id="risk-level">LOW</div>
                        <div class="text-gray-300 text-sm">Risk Assessment</div>
                    </div>
                </div>
            `;
        
        container.append('div')
            .attr('class', 'status-bar bg-gradient-to-r from-dark-secondary/80 to-dark-accent/80 rounded-2xl p-6 mb-8 border border-primary/30 shadow-lg')
            .html(statusHtml);
        
        // Update GNN risk count if available
        if (Object.keys(this.riskScores).length > 0) {
            const highRiskCount = Object.values(this.riskScores)
                .filter(r => r.risk_level === 'CRITICAL' || r.risk_level === 'HIGH')
                .length;
            container.select('#gnn-risk-count').text(highRiskCount);
        }
        
        // Create clean SVG with improved styling
        this.width = Math.max(this.container.clientWidth - this.margin.left - this.margin.right, 800);
        
        this.svg = container
            .append('svg')
            .attr('class', 'timeline-svg bg-dark/20 rounded-xl border border-primary/20')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .style('background', 'linear-gradient(135deg, rgba(10, 10, 15, 0.95) 0%, rgba(26, 26, 46, 0.85) 50%, rgba(22, 33, 62, 0.75) 100%)')
            .style('backdrop-filter', 'blur(12px)')
            .style('border', '2px solid rgba(0, 255, 135, 0.3)')
            .style('box-shadow', '0 8px 32px rgba(0, 255, 135, 0.1)');

        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Create scales
        this.xScale = d3.scaleTime().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height - this.margin.bottom, this.margin.top]);

        // Create axes with enhanced styling
        this.xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d3.timeFormat('%m/%d\n%H:%M'))
            .ticks(12)
            .tickSize(-this.height + this.margin.top + this.margin.bottom)
            .tickPadding(15);
            
        this.yAxis = d3.axisLeft(this.yScale)
            .tickFormat(d => {
                if (d >= 1000000) return `₹${(d/1000000).toFixed(1)}M`;
                if (d >= 100000) return `₹${(d/1000).toFixed(0)}K`;
                if (d >= 1000) return `₹${(d/1000).toFixed(1)}K`;
                return `₹${d.toFixed(0)}`;
            })
            .ticks(10)
            .tickSize(-this.width)
            .tickPadding(15);

        // Add grid lines and axes
        this.g.append('g')
            .attr('class', 'x-axis timeline-axis')
            .attr('transform', `translate(0,${this.height - this.margin.bottom})`)
            .style('color', '#4a5568')
            .style('font-size', '12px');

        this.g.append('g')
            .attr('class', 'y-axis timeline-axis')
            .style('color', '#4a5568')
            .style('font-size', '12px');

        // Add enhanced axis labels
        this.g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left + 15)
            .attr('x', 0 - (this.height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('fill', '#00ff87')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .text('💰 Transaction Amount (₹)');

        this.g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${this.width / 2}, ${this.height + this.margin.bottom - 5})`)
            .style('text-anchor', 'middle')
            .style('fill', '#00d4ff')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .text('⏰ Timeline (Date & Time)');
            
        // Add enhanced CSS for grid lines and better readability
        this.svg.append('defs').append('style').text(`
            .timeline-axis .tick line {
                stroke: rgba(255, 255, 255, 0.6);
                stroke-width: 1px;
                opacity: 1;
            }
            .timeline-axis .domain {
                stroke: #ffffff;
                stroke-width: 3px;
                opacity: 1;
            }
            .timeline-axis text {
                fill: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                font-weight: 500;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            .timeline-axis .tick:hover line {
                stroke: rgba(255, 255, 255, 0.8);
                stroke-width: 2px;
            }
        `);

        // Create enhanced tooltip
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'chronos-tooltip')
            .style('position', 'absolute')
            .style('background', 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%)')
            .style('backdrop-filter', 'blur(12px)')
            .style('border', '1px solid #00ff87')
            .style('border-radius', '12px')
            .style('padding', '16px')
            .style('color', '#ffffff')
            .style('font-size', '13px')
            .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
            .style('box-shadow', '0 8px 32px rgba(0, 255, 135, 0.15)')
            .style('z-index', '10000')
            .style('opacity', 0)
            .style('pointer-events', 'none')
            .style('transition', 'all 0.2s ease-in-out');

        // Add info panel
        container.append('div')
            .attr('class', 'timeline-info bg-gradient-to-br from-secondary/10 to-primary/10 rounded-2xl p-8 mb-8 border border-secondary/20 shadow-lg')
            .html(`
                <div class="text-center mb-6">
                    <h4 class="text-2xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent mb-4">📊 Transaction Analysis Dashboard</h4>
                    <p class="text-lg text-gray-300 leading-relaxed">Comprehensive real-time analysis of financial transaction patterns and risk assessment.</p>
                </div>
            `);
            
        // Add keyboard shortcuts
        container.append('div')
            .attr('class', 'shortcuts-info bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl p-8 border border-purple-400/20 shadow-lg')
            .html(`
                <div class="text-center mb-6">
                    <h6 class="text-2xl font-bold text-purple-400 mb-4 flex items-center justify-center">
                        ⌨️ Keyboard Controls
                        <span class="ml-3 text-sm bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full">Pro Tips</span>
                    </h6>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div class="bg-dark/40 rounded-xl p-4 text-center border border-green-400/20 hover:border-green-400/50 transition-all">
                        <kbd class="bg-green-500/20 text-green-400 px-3 py-2 rounded-lg font-bold text-lg block mb-2">Space</kbd>
                        <span class="text-gray-300 text-sm">Play/Pause</span>
                    </div>
                    <div class="bg-dark/40 rounded-xl p-4 text-center border border-red-400/20 hover:border-red-400/50 transition-all">
                        <kbd class="bg-red-500/20 text-red-400 px-3 py-2 rounded-lg font-bold text-lg block mb-2">R</kbd>
                        <span class="text-gray-300 text-sm">Reset</span>
                    </div>
                    <div class="bg-dark/40 rounded-xl p-4 text-center border border-blue-400/20 hover:border-blue-400/50 transition-all">
                        <kbd class="bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg font-bold text-lg block mb-2">T</kbd>
                        <span class="text-gray-300 text-sm">Timeline View</span>
                    </div>
                    <div class="bg-dark/40 rounded-xl p-4 text-center border border-yellow-400/20 hover:border-yellow-400/50 transition-all">
                        <kbd class="bg-yellow-500/20 text-yellow-400 px-3 py-2 rounded-lg font-bold text-lg block mb-2">N</kbd>
                        <span class="text-gray-300 text-sm">Network View</span>
                    </div>
                    <div class="bg-dark/40 rounded-xl p-4 text-center border border-purple-400/20 hover:border-purple-400/50 transition-all">
                        <kbd class="bg-purple-500/20 text-purple-400 px-2 py-2 rounded-lg font-bold text-sm block mb-2">Ctrl+F</kbd>
                        <span class="text-gray-300 text-sm">Search</span>
                    </div>
                </div>
            `);
    }

    setupSearchModal() {
        // Create search results modal
        this.searchModal = d3.select('body').append('div')
            .attr('class', 'search-modal hidden')
            .style('position', 'fixed')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('background', 'var(--color-dark-light)')
            .style('border', '1px solid var(--color-primary)')
            .style('border-radius', 'var(--radius-xl)')
            .style('padding', 'var(--space-8)')
            .style('max-width', '800px')
            .style('max-height', '600px')
            .style('overflow-y', 'auto')
            .style('z-index', 'var(--z-modal)')
            .style('box-shadow', 'var(--shadow-2xl)');

        // Add modal content structure
        this.searchModal.append('div')
            .attr('class', 'search-modal-header')
            .html(`
                <h3>🔍 Transaction Search Results</h3>
                <button class="close-search-modal" style="float: right; background: none; border: none; color: var(--color-light); font-size: 24px; cursor: pointer;">&times;</button>
            `);

        this.searchModal.append('div')
            .attr('class', 'search-modal-content');

        // Add event listener to close modal
        this.searchModal.select('.close-search-modal')
            .on('click', () => this.hideSearchModal());
    }

    setupNetworkOverview() {
        // Create network overview modal
        this.networkOverviewModal = d3.select('body').append('div')
            .attr('class', 'network-overview-modal hidden')
            .style('position', 'fixed')
            .style('top', '5%')
            .style('left', '5%')
            .style('width', '90%')
            .style('height', '90%')
            .style('background', 'linear-gradient(135deg, rgba(10, 10, 15, 0.98) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.98) 100%)')
            .style('backdrop-filter', 'blur(20px)')
            .style('border', '2px solid #00ff87')
            .style('border-radius', '20px')
            .style('z-index', '10001')
            .style('box-shadow', '0 20px 60px rgba(0, 255, 135, 0.3)')
            .style('overflow', 'hidden');

        // Add modal header
        const header = this.networkOverviewModal.append('div')
            .attr('class', 'network-overview-header')
            .style('padding', '20px 30px')
            .style('border-bottom', '2px solid rgba(0, 255, 135, 0.3)')
            .style('background', 'rgba(0, 255, 135, 0.1)')
            .style('display', 'flex')
            .style('justify-content', 'space-between')
            .style('align-items', 'center');

        header.append('div')
            .html(`
                <h2 style="color: #00ff87; font-size: 28px; font-weight: bold; margin: 0; display: flex; align-items: center;">
                    🕸️ Complete Network Overview
                    <span style="margin-left: 15px; font-size: 14px; background: rgba(0, 255, 135, 0.2); color: #00ff87; padding: 5px 12px; border-radius: 20px;">Full Analysis</span>
                </h2>
                <p style="color: #a0aec0; font-size: 16px; margin: 5px 0 0 0;">Interactive visualization of all account connections and transaction flows</p>
            `);

        const controls = header.append('div')
            .style('display', 'flex')
            .style('gap', '15px')
            .style('align-items', 'center');

        // Add control buttons
        controls.append('button')
            .attr('class', 'network-zoom-fit')
            .style('padding', '8px 16px')
            .style('background', 'rgba(0, 212, 255, 0.2)')
            .style('border', '1px solid #00d4ff')
            .style('border-radius', '8px')
            .style('color', '#00d4ff')
            .style('cursor', 'pointer')
            .style('font-weight', '600')
            .style('transition', 'all 0.3s ease')
            .text('🔍 Zoom to Fit')
            .on('click', () => this.zoomToFitNetwork())
            .on('mouseover', function() {
                d3.select(this).style('background', 'rgba(0, 212, 255, 0.3)');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', 'rgba(0, 212, 255, 0.2)');
            });

        controls.append('button')
            .attr('class', 'network-reset')
            .style('padding', '8px 16px')
            .style('background', 'rgba(239, 68, 68, 0.2)')
            .style('border', '1px solid #ef4444')
            .style('border-radius', '8px')
            .style('color', '#ef4444')
            .style('cursor', 'pointer')
            .style('font-weight', '600')
            .style('transition', 'all 0.3s ease')
            .text('🔄 Reset View')
            .on('click', () => this.resetNetworkView())
            .on('mouseover', function() {
                d3.select(this).style('background', 'rgba(239, 68, 68, 0.3)');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', 'rgba(239, 68, 68, 0.2)');
            });

        controls.append('button')
            .attr('class', 'close-network-overview')
            .style('padding', '8px 16px')
            .style('background', 'rgba(156, 163, 175, 0.2)')
            .style('border', '1px solid #9ca3af')
            .style('border-radius', '8px')
            .style('color', '#9ca3af')
            .style('cursor', 'pointer')
            .style('font-weight', '600')
            .style('transition', 'all 0.3s ease')
            .text('✕ Close')
            .on('click', () => this.hideNetworkOverview())
            .on('mouseover', function() {
                d3.select(this).style('background', 'rgba(156, 163, 175, 0.3)');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', 'rgba(156, 163, 175, 0.2)');
            });

        // Add main content area
        this.networkOverviewModal.append('div')
            .attr('class', 'network-overview-content')
            .style('height', 'calc(100% - 100px)')
            .style('position', 'relative')
            .style('padding', '20px')
            .style('overflow', 'hidden');

        // Add zoom and pan controls info
        this.networkOverviewModal.select('.network-overview-content')
            .append('div')
            .attr('class', 'network-controls-info')
            .style('position', 'absolute')
            .style('top', '20px')
            .style('right', '20px')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('border', '1px solid rgba(0, 255, 135, 0.3)')
            .style('border-radius', '12px')
            .style('padding', '12px 16px')
            .style('color', '#e2e8f0')
            .style('font-size', '12px')
            .style('z-index', '10002')
            .html(`
                <div style="font-weight: bold; color: #00ff87; margin-bottom: 8px;">🎮 Network Controls</div>
                <div style="margin-bottom: 4px;">🖱️ <strong>Drag:</strong> Pan network</div>
                <div style="margin-bottom: 4px;">🔍 <strong>Scroll:</strong> Zoom in/out</div>
                <div style="margin-bottom: 4px;">👆 <strong>Click Node:</strong> Focus & info</div>
                <div>🔗 <strong>Drag Node:</strong> Reposition</div>
            `);
    }

    setupControls() {
        const playButton = document.getElementById('play-button');
        const pauseButton = document.getElementById('pause-button');
        const resetButton = document.getElementById('reset-button');
        const speedSlider = document.getElementById('speed-slider');
        const speedDisplay = document.getElementById('speed-display');
        const timelineView = document.getElementById('timeline-view');
        const networkView = document.getElementById('network-view');
        
        // New controls
        const timeQuantumSelect = document.getElementById('time-quantum');
        const transactionSearch = document.getElementById('transaction-search');
        const searchButton = document.getElementById('search-button');
        const searchType = document.getElementById('search-type');

        if (playButton) {
            playButton.addEventListener('click', () => this.play());
        }

        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.pause());
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => this.reset());
        }

        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                this.speed = parseInt(e.target.value);
                if (speedDisplay) {
                    speedDisplay.textContent = `${this.speed}x`;
                }
            });
        }

        if (timelineView) {
            timelineView.addEventListener('click', () => this.switchView('timeline'));
        }

        if (networkView) {
            networkView.addEventListener('click', () => this.switchView('network'));
        }
        
        const exportButton = document.getElementById('export-chronos');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportReport());
        }

        // Time quantum control
        if (timeQuantumSelect) {
            timeQuantumSelect.addEventListener('change', (e) => {
                this.timeQuantum = e.target.value;
                this.loadData(this.currentScenario);
                showNotification(`Time period changed to ${e.target.selectedOptions[0].text}`, 'info');
            });
        }

        // Search controls
        if (searchButton) {
            searchButton.addEventListener('click', () => this.searchTransactions());
        }

        if (transactionSearch) {
            transactionSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchTransactions();
                }
            });
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' && !e.ctrlKey) return; // Don't interfere with input fields
            
            switch(e.key) {
                case ' ':
                case 'Space':
                    e.preventDefault();
                    this.isPlaying ? this.pause() : this.play();
                    break;
                case 'r':
                case 'R':
                    this.reset();
                    break;
                case 't':
                case 'T':
                    this.switchView('timeline');
                    break;
                case 'n':
                case 'N':
                    this.switchView('network');
                    break;
                case 'f':
                case 'F':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        if (transactionSearch) {
                            transactionSearch.focus();
                        }
                    }
                    break;
            }
        });
    }

    async setTimeQuantum(quantum) {
        try {
            console.log(`🕐 CHRONOS: Setting time quantum to: ${quantum}`);
            this.timeQuantum = quantum;
            await this.loadData(this.currentScenario);
        } catch (error) {
            console.error('[ERROR] CHRONOS: Error setting time quantum:', error);
            showNotification('Failed to update time quantum', 'error');
        }
    }

    setPlaybackSpeed(val) {
        // Map React slider range (0.25–4) to internal speed (2–40)
        this.speed = Math.max(2, Math.round(val * 10));
        console.log(`⚡ CHRONOS: Playback speed set to ${val}x (internal: ${this.speed})`);
    }

    async loadData(scenario = 'all') {
        try {
            showLoading();
            this.currentScenario = scenario;
            
            console.log(`🔄 CHRONOS: Loading data for scenario: ${scenario}, time quantum: ${this.timeQuantum}`);
            const response = await api.getTimelineData(scenario, this.timeQuantum);
            console.log('📊 CHRONOS: API Response:', response);
            
            if (response.status === 'success' && response.data) {
                console.log(`📈 CHRONOS: Raw data received: ${response.data.length} transactions`);
                this.data = this.parseEnhancedTransactionData(response.data);
                console.log(`[SUCCESS] CHRONOS: Parsed data: ${this.data.length} transactions`);
                
                if (this.data.length > 0) {
                    this.render();
                    const timeRange = response.date_range ? 
                        `(${new Date(response.date_range.start).toLocaleDateString()} - ${new Date(response.date_range.end).toLocaleDateString()})` : '';
                    const notificationMessage = `Loaded ${this.data.length} transactions for ${scenario} ${timeRange}`;
                    showNotification(notificationMessage, 'success');
                    
                    // Display layering summary if available
                    if (response.layering_summary) {
                        this.displayLayeringSummary(response.layering_summary);
                    }
                } else {
                    throw new Error('No transaction data available for this scenario and time period');
                }
            } else {
                throw new Error(response.message || 'Failed to load timeline data');
            }
        } catch (error) {
            console.error('[ERROR] CHRONOS Error loading timeline data:', error);
            this.showErrorState(error.message);
            showNotification('Failed to load timeline data', 'error');
        } finally {
            hideLoading();
        }
    }
    
    showErrorState(message) {
        const container = d3.select(`#${this.containerId}`);
        container.selectAll('.error-state').remove();
        
        container.append('div')
            .attr('class', 'error-state')
            .html(`
                <div class="error-content">
                    <h4>[WARN] Unable to Load Timeline Data</h4>
                    <p>${message}</p>
                    <button class="retry-button" onclick="window.TriNetra.getChronos().loadData('${this.currentScenario}')">
                        🔄 Try Again
                    </button>
                </div>
            `);
    }

    parseEnhancedTransactionData(rawData) {
        return rawData.map(tx => {
            // Enhanced parsing with new fields
            const parsedTx = parseTransactionData([tx])[0];
            
            // Add enhanced fields
            parsedTx.aadhar_location = tx.aadhar_location || {};
            parsedTx.layering_analysis = tx.layering_analysis || {};
            parsedTx.country_risk_level = tx.country_risk_level || { level: 1, description: 'Low Risk', color: '#44ff44' };
            parsedTx.transaction_method = tx.transaction_method || 'Unknown';
            parsedTx.bank_details = tx.bank_details || {};
            
            return parsedTx;
        });
    }

    async searchTransactions(term, type) {
        const searchTerm = term || document.getElementById('transaction-search')?.value?.trim();
        const searchType = type || document.getElementById('search-type')?.value || 'all';
        
        if (!searchTerm) {
            showNotification('Please enter a search term', 'warning');
            return [];
        }
        
        try {
            showLoading();
            console.log(`🔍 CHRONOS: Searching for "${searchTerm}" (type: ${searchType})`);
            
            const response = await api.searchTransactions(searchTerm, searchType);
            
            if (response.status === 'success' && response.results) {
                this.searchResults = response.results;
                this.displaySearchResults(response);
                
                if (response.results.length > 0) {
                    showNotification(`Found ${response.results.length} matching transactions`, 'success');
                } else {
                    showNotification('No transactions found matching your search', 'info');
                }
                return response.results;
            } else {
                throw new Error(response.message || 'Search failed');
            }
        } catch (error) {
            console.error('[ERROR] CHRONOS Search error:', error);
            showNotification('Search failed. Please try again.', 'error');
            return [];
        } finally {
            hideLoading();
        }
    }

    displaySearchResults(response) {
        if (!this.searchModal) return;
        
        const content = this.searchModal.select('.search-modal-content');
        content.selectAll('*').remove();
        
        if (response.results.length === 0) {
            content.html(`
                <div style="text-align: center; padding: 60px 40px; 
                            background: rgba(26, 26, 46, 0.6); 
                            border: 2px dashed rgba(0, 212, 255, 0.3); 
                            border-radius: 16px;">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 24px; opacity: 0.4;">
                        <circle cx="11" cy="11" r="8" stroke="#00d4ff" stroke-width="2"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#00d4ff" stroke-width="2" stroke-linecap="round"/>
                        <line x1="8" y1="11" x2="14" y2="11" stroke="#00d4ff" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <h4 style="color: #00d4ff; font-size: 24px; font-weight: 700; margin-bottom: 12px;">
                        No Results Found
                    </h4>
                    <p style="color: #9ca3af; font-size: 16px; margin-bottom: 8px;">
                        No transactions match your search criteria.
                    </p>
                    <div style="margin-top: 20px; padding: 16px; background: rgba(0, 212, 255, 0.1); 
                                border-radius: 12px; border: 1px solid rgba(0, 212, 255, 0.2);">
                        <p style="color: #e5e7eb; font-size: 14px; margin-bottom: 6px;">
                            <strong style="color: #00d4ff;">Search term:</strong> "${response.search_term}"
                        </p>
                        <p style="color: #e5e7eb; font-size: 14px;">
                            <strong style="color: #00d4ff;">Search type:</strong> ${response.search_type}
                        </p>
                    </div>
                </div>
            `);
        } else {
            // Create search results header
            content.append('div')
                .attr('class', 'search-results-header')
                .style('background', 'linear-gradient(135deg, rgba(0, 255, 135, 0.1) 0%, rgba(0, 212, 255, 0.1) 100%)')
                .style('border', '2px solid rgba(0, 255, 135, 0.3)')
                .style('border-radius', '16px')
                .style('padding', '20px 24px')
                .style('margin-bottom', '24px')
                .style('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.2)')
                .html(`
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 14px; color: #00ff87; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                                Search Results
                            </div>
                            <div style="font-size: 32px; font-weight: 800; color: #ffffff;">
                                ${response.results.length} ${response.results.length === 1 ? 'Transaction' : 'Transactions'}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">
                                Searched for
                            </div>
                            <div style="font-size: 16px; color: #00d4ff; font-weight: 600;">
                                "${response.search_term}"
                            </div>
                            <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">
                                in ${response.search_type}
                            </div>
                        </div>
                    </div>
                `);
            
            // Create results container
            const resultsContainer = content.append('div')
                .attr('class', 'search-results-container')
                .style('display', 'grid')
                .style('gap', '20px')
                .style('max-height', '600px')
                .style('overflow-y', 'auto')
                .style('padding-right', '8px');
            
            // Add each result
            response.results.forEach((result, index) => {
                const resultDiv = resultsContainer.append('div')
                    .attr('class', 'search-result-item')
                    .style('cursor', 'pointer')
                    .style('transition', 'all 0.3s ease')
                    .on('click', () => this.highlightSearchResult(result))
                    .on('mouseenter', function() {
                        d3.select(this)
                            .style('transform', 'translateY(-2px)')
                            .style('box-shadow', '0 8px 20px rgba(0, 255, 135, 0.2)');
                    })
                    .on('mouseleave', function() {
                        d3.select(this)
                            .style('transform', 'translateY(0)')
                            .style('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.3)');
                    });
                
                resultDiv.html(this.formatSearchResult(result, index + 1));
            });
        }
        
        this.showSearchModal();
    }

    formatSearchResult(result, index) {
        const suspicionLevel = result.suspicious_score > 0.8 ? 'CRITICAL' : 
                              result.suspicious_score > 0.5 ? 'SUSPICIOUS' : 'NORMAL';
        const suspicionClass = suspicionLevel.toLowerCase();
        
        // Risk badge styling
        const riskColors = {
            'CRITICAL': { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#fee2e2' },
            'SUSPICIOUS': { bg: 'rgba(251, 146, 60, 0.15)', border: '#fb923c', text: '#fed7aa' },
            'NORMAL': { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#bbf7d0' }
        };
        const riskStyle = riskColors[suspicionLevel];
        
        // Format transaction flow
        const txFlow = `
            <div style="display: flex; align-items: center; gap: 12px; margin: 16px 0;">
                <div style="flex: 1; text-align: right;">
                    <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">From</div>
                    <div style="font-weight: 600; color: #00d4ff; font-size: 14px;">${result.from_account}</div>
                </div>
                <div style="flex-shrink: 0;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#00ff87" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">To</div>
                    <div style="font-weight: 600; color: #00ff87; font-size: 14px;">${result.to_account}</div>
                </div>
            </div>
        `;
        
        return `
            <div style="background: linear-gradient(135deg, rgba(26, 26, 46, 0.9) 0%, rgba(16, 16, 32, 0.95) 100%); 
                        border: 2px solid ${riskStyle.border}40; 
                        border-radius: 16px; 
                        overflow: hidden;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                
                <!-- Header Section -->
                <div style="background: ${riskStyle.bg}; 
                            border-bottom: 2px solid ${riskStyle.border}40; 
                            padding: 16px 20px; 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center;">
                    <div>
                        <div style="font-size: 12px; color: #9ca3af; font-weight: 500; margin-bottom: 4px;">
                            Result #${index}
                        </div>
                        <div style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
                            ${result.id}
                        </div>
                    </div>
                    <div style="background: ${riskStyle.bg}; 
                                border: 2px solid ${riskStyle.border}; 
                                padding: 8px 16px; 
                                border-radius: 12px;
                                box-shadow: 0 0 15px ${riskStyle.border}50;">
                        <div style="font-size: 11px; color: ${riskStyle.text}; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                            ${suspicionLevel}
                        </div>
                        <div style="font-size: 18px; font-weight: 800; color: ${riskStyle.border}; margin-top: 2px;">
                            ${(result.suspicious_score * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>
                
                <!-- Content Section -->
                <div style="padding: 20px;">
                    
                    <!-- Amount Display (Prominent) -->
                    <div style="text-align: center; padding: 24px 0; margin-bottom: 20px; 
                                background: linear-gradient(135deg, rgba(0, 255, 135, 0.05) 0%, rgba(0, 212, 255, 0.05) 100%);
                                border-radius: 12px; border: 1px solid rgba(0, 255, 135, 0.2);">
                        <div style="font-size: 13px; color: #00ff87; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1.5px;">
                            Transaction Amount
                        </div>
                        <div style="font-size: 36px; font-weight: 800; color: #ffffff; text-shadow: 0 0 20px rgba(0, 255, 135, 0.3);">
                            ${formatCurrency(result.amount)}
                        </div>
                        <div style="font-size: 13px; color: #9ca3af; margin-top: 8px;">
                            ${formatDateTime(result.timestamp)}
                        </div>
                    </div>
                    
                    <!-- Transaction Flow -->
                    ${txFlow}
                    
                    <!-- Details Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;">
                        
                        <div style="background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.2); 
                                    padding: 12px; border-radius: 10px;">
                            <div style="font-size: 10px; color: #00d4ff; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; letter-spacing: 1px;">
                                Type
                            </div>
                            <div style="font-size: 14px; color: #ffffff; font-weight: 600;">
                                ${result.transaction_method || result.transaction_type || 'TRANSFER'}
                            </div>
                        </div>
                        
                        <div style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.2); 
                                    padding: 12px; border-radius: 10px;">
                            <div style="font-size: 10px; color: #a78bfa; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; letter-spacing: 1px;">
                                Pattern
                            </div>
                            <div style="font-size: 14px; color: #ffffff; font-weight: 600; text-transform: capitalize;">
                                ${result.pattern_type || 'Normal'}
                            </div>
                        </div>
                        
                        ${result.aadhar_location ? `
                        <div style="background: rgba(251, 146, 60, 0.05); border: 1px solid rgba(251, 146, 60, 0.2); 
                                    padding: 12px; border-radius: 10px; grid-column: 1 / -1;">
                            <div style="font-size: 10px; color: #fb923c; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; letter-spacing: 1px;">
                                Location
                            </div>
                            <div style="font-size: 14px; color: #ffffff; font-weight: 600;">
                                ${result.aadhar_location.city}, ${result.aadhar_location.state}, ${result.aadhar_location.country}
                            </div>
                        </div>
                        ` : ''}
                        
                        ${result.country_risk_level ? `
                        <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); 
                                    padding: 12px; border-radius: 10px; grid-column: 1 / -1;">
                            <div style="font-size: 10px; color: #ef4444; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; letter-spacing: 1px;">
                                Country Risk
                            </div>
                            <div style="font-size: 14px; font-weight: 600;" 
                                 style="color: ${result.country_risk_level.color || '#ffffff'}">
                                ${result.country_risk_level.description}
                            </div>
                        </div>
                        ` : ''}
                        
                        ${result.layering_analysis && result.layering_analysis.layer_3_integration ? `
                        <div style="background: rgba(234, 88, 12, 0.05); border: 1px solid rgba(234, 88, 12, 0.2); 
                                    padding: 12px; border-radius: 10px; grid-column: 1 / -1;">
                            <div style="font-size: 10px; color: #ea580c; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; letter-spacing: 1px;">
                                Threat Level
                            </div>
                            <div style="font-size: 14px; color: #ffffff; font-weight: 600; text-transform: uppercase;">
                                ${result.layering_analysis.layer_3_integration.threat_level}
                            </div>
                        </div>
                        ` : ''}
                        
                    </div>
                    
                    ${result.scenario ? `
                    <div style="margin-top: 16px; padding: 12px; background: rgba(255, 255, 255, 0.02); 
                                border-left: 3px solid #00ff87; border-radius: 8px;">
                        <div style="font-size: 10px; color: #00ff87; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; letter-spacing: 1px;">
                            Scenario
                        </div>
                        <div style="font-size: 13px; color: #d1d5db; line-height: 1.6;">
                            ${result.scenario}
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Action Button -->
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <button onclick="event.stopPropagation(); window.TriNetra.getChronos().showDetailedAnalysis('${result.id}')"
                                style="width: 100%; 
                                       background: linear-gradient(135deg, #00ff87 0%, #00d4ff 100%); 
                                       color: #0a0a0f; 
                                       font-weight: 700; 
                                       font-size: 14px;
                                       text-transform: uppercase;
                                       letter-spacing: 1px;
                                       padding: 14px 24px; 
                                       border: none; 
                                       border-radius: 10px; 
                                       cursor: pointer;
                                       transition: all 0.3s ease;
                                       box-shadow: 0 4px 15px rgba(0, 255, 135, 0.3);">
                            View Detailed Analysis
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    highlightSearchResult(result) {
        // Close search modal
        this.hideSearchModal();
        
        // Find and highlight the transaction in the timeline
        if (this.data && this.data.length > 0) {
            const transaction = this.data.find(tx => tx.id === result.id);
            if (transaction) {
                this.selectTransaction(transaction);
                showNotification(`Highlighted transaction ${result.id}`, 'info');
            } else {
                showNotification('Transaction not visible in current timeline', 'warning');
            }
        }
    }

    showDetailedAnalysis(transactionId) {
        const result = this.searchResults.find(r => r.id === transactionId);
        if (!result) return;

        const previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const closeModal = () => {
            backdrop.remove();
            analysisModal.remove();
            document.body.style.overflow = previousBodyOverflow;
            d3.select(window).on('keydown.analysis-modal', null);
        };
        
        // Create backdrop
        const backdrop = d3.select('body').append('div')
            .attr('class', 'modal-backdrop')
            .style('position', 'fixed')
            .style('top', '0')
            .style('left', '0')
            .style('width', '100%')
            .style('height', '100%')
            .style('background', 'rgba(5, 8, 16, 0.92)')
            .style('z-index', '9998')
            .style('animation', 'fadeIn 0.3s ease')
            .on('click', closeModal);
        
        // Create detailed analysis modal
        const analysisModal = d3.select('body').append('div')
            .attr('class', 'analysis-modal')
            .style('position', 'fixed')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('background', '#0f1424')
            .style('border', '2px solid rgba(0, 255, 135, 0.3)')
            .style('border-radius', '24px')
            .style('padding', '0')
            .style('width', '90%')
            .style('max-width', '1100px')
            .style('max-height', '85vh')
            .style('overflow', 'auto')
            .style('z-index', '9999')
            .style('box-shadow', '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(0, 255, 135, 0.2)')
            .style('animation', 'slideIn 0.3s ease')
            .on('click', function(event) {
                event.stopPropagation();
            });
        
        analysisModal.html(this.formatDetailedAnalysis(result));
        
        // Add close button functionality
        analysisModal.select('.close-analysis-modal')
            .on('click', closeModal);

        d3.select(window).on('keydown.analysis-modal', (event) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        });
        
        // Add CSS animations if not exists
        if (!document.getElementById('modal-animations')) {
            const style = document.createElement('style');
            style.id = 'modal-animations';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { 
                        opacity: 0; 
                        transform: translate(-50%, -48%);
                    }
                    to { 
                        opacity: 1; 
                        transform: translate(-50%, -50%);
                    }
                }
                .analysis-modal {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0, 255, 135, 0.5) rgba(255, 255, 255, 0.08);
                }
                .analysis-modal::-webkit-scrollbar {
                    width: 10px;
                }
                .analysis-modal::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 8px;
                }
                .analysis-modal::-webkit-scrollbar-thumb {
                    background: rgba(0, 255, 135, 0.5);
                    border-radius: 8px;
                }
                .analysis-hero-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 14px;
                    margin-bottom: 28px;
                }
                .analysis-flow-grid {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    align-items: center;
                    gap: 24px;
                }
                .analysis-details-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 24px;
                    margin-bottom: 32px;
                }
                @media (max-width: 1024px) {
                    .analysis-hero-grid {
                        grid-template-columns: 1fr;
                    }
                    .analysis-flow-grid {
                        grid-template-columns: 1fr;
                    }
                    .analysis-details-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    formatDetailedAnalysis(result) {
        const suspicionLevel = result.suspicious_score > 0.8 ? 'CRITICAL' : 
                              result.suspicious_score > 0.5 ? 'SUSPICIOUS' : 'NORMAL';
        
        const riskColors = {
            'CRITICAL': { bg: '#ef4444', text: '#fee2e2', glow: 'rgba(239, 68, 68, 0.4)' },
            'SUSPICIOUS': { bg: '#fb923c', text: '#fed7aa', glow: 'rgba(251, 146, 60, 0.4)' },
            'NORMAL': { bg: '#22c55e', text: '#bbf7d0', glow: 'rgba(34, 197, 94, 0.4)' }
        };
        const riskStyle = riskColors[suspicionLevel];
        
        return `
            <!-- Modal Header -->
            <div style="background: linear-gradient(135deg, rgba(0, 255, 135, 0.16) 0%, rgba(0, 212, 255, 0.14) 100%);
                        border-bottom: 2px solid rgba(0, 255, 135, 0.3);
                        padding: 24px 32px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;">
                <div>
                    <div style="font-size: 14px; color: #00ff87; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                        Transaction Analysis
                    </div>
                    <h3 style="font-size: 28px; font-weight: 800; color: #ffffff; margin: 0;">
                        ${result.id}
                    </h3>
                </div>
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="background: ${riskStyle.bg}20; 
                                border: 2px solid ${riskStyle.bg}; 
                                padding: 12px 20px; 
                                border-radius: 12px;
                                text-align: center;
                                box-shadow: 0 0 20px ${riskStyle.glow};">
                        <div style="font-size: 11px; color: ${riskStyle.text}; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                            ${suspicionLevel}
                        </div>
                        <div style="font-size: 24px; font-weight: 800; color: ${riskStyle.bg}; margin-top: 4px;">
                            ${(result.suspicious_score * 100).toFixed(1)}%
                        </div>
                    </div>
                    <button class="close-analysis-modal" 
                            style="background: rgba(239, 68, 68, 0.1); 
                                   border: 2px solid #ef4444; 
                                   color: #ef4444; 
                                   width: 44px;
                                   height: 44px;
                                   border-radius: 12px;
                                   font-size: 28px; 
                                   font-weight: 300;
                                   cursor: pointer;
                                   display: flex;
                                   align-items: center;
                                   justify-content: center;
                                   transition: all 0.2s ease;"
                            onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.transform='scale(1.05)'"
                            onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.transform='scale(1)'">
                        ×
                    </button>
                </div>
            </div>
            
            <!-- Modal Content -->
            <div style="padding: 32px;">
                
                <!-- Quick Summary -->
                <div class="analysis-hero-grid">
                    <div style="background: rgba(17, 24, 39, 0.95); border: 1px solid rgba(0, 255, 135, 0.25); border-radius: 14px; padding: 16px 18px;">
                        <div style="font-size: 11px; color: #00ff87; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Risk Score</div>
                        <div style="font-size: 24px; color: #ffffff; font-weight: 800;">${(result.suspicious_score * 100).toFixed(1)}%</div>
                    </div>
                    <div style="background: rgba(17, 24, 39, 0.95); border: 1px solid rgba(0, 212, 255, 0.25); border-radius: 14px; padding: 16px 18px;">
                        <div style="font-size: 11px; color: #00d4ff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Transaction Type</div>
                        <div style="font-size: 20px; color: #ffffff; font-weight: 700; text-transform: capitalize;">${result.transaction_method || result.transaction_type || 'Transfer'}</div>
                    </div>
                    <div style="background: rgba(17, 24, 39, 0.95); border: 1px solid rgba(251, 146, 60, 0.25); border-radius: 14px; padding: 16px 18px;">
                        <div style="font-size: 11px; color: #fb923c; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Pattern Type</div>
                        <div style="font-size: 20px; color: #ffffff; font-weight: 700; text-transform: capitalize;">${result.pattern_type || 'Normal'}</div>
                    </div>
                </div>
                
                <!-- Amount Hero Section -->
                <div style="text-align: center; 
                            padding: 48px 32px; 
                            margin-bottom: 32px;
                            background: linear-gradient(135deg, rgba(0, 255, 135, 0.14) 0%, rgba(0, 212, 255, 0.12) 100%);
                            border: 2px solid rgba(0, 255, 135, 0.3);
                            border-radius: 20px;
                            box-shadow: 0 0 40px rgba(0, 255, 135, 0.1);">
                    <div style="font-size: 14px; color: #00ff87; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">
                        Transaction Amount
                    </div>
                    <div style="font-size: 56px; font-weight: 900; color: #ffffff; text-shadow: 0 0 30px rgba(0, 255, 135, 0.5); margin-bottom: 12px;">
                        ${formatCurrency(result.amount)}
                    </div>
                    <div style="font-size: 16px; color: #9ca3af;">
                        ${formatDateTime(result.timestamp)}
                    </div>
                </div>
                
                <!-- Transaction Flow Visual -->
                <div style="margin-bottom: 32px; 
                            padding: 32px; 
                            background: rgba(17, 24, 39, 0.92);
                            border: 2px solid rgba(0, 212, 255, 0.2);
                            border-radius: 20px;">
                    <div style="font-size: 14px; color: #00d4ff; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px; text-align: center;">
                        Transaction Flow
                    </div>
                    <div class="analysis-flow-grid">
                        <div style="flex: 1; text-align: center;">
                            <div style="background: rgba(0, 212, 255, 0.15); 
                                        border: 2px solid #00d4ff; 
                                        padding: 24px; 
                                        border-radius: 16px;">
                                <div style="font-size: 12px; color: #00d4ff; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
                                    Source Account
                                </div>
                                <div style="font-size: 24px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">
                                    ${result.from_account}
                                </div>
                                ${result.bank_details && result.bank_details.bank_name ? `
                                <div style="font-size: 13px; color: #9ca3af; margin-top: 8px;">
                                    ${result.bank_details.bank_name}
                                </div>
                                <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                                    ${result.bank_details.ifsc_code || 'N/A'}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div style="flex-shrink: 0;">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#00ff87" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        
                        <div style="flex: 1; text-align: center;">
                            <div style="background: rgba(0, 255, 135, 0.15); 
                                        border: 2px solid #00ff87; 
                                        padding: 24px; 
                                        border-radius: 16px;">
                                <div style="font-size: 12px; color: #00ff87; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
                                    Destination Account
                                </div>
                                <div style="font-size: 24px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">
                                    ${result.to_account}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Details Grid -->
                <div class="analysis-details-grid">
                    
                    <!-- Transaction Details Card -->
                    <div style="background: rgba(17, 24, 39, 0.92);
                                border: 2px solid rgba(139, 92, 246, 0.3);
                                border-radius: 20px;
                                padding: 24px;">
                        <h4 style="font-size: 16px; color: #a78bfa; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid rgba(139, 92, 246, 0.2);">
                            Transaction Details
                        </h4>
                        <div style="space-y: 16px;">
                            <div style="margin-bottom: 16px;">
                                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                                    Transaction Type
                                </div>
                                <div style="font-size: 16px; color: #ffffff; font-weight: 600;">
                                    ${result.transaction_method || result.transaction_type || 'TRANSFER'}
                                </div>
                            </div>
                            <div style="margin-bottom: 16px;">
                                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                                    Pattern Type
                                </div>
                                <div style="font-size: 16px; color: #ffffff; font-weight: 600; text-transform: capitalize;">
                                    ${result.pattern_type || 'Normal'}
                                </div>
                            </div>
                            ${result.scenario ? `
                            <div>
                                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                                    Scenario
                                </div>
                                <div style="font-size: 14px; color: #d1d5db; line-height: 1.6;">
                                    ${result.scenario}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Location Details Card -->
                    ${result.aadhar_location ? `
                    <div style="background: rgba(17, 24, 39, 0.92);
                                border: 2px solid rgba(251, 146, 60, 0.3);
                                border-radius: 20px;
                                padding: 24px;">
                        <h4 style="font-size: 16px; color: #fb923c; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid rgba(251, 146, 60, 0.2);">
                            Location Analysis
                        </h4>
                        <div style="space-y: 16px;">
                            <div style="margin-bottom: 16px;">
                                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                                    City
                                </div>
                                <div style="font-size: 16px; color: #ffffff; font-weight: 600;">
                                    ${result.aadhar_location.city || 'Unknown'}
                                </div>
                            </div>
                            <div style="margin-bottom: 16px;">
                                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                                    State / Region
                                </div>
                                <div style="font-size: 16px; color: #ffffff; font-weight: 600;">
                                    ${result.aadhar_location.state || 'Unknown'}
                                </div>
                            </div>
                            <div style="margin-bottom: 16px;">
                                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                                    Country
                                </div>
                                <div style="font-size: 16px; color: #ffffff; font-weight: 600;">
                                    ${result.aadhar_location.country || 'Unknown'}
                                </div>
                            </div>
                            ${result.country_risk_level ? `
                            <div style="padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px;">
                                <div style="font-size: 11px; color: #ef4444; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                                    Country Risk
                                </div>
                                <div style="font-size: 14px; font-weight: 600; color: ${result.country_risk_level.color || '#ffffff'};">
                                    ${result.country_risk_level.description}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                </div>
                
                <!-- Layering Analysis Section -->
                ${result.layering_analysis ? `
                <div style="background: rgba(17, 24, 39, 0.92);
                            border: 2px solid rgba(234, 88, 12, 0.3);
                            border-radius: 20px;
                            padding: 24px;
                            margin-bottom: 24px;">
                    <h4 style="font-size: 16px; color: #ea580c; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid rgba(234, 88, 12, 0.2);">
                        Layering Analysis
                    </h4>
                    ${this.formatLayeringAnalysis(result.layering_analysis)}
                </div>
                ` : ''}
                
            </div>
        `;
    }

    formatLayeringAnalysis(layering) {
        if (!layering) return '<p style="color: #9ca3af; text-align: center; padding: 20px;">No layering analysis available</p>';
        
        return `
            <div style="display: grid; gap: 20px;">
                <!-- Layer 1 -->
                <div style="background: rgba(59, 130, 246, 0.08); 
                            border-left: 4px solid #3b82f6; 
                            padding: 20px; 
                            border-radius: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <div style="background: rgba(59, 130, 246, 0.2); 
                                    color: #3b82f6; 
                                    width: 36px; 
                                    height: 36px; 
                                    border-radius: 10px; 
                                    display: flex; 
                                    align-items: center; 
                                    justify-content: center; 
                                    font-weight: 800; 
                                    font-size: 18px;
                                    border: 2px solid #3b82f6;">
                            1
                        </div>
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px;">
                                Layer 1: Data Extraction
                            </div>
                            <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">
                                ${layering.layer_1_extraction?.description || 'Pattern Detection & Data Extraction'}
                            </div>
                        </div>
                    </div>
                    ${layering.layer_1_extraction && (layering.layer_1_extraction.patterns_detected?.length || layering.layer_1_extraction.risk_indicators?.length) ? `
                    <div style="margin-left: 48px;">
                        ${layering.layer_1_extraction.patterns_detected && layering.layer_1_extraction.patterns_detected.length > 0 ? `
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 11px; color: #60a5fa; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
                                Patterns Detected
                            </div>
                            ${layering.layer_1_extraction.patterns_detected.map(p => `
                                <div style="padding: 8px 12px; 
                                            background: rgba(59, 130, 246, 0.1); 
                                            border-left: 2px solid #60a5fa; 
                                            margin-bottom: 6px; 
                                            border-radius: 6px; 
                                            font-size: 13px; 
                                            color: #e5e7eb;">
                                    • ${p}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                        ${layering.layer_1_extraction.risk_indicators && layering.layer_1_extraction.risk_indicators.length > 0 ? `
                        <div>
                            <div style="font-size: 11px; color: #fb923c; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
                                Risk Indicators
                            </div>
                            ${layering.layer_1_extraction.risk_indicators.map(r => `
                                <div style="padding: 8px 12px; 
                                            background: rgba(251, 146, 60, 0.1); 
                                            border-left: 2px solid #fb923c; 
                                            margin-bottom: 6px; 
                                            border-radius: 6px; 
                                            font-size: 13px; 
                                            color: #fed7aa;">
                                    ⚠ ${r}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                    ` : '<div style="margin-left: 48px; color: #6b7280; font-size: 13px;">No patterns detected</div>'}
                </div>
                
                <!-- Layer 2 -->
                <div style="background: rgba(139, 92, 246, 0.08); 
                            border-left: 4px solid #8b5cf6; 
                            padding: 20px; 
                            border-radius: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <div style="background: rgba(139, 92, 246, 0.2); 
                                    color: #8b5cf6; 
                                    width: 36px; 
                                    height: 36px; 
                                    border-radius: 10px; 
                                    display: flex; 
                                    align-items: center; 
                                    justify-content: center; 
                                    font-weight: 800; 
                                    font-size: 18px;
                                    border: 2px solid #8b5cf6;">
                            2
                        </div>
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: #8b5cf6; text-transform: uppercase; letter-spacing: 1px;">
                                Layer 2: Pattern Processing
                            </div>
                            <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">
                                ${layering.layer_2_processing?.description || 'Pattern Analysis & Connection Mapping'}
                            </div>
                        </div>
                    </div>
                    ${layering.layer_2_processing ? `
                    <div style="margin-left: 48px; display: grid; gap: 12px;">
                        ${layering.layer_2_processing.connected_accounts !== undefined ? `
                        <div style="padding: 12px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3);">
                            <div style="font-size: 11px; color: #a78bfa; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                                Connected Accounts
                            </div>
                            <div style="font-size: 20px; font-weight: 800; color: #8b5cf6;">
                                ${layering.layer_2_processing.connected_accounts}
                            </div>
                        </div>
                        ` : ''}
                        ${layering.layer_2_processing.temporal_patterns && layering.layer_2_processing.temporal_patterns.length > 0 ? `
                        <div>
                            <div style="font-size: 11px; color: #a78bfa; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
                                Temporal Patterns
                            </div>
                            ${layering.layer_2_processing.temporal_patterns.map(p => `
                                <div style="padding: 8px 12px; background: rgba(139, 92, 246, 0.1); border-left: 2px solid #a78bfa; margin-bottom: 6px; border-radius: 6px; font-size: 13px; color: #e5e7eb;">
                                    • ${p}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                        ${layering.layer_2_processing.amount_patterns && layering.layer_2_processing.amount_patterns.length > 0 ? `
                        <div>
                            <div style="font-size: 11px; color: #a78bfa; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
                                Amount Patterns
                            </div>
                            ${layering.layer_2_processing.amount_patterns.map(p => `
                                <div style="padding: 8px 12px; background: rgba(139, 92, 246, 0.1); border-left: 2px solid #a78bfa; margin-bottom: 6px; border-radius: 6px; font-size: 13px; color: #e5e7eb;">
                                    • ${p}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                    ` : '<div style="margin-left: 48px; color: #6b7280; font-size: 13px;">No processing data available</div>'}
                </div>
                
                <!-- Layer 3 -->
                <div style="background: rgba(234, 88, 12, 0.08); 
                            border-left: 4px solid #ea580c; 
                            padding: 20px; 
                            border-radius: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <div style="background: rgba(234, 88, 12, 0.2); 
                                    color: #ea580c; 
                                    width: 36px; 
                                    height: 36px; 
                                    border-radius: 10px; 
                                    display: flex; 
                                    align-items: center; 
                                    justify-content: center; 
                                    font-weight: 800; 
                                    font-size: 18px;
                                    border: 2px solid #ea580c;">
                            3
                        </div>
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 1px;">
                                Layer 3: Integration Analysis
                            </div>
                            <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">
                                ${layering.layer_3_integration?.description || 'Threat Assessment & Risk Integration'}
                            </div>
                        </div>
                    </div>
                    ${layering.layer_3_integration ? `
                    <div style="margin-left: 48px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                        ${layering.layer_3_integration.threat_level ? `
                        <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 10px; border: 2px solid rgba(239, 68, 68, 0.3); text-align: center;">
                            <div style="font-size: 10px; color: #fca5a5; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">
                                Threat Level
                            </div>
                            <div style="font-size: 18px; font-weight: 800; color: #ef4444; text-transform: uppercase;">
                                ${layering.layer_3_integration.threat_level}
                            </div>
                        </div>
                        ` : ''}
                        ${layering.layer_3_integration.geolocation_risk ? `
                        <div style="padding: 16px; background: rgba(251, 146, 60, 0.1); border-radius: 10px; border: 2px solid rgba(251, 146, 60, 0.3); text-align: center;">
                            <div style="font-size: 10px; color: #fdba74; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">
                                Geo Risk
                            </div>
                            <div style="font-size: 18px; font-weight: 800; color: #fb923c; text-transform: uppercase;">
                                ${layering.layer_3_integration.geolocation_risk}
                            </div>
                        </div>
                        ` : ''}
                        ${layering.layer_3_integration.pattern_match_confidence !== undefined ? `
                        <div style="padding: 16px; background: rgba(139, 92, 246, 0.1); border-radius: 10px; border: 2px solid rgba(139, 92, 246, 0.3); text-align: center;">
                            <div style="font-size: 10px; color: #c4b5fd; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">
                                Confidence
                            </div>
                            <div style="font-size: 18px; font-weight: 800; color: #8b5cf6;">
                                ${(layering.layer_3_integration.pattern_match_confidence * 100).toFixed(1)}%
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    ` : '<div style="margin-left: 48px; color: #6b7280; font-size: 13px;">No integration data available</div>'}
                </div>
            </div>
        `;
    }

    displayLayeringSummary(summary) {
        // Display layering summary in the info panel with VISUAL CHARTS
        const infoContainer = document.getElementById('timeline-info');
        if (!infoContainer) return;
        
        // Remove any existing layering summary to prevent duplicates
        const existing = infoContainer.querySelectorAll('.layering-summary');
        existing.forEach(el => el.remove());
        
        const total = summary.total_transactions;
        const criticalPct = (summary.risk_distribution.critical / total * 100).toFixed(1);
        const mediumPct = (summary.risk_distribution.medium / total * 100).toFixed(1);
        const lowPct = (summary.risk_distribution.low / total * 100).toFixed(1);
        
        const layer1Pct = (summary.layering_effectiveness.layer_1_detection_rate * 100).toFixed(1);
        const layer2Pct = (summary.layering_effectiveness.layer_2_processing_rate * 100).toFixed(1);
        const layer3Pct = (summary.layering_effectiveness.layer_3_integration_rate * 100).toFixed(1);
        
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'layering-summary';
        summaryDiv.innerHTML = `
            <div class="bg-[#1a1a2e]/80 backdrop-blur-sm rounded-2xl p-8 border-2 border-[#00CED1]/20 mb-8">
                <div class="text-center mb-8">
                    <h4 class="text-2xl font-bold text-[#00CED1] uppercase tracking-wide mb-4">
                        Transaction Analysis Overview
                    </h4>
                    <p class="text-sm text-gray-400 uppercase tracking-wide">Visual risk distribution and detection performance metrics</p>
                </div>
                
                <!-- Risk Distribution Stacked Bar Chart -->
                <div class="mb-8">
                    <h5 class="text-lg font-semibold text-[#00CED1] uppercase tracking-wide mb-4">Risk Distribution</h5>
                    <div class="relative h-20 bg-[#0a0a0f]/60 rounded-xl overflow-hidden border-2 border-[#00CED1]/20 mb-4">
                        <!-- Critical segment -->
                        <div class="absolute left-0 top-0 h-full bg-gradient-to-r from-[#FF3333] to-[#E62E2E] flex items-center justify-center transition-all duration-1000" 
                             style="width: ${criticalPct}%">
                            ${parseFloat(criticalPct) > 10 ? `
                                <div class="text-center px-2">
                                    <div class="text-lg font-bold text-white">${summary.risk_distribution.critical}</div>
                                    <div class="text-xs text-white/90 uppercase">Critical</div>
                                </div>
                            ` : ''}
                        </div>
                        <!-- Medium segment -->
                        <div class="absolute top-0 h-full bg-gradient-to-r from-[#FFB800] to-[#FF8C00] flex items-center justify-center transition-all duration-1000 delay-200" 
                             style="left: ${criticalPct}%; width: ${mediumPct}%">
                            ${parseFloat(mediumPct) > 10 ? `
                                <div class="text-center px-2">
                                    <div class="text-lg font-bold text-[#0a0a0f]">${summary.risk_distribution.medium}</div>
                                    <div class="text-xs text-[#0a0a0f]/90 uppercase">Medium</div>
                                </div>
                            ` : ''}
                        </div>
                        <!-- Low segment -->
                        <div class="absolute top-0 h-full bg-gradient-to-r from-[#00CED1] to-[#20B2AA] flex items-center justify-center transition-all duration-1000 delay-400" 
                             style="left: ${parseFloat(criticalPct) + parseFloat(mediumPct)}%; width: ${lowPct}%">
                            ${parseFloat(lowPct) > 10 ? `
                                <div class="text-center px-2">
                                    <div class="text-lg font-bold text-[#0a0a0f]">${summary.risk_distribution.low}</div>
                                    <div class="text-xs text-[#0a0a0f]/90 uppercase">Low</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <!-- Legend -->
                    <div class="grid grid-cols-3 gap-3 text-sm mb-6">
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded bg-gradient-to-r from-[#FF3333] to-[#E62E2E]"></div>
                            <span class="text-gray-300">Critical <span class="text-[#FF3333] font-semibold">(${criticalPct}%)</span></span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded bg-gradient-to-r from-[#FFB800] to-[#FF8C00]"></div>
                            <span class="text-gray-300">Medium <span class="text-[#FFB800] font-semibold">(${mediumPct}%)</span></span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded bg-gradient-to-r from-[#00CED1] to-[#20B2AA]"></div>
                            <span class="text-gray-300">Low Risk <span class="text-[#00CED1] font-semibold">(${lowPct}%)</span></span>
                        </div>
                    </div>
                </div>
                
                <!-- Metric Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div class="bg-[#00CED1]/10 border-2 border-[#00CED1]/30 rounded-xl p-4 relative overflow-hidden">
                        <div class="relative z-10">
                            <div class="text-3xl font-bold text-[#00CED1] mb-1">${summary.total_transactions}</div>
                            <div class="text-xs text-gray-400 uppercase tracking-wide">Total</div>
                        </div>
                        <div class="absolute bottom-0 right-0 w-16 h-16 bg-[#00CED1]/10 rounded-tl-full"></div>
                    </div>
                    <div class="bg-[#FF3333]/10 border-2 border-[#FF3333]/30 rounded-xl p-4 relative overflow-hidden">
                        <div class="relative z-10">
                            <div class="text-3xl font-bold text-[#FF3333] mb-1">${summary.risk_distribution.critical}</div>
                            <div class="text-xs text-gray-400 uppercase tracking-wide">Critical</div>
                        </div>
                        <div class="absolute bottom-2 right-2 flex gap-1">
                            <div class="w-1 bg-[#FF3333]/30" style="height: 4px"></div>
                            <div class="w-1 bg-[#FF3333]/30" style="height: 8px"></div>
                            <div class="w-1 bg-[#FF3333]/30" style="height: 12px"></div>
                            <div class="w-1 bg-[#FF3333]/30" style="height: 16px"></div>
                            <div class="w-1 bg-[#FF3333]/30" style="height: 20px"></div>
                        </div>
                    </div>
                    <div class="bg-[#FFB800]/10 border-2 border-[#FFB800]/30 rounded-xl p-4">
                        <div class="text-3xl font-bold text-[#FFB800] mb-1">${summary.risk_distribution.medium}</div>
                        <div class="text-xs text-gray-400 uppercase tracking-wide">Medium</div>
                    </div>
                    <div class="bg-white/5 border-2 border-white/10 rounded-xl p-4">
                        <div class="text-3xl font-bold text-white mb-1">${summary.risk_distribution.low}</div>
                        <div class="text-xs text-gray-400 uppercase tracking-wide">Low Risk</div>
                    </div>
                </div>
                
                <!-- Detection Effectiveness with Progress Bars -->
                <div>
                    <h5 class="text-lg font-semibold text-[#00CED1] uppercase tracking-wide mb-4">Detection Effectiveness</h5>
                    <div class="space-y-4">
                        <!-- Layer 1 -->
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-sm text-gray-300 font-medium">Layer 1: Pattern Recognition</span>
                                <span class="text-sm text-[#00CED1] font-bold">${layer1Pct}%</span>
                            </div>
                            <div class="h-3 bg-[#0a0a0f]/60 rounded-full overflow-hidden border border-[#00CED1]/20">
                                <div class="h-full bg-gradient-to-r from-[#00CED1] to-[#20B2AA] transition-all duration-1000" 
                                     style="width: ${layer1Pct}%"></div>
                            </div>
                        </div>
                        <!-- Layer 2 -->
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-sm text-gray-300 font-medium">Layer 2: Behavioral Analysis</span>
                                <span class="text-sm text-[#00CED1] font-bold">${layer2Pct}%</span>
                            </div>
                            <div class="h-3 bg-[#0a0a0f]/60 rounded-full overflow-hidden border border-[#00CED1]/20">
                                <div class="h-full bg-gradient-to-r from-[#00CED1] to-[#20B2AA] transition-all duration-1000 delay-200" 
                                     style="width: ${layer2Pct}%"></div>
                            </div>
                        </div>
                        <!-- Layer 3 -->
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-sm text-gray-300 font-medium">Layer 3: Risk Assessment</span>
                                <span class="text-sm text-[#00CED1] font-bold">${layer3Pct}%</span>
                            </div>
                            <div class="h-3 bg-[#0a0a0f]/60 rounded-full overflow-hidden border border-[#00CED1]/20">
                                <div class="h-full bg-gradient-to-r from-[#00CED1] to-[#20B2AA] transition-all duration-1000 delay-400" 
                                     style="width: ${layer3Pct}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        infoContainer.insertBefore(summaryDiv, infoContainer.firstChild);
    }

    showSearchModal() {
        if (this.searchModal) {
            this.searchModal.classed('hidden', false);
        }
    }

    hideSearchModal() {
        if (this.searchModal) {
            this.searchModal.classed('hidden', true);
        }
    }

    showNetworkOverview() {
        if (!this.networkOverviewModal || !this.data || this.data.length === 0) {
            showNotification('No network data available to display', 'warning');
            return;
        }

        console.log('🕸️ CHRONOS: Opening network overview modal');
        
        // Show the modal
        this.networkOverviewModal.classed('hidden', false);
        
        // Clear existing network overview content
        const content = this.networkOverviewModal.select('.network-overview-content');
        content.selectAll('svg').remove();
        
        // Get the actual content dimensions
        const contentNode = content.node();
        const contentRect = contentNode.getBoundingClientRect();
        const modalWidth = contentRect.width - 40; // Account for padding
        const modalHeight = contentRect.height - 40; // Account for padding
        
        const overviewSvg = content
            .append('svg')
            .attr('class', 'network-overview-svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${modalWidth} ${modalHeight}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('background', 'linear-gradient(135deg, rgba(10, 10, 15, 0.8) 0%, rgba(26, 26, 46, 0.6) 50%, rgba(22, 33, 62, 0.4) 100%)')
            .style('border-radius', '12px')
            .style('border', '1px solid rgba(0, 255, 135, 0.2)')
            .style('display', 'block');

        // Add zoom and pan behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                overviewGroup.attr('transform', event.transform);
            });

        overviewSvg.call(zoom);

        const overviewGroup = overviewSvg.append('g')
            .attr('class', 'network-overview-group');

        // Create network data if not exists
        if (!this.networkNodes || this.networkNodes.length === 0) {
            this.createNetworkData();
        }

        // Create a more spread out force simulation for overview
        this.overviewSimulation = d3.forceSimulation(this.networkNodes)
            .force('link', d3.forceLink(this.networkLinks).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-800))
            .force('center', d3.forceCenter(modalWidth / 2, modalHeight / 2))
            .force('collision', d3.forceCollide().radius(40))
            .force('x', d3.forceX(modalWidth / 2).strength(0.1))
            .force('y', d3.forceY(modalHeight / 2).strength(0.1));

        // Create links for overview
        const overviewLinks = overviewGroup.append('g')
            .attr('class', 'overview-links')
            .selectAll('line')
            .data(this.networkLinks)
            .enter().append('line')
            .attr('class', 'overview-link')
            .style('stroke', d => d.suspicious ? '#ef4444' : '#00ff87')
            .style('stroke-width', d => d.suspicious ? 6 : 3)
            .style('opacity', d => d.suspicious ? 0.9 : 0.6)
            .style('filter', d => d.suspicious ? 'drop-shadow(0 0 4px #ef4444)' : 'drop-shadow(0 0 2px #00ff87)');

        // Create nodes for overview
        const overviewNodes = overviewGroup.append('g')
            .attr('class', 'overview-nodes')
            .selectAll('circle')
            .data(this.networkNodes)
            .enter().append('circle')
            .attr('class', 'overview-node')
            .attr('r', d => d.type === 'account' ? (d.suspicious ? 25 : 20) : 15)
            .style('fill', d => {
                if (d.type === 'account') {
                    return d.suspicious ? '#ef4444' : '#00d4ff';
                }
                return '#00ff87';
            })
            .style('stroke', '#ffffff')
            .style('stroke-width', 4)
            .style('filter', d => {
                if (d.type === 'account') {
                    return d.suspicious ? 'drop-shadow(0 0 12px #ef4444)' : 'drop-shadow(0 0 10px #00d4ff)';
                }
                return 'drop-shadow(0 0 8px #00ff87)';
            })
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) this.overviewSimulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) this.overviewSimulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }))
            .on('click', (event, d) => this.selectOverviewNode(d))
            .on('mouseover', (event, d) => this.showOverviewTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());

        // Create labels for overview
        const overviewLabels = overviewGroup.append('g')
            .attr('class', 'overview-labels')
            .selectAll('text')
            .data(this.networkNodes)
            .enter().append('text')
            .attr('class', 'overview-label')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('fill', '#e2e8f0')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .style('text-shadow', '2px 2px 4px rgba(0, 0, 0, 0.8)')
            .style('filter', 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.3))')
            .text(d => d.label);

        // Update positions on simulation tick
        this.overviewSimulation.on('tick', () => {
            overviewLinks
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            overviewNodes
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            overviewLabels
                .attr('x', d => d.x)
                .attr('y', d => d.y + 6);
        });

        // Store references for control functions
        this.overviewZoom = zoom;
        this.overviewSvg = overviewSvg;
        this.overviewGroup = overviewGroup;
        
        showNotification('Network overview opened - Double-click nodes for details', 'info');
    }

    hideNetworkOverview() {
        if (this.networkOverviewModal) {
            this.networkOverviewModal.classed('hidden', true);
            
            // Stop simulation to improve performance
            if (this.overviewSimulation) {
                this.overviewSimulation.stop();
                this.overviewSimulation = null;
            }
            
            console.log('🕸️ CHRONOS: Closed network overview modal');
        }
    }

    selectOverviewNode(node) {
        console.log('🔍 Selected overview node:', node.id);
        
        // Highlight connected nodes and links
        this.overviewGroup.selectAll('.overview-node')
            .style('opacity', d => d === node || this.isConnected(d, node) ? 1 : 0.3)
            .style('stroke-width', d => d === node ? 6 : 4);
            
        this.overviewGroup.selectAll('.overview-link')
            .style('opacity', d => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                return (sourceId === node.id || targetId === node.id) ? 1 : 0.2;
            });

        // Show detailed info in a side panel
        this.showOverviewNodeDetails(node);
    }

    showOverviewNodeDetails(node) {
        // Remove existing details panel
        this.networkOverviewModal.selectAll('.node-details-panel').remove();
        
        const detailsPanel = this.networkOverviewModal.select('.network-overview-content')
            .append('div')
            .attr('class', 'node-details-panel')
            .style('position', 'absolute')
            .style('top', '20px')
            .style('left', '20px')
            .style('width', '300px')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('border', '2px solid #00ff87')
            .style('border-radius', '12px')
            .style('padding', '20px')
            .style('color', '#e2e8f0')
            .style('z-index', '10002')
            .style('box-shadow', '0 8px 32px rgba(0, 255, 135, 0.3)');

        const connectedAccounts = this.getConnectedAccounts(node);
        const suspiciousTransactions = node.transactions ? node.transactions.filter(tx => tx.suspicious_score > 0.5).length : 0;

        detailsPanel.html(`
            <div style="border-bottom: 2px solid #00ff87; padding-bottom: 12px; margin-bottom: 16px;">
                <h3 style="color: #00ff87; font-size: 18px; margin: 0 0 8px 0; font-weight: bold;">🔍 Node Analysis</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; color: #9ca3af; font-size: 18px; cursor: pointer;">✕</button>
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="color: #a0aec0; font-size: 12px; margin-bottom: 4px;">Account ID</div>
                <div style="color: #00d4ff; font-weight: 600; font-family: monospace; font-size: 14px; word-break: break-all;">${node.id}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                    <div style="color: #a0aec0; font-size: 12px; margin-bottom: 4px;">Node Type</div>
                    <div style="color: #e2e8f0; font-weight: 600;">${node.type || 'Account'}</div>
                </div>
                <div>
                    <div style="color: #a0aec0; font-size: 12px; margin-bottom: 4px;">Risk Level</div>
                    <div style="color: ${node.suspicious ? '#ef4444' : '#10b981'}; font-weight: 700;">${node.suspicious ? 'HIGH' : 'NORMAL'}</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                    <div style="color: #a0aec0; font-size: 12px; margin-bottom: 4px;">Total Transactions</div>
                    <div style="color: #00d4ff; font-weight: 600; font-size: 18px;">${node.transactions ? node.transactions.length : 0}</div>
                </div>
                <div>
                    <div style="color: #a0aec0; font-size: 12px; margin-bottom: 4px;">Suspicious</div>
                    <div style="color: ${suspiciousTransactions > 0 ? '#ef4444' : '#10b981'}; font-weight: 600; font-size: 18px;">${suspiciousTransactions}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="color: #a0aec0; font-size: 12px; margin-bottom: 8px;">Connected Accounts (${connectedAccounts.length})</div>
                <div style="max-height: 300px; overflow-y: auto; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px;">
                    ${connectedAccounts.map(acc => `
                        <div style="margin-bottom: 4px; font-size: 11px; color: #a0aec0; font-family: monospace;">
                            ${acc.id.substring(0, 16)}...
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <button onclick="window.TriNetra.getChronos().focusOnNode('${node.id}')" 
                    style="width: 100%; padding: 10px; background: rgba(0, 255, 135, 0.2); border: 1px solid #00ff87; border-radius: 8px; color: #00ff87; cursor: pointer; font-weight: 600;">
                🎯 Focus on This Node
            </button>
        `);
    }

    showOverviewTooltip(event, d) {
        const content = `
            <div style="font-weight: bold; color: #00ff87; margin-bottom: 8px;">🏦 ${d.type === 'account' ? 'Account' : 'Node'}</div>
            <div style="margin-bottom: 4px;"><strong>ID:</strong> ${d.id.substring(0, 12)}...</div>
            <div style="margin-bottom: 4px;"><strong>Transactions:</strong> ${d.transactions ? d.transactions.length : 0}</div>
            <div style="margin-bottom: 4px;"><strong>Risk Level:</strong> <span style="color: ${d.suspicious ? '#ef4444' : '#10b981'}">${d.suspicious ? 'HIGH' : 'NORMAL'}</span></div>
            <div style="margin-bottom: 4px;"><strong>Connections:</strong> ${this.getConnectedAccounts(d).length}</div>
            <div style="font-size: 11px; color: #a0aec0; margin-top: 8px;">💡 Click to select, Double-click for details</div>
        `;
            
        this.tooltip
            .style('opacity', 1)
            .html(content)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    zoomToFitNetwork() {
        if (!this.overviewSvg || !this.overviewZoom) return;
        
        // Calculate bounds of all nodes
        const nodes = this.networkNodes;
        if (!nodes || nodes.length === 0) return;
        
        const bounds = {
            minX: d3.min(nodes, d => d.x),
            maxX: d3.max(nodes, d => d.x),
            minY: d3.min(nodes, d => d.y),
            maxY: d3.max(nodes, d => d.y)
        };
        
        const width = this.overviewSvg.attr('width');
        const height = this.overviewSvg.attr('height');
        const padding = 100;
        
        const scale = Math.min(
            (width - padding) / (bounds.maxX - bounds.minX),
            (height - padding) / (bounds.maxY - bounds.minY)
        ) * 0.8;
        
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);
        
        this.overviewSvg.transition()
            .duration(750)
            .call(this.overviewZoom.transform, transform);
            
        showNotification('Network zoomed to fit view', 'info');
    }

    resetNetworkView() {
        if (!this.overviewSvg || !this.overviewZoom) return;
        
        this.overviewSvg.transition()
            .duration(500)
            .call(this.overviewZoom.transform, d3.zoomIdentity);
            
        // Reset node highlighting
        if (this.overviewGroup) {
            this.overviewGroup.selectAll('.overview-node')
                .style('opacity', 1)
                .style('stroke-width', 4);
            this.overviewGroup.selectAll('.overview-link')
                .style('opacity', d => d.suspicious ? 0.9 : 0.6);
        }
        
        // Remove details panel
        this.networkOverviewModal.selectAll('.node-details-panel').remove();
        
        showNotification('Network view reset', 'info');
    }

    focusOnNode(nodeId) {
        const node = this.networkNodes.find(n => n.id === nodeId);
        if (!node || !this.overviewSvg || !this.overviewZoom) return;
        
        const width = this.overviewSvg.attr('width');
        const height = this.overviewSvg.attr('height');
        
        const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(2)
            .translate(-node.x, -node.y);
        
        this.overviewSvg.transition()
            .duration(750)
            .call(this.overviewZoom.transform, transform);
            
        showNotification(`Focused on account ${nodeId.substring(0, 12)}...`, 'info');
    }

    updateStatusBar() {
        if (!this.data || this.data.length === 0) return;
        
        const suspiciousCount = this.data.filter(d => d.suspicious_score > 0.5).length;
        const criticalCount = this.data.filter(d => d.suspicious_score > 0.8).length;
        const threatPercentage = (suspiciousCount / this.data.length) * 100;
        
        let riskLevel, riskClass;
        if (criticalCount > 0) {
            riskLevel = 'HIGH';
            riskClass = 'critical';
        } else if (threatPercentage > 25) {
            riskLevel = 'MEDIUM';
            riskClass = 'medium';
        } else if (threatPercentage > 10) {
            riskLevel = 'LOW';
            riskClass = 'low';
        } else {
            riskLevel = 'MINIMAL';
            riskClass = 'low';
        }
        
        const totalElement = document.getElementById('total-count');
        const suspiciousElement = document.getElementById('suspicious-count');
        const riskElement = document.getElementById('risk-level');
        
        if (totalElement) totalElement.textContent = this.data.length;
        if (suspiciousElement) {
            suspiciousElement.textContent = suspiciousCount;
            suspiciousElement.className = suspiciousCount > 0 ? 'status-value alert' : 'status-value';
        }
        if (riskElement) {
            riskElement.textContent = riskLevel;
            riskElement.className = `status-value ${riskClass}`;
        }
    }
    
    showNoDataState() {
        const infoPanel = d3.select(`#${this.containerId} .timeline-info`);
        if (!infoPanel.empty()) {
            infoPanel.html(`
                <h4>[WARN] No Data Available</h4>
                <p>No transaction data found for the selected scenario. Please try a different filter or check the data source.</p>
            `);
        }
    }

    render() {
        if (!this.data.length) {
            this.showNoDataState();
            return;
        }

        // Update status bar
        this.updateStatusBar();

        // Clear any existing content first (important for view switching)
        this.g.selectAll('*').remove();
        
        // Re-create axes for timeline view
        this.g.append('g')
            .attr('class', 'x-axis timeline-axis')
            .attr('transform', `translate(0,${this.height - this.margin.bottom})`);

        this.g.append('g')
            .attr('class', 'y-axis timeline-axis');

        // Re-add axis labels
        this.g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left)
            .attr('x', 0 - (this.height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('fill', 'var(--text-gray)')
            .text('Transaction Amount (₹)');

        this.g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${this.width / 2}, ${this.height + this.margin.bottom - 5})`)
            .style('text-anchor', 'middle')
            .style('fill', 'var(--text-gray)')
            .text('Timeline');

        // Update scales
        this.xScale.domain(d3.extent(this.data, d => d.timestamp));
        this.yScale.domain([0, d3.max(this.data, d => d.amount)]);

        // Update axes
        this.g.select('.x-axis').call(this.xAxis);
        this.g.select('.y-axis').call(this.yAxis);

        // Render transactions (all hidden initially)
        this.renderTransactions();
        this.renderConnections();
        
        // Reset animation and ensure it starts paused
        this.currentFrame = 0;
        this.isPlaying = false;
        this.updateButtonStates();
        this.updateTimelineInfo();
        
        // Hide all transactions initially
        this.g.selectAll('.transaction-node').style('opacity', 0.1);
        this.g.selectAll('.transaction-link').style('opacity', 0.1);
        
        console.log('📈 CHRONOS: Timeline view rendered successfully');
    }

    renderTransactions() {
        const nodes = this.g.selectAll('.transaction-node')
            .data(this.data, d => d.id);

        // Remove old nodes
        nodes.exit().remove();

        // Add new nodes with enhanced styling and better visibility
        const nodeEnter = nodes.enter()
            .append('circle')
            .attr('class', d => `transaction-node ${d.suspicionLevel}`)
            .attr('r', 0)
            .attr('cx', d => this.xScale(d.timestamp))
            .attr('cy', d => this.yScale(d.amount))
            .style('fill', d => {
                if (d.suspicious_score > 0.8) return '#ff1744';      // Bright red for critical
                if (d.suspicious_score > 0.5) return '#ff9800';      // Bright orange for suspicious  
                return '#00e5ff';                                     // Bright cyan for normal
            })
            .style('stroke', d => {
                if (d.suspicious_score > 0.8) return '#ffffff';      // White border for critical
                if (d.suspicious_score > 0.5) return '#000000';      // Black border for suspicious
                return '#ffffff';                                     // White border for normal
            })
            .style('stroke-width', d => {
                if (d.suspicious_score > 0.8) return '4px';          // Thicker border for critical
                if (d.suspicious_score > 0.5) return '3px';          // Medium border for suspicious
                return '2px';                                         // Normal border
            })
            .style('opacity', 0)
            .style('cursor', 'pointer')
            .style('filter', d => {
                if (d.suspicious_score > 0.8) return 'drop-shadow(0 0 12px #ff1744) drop-shadow(0 0 20px rgba(255, 23, 68, 0.6))';
                if (d.suspicious_score > 0.5) return 'drop-shadow(0 0 10px #ff9800) drop-shadow(0 0 16px rgba(255, 152, 0, 0.4))';
                return 'drop-shadow(0 0 8px #00e5ff) drop-shadow(0 0 12px rgba(0, 229, 255, 0.3))';
            });

        // Update existing nodes with enhanced animations and better visibility
        nodes.merge(nodeEnter)
            .transition()
            .duration(500)
            .attr('cx', d => this.xScale(d.timestamp))
            .attr('cy', d => this.yScale(d.amount))
            .attr('r', d => {
                // Smaller, cleaner dots for better readability
                if (d.suspicious_score > 0.8) return 6;     // Small for critical
                if (d.suspicious_score > 0.5) return 5;     // Smaller for suspicious
                return 4;                                    // Smallest for normal
            })
            .style('fill', d => {
                if (d.suspicious_score > 0.8) return '#ff1744';
                if (d.suspicious_score > 0.5) return '#ff9800';
                return '#00e5ff';
            })
            .style('opacity', 0.9)
            .style('stroke-width', d => {
                if (d.suspicious_score > 0.8) return '2px';
                if (d.suspicious_score > 0.5) return '1.5px';
                return '1px';
            });

        // Add enhanced hover effects
        this.g.selectAll('.transaction-node')
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('r', d => {
                        // Slightly larger on hover but still small
                        if (d.suspicious_score > 0.8) return 8;     // Small hover for critical
                        if (d.suspicious_score > 0.5) return 7;     // Smaller hover for suspicious
                        return 6;                                    // Smallest hover for normal
                    })
                    .style('stroke-width', '3px')
                    .style('opacity', 1)
                    .style('filter', d => {
                        if (d.suspicious_score > 0.8) return 'drop-shadow(0 0 25px #ff1744) drop-shadow(0 0 35px rgba(255, 23, 68, 0.8))';
                        if (d.suspicious_score > 0.5) return 'drop-shadow(0 0 20px #ff9800) drop-shadow(0 0 30px rgba(255, 152, 0, 0.6))';
                        return 'drop-shadow(0 0 18px #00e5ff) drop-shadow(0 0 25px rgba(0, 229, 255, 0.5))';
                    });
                this.showTooltip(event, d);
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('r', d => {
                        // Return to small default sizes
                        if (d.suspicious_score > 0.8) return 6;
                        if (d.suspicious_score > 0.5) return 5;
                        return 4;
                    })
                    .style('stroke-width', d => {
                        if (d.suspicious_score > 0.8) return '2px';
                        if (d.suspicious_score > 0.5) return '1.5px';
                        return '1px';
                    })
                    .style('opacity', 0.9)
                    .style('filter', d => {
                        if (d.suspicious_score > 0.8) return 'drop-shadow(0 0 12px #ff1744) drop-shadow(0 0 20px rgba(255, 23, 68, 0.6))';
                        if (d.suspicious_score > 0.5) return 'drop-shadow(0 0 10px #ff9800) drop-shadow(0 0 16px rgba(255, 152, 0, 0.4))';
                        return 'drop-shadow(0 0 8px #00e5ff) drop-shadow(0 0 12px rgba(0, 229, 255, 0.3))';
                    });
                this.hideTooltip();
            })
            .on('click', (event, d) => this.selectTransaction(d));
    }

    renderConnections() {
        // Group transactions by account to show flow patterns
        const connections = [];
        const accountMap = new Map();

        this.data.forEach(tx => {
            if (!accountMap.has(tx.from_account)) {
                accountMap.set(tx.from_account, []);
            }
            if (!accountMap.has(tx.to_account)) {
                accountMap.set(tx.to_account, []);
            }
            
            accountMap.get(tx.from_account).push(tx);
            accountMap.get(tx.to_account).push(tx);
        });

        // Create connections for suspicious patterns
        this.data.forEach((tx, i) => {
            if (tx.suspicious_score > 0.7 && i < this.data.length - 1) {
                const nextTx = this.data[i + 1];
                if (tx.to_account === nextTx.from_account) {
                    connections.push({
                        source: tx,
                        target: nextTx,
                        suspicious: Math.max(tx.suspicious_score, nextTx.suspicious_score)
                    });
                }
            }
        });

        const links = this.g.selectAll('.transaction-link')
            .data(connections);

        links.exit().remove();

        links.enter()
            .append('line')
            .attr('class', 'transaction-link')
            .merge(links)
            .attr('x1', d => this.xScale(d.source.timestamp))
            .attr('y1', d => this.yScale(d.source.amount))
            .attr('x2', d => this.xScale(d.target.timestamp))
            .attr('y2', d => this.yScale(d.target.amount))
            .style('stroke', d => d.suspicious > 0.8 ? '#ef4444' : d.suspicious > 0.5 ? '#f59e0b' : 'rgba(0, 255, 135, 0.6)')
            .style('stroke-width', d => d.suspicious > 0.8 ? 5 : d.suspicious > 0.5 ? 3 : 2)
            .style('opacity', d => d.suspicious > 0.8 ? 0.9 : d.suspicious > 0.5 ? 0.7 : 0.4)
            .style('stroke-dasharray', d => d.suspicious > 0.8 ? 'none' : '6,4')
            .style('filter', d => d.suspicious > 0.8 ? 'drop-shadow(0 0 4px #ef4444)' : d.suspicious > 0.5 ? 'drop-shadow(0 0 3px #f59e0b)' : 'none');
    }

    showTooltip(event, d) {
        const suspicionScore = (d.suspicious_score * 100).toFixed(1);
        let riskClass = 'normal';
        if (d.suspicious_score > 0.8) riskClass = 'critical';
        else if (d.suspicious_score > 0.5) riskClass = 'suspicious';
        
        this.tooltip
            .style('opacity', 1)
            .html(`
                <div style="border-bottom: 2px solid #00ff87; padding-bottom: 8px; margin-bottom: 12px;">
                    <div style="color: #00ff87; font-weight: 700; font-size: 14px; margin-bottom: 4px;">💰 Transaction Details</div>
                    <div style="color: #a0aec0; font-size: 11px;">ID: ${d.id || d.transaction_id}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                    <div>
                        <div style="color: #4a5568; font-size: 11px; margin-bottom: 2px;">Amount</div>
                        <div style="color: #00d4ff; font-weight: 600; font-size: 15px;">${formatCurrency(d.amount)}</div>
                    </div>
                    <div>
                        <div style="color: #4a5568; font-size: 11px; margin-bottom: 2px;">Risk Level</div>
                        <div style="color: ${riskClass === 'critical' ? '#ef4444' : riskClass === 'suspicious' ? '#f59e0b' : '#10b981'}; font-weight: 700; font-size: 15px;">${suspicionScore}%</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <div style="color: #4a5568; font-size: 11px; margin-bottom: 4px;">⏰ Transaction Time</div>
                    <div style="color: #e2e8f0; font-size: 12px;">${formatDateTime(d.timestamp)}</div>
                </div>
                
                <div style="margin-bottom: 8px;">
                    <div style="color: #4a5568; font-size: 11px; margin-bottom: 4px;">🔄 Account Flow</div>
                    <div style="background: rgba(0, 255, 135, 0.1); border-radius: 6px; padding: 6px; font-size: 11px;">
                        <div style="color: #00ff87; margin-bottom: 2px;">📤 From: <span style="color: #e2e8f0; font-family: monospace;">${d.from_account}</span></div>
                        <div style="color: #00d4ff;">📥 To: <span style="color: #e2e8f0; font-family: monospace;">${d.to_account}</span></div>
                    </div>
                </div>
                
                ${d.scenario ? `<div style="background: rgba(168, 85, 247, 0.1); border-radius: 6px; padding: 6px; margin-top: 8px;">
                    <div style="color: #a855f7; font-size: 11px; font-weight: 600;">🔍 Scenario: ${d.scenario}</div>
                </div>` : ''}
            `)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        
        // Don't update info panel on hover - only show tooltip
    }

    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }

    selectTransaction(transaction) {
        // Highlight related transactions
        this.g.selectAll('.transaction-node')
            .classed('highlighted', false)
            .style('opacity', 0.3);

        this.g.selectAll('.transaction-node')
            .filter(d => d.from_account === transaction.from_account || 
                        d.to_account === transaction.to_account ||
                        d.id === transaction.id)
            .classed('highlighted', true)
            .style('opacity', 1);

        this.updateTimelineInfo(transaction);
    }

    updateTimelineInfo(selectedTransaction = null) {
        const infoPanel = d3.select(`#${this.containerId} .timeline-info`);
        if (infoPanel.empty()) return;

        if (selectedTransaction) {
            const suspicionScore = (selectedTransaction.suspicious_score * 100).toFixed(1);
            let riskLevel = 'Normal';
            let riskBadgeClass = 'bg-[#00CED1]/20 text-[#00CED1] border-[#00CED1]/40';
            let riskBarClass = 'from-[#00CED1] to-[#20B2AA]';
            
            if (selectedTransaction.suspicious_score > 0.8) {
                riskLevel = 'Critical';
                riskBadgeClass = 'bg-[#FF3333]/20 text-[#FF3333] border-[#FF3333]/40';
                riskBarClass = 'from-[#FF3333] to-[#E62E2E]';
            } else if (selectedTransaction.suspicious_score > 0.5) {
                riskLevel = 'Suspicious';
                riskBadgeClass = 'bg-[#FFB800]/20 text-[#FFB800] border-[#FFB800]/40';
                riskBarClass = 'from-[#FFB800] to-[#FF8C00]';
            }

            const transactionId = selectedTransaction.id || selectedTransaction.transaction_id || 'N/A';
            const scenario = selectedTransaction.scenario || 'Unknown';
            const patternType = selectedTransaction.pattern_type || 'Not specified';
            
            infoPanel.html(`
                <div class="bg-linear-to-br from-secondary/12 to-primary/12 rounded-2xl p-6 md:p-8 border border-secondary/35 shadow-xl">
                    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-6">
                        <div>
                            <h4 class="text-2xl font-bold text-white mb-2">Selected Transaction Analysis</h4>
                            <p class="text-sm text-gray-300">Detailed profile for the selected timeline event.</p>
                        </div>
                        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${riskBadgeClass}">
                            <span class="text-xs uppercase tracking-wider font-semibold">Risk</span>
                            <span class="text-sm font-bold">${riskLevel}</span>
                        </div>
                    </div>

                    <div class="mb-7">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs uppercase tracking-wider text-gray-400 font-semibold">Suspicion Score</span>
                            <span class="text-sm font-bold text-white">${suspicionScore}%</span>
                        </div>
                        <div class="h-3 bg-dark/65 rounded-full overflow-hidden border border-secondary/20">
                            <div class="h-full bg-linear-to-r ${riskBarClass} transition-all duration-700" style="width: ${suspicionScore}%"></div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div class="bg-dark/60 rounded-xl p-4 border border-secondary/25">
                            <div class="text-xs uppercase tracking-wider text-gray-400 mb-1">Transaction ID</div>
                            <div class="text-sm text-white font-mono break-all">${transactionId}</div>
                        </div>
                        <div class="bg-dark/60 rounded-xl p-4 border border-secondary/25">
                            <div class="text-xs uppercase tracking-wider text-gray-400 mb-1">Amount</div>
                            <div class="text-lg font-bold text-secondary">${formatCurrency(selectedTransaction.amount)}</div>
                        </div>
                        <div class="bg-dark/60 rounded-xl p-4 border border-secondary/25">
                            <div class="text-xs uppercase tracking-wider text-gray-400 mb-1">Date and Time</div>
                            <div class="text-sm text-white">${formatDateTime(selectedTransaction.timestamp)}</div>
                        </div>
                        <div class="bg-dark/60 rounded-xl p-4 border border-secondary/25">
                            <div class="text-xs uppercase tracking-wider text-gray-400 mb-1">Pattern Type</div>
                            <div class="text-sm text-white">${patternType}</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div class="bg-[#00CED1]/10 rounded-xl p-4 border border-[#00CED1]/30">
                            <div class="text-xs uppercase tracking-wider text-[#00CED1] mb-1">From Account</div>
                            <div class="text-sm text-white font-mono break-all">${selectedTransaction.from_account || 'N/A'}</div>
                        </div>
                        <div class="bg-[#20B2AA]/10 rounded-xl p-4 border border-[#20B2AA]/30">
                            <div class="text-xs uppercase tracking-wider text-[#20B2AA] mb-1">To Account</div>
                            <div class="text-sm text-white font-mono break-all">${selectedTransaction.to_account || 'N/A'}</div>
                        </div>
                    </div>

                    <div class="bg-dark/55 rounded-xl p-4 border border-secondary/20">
                        <div class="text-xs uppercase tracking-wider text-gray-400 mb-1">Scenario</div>
                        <div class="text-sm text-white">${scenario}</div>
                    </div>
                </div>
            `);
        } else {
            // Show guidance panel when no transaction is selected
            infoPanel.html(`
                <div class="bg-gradient-to-br from-secondary/10 to-primary/10 rounded-2xl p-8 border border-secondary/30 shadow-xl">
                    <div class="text-center mb-8">
                        <h4 class="text-3xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent mb-4">
                            Timeline View - ${this.currentScenario.toUpperCase()}
                        </h4>
                        <p class="text-lg text-gray-300 leading-relaxed">Explore transaction behavior through the interactive timeline.</p>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div class="bg-dark/60 rounded-xl p-6 border border-secondary/20">
                            <div class="text-sm text-secondary font-semibold uppercase tracking-wide mb-2">Select</div>
                            <p class="text-sm text-gray-300 leading-relaxed">Click any timeline point to inspect transaction-level details and account flow.</p>
                        </div>
                        <div class="bg-dark/60 rounded-xl p-6 border border-secondary/20">
                            <div class="text-sm text-secondary font-semibold uppercase tracking-wide mb-2">Navigate</div>
                            <p class="text-sm text-gray-300 leading-relaxed">Use timeline controls and playback speed to trace events over time.</p>
                        </div>
                        <div class="bg-dark/60 rounded-xl p-6 border border-secondary/20">
                            <div class="text-sm text-secondary font-semibold uppercase tracking-wide mb-2">Investigate</div>
                            <p class="text-sm text-gray-300 leading-relaxed">Switch between timeline and network modes to follow linked activities.</p>
                        </div>
                    </div>
                    
                    <div class="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-400/30 text-center">
                        <div class="text-blue-400 text-lg font-semibold mb-2">Interactive Analysis</div>
                        <p class="text-gray-300 text-sm leading-relaxed">Click on any transaction point in the timeline to see detailed analysis information including risk factors, ML confidence scores, and regulatory compliance indicators.</p>
                    </div>
                </div>
            `);
        }
    }

    play() {
        if (this.isPlaying || !this.data.length) return;
        
        this.isPlaying = true;
        
        // Update button states
        this.updateButtonStates();
        
        this.animate();
        showNotification('Timeline animation started', 'info');
    }

    pause() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Update button states
        this.updateButtonStates();
        
        showNotification('Timeline animation paused', 'info');
    }

    animate() {
        if (!this.isPlaying || !this.data.length) {
            console.log(`⏸️ CHRONOS: Animation stopped. Playing: ${this.isPlaying}, Data length: ${this.data.length}`);
            return;
        }

        // Calculate step size based on speed - slower speeds show fewer transactions per frame
        const step = Math.max(1, Math.floor(this.speed / 5));
        const visibleCount = Math.min(this.currentFrame * step, this.data.length);
        
        console.log(`🎬 CHRONOS: Frame ${this.currentFrame}, showing ${visibleCount}/${this.data.length} transactions`);
        
        // Animate transaction nodes
        const nodes = this.g.selectAll('.transaction-node');
        
        nodes.style('opacity', (d, i) => {
            if (!d) return 0; // Handle undefined data
            
            if (i < visibleCount) {
                // Add entrance animation for new nodes
                if (i >= (this.currentFrame - 1) * step && i < this.currentFrame * step) {
                    // Use d3.select with the current element instead of 'this'
                    d3.select(nodes.nodes()[i]).transition().duration(500)
                        .attr('r', d => {
                            if (!d) return 4;
                            return d.suspicionLevel === 'critical' ? 8 : d.suspicionLevel === 'suspicious' ? 6 : 4;
                        })
                        .style('opacity', 0.8);
                }
                return 0.8;
            }
            return 0.1;
        });

        // Animate transaction links
        this.g.selectAll('.transaction-link')
            .style('opacity', (d, i) => i < visibleCount ? 0.6 : 0.1);

        // Update info panel with current progress
        this.updateAnimationProgress(visibleCount);

        this.currentFrame++;
        
        if (visibleCount < this.data.length) {
            this.animationId = requestAnimationFrame(() => {
                setTimeout(() => this.animate(), Math.max(50, 150 - this.speed)); // Improved speed control
            });
        } else {
            this.isPlaying = false;
            this.updateButtonStates();
            console.log('[SUCCESS] CHRONOS: Animation completed');
            showNotification('Timeline animation completed', 'success');
            // Reset for replay
            this.currentFrame = 0;
        }
    }

    updateAnimationProgress(visibleCount) {
        if (!this.data || this.data.length === 0) {
            console.log('[WARN] CHRONOS: No data available for progress update');
            return;
        }
        
        const progress = Math.round((visibleCount / this.data.length) * 100);
        const infoContainer = document.getElementById('timeline-info');
        
        if (infoContainer && this.isPlaying) {
            const progressDiv = infoContainer.querySelector('.animation-progress') || document.createElement('div');
            progressDiv.className = 'animation-progress';
            progressDiv.innerHTML = `
                <h4>🎬 Animation Progress: ${progress}%</h4>
                <div style="background: var(--bg-secondary); border-radius: 10px; height: 20px; margin: 10px 0;">
                    <div style="background: linear-gradient(90deg, var(--accent-green), var(--accent-blue)); 
                               height: 100%; border-radius: 10px; width: ${progress}%; transition: width 0.3s ease;"></div>
                </div>
                <p>📊 Showing ${visibleCount} of ${this.data.length} transactions</p>
                <p>⚡ Speed: ${this.speed}x | Scenario: ${this.currentScenario}</p>
            `;
            if (!infoContainer.querySelector('.animation-progress')) {
                infoContainer.insertBefore(progressDiv, infoContainer.firstChild);
            }
        }
    }

    switchView(mode) {
        if (this.viewMode === mode) return;
        
        this.pause(); // Stop animation when switching views
        this.viewMode = mode;
        
        // Update button active states (works with both React class-based and ID-based buttons)
        document.querySelectorAll('.view-button').forEach(btn => btn.classList.remove('active'));
        
        // Clear the current visualization before switching
        this.clearVisualization();
        
        if (mode === 'timeline') {
            this.renderTimeline();
        } else if (mode === 'network') {
            this.renderNetwork();
        }
        
        showNotification(`Switched to ${mode} view`, 'info');
    }

    setNetworkRiskFilter(filter = 'all') {
        const allowed = new Set(['all', 'low', 'high']);
        if (!allowed.has(filter)) return;

        this.networkRiskFilter = filter;

        if (this.viewMode === 'network') {
            this.renderNetwork();
        }
    }

    getFilteredNetworkTransactions() {
        if (this.networkRiskFilter === 'all') return this.data;

        return this.data.filter((tx) => {
            const score = tx.suspicious_score || 0;
            if (this.networkRiskFilter === 'low') return score <= 0.5;
            if (this.networkRiskFilter === 'high') return score > 0.5;
            return true;
        });
    }

    renderNetwork() {
        if (!this.data.length) {
            console.log('[WARN] CHRONOS: No data available for network view');
            return;
        }

        const filteredTransactions = this.getFilteredNetworkTransactions();

        if (!filteredTransactions.length) {
            this.g.selectAll('*').remove();
            this.networkNodes = [];
            this.networkLinks = [];
            showNotification('No transactions available for this network filter', 'warning');
            return;
        }
        
        console.log(`🕸️ CHRONOS: Rendering network view with ${filteredTransactions.length} transactions`);
        
        // Clear existing visualization
        this.g.selectAll('*').remove();

        // Add zoom/pan to the SVG for this view
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => this.g.attr('transform', event.transform));
        this.svg.call(zoom);
        this.svg.call(zoom.transform, d3.zoomIdentity.translate(this.margin.left, this.margin.top));
        
        // Create network data from transactions
        this.createNetworkData(filteredTransactions);
        
        // Set up force simulation
        this.simulation = d3.forceSimulation(this.networkNodes)
            .force('link', d3.forceLink(this.networkLinks).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(30));

        // Create links with enhanced styling
        const link = this.g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(this.networkLinks)
            .enter().append('line')
            .attr('class', 'network-link')
            .style('stroke', d => d.suspicious ? '#ef4444' : '#00ff87')
            .style('stroke-width', d => d.suspicious ? 4 : 2)
            .style('opacity', d => d.suspicious ? 0.8 : 0.6)
            .style('filter', d => d.suspicious ? 'drop-shadow(0 0 3px #ef4444)' : 'drop-shadow(0 0 2px #00ff87)');

        // Create nodes with enhanced styling and better visibility
        const node = this.g.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(this.networkNodes)
            .enter().append('circle')
            .attr('class', 'network-node')
            .attr('r', d => d.type === 'account' ? (d.suspicious ? 18 : 14) : 10)
            .style('fill', d => {
                if (d.type === 'account') {
                    return d.suspicious ? '#ef4444' : '#00d4ff';
                }
                return '#00ff87'; // Default color for non-account nodes
            })
            .style('stroke', '#ffffff')
            .style('stroke-width', 3)
            .style('filter', d => {
                if (d.type === 'account') {
                    return d.suspicious ? 'drop-shadow(0 0 8px #ef4444)' : 'drop-shadow(0 0 6px #00d4ff)';
                }
                return 'drop-shadow(0 0 4px #00ff87)';
            })
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) this.simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) this.simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }))
            .on('click', (event, d) => this.selectNetworkNode(d))
            .on('dblclick', (event, d) => this.showNetworkOverview())
            .on('contextmenu', (event, d) => {
                event.preventDefault();
                this.showNetworkOverview();
            })
            .on('mouseover', (event, d) => this.showNetworkTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());

        // Add enhanced labels with better readability
        const label = this.g.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(this.networkNodes)
            .enter().append('text')
            .attr('class', 'network-label')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', '#e2e8f0')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .style('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.8)')
            .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))')
            .text(d => d.label);

        // Update positions on simulation tick
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            label
                .attr('x', d => d.x)
                .attr('y', d => d.y + 5);
        });
    }

    createNetworkData(transactions = this.data) {
        // Create account nodes and transaction links
        const accounts = new Map();
        const links = [];
        
        console.log(`🔧 CHRONOS: Creating network data from ${transactions.length} transactions`);
        
        transactions.forEach(tx => {
            // Create or update account nodes
            if (!accounts.has(tx.from_account)) {
                accounts.set(tx.from_account, {
                    id: tx.from_account,
                    label: tx.from_account.substring(0, 8) + '...',
                    type: 'account',
                    suspicious: false,
                    transactions: []
                });
            }
            
            if (!accounts.has(tx.to_account)) {
                accounts.set(tx.to_account, {
                    id: tx.to_account,
                    label: tx.to_account.substring(0, 8) + '...',
                    type: 'account',
                    suspicious: false,
                    transactions: []
                });
            }
            
            // Update suspicion levels
            if (tx.suspicious_score > 0.7) {
                accounts.get(tx.from_account).suspicious = true;
                accounts.get(tx.to_account).suspicious = true;
            }
            
            accounts.get(tx.from_account).transactions.push(tx);
            accounts.get(tx.to_account).transactions.push(tx);
            
            // Create link
            links.push({
                source: tx.from_account,
                target: tx.to_account,
                suspicious: tx.suspicious_score > 0.7,
                amount: tx.amount,
                transaction: tx
            });
        });
        
        this.networkNodes = Array.from(accounts.values());
        this.networkLinks = links;
        
        console.log(`🕸️ CHRONOS: Created network with ${this.networkNodes.length} nodes and ${this.networkLinks.length} links`);
    }

    clearVisualization() {
        // Stop any ongoing animations
        this.pause();
        
        // Clear all SVG content when switching views
        if (this.g) {
            this.g.selectAll('*').remove();
        }
        
        // Stop and clear any D3 force simulations
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        
        // Reset stored selections and state
        this.selectedNode = null;
        this.currentFrame = 0;
        
        // Clear any animation intervals
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Reset button states
        this.isPlaying = false;
        this.updateButtonStates();
        
        console.log('🧹 CHRONOS: Cleared visualization completely for view switch');
    }

    renderTimeline() {
        console.log('📈 CHRONOS: Rendering timeline view');
        
        // Reset zoom transform when returning to timeline
        this.svg.on('.zoom', null);
        this.g.attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Clear any network-specific selections
        this.clearSelection();
        
        // Render the timeline
        this.render(); // Use existing timeline render method
    }

    selectNetworkNode(node) {
        this.selectedNode = node;
        
        // Highlight connected nodes and links
        this.g.selectAll('.network-node')
            .style('opacity', d => d === node || this.isConnected(d, node) ? 1 : 0.3);
            
        this.g.selectAll('.network-link')
            .style('opacity', d => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                return (sourceId === node.id || targetId === node.id) ? 1 : 0.1;
            });
            
        // Update info panel
        this.updateNetworkInfo(node);
    }

    isConnected(nodeA, nodeB) {
        return this.networkLinks.some(link => {
            // Handle both string IDs and node objects
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return (sourceId === nodeA.id && targetId === nodeB.id) ||
                   (sourceId === nodeB.id && targetId === nodeA.id);
        });
    }

    showNetworkTooltip(event, d) {
        const content = d.type === 'account' 
            ? `
                <div style="font-weight: bold; color: #00ff87; margin-bottom: 8px;">🏦 Account Node</div>
                <div style="margin-bottom: 4px;"><strong>ID:</strong> ${d.id.substring(0, 12)}...</div>
                <div style="margin-bottom: 4px;"><strong>Transactions:</strong> ${d.transactions.length}</div>
                <div style="margin-bottom: 4px;"><strong>Suspicious:</strong> <span style="color: ${d.suspicious ? '#ef4444' : '#10b981'}">${d.suspicious ? 'Yes' : 'No'}</span></div>
                <div style="margin-bottom: 4px;"><strong>Connections:</strong> ${this.getConnectedAccounts(d).length}</div>
                <div style="font-size: 11px; color: #a0aec0; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
                    💡 <strong>Click:</strong> Select node<br/>
                    🖱️ <strong>Double-click:</strong> Open full network<br/>
                    🖱️ <strong>Right-click:</strong> Network overview
                </div>
            `
            : `
                <div style="font-weight: bold; color: #00ff87; margin-bottom: 8px;">🔗 Network Node</div>
                <div style="margin-bottom: 4px;"><strong>Type:</strong> ${d.type || 'Unknown'}</div>
                <div style="font-size: 11px; color: #a0aec0; margin-top: 8px;">💡 Double-click for full network view</div>
            `;
            
        this.tooltip
            .style('opacity', 1)
            .html(content)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    updateNetworkInfo(node) {
        const infoContainer = document.getElementById('timeline-info');
        if (!infoContainer || !node) return;

        if (!document.getElementById('chronos-network-info-styles')) {
            const style = document.createElement('style');
            style.id = 'chronos-network-info-styles';
            style.textContent = `
                .chronos-network-panel {
                    background: rgba(15, 20, 36, 0.95);
                    border: 1px solid rgba(0, 206, 209, 0.3);
                    border-radius: 14px;
                    padding: 18px;
                }
                .chronos-network-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 14px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                }
                .chronos-network-metrics {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 12px;
                    margin-top: 12px;
                }
                .chronos-network-metric {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 10px;
                    padding: 12px;
                }
                .chronos-network-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 16px;
                }
                .chronos-network-btn {
                    min-height: 42px;
                    padding: 0 16px;
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.25);
                    background: rgba(255, 255, 255, 0.06);
                    color: #e5e7eb;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .chronos-network-btn:hover {
                    background: rgba(255, 255, 255, 0.12);
                    transform: translateY(-1px);
                }
                .chronos-network-btn:focus-visible {
                    outline: 2px solid #00d4ff;
                    outline-offset: 2px;
                }
                .chronos-network-btn-primary {
                    background: rgba(0, 255, 135, 0.18);
                    border-color: rgba(0, 255, 135, 0.6);
                    color: #00ff87;
                }
                .chronos-network-btn-primary:hover {
                    background: rgba(0, 255, 135, 0.28);
                }
                .chronos-risk-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 5px 10px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.6px;
                    text-transform: uppercase;
                }
                @media (max-width: 768px) {
                    .chronos-network-metrics {
                        grid-template-columns: 1fr;
                    }
                    .chronos-network-actions .chronos-network-btn {
                        width: 100%;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        const connectedAccounts = this.getConnectedAccounts(node);
        const txCount = node.transactions ? node.transactions.length : 0;
        const riskLabel = node.suspicious ? 'High Risk' : 'Normal Risk';
        const riskColor = node.suspicious ? '#ef4444' : '#22c55e';
        const riskBg = node.suspicious ? 'rgba(239, 68, 68, 0.18)' : 'rgba(34, 197, 94, 0.18)';
        const typeLabel = (node.type || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const nodeIdDisplay = String(node.id || 'N/A');
        const shortNodeId = nodeIdDisplay.length > 24 ? `${nodeIdDisplay.slice(0, 12)}...${nodeIdDisplay.slice(-8)}` : nodeIdDisplay;
        const connectionsPreview = connectedAccounts.slice(0, 3).map((acc) => acc.id).join(', ');

        infoContainer.innerHTML = `
            <div class="chronos-network-panel" role="region" aria-label="Network Node Details">
                <div class="chronos-network-header">
                    <div>
                        <h4 style="margin: 0; font-size: 18px; color: #00d4ff; font-weight: 700;">Network Node Details</h4>
                        <p style="margin: 6px 0 0 0; font-size: 13px; color: #9ca3af;">Selected account overview and quick actions</p>
                    </div>
                    <span class="chronos-risk-pill" style="color: ${riskColor}; border: 1px solid ${riskColor}; background: ${riskBg};">${riskLabel}</span>
                </div>

                <div style="background: rgba(0, 212, 255, 0.08); border: 1px solid rgba(0, 212, 255, 0.28); border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                    <div style="font-size: 11px; color: #7dd3fc; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Node Identifier</div>
                    <div title="${nodeIdDisplay}" style="font-size: 16px; color: #ffffff; font-weight: 700; word-break: break-all;">${shortNodeId}</div>
                </div>

                <div class="chronos-network-metrics">
                    <div class="chronos-network-metric">
                        <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Node Type</div>
                        <div style="font-size: 16px; color: #ffffff; font-weight: 700;">${typeLabel}</div>
                    </div>
                    <div class="chronos-network-metric">
                        <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Transactions</div>
                        <div style="font-size: 16px; color: #ffffff; font-weight: 700;">${txCount}</div>
                    </div>
                    <div class="chronos-network-metric">
                        <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Connected Accounts</div>
                        <div style="font-size: 16px; color: #ffffff; font-weight: 700;">${connectedAccounts.length}</div>
                    </div>
                    <div class="chronos-network-metric">
                        <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Connection Snapshot</div>
                        <div style="font-size: 13px; color: #d1d5db; line-height: 1.4;">${connectionsPreview || 'No connected accounts found'}</div>
                    </div>
                </div>

                <div style="margin-top: 14px; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">How to read this</div>
                    <div style="font-size: 13px; color: #d1d5db; line-height: 1.5;">
                        High risk means this node is linked with suspicious patterns. Use Open Full Network to inspect all direct paths and neighbors.
                    </div>
                </div>

                <div class="chronos-network-actions">
                    <button id="chronos-clear-selection-btn" class="chronos-network-btn" type="button">Clear Selection</button>
                    <button id="chronos-open-network-btn" class="chronos-network-btn chronos-network-btn-primary" type="button">Open Full Network</button>
                </div>
            </div>
        `;

        const clearButton = infoContainer.querySelector('#chronos-clear-selection-btn');
        const openButton = infoContainer.querySelector('#chronos-open-network-btn');

        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearSelection());
            clearButton.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.clearSelection();
                }
            });
        }

        if (openButton) {
            openButton.addEventListener('click', () => this.showNetworkOverview());
            openButton.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.showNetworkOverview();
                }
            });
        }
    }

    getConnectedAccounts(node) {
        return this.networkLinks
            .filter(link => link.source.id === node.id || link.target.id === node.id)
            .map(link => link.source.id === node.id ? link.target : link.source)
            .filter((account, index, self) => self.findIndex(a => a.id === account.id) === index);
    }

    clearSelection() {
        this.selectedNode = null;
        
        // Reset all opacities for both network and timeline elements
        this.g.selectAll('.network-node').style('opacity', 1);
        this.g.selectAll('.network-link').style('opacity', 0.6);
        this.g.selectAll('.transaction-node').style('opacity', 0.8).classed('highlighted', false);
        this.g.selectAll('.transaction-link').style('opacity', 0.4);
        
        // Reset info panel
        this.updateTimelineInfo();
        
        console.log('🧹 CHRONOS: Cleared all selections');
    }

    updateButtonStates() {
        const playButton = document.getElementById('play-button');
        const pauseButton = document.getElementById('pause-button');
        
        if (playButton && pauseButton) {
            if (this.isPlaying) {
                playButton.style.opacity = '0.5';
                playButton.disabled = true;
                pauseButton.style.opacity = '1';
                pauseButton.disabled = false;
            } else {
                playButton.style.opacity = '1';
                playButton.disabled = false;
                pauseButton.style.opacity = '0.5';
                pauseButton.disabled = true;
            }
        }
    }

    reset() {
        this.pause();
        this.currentFrame = 0;
        this.selectedNode = null;
        
        // Clear any existing visualization first
        this.clearVisualization();
        
        // Always ensure proper view rendering
        if (this.viewMode === 'timeline') {
            this.renderTimeline();
        } else if (this.viewMode === 'network') {
            this.renderNetwork();
        }
        
        console.log(`🔄 CHRONOS: Reset completed for ${this.viewMode} view`);
    }

    resize() {
        this.width = this.container.clientWidth - this.margin.left - this.margin.right;
        this.svg.attr('width', this.width + this.margin.left + this.margin.right);
        this.xScale.range([0, this.width]);
        
        if (this.viewMode === 'timeline') {
            this.render();
        } else {
            this.renderNetwork();
        }
    }
    
    async exportReport() {
        if (!this.data || this.data.length === 0) {
            showNotification('No data to export. Load timeline data first.', 'warning');
            return;
        }

        try {
            showLoading();
            showNotification('Generating CHRONOS PDF report...', 'info');
            
            // Create PDF generator
            const pdfGenerator = new TriNetraPDFGenerator();
            
            // Prepare network data if available
            const networkData = {
                networkNodes: this.networkNodes || [],
                networkLinks: this.networkLinks || []
            };
            
            // Generate CHRONOS PDF
            const pdf = await pdfGenerator.generateChronosReport(
                this.data, 
                networkData, 
                this.currentScenario
            );
            
            // Download PDF
            const filename = `CHRONOS_${this.currentScenario}_${new Date().toISOString().split('T')[0]}.pdf`;
            await pdfGenerator.downloadPDF(filename);
            
            showNotification('CHRONOS PDF report downloaded successfully', 'success');
        } catch (error) {
            console.error('CHRONOS PDF export failed:', error);
            showNotification('Failed to export CHRONOS PDF report', 'error');
        } finally {
            hideLoading();
        }
    }
}

// Export the class
export default ChronosTimeline;