import { API_BASE_URL } from '../../config.js';

export default class Reports {
    constructor() {
        this.reportsView = document.getElementById('reportsView');
        this.reportsContent = document.getElementById('reportsContent');

        this.lookupSection = document.getElementById('lookupSection');
        this.statsSection = document.getElementById('statsSection');
        this.evalsSection = document.getElementById('evalsSection');

        this.isLoading = false;
        this.users = [];
        this.evaluations = [];
        this.currentEvaluation = null;

        this.setupTabs();
        this.setupCaseLookup();
        this.setupStatistics();
        this.setupEvaluations();
        this.setupEvaluationCRUD();
    }

    // =========================================================================
    // AUTH
    // =========================================================================

    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${token}`
        };
    }

    // =========================================================================
    // TABS
    // =========================================================================

    setupTabs() {
        const tabs = document.querySelectorAll('.reports-tab');
        const sections = document.querySelectorAll('.reports-section');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                sections.forEach(s => s.classList.remove('active'));
                const targetSection = document.getElementById(`${target}Section`);
                if (targetSection) targetSection.classList.add('active');

                if (target === 'stats') this.loadAllStats();
            });
        });
    }

    // =========================================================================
    // CASE LOOKUP
    // =========================================================================

    setupCaseLookup() {
        const input = document.getElementById('lookupInput');
        const btn = document.getElementById('lookupBtn');

        if (!input || !btn) return;

        btn.addEventListener('click', () => this.searchCase());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCase();
        });
    }

    async searchCase() {
        const input = document.getElementById('lookupInput');
        const resultContainer = document.getElementById('lookupResult');
        const casenum = input.value.trim();

        if (!casenum) return;

        resultContainer.innerHTML = this.renderLoading();

        try {
            const [searchRes, historyRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/caselookup/search/${casenum}/`, {
                    headers: this.getAuthHeaders()
                }),
                fetch(`${API_BASE_URL}/api/caselookup/history/${casenum}/`, {
                    headers: this.getAuthHeaders()
                })
            ]);

            if (!searchRes.ok && searchRes.status === 404) {
                resultContainer.innerHTML = this.renderLookupNotFound(casenum);
                return;
            }

            const searchData = searchRes.ok ? await searchRes.json() : null;
            const historyData = historyRes.ok ? await historyRes.json() : null;

            resultContainer.innerHTML = this.renderCaseDetail(searchData, historyData);

        } catch (error) {
            console.error('Case lookup error:', error);
            resultContainer.innerHTML = `<div class="reports-error">Failed to search for case. Please try again.</div>`;
        }
    }

    renderCaseDetail(searchData, historyData) {
        if (!searchData || !searchData.found) {
            return this.renderLookupNotFound(searchData?.casenum || 'Unknown');
        }

        const status = searchData.current_status || 'unknown';
        const timeline = (historyData && historyData.timeline) || [];

        // Aggregate all unique techs and leads from the full timeline
        const techs = new Set();
        const leads = new Set();

        timeline.forEach(entry => {
            if (entry.stage === 'active' && entry.claimed_by) techs.add(entry.claimed_by);
            if (entry.stage === 'complete') {
                if (entry.completed_by) techs.add(entry.completed_by);
                if (entry.reviewing_lead) leads.add(entry.reviewing_lead);
            }
            if (entry.stage === 'reviewed') {
                if (entry.tech) techs.add(entry.tech);
                if (entry.lead) leads.add(entry.lead);
            }
        });

        const techList = techs.size > 0 ? [...techs].map(t => this.escapeHtml(t)).join(', ') : '—';
        const leadList = leads.size > 0 ? [...leads].map(l => this.escapeHtml(l)).join(', ') : '—';

        const fieldsHTML = `
            <div class="case-detail-field"><label>Current Status</label><span>${this.formatStatus(status)}</span></div>
            <div class="case-detail-field"><label>Techs</label><span>${techList}</span></div>
            <div class="case-detail-field"><label>Reviewed By</label><span>${leadList}</span></div>
        `;

        let timelineHTML = '';
        if (timeline.length > 0) {
            const items = timeline.map(entry => {
                let meta = '';
                let statusClass = '';

                if (entry.stage === 'active') {
                    meta = `Claimed by ${entry.claimed_by || '—'} at ${this.formatDate(entry.claim_time)}`;
                } else if (entry.stage === 'complete') {
                    meta = `Completed by ${entry.completed_by || '—'} at ${this.formatDate(entry.complete_time)}`;
                    if (entry.reviewing_lead) meta += ` &middot; Reviewing: ${entry.reviewing_lead}`;
                } else if (entry.stage === 'reviewed') {
                    statusClass = `status-${entry.status || ''}`;
                    meta = `Tech: ${entry.tech || '—'} &middot; Lead: ${entry.lead || '—'} &middot; Status: ${this.formatStatus(entry.status || '—')}`;
                    meta += `<br>Reviewed at ${this.formatDate(entry.review_time)}`;
                    if (entry.comment) meta += `<br>Comment: ${this.escapeHtml(entry.comment)}`;
                }

                return `
                    <div class="timeline-item ${entry.stage} ${statusClass}">
                        <div class="timeline-stage">${entry.stage}</div>
                        <div class="timeline-meta">${meta}</div>
                    </div>
                `;
            }).join('');

            timelineHTML = `
                <div class="case-timeline">
                    <h4>Timeline</h4>
                    <div class="timeline-list">${items}</div>
                </div>
            `;
        }

        return `
            <div class="case-detail-card">
                <div class="case-detail-header">
                    <h3>Case ${searchData.casenum} <span class="case-status-badge ${status}">${status}</span></h3>
                </div>
                <div class="case-detail-fields">${fieldsHTML}</div>
                ${timelineHTML}
            </div>
        `;
    }

    renderLookupNotFound(casenum) {
        return `
            <div class="lookup-empty">
                <svg width="48" height="48" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <p>Case <strong>${this.escapeHtml(casenum)}</strong> was not found in any stage.</p>
            </div>
        `;
    }

    // =========================================================================
    // CASE STATISTICS
    // =========================================================================

    setupStatistics() {
        const periodSelect = document.getElementById('statsPeriod');
        if (periodSelect) {
            periodSelect.addEventListener('change', () => this.loadAllStats());
        }

        const userSelect = document.getElementById('caseHistoryUser');
        if (userSelect) {
            userSelect.addEventListener('change', () => this.loadAllStats());
        }

        const expandBtn = document.getElementById('expandCaseHistory');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                const panel = expandBtn.closest('.stats-panel-wide');
                if (!panel) return;
                const isExpanded = panel.classList.toggle('expanded');
                expandBtn.title = isExpanded ? 'Collapse' : 'Expand';
                expandBtn.innerHTML = isExpanded
                    ? '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>'
                    : '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
            });
        }

        this.loadUsers();
    }

    async loadUsers() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/user/users/`, { headers: this.getAuthHeaders() });
            if (!res.ok) return;

            this.users = await res.json();
            this.userMap = {};
            this.users.forEach(u => {
                this.userMap[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
            });

            const select = document.getElementById('caseHistoryUser');
            if (select) {
                this.users.forEach(user => {
                    const opt = document.createElement('option');
                    opt.value = user.id;
                    opt.textContent = this.userMap[user.id];
                    select.appendChild(opt);
                });
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    async loadAllStats() {
        const userId = document.getElementById('caseHistoryUser')?.value;

        if (userId) {
            await this.loadUserStatistics(parseInt(userId));
        } else {
            await this.loadGlobalStatistics();
        }
    }

    async loadGlobalStatistics() {
        const summaryGrid = document.getElementById('statsSummaryGrid');
        const pingStatsBody = document.getElementById('pingStatsBody');
        const caseHistoryBody = document.getElementById('caseHistoryBody');

        if (!summaryGrid) return;

        summaryGrid.innerHTML = this.renderLoading();
        if (pingStatsBody) pingStatsBody.innerHTML = this.renderLoading();
        if (caseHistoryBody) caseHistoryBody.innerHTML = this.renderLoading();

        try {
            const [summaryRes, pingRes, activeRes, completeRes, reviewedRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/reports/summary/`, { headers: this.getAuthHeaders() }),
                fetch(`${API_BASE_URL}/api/reports/ping-stats/`, { headers: this.getAuthHeaders() }),
                fetch(`${API_BASE_URL}/api/activeclaim/list/`, { headers: this.getAuthHeaders() }),
                fetch(`${API_BASE_URL}/api/completeclaim/list/`, { headers: this.getAuthHeaders() }),
                fetch(`${API_BASE_URL}/api/reviewedclaim/list/`, { headers: this.getAuthHeaders() })
            ]);

            if (summaryRes.ok) {
                const summary = await summaryRes.json();
                this.renderGlobalSummary(summary, summaryGrid);
            } else {
                summaryGrid.innerHTML = `<div class="reports-error">Failed to load summary</div>`;
            }

            if (pingRes.ok) {
                const pings = await pingRes.json();
                this.renderPingStats(pings, pingStatsBody);
            } else if (pingStatsBody) {
                pingStatsBody.innerHTML = `<div class="reports-error">Failed to load ping stats</div>`;
            }

            this.buildCaseHistoryFromResponses(null, activeRes, completeRes, reviewedRes, caseHistoryBody);

        } catch (error) {
            console.error('Statistics load error:', error);
            summaryGrid.innerHTML = `<div class="reports-error">Failed to load statistics. Please try again.</div>`;
        }
    }

    async loadUserStatistics(userId) {
        const summaryGrid = document.getElementById('statsSummaryGrid');
        const pingStatsBody = document.getElementById('pingStatsBody');
        const caseHistoryBody = document.getElementById('caseHistoryBody');

        if (!summaryGrid) return;

        summaryGrid.innerHTML = this.renderLoading();
        if (pingStatsBody) pingStatsBody.innerHTML = this.renderLoading();
        if (caseHistoryBody) caseHistoryBody.innerHTML = this.renderLoading();

        try {
            const [userStatsRes, activeRes, completeRes, reviewedRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/reports/user/${userId}/`, { headers: this.getAuthHeaders() }),
                fetch(`${API_BASE_URL}/api/activeclaim/list/`, { headers: this.getAuthHeaders() }),
                fetch(`${API_BASE_URL}/api/completeclaim/list/`, { headers: this.getAuthHeaders() }),
                fetch(`${API_BASE_URL}/api/reviewedclaim/list/`, { headers: this.getAuthHeaders() })
            ]);

            if (userStatsRes.ok) {
                const userStats = await userStatsRes.json();
                this.renderUserSummary(userStats, summaryGrid);
            } else {
                summaryGrid.innerHTML = `<div class="reports-error">Failed to load user stats</div>`;
            }

            // Build case history (filtered) and compute per-user ping stats from reviewed data
            const reviewed = reviewedRes.ok ? await reviewedRes.json() : [];
            const userReviewed = reviewed.filter(c => c.tech_id === userId);
            this.renderUserPingStats(userReviewed, pingStatsBody);
            this.buildCaseHistoryFromResponses(userId, activeRes, completeRes, { already: reviewed }, caseHistoryBody);

        } catch (error) {
            console.error('User statistics load error:', error);
            summaryGrid.innerHTML = `<div class="reports-error">Failed to load statistics. Please try again.</div>`;
        }
    }

    renderGlobalSummary(summary, container) {
        const cards = [
            { label: 'Active Claims', value: summary.totals.active_claims, sub: `${summary.today.claimed} claimed today` },
            { label: 'Pending Review', value: summary.totals.pending_review, sub: `${summary.today.completed} completed today` },
            { label: 'Total Reviewed', value: summary.totals.reviewed_claims, sub: `${summary.today.reviewed} reviewed today` },
            { label: 'Ping Rate', value: `${summary.ping_rate}%`, sub: `${summary.this_week.reviewed} reviewed this week` },
        ];

        container.innerHTML = cards.map(c => `
            <div class="stats-card">
                <span class="stats-card-label">${c.label}</span>
                <span class="stats-card-value">${c.value}</span>
                <span class="stats-card-sub">${c.sub}</span>
            </div>
        `).join('');
    }

    renderUserSummary(stats, container) {
        const tech = stats.as_tech || {};
        const lead = stats.as_lead || {};
        const cards = [
            { label: 'Active Claims', value: tech.active_claims || 0, sub: `${tech.completed_pending_review || 0} pending review` },
            { label: 'Cases Reviewed', value: tech.total_reviewed || 0, sub: `${tech.positive_reviews || 0} positive` },
            { label: 'Ping Rate', value: `${tech.ping_rate || 0}%`, sub: `${tech.pings_received || 0} pings total` },
            { label: 'Reviews Given (as Lead)', value: lead.reviews_given || 0, sub: `${lead.reviews_this_week || 0} this week` },
        ];

        container.innerHTML = cards.map(c => `
            <div class="stats-card">
                <span class="stats-card-label">${c.label}</span>
                <span class="stats-card-value">${c.value}</span>
                <span class="stats-card-sub">${c.sub}</span>
            </div>
        `).join('');
    }

    renderPingStats(data, container) {
        if (!container) return;
        const total = data.totals.all_pings || 1;
        const stats = [
            { label: 'Low Severity', value: data.by_severity.low, cls: 'low' },
            { label: 'Medium Severity', value: data.by_severity.medium, cls: 'medium' },
            { label: 'High Severity', value: data.by_severity.high, cls: 'high' },
            { label: 'Acknowledged', value: data.totals.acknowledged, cls: 'acknowledged' },
            { label: 'Resolved', value: data.totals.resolved, cls: 'resolved' },
        ];

        container.innerHTML = `
            <div class="ping-stats-list">
                ${stats.map(s => `
                    <div class="ping-stat-row">
                        <div class="ping-stat-label">
                            <span>${s.label}</span>
                            <span>${s.value}</span>
                        </div>
                        <div class="ping-stat-bar">
                            <div class="ping-stat-bar-fill ${s.cls}" style="width: ${Math.max((s.value / total) * 100, 2)}%"></div>
                        </div>
                    </div>
                `).join('')}
                <div class="ping-stat-row" style="margin-top: var(--space-3);">
                    <div class="ping-stat-label">
                        <span>Resolution Rate</span>
                        <span>${data.resolution_rate}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderUserPingStats(userReviewed, container) {
        if (!container) return;

        const pingStatuses = ['pingedlow', 'pingedmed', 'pingedhigh', 'acknowledged', 'resolved'];
        const userPings = userReviewed.filter(c => pingStatuses.includes(c.status));

        const low = userPings.filter(c => c.status === 'pingedlow').length;
        const med = userPings.filter(c => c.status === 'pingedmed').length;
        const high = userPings.filter(c => c.status === 'pingedhigh').length;
        const ack = userPings.filter(c => c.status === 'acknowledged').length;
        const res = userPings.filter(c => c.status === 'resolved').length;
        const total = userPings.length || 1;
        const resRate = userPings.length > 0 ? Math.round(res / userPings.length * 100) : 0;

        const stats = [
            { label: 'Low Severity', value: low, cls: 'low' },
            { label: 'Medium Severity', value: med, cls: 'medium' },
            { label: 'High Severity', value: high, cls: 'high' },
            { label: 'Acknowledged', value: ack, cls: 'acknowledged' },
            { label: 'Resolved', value: res, cls: 'resolved' },
        ];

        container.innerHTML = `
            <div class="ping-stats-list">
                ${stats.map(s => `
                    <div class="ping-stat-row">
                        <div class="ping-stat-label">
                            <span>${s.label}</span>
                            <span>${s.value}</span>
                        </div>
                        <div class="ping-stat-bar">
                            <div class="ping-stat-bar-fill ${s.cls}" style="width: ${Math.max((s.value / total) * 100, 2)}%"></div>
                        </div>
                    </div>
                `).join('')}
                <div class="ping-stat-row" style="margin-top: var(--space-3);">
                    <div class="ping-stat-label">
                        <span>Resolution Rate</span>
                        <span>${resRate}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // USER CASE HISTORY TABLE
    // =========================================================================

    async buildCaseHistoryFromResponses(userId, activeRes, completeRes, reviewedResOrData, container) {
        if (!container) return;

        try {
            const rows = [];
            const uid = userId ? parseInt(userId) : null;

            if (activeRes && activeRes.ok) {
                const active = await activeRes.json();
                const filtered = uid ? active.filter(c => c.user_id === uid) : active;
                filtered.forEach(c => {
                    rows.push({
                        casenum: c.casenum,
                        date: c.claim_time,
                        tech: this.userMap[c.user_id] || `User #${c.user_id}`,
                        reviewer: '—',
                        status: 'active',
                        comment: ''
                    });
                });
            }

            if (completeRes && completeRes.ok) {
                const complete = await completeRes.json();
                const filtered = uid ? complete.filter(c => c.user_id === uid) : complete;
                filtered.forEach(c => {
                    rows.push({
                        casenum: c.casenum,
                        date: c.complete_time || c.claim_time,
                        tech: this.userMap[c.user_id] || `User #${c.user_id}`,
                        reviewer: c.lead_id ? (this.userMap[c.lead_id] || `User #${c.lead_id}`) : '—',
                        status: 'complete',
                        comment: ''
                    });
                });
            }

            // reviewedResOrData may be a fetch Response or an object with pre-parsed data
            let reviewed = [];
            if (reviewedResOrData && reviewedResOrData.already) {
                reviewed = reviewedResOrData.already;
            } else if (reviewedResOrData && reviewedResOrData.ok) {
                reviewed = await reviewedResOrData.json();
            }

            const filteredReviewed = uid ? reviewed.filter(c => c.tech_id === uid) : reviewed;
            filteredReviewed.forEach(c => {
                rows.push({
                    casenum: c.casenum,
                    date: c.review_time || c.complete_time || c.claim_time,
                    tech: this.userMap[c.tech_id] || `User #${c.tech_id}`,
                    reviewer: c.lead_id ? (this.userMap[c.lead_id] || `User #${c.lead_id}`) : '—',
                    status: c.status,
                    comment: c.comment || ''
                });
            });

            rows.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.renderCaseHistoryTable(rows, container);

        } catch (error) {
            console.error('Case history build error:', error);
            container.innerHTML = `<div class="reports-error">Failed to load case history.</div>`;
        }
    }

    renderCaseHistoryTable(rows, container) {
        if (rows.length === 0) {
            container.innerHTML = `<div class="lookup-empty"><p>No cases found</p></div>`;
            return;
        }

        const truncate = (str, max = 15) => {
            const s = String(str);
            return s.length > max ? s.slice(0, max) + '…' : s;
        };

        const tableRows = rows.map(r => `
            <tr>
                <td class="case-num-cell" title="${this.escapeHtml(r.casenum)}">${this.escapeHtml(truncate(r.casenum))}</td>
                <td>${this.escapeHtml(r.tech)}</td>
                <td>${this.formatDateShort(r.date)}</td>
                <td>${this.escapeHtml(r.reviewer)}</td>
                <td><span class="status-cell ${r.status}">${this.formatStatus(r.status)}</span></td>
                <td class="comment-cell" title="${this.escapeHtml(r.comment)}">${this.escapeHtml(truncate(r.comment, 30)) || '—'}</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <table class="case-history-table">
                <thead>
                    <tr>
                        <th>Case #</th>
                        <th>Tech</th>
                        <th>Date</th>
                        <th>Reviewed By</th>
                        <th>Status</th>
                        <th>Comment</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
    }

    formatStatus(status) {
        const labels = {
            active: 'Active',
            complete: 'Pending Review',
            checked: 'Checked',
            done: 'Done',
            kudos: 'Kudos',
            pingedlow: 'Pinged (Low)',
            pingedmed: 'Pinged (Med)',
            pingedhigh: 'Pinged (High)',
            acknowledged: 'Acknowledged',
            resolved: 'Resolved'
        };
        return labels[status] || status;
    }

    // =========================================================================
    // EVALUATIONS - SETUP
    // =========================================================================

    setupEvaluations() {
        this.setupEvalSubtabs();
        this.populateGenEvalSelects();
        this.populateEvalFormSelects();

        const btn = document.getElementById('genEvalBtn');
        if (btn) {
            btn.addEventListener('click', () => this.generateEvaluations());
        }
    }

    setupEvalSubtabs() {
        const subtabs = document.querySelectorAll('.eval-subtab');
        const contents = document.querySelectorAll('.eval-content');

        subtabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.evaltab;

                subtabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                contents.forEach(c => c.classList.remove('active'));
                const targetContent = document.getElementById(`eval${target.charAt(0).toUpperCase() + target.slice(1)}Content`);
                if (targetContent) targetContent.classList.add('active');

                if (target === 'list') this.loadEvaluationList();
            });
        });
    }

    populateEvalFormSelects() {
        const waitForUsers = () => {
            if (this.users.length > 0) {
                const techSelect = document.getElementById('evalTech');
                const filterTech = document.getElementById('evalFilterTech');
                const filterEvaluator = document.getElementById('evalFilterEvaluator');

                if (techSelect) {
                    techSelect.innerHTML = '<option value="">Select a tech...</option>';
                    this.users.forEach(user => {
                        const opt = document.createElement('option');
                        opt.value = user.id;
                        opt.textContent = this.userMap[user.id];
                        techSelect.appendChild(opt);
                    });
                }

                if (filterTech) {
                    filterTech.innerHTML = '<option value="">All Techs</option>';
                    this.users.forEach(user => {
                        const opt = document.createElement('option');
                        opt.value = user.id;
                        opt.textContent = this.userMap[user.id];
                        filterTech.appendChild(opt);
                    });
                }

                if (filterEvaluator) {
                    filterEvaluator.innerHTML = '<option value="">All Evaluators</option>';
                    this.users.forEach(user => {
                        const opt = document.createElement('option');
                        opt.value = user.id;
                        opt.textContent = this.userMap[user.id];
                        filterEvaluator.appendChild(opt);
                    });
                }
            } else {
                setTimeout(waitForUsers, 100);
            }
        };
        waitForUsers();

        const now = new Date();
        const startInput = document.getElementById('evalPeriodStart');
        const endInput = document.getElementById('evalPeriodEnd');
        if (startInput && endInput) {
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            startInput.value = firstOfMonth.toISOString().split('T')[0];
            endInput.value = lastOfMonth.toISOString().split('T')[0];
        }
    }

    populateGenEvalSelects() {
        const monthSelect = document.getElementById('genEvalMonth');
        const yearSelect = document.getElementById('genEvalYear');
        if (!monthSelect || !yearSelect) return;

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const now = new Date();

        months.forEach((name, i) => {
            const opt = document.createElement('option');
            opt.value = i + 1;
            opt.textContent = name;
            if (i + 1 === now.getMonth()) opt.selected = true;
            monthSelect.appendChild(opt);
        });

        const currentYear = now.getFullYear();
        for (let y = currentYear; y >= currentYear - 3; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        }
    }

    async generateEvaluations() {
        const month = document.getElementById('genEvalMonth')?.value;
        const year = document.getElementById('genEvalYear')?.value;
        const btn = document.getElementById('genEvalBtn');
        const statusEl = document.getElementById('genEvalStatus');

        if (!month || !year) return;

        btn.disabled = true;
        btn.textContent = 'Generating...';
        statusEl.innerHTML = '';

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/evaluation/geneval/?month=${month}&year=${year}`,
                { headers: { 'Authorization': `Token ${localStorage.getItem('authToken')}` } }
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Generation failed' }));
                throw new Error(err.error || `Server returned ${res.status}`);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `evaluations_${month}_${year}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            statusEl.innerHTML = `<span class="geneval-success">Download started successfully.</span>`;

        } catch (error) {
            console.error('GenEval error:', error);
            statusEl.innerHTML = `<span class="geneval-error">${this.escapeHtml(error.message)}</span>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Generate Evaluations';
        }
    }

    // =========================================================================
    // EVALUATIONS - CRUD OPERATIONS
    // =========================================================================

    setupEvaluationCRUD() {
        // Filter listeners
        document.getElementById('evalFilterTech')?.addEventListener('change', () => this.loadEvaluationList());
        document.getElementById('evalFilterEvaluator')?.addEventListener('change', () => this.loadEvaluationList());

        // Preview metrics button
        document.getElementById('evalPreviewBtn')?.addEventListener('click', () => this.previewEvalMetrics());

        // Create form
        document.getElementById('evalCreateForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createEvaluation();
        });

        document.getElementById('evalFormReset')?.addEventListener('click', () => this.resetEvalForm());

        // Detail modal
        document.getElementById('evalModalClose')?.addEventListener('click', () => this.closeModal('evalDetailModal'));
        document.getElementById('evalModalEdit')?.addEventListener('click', () => this.openEditModal());
        document.getElementById('evalModalDelete')?.addEventListener('click', () => this.openDeleteModal());

        // Edit modal
        document.getElementById('evalEditModalClose')?.addEventListener('click', () => this.closeModal('evalEditModal'));
        document.getElementById('evalEditCancel')?.addEventListener('click', () => this.closeModal('evalEditModal'));
        document.getElementById('evalEditSave')?.addEventListener('click', () => this.updateEvaluation());

        // Delete modal
        document.getElementById('evalDeleteModalClose')?.addEventListener('click', () => this.closeModal('evalDeleteModal'));
        document.getElementById('evalDeleteCancel')?.addEventListener('click', () => this.closeModal('evalDeleteModal'));
        document.getElementById('evalDeleteConfirm')?.addEventListener('click', () => this.deleteEvaluation());

        // Close modals on overlay click
        ['evalDetailModal', 'evalEditModal', 'evalDeleteModal'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', (e) => {
                if (e.target.id === id) this.closeModal(id);
            });
        });
    }

    // --- LIST ---
    async loadEvaluationList() {
        const container = document.getElementById('evalListContainer');
        if (!container) return;

        container.innerHTML = this.renderLoading();

        const techId = document.getElementById('evalFilterTech')?.value;
        const evaluatorId = document.getElementById('evalFilterEvaluator')?.value;

        let url = `${API_BASE_URL}/api/evaluation/list/`;
        const params = new URLSearchParams();
        if (techId) params.append('tech_id', techId);
        if (evaluatorId) params.append('evaluator_id', evaluatorId);
        if (params.toString()) url += `?${params.toString()}`;

        try {
            const res = await fetch(url, { headers: this.getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load evaluations');

            this.evaluations = await res.json();
            this.renderEvaluationList(container);

        } catch (error) {
            console.error('Load evaluations error:', error);
            container.innerHTML = `<div class="reports-error">Failed to load evaluations. Please try again.</div>`;
        }
    }

    renderEvaluationList(container) {
        if (this.evaluations.length === 0) {
            container.innerHTML = `
                <div class="lookup-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    <p>No evaluations found</p>
                </div>
            `;
            return;
        }

        const ratingLabels = {
            5: 'Outstanding',
            4: 'Exceeds',
            3: 'Meets',
            2: 'Below',
            1: 'Needs Improvement'
        };

        const rows = this.evaluations.map(ev => {
            const techName = ev.tech_name || this.userMap[ev.tech] || `User #${ev.tech}`;
            const evaluatorName = ev.evaluator_name || this.userMap[ev.evaluator] || `User #${ev.evaluator}`;
            const rating = ev.overall_rating;
            const ratingLabel = ratingLabels[rating] || '—';

            return `
                <tr data-eval-id="${ev.id}">
                    <td>${this.escapeHtml(techName)}</td>
                    <td>${this.formatDateShort(ev.period_start)} - ${this.formatDateShort(ev.period_end)}</td>
                    <td>${this.escapeHtml(evaluatorName)}</td>
                    <td>
                        <span class="eval-rating-badge rating-${rating}">
                            ${rating} - ${ratingLabel}
                        </span>
                    </td>
                    <td>${this.formatDateShort(ev.created_at)}</td>
                    <td class="eval-actions-cell" onclick="event.stopPropagation()">
                        <button class="eval-action-btn view" title="View" data-action="view" data-id="${ev.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                        </button>
                        <button class="eval-action-btn edit" title="Edit" data-action="edit" data-id="${ev.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button class="eval-action-btn delete" title="Delete" data-action="delete" data-id="${ev.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="eval-list-table">
                <thead>
                    <tr>
                        <th>Tech</th>
                        <th>Period</th>
                        <th>Evaluator</th>
                        <th>Rating</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;

        // Add click handlers
        container.querySelectorAll('tbody tr').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.dataset.evalId;
                this.openDetailModal(parseInt(id));
            });
        });

        container.querySelectorAll('.eval-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = parseInt(btn.dataset.id);
                if (action === 'view') this.openDetailModal(id);
                else if (action === 'edit') this.openEditModalById(id);
                else if (action === 'delete') this.openDeleteModalById(id);
            });
        });
    }

    // --- PREVIEW METRICS ---
    async previewEvalMetrics() {
        const techId = document.getElementById('evalTech')?.value;
        const startDate = document.getElementById('evalPeriodStart')?.value;
        const endDate = document.getElementById('evalPeriodEnd')?.value;
        const previewContent = document.getElementById('evalPreviewContent');
        const previewCard = document.getElementById('evalPreviewCard');

        if (!techId || !startDate || !endDate) {
            alert('Please select a tech and date range first.');
            return;
        }

        previewContent.innerHTML = this.renderLoading();

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/evaluation/generate/${techId}/?start_date=${startDate}&end_date=${endDate}`,
                { headers: this.getAuthHeaders() }
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to generate preview' }));
                throw new Error(err.error || 'Failed to generate preview');
            }

            const data = await res.json();
            this.renderMetricsPreview(data, previewContent);

        } catch (error) {
            console.error('Preview metrics error:', error);
            previewContent.innerHTML = `<div class="reports-error">${this.escapeHtml(error.message)}</div>`;
        }
    }

    renderMetricsPreview(data, container) {
        const metrics = data.metrics || {};
        const breakdown = data.breakdown || {};
        const suggestedRating = data.suggested_rating;

        const ratingLabels = {
            5: 'Outstanding',
            4: 'Exceeds Expectations',
            3: 'Meets Expectations',
            2: 'Below Expectations',
            1: 'Needs Improvement'
        };

        container.innerHTML = `
            <div class="eval-preview-metrics">
                <div class="eval-preview-metric">
                    <div class="eval-preview-metric-value">${metrics.cases_reviewed || 0}</div>
                    <div class="eval-preview-metric-label">Cases</div>
                </div>
                <div class="eval-preview-metric">
                    <div class="eval-preview-metric-value">${metrics.quality_score || 0}%</div>
                    <div class="eval-preview-metric-label">Quality</div>
                </div>
                <div class="eval-preview-metric">
                    <div class="eval-preview-metric-value">${metrics.ping_count || 0}</div>
                    <div class="eval-preview-metric-label">Pings</div>
                </div>
                <div class="eval-preview-metric">
                    <div class="eval-preview-metric-value">${metrics.kudos_count || 0}</div>
                    <div class="eval-preview-metric-label">Kudos</div>
                </div>
            </div>
            <div class="eval-preview-breakdown">
                <h5>Status Breakdown</h5>
                <div class="eval-preview-breakdown-grid">
                    <div class="eval-preview-breakdown-item"><span>Kudos</span><span>${breakdown.kudos || 0}</span></div>
                    <div class="eval-preview-breakdown-item"><span>Checked</span><span>${breakdown.checked || 0}</span></div>
                    <div class="eval-preview-breakdown-item"><span>Done</span><span>${breakdown.done || 0}</span></div>
                    <div class="eval-preview-breakdown-item"><span>Low Ping</span><span>${breakdown.pinged_low || 0}</span></div>
                    <div class="eval-preview-breakdown-item"><span>Med Ping</span><span>${breakdown.pinged_med || 0}</span></div>
                    <div class="eval-preview-breakdown-item"><span>High Ping</span><span>${breakdown.pinged_high || 0}</span></div>
                </div>
            </div>
            ${suggestedRating ? `
                <div class="eval-suggested-rating">
                    <div class="eval-suggested-rating-label">Suggested Rating</div>
                    <div class="eval-suggested-rating-value">${suggestedRating} - ${ratingLabels[suggestedRating]}</div>
                </div>
            ` : ''}
        `;

        // Auto-fill rating if suggested
        if (suggestedRating) {
            const ratingSelect = document.getElementById('evalRating');
            if (ratingSelect && !ratingSelect.value) {
                ratingSelect.value = suggestedRating;
            }
        }
    }

    // --- CREATE ---
    async createEvaluation() {
        const form = document.getElementById('evalCreateForm');
        const submitBtn = form.querySelector('button[type="submit"]');

        const techId = document.getElementById('evalTech')?.value;
        const periodStart = document.getElementById('evalPeriodStart')?.value;
        const periodEnd = document.getElementById('evalPeriodEnd')?.value;
        const strengths = document.getElementById('evalStrengths')?.value;
        const improvements = document.getElementById('evalImprovements')?.value;
        const comments = document.getElementById('evalComments')?.value;
        const rating = document.getElementById('evalRating')?.value;

        if (!techId || !periodStart || !periodEnd || !rating) {
            alert('Please fill in all required fields.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        try {
            const res = await fetch(`${API_BASE_URL}/api/evaluation/create/`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    tech: parseInt(techId),
                    period_start: periodStart,
                    period_end: periodEnd,
                    strengths: strengths || '',
                    areas_for_improvement: improvements || '',
                    additional_comments: comments || '',
                    overall_rating: parseInt(rating)
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to create evaluation' }));
                throw new Error(err.error || 'Failed to create evaluation');
            }

            this.resetEvalForm();
            alert('Evaluation created successfully!');

            // Switch to list view
            document.querySelector('.eval-subtab[data-evaltab="list"]')?.click();

        } catch (error) {
            console.error('Create evaluation error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Evaluation';
        }
    }

    resetEvalForm() {
        document.getElementById('evalCreateForm')?.reset();
        document.getElementById('evalPreviewContent').innerHTML = '';

        // Reset date defaults
        const now = new Date();
        const startInput = document.getElementById('evalPeriodStart');
        const endInput = document.getElementById('evalPeriodEnd');
        if (startInput && endInput) {
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            startInput.value = firstOfMonth.toISOString().split('T')[0];
            endInput.value = lastOfMonth.toISOString().split('T')[0];
        }
    }

    // --- DETAIL MODAL ---
    async openDetailModal(id) {
        const modal = document.getElementById('evalDetailModal');
        const body = document.getElementById('evalModalBody');

        body.innerHTML = this.renderLoading();
        modal.classList.add('active');

        try {
            const res = await fetch(`${API_BASE_URL}/api/evaluation/detail/${id}/`, {
                headers: this.getAuthHeaders()
            });

            if (!res.ok) throw new Error('Failed to load evaluation');

            this.currentEvaluation = await res.json();
            this.renderEvaluationDetail(body);

        } catch (error) {
            console.error('Load evaluation detail error:', error);
            body.innerHTML = `<div class="reports-error">Failed to load evaluation details.</div>`;
        }
    }

    renderEvaluationDetail(container) {
        const ev = this.currentEvaluation;
        if (!ev) return;

        const techName = ev.tech_name || this.userMap[ev.tech] || `User #${ev.tech}`;
        const evaluatorName = ev.evaluator_name || this.userMap[ev.evaluator] || `User #${ev.evaluator}`;

        const ratingLabels = {
            5: 'Outstanding',
            4: 'Exceeds Expectations',
            3: 'Meets Expectations',
            2: 'Below Expectations',
            1: 'Needs Improvement'
        };

        container.innerHTML = `
            <div class="eval-detail-header">
                <div class="eval-detail-meta">
                    <div class="eval-detail-tech">${this.escapeHtml(techName)}</div>
                    <div class="eval-detail-period">${this.formatDateShort(ev.period_start)} - ${this.formatDateShort(ev.period_end)}</div>
                    <div class="eval-detail-evaluator">Evaluated by ${this.escapeHtml(evaluatorName)} on ${this.formatDateShort(ev.created_at)}</div>
                </div>
                <span class="eval-rating-badge rating-${ev.overall_rating}">
                    ${ev.overall_rating} - ${ratingLabels[ev.overall_rating] || '—'}
                </span>
            </div>

            ${(ev.cases_reviewed || ev.quality_score || ev.ping_count || ev.kudos_count) ? `
                <div class="eval-detail-metrics">
                    <div class="eval-detail-metric">
                        <div class="eval-detail-metric-value">${ev.cases_reviewed || 0}</div>
                        <div class="eval-detail-metric-label">Cases</div>
                    </div>
                    <div class="eval-detail-metric">
                        <div class="eval-detail-metric-value">${ev.quality_score || 0}%</div>
                        <div class="eval-detail-metric-label">Quality</div>
                    </div>
                    <div class="eval-detail-metric">
                        <div class="eval-detail-metric-value">${ev.ping_count || 0}</div>
                        <div class="eval-detail-metric-label">Pings</div>
                    </div>
                    <div class="eval-detail-metric">
                        <div class="eval-detail-metric-value">${ev.kudos_count || 0}</div>
                        <div class="eval-detail-metric-label">Kudos</div>
                    </div>
                </div>
            ` : ''}

            ${ev.strengths ? `
                <div class="eval-detail-section">
                    <div class="eval-detail-section-title">Strengths</div>
                    <div class="eval-detail-section-content">${this.escapeHtml(ev.strengths)}</div>
                </div>
            ` : ''}

            ${ev.areas_for_improvement ? `
                <div class="eval-detail-section">
                    <div class="eval-detail-section-title">Areas for Improvement</div>
                    <div class="eval-detail-section-content">${this.escapeHtml(ev.areas_for_improvement)}</div>
                </div>
            ` : ''}

            ${ev.additional_comments ? `
                <div class="eval-detail-section">
                    <div class="eval-detail-section-title">Additional Comments</div>
                    <div class="eval-detail-section-content">${this.escapeHtml(ev.additional_comments)}</div>
                </div>
            ` : ''}
        `;
    }

    // --- EDIT MODAL ---
    openEditModal() {
        if (!this.currentEvaluation) return;
        this.closeModal('evalDetailModal');
        this.populateEditForm(this.currentEvaluation);
        document.getElementById('evalEditModal').classList.add('active');
    }

    async openEditModalById(id) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/evaluation/detail/${id}/`, {
                headers: this.getAuthHeaders()
            });

            if (!res.ok) throw new Error('Failed to load evaluation');

            this.currentEvaluation = await res.json();
            this.populateEditForm(this.currentEvaluation);
            document.getElementById('evalEditModal').classList.add('active');

        } catch (error) {
            console.error('Load evaluation for edit error:', error);
            alert('Failed to load evaluation for editing.');
        }
    }

    populateEditForm(ev) {
        const techName = ev.tech_name || this.userMap[ev.tech] || `User #${ev.tech}`;

        document.getElementById('evalEditId').value = ev.id;
        document.getElementById('evalEditTechDisplay').value = techName;
        document.getElementById('evalEditPeriodStart').value = ev.period_start;
        document.getElementById('evalEditPeriodEnd').value = ev.period_end;
        document.getElementById('evalEditStrengths').value = ev.strengths || '';
        document.getElementById('evalEditImprovements').value = ev.areas_for_improvement || '';
        document.getElementById('evalEditComments').value = ev.additional_comments || '';
        document.getElementById('evalEditRating').value = ev.overall_rating || '';
    }

    async updateEvaluation() {
        const id = document.getElementById('evalEditId')?.value;
        const saveBtn = document.getElementById('evalEditSave');

        if (!id) return;

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const res = await fetch(`${API_BASE_URL}/api/evaluation/update/${id}/`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    tech: this.currentEvaluation.tech,
                    period_start: document.getElementById('evalEditPeriodStart').value,
                    period_end: document.getElementById('evalEditPeriodEnd').value,
                    strengths: document.getElementById('evalEditStrengths').value,
                    areas_for_improvement: document.getElementById('evalEditImprovements').value,
                    additional_comments: document.getElementById('evalEditComments').value,
                    overall_rating: parseInt(document.getElementById('evalEditRating').value)
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to update evaluation' }));
                throw new Error(err.error || 'Failed to update evaluation');
            }

            this.closeModal('evalEditModal');
            this.loadEvaluationList();
            alert('Evaluation updated successfully!');

        } catch (error) {
            console.error('Update evaluation error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }

    // --- DELETE MODAL ---
    openDeleteModal() {
        if (!this.currentEvaluation) return;
        document.getElementById('evalDeleteId').value = this.currentEvaluation.id;
        this.closeModal('evalDetailModal');
        document.getElementById('evalDeleteModal').classList.add('active');
    }

    openDeleteModalById(id) {
        document.getElementById('evalDeleteId').value = id;
        document.getElementById('evalDeleteModal').classList.add('active');
    }

    async deleteEvaluation() {
        const id = document.getElementById('evalDeleteId')?.value;
        const confirmBtn = document.getElementById('evalDeleteConfirm');

        if (!id) return;

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting...';

        try {
            const res = await fetch(`${API_BASE_URL}/api/evaluation/delete/${id}/`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to delete evaluation' }));
                throw new Error(err.error || 'Failed to delete evaluation');
            }

            this.closeModal('evalDeleteModal');
            this.loadEvaluationList();
            alert('Evaluation deleted successfully!');

        } catch (error) {
            console.error('Delete evaluation error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Delete';
        }
    }

    // --- MODAL HELPERS ---
    closeModal(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    renderLoading() {
        return `<div class="reports-loading"><div class="spinner"></div><span>Loading...</span></div>`;
    }

    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    formatDateShort(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
