// Import API configuration
import { API_BASE_URL } from '../../config.js';
import websocketManager from '../utils/websocket-manager.js';

export default class Pings {
    constructor() {
        this.pingsContainer = document.getElementById('pingsContainer');
        this.pingsView = document.getElementById('pingsView');
        this.activePingsList = document.getElementById('activePingsList');
        this.acknowledgedPingsList = document.getElementById('acknowledgedPingsList');
        this.completedPingsList = document.getElementById('completedPingsList');
        this.websocket = null;
        
        // Local state management
        this.pings = new Map(); // Store pings by ID for efficient lookup
        this.isLoading = false;
        
        this.initialize();
        this.initializeWebSocket();
    }

    initialize() {
        // Load pings from API
        this.loadPingsFromAPI();
        
        // Set up tab switching
        this.setupTabs();
    }
    
    setupTabs() {
        const tabs = document.querySelectorAll('.ping-tab');
        const sections = document.querySelectorAll('.pings-section');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Hide all sections
                sections.forEach(section => section.classList.remove('active'));
                
                // Show the target section
                const targetSection = document.getElementById(`${targetTab}PingsSection`);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
            });
        });
    }

    // Get authentication headers
    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${token}`
        };
    }

    // Load pings from API
    async loadPingsFromAPI() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            const response = await fetch(`${API_BASE_URL}/api/reviewedclaim/list/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.error('Failed to load pings:', response.status);
                this.showWelcomeMessage();
                return;
            }

            const reviewedClaims = await response.json();
            
            // Convert reviewed claims to ping format
            const pings = reviewedClaims
                .filter(claim => this.isPingStatus(claim.status))
                .map(claim => this.convertReviewedClaimToPing(claim))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Update local state
            this.pings.clear();
            pings.forEach(ping => this.pings.set(ping.id, ping));
            
            // Render pings
            this.renderAllPings();

        } catch (error) {
            console.error('Error loading pings:', error);
            this.showWelcomeMessage();
        } finally {
            this.isLoading = false;
        }
    }

    // Render all pings from state, organized by status
    renderAllPings() {
        // Clear existing pings in all sections
        this.activePingsList.innerHTML = '';
        this.acknowledgedPingsList.innerHTML = '';
        this.completedPingsList.innerHTML = '';
        
        if (this.pings.size === 0) {
            this.showWelcomeMessage();
            return;
        }

        // Categorize pings by status
        const activePings = [];
        const acknowledgedPings = [];
        const completedPings = [];
        
        this.pings.forEach(ping => {
            if (ping.status === 'acknowledged') {
                acknowledgedPings.push(ping);
            } else if (ping.status === 'resolved') {
                completedPings.push(ping);
            } else {
                // pingedlow, pingedmed, pingedhigh, or pending
                activePings.push(ping);
            }
        });
        
        // Sort each category by timestamp (newest first)
        const sortByTimestamp = (a, b) => new Date(b.timestamp) - new Date(a.timestamp);
        activePings.sort(sortByTimestamp);
        acknowledgedPings.sort(sortByTimestamp);
        completedPings.sort(sortByTimestamp);
        
        // Render pings in their respective sections
        activePings.forEach(ping => this.renderPing(ping, this.activePingsList));
        acknowledgedPings.forEach(ping => this.renderPing(ping, this.acknowledgedPingsList));
        completedPings.forEach(ping => this.renderPing(ping, this.completedPingsList));
        
        // Show/hide empty state messages
        this.updateEmptyStates(activePings.length, acknowledgedPings.length, completedPings.length);
    }

    // Check if a status is a ping status
    isPingStatus(status) {
        return ['pingedlow', 'pingedmed', 'pingedhigh', 'acknowledged', 'resolved'].includes(status);
    }

    // Convert backend status to frontend severity
    mapBackendStatusToSeverity(backendStatus) {
        const statusMap = {
            'pingedlow': 'Low',
            'pingedmed': 'Moderate',
            'pingedhigh': 'High'
        };
        return statusMap[backendStatus] || 'Low';
    }

    // Convert ReviewedClaim to ping format
    convertReviewedClaimToPing(reviewedClaim) {
        const severity = this.mapBackendStatusToSeverity(reviewedClaim.status);
        
        // Parse description and todo from comment
        const comment = reviewedClaim.comment || '';
        const parts = comment.split('\n\nTo Do:');
        const description = parts[0] || '';
        const todo = parts[1] || '';

        // Use the backend status directly - it's already in the right format
        // 'pingedlow', 'pingedmed', 'pingedhigh' -> Active
        // 'acknowledged' -> Acknowledged
        // 'resolved' -> Completed
        const frontendStatus = reviewedClaim.status;

        return {
            id: reviewedClaim.id,
            caseNumber: reviewedClaim.casenum,
            caseId: reviewedClaim.id,
            severity: severity,
            description: description,
            todo: todo,
            sender: reviewedClaim.lead_id?.username || 'Unknown User',
            timestamp: new Date(reviewedClaim.review_time),
            status: frontendStatus, // Keep original backend status
            reviewedClaimId: reviewedClaim.id,
            acknowledgedBy: reviewedClaim.acknowledged_by?.username || null,
            acknowledgedAt: reviewedClaim.acknowledge_time ? new Date(reviewedClaim.acknowledge_time) : null,
            resolution: reviewedClaim.acknowledge_comment || null,
            resolvedAt: null
        };
    }

    // Show welcome message when no pings exist
    showWelcomeMessage() {
        // Clear all lists
        this.activePingsList.innerHTML = '<div class="empty-state">No active pings</div>';
        this.acknowledgedPingsList.innerHTML = '<div class="empty-state">No acknowledged pings</div>';
        this.completedPingsList.innerHTML = '<div class="empty-state">No completed pings</div>';
        
        // Reset count badges
        this.updateCountBadges(0, 0);
    }

    // Add or update a ping in state and UI
    addPing(ping) {
        // Add to state
        this.pings.set(ping.id, ping);
        
        // Re-render all pings to ensure they're in the correct sections
        this.renderAllPings();
    }

    // Render a single ping to the UI in a specific container
    renderPing(ping, targetList) {
        const pingElement = document.createElement('div');
        pingElement.className = `ping-item ${ping.read ? 'read' : 'unread'}`;
        pingElement.dataset.pingId = ping.id;
        
        // Build the ping content based on status
        pingElement.innerHTML = this.buildPingContent(ping);
        
        // Add event listeners
        this.setupPingEventListeners(pingElement, ping);
        
        // Append to the target list
        targetList.appendChild(pingElement);
    }
    
    // Update empty state messages for each section
    updateEmptyStates(activeCount, acknowledgedCount, completedCount) {
        this.updateSectionEmptyState(this.activePingsList, activeCount, 'No active pings');
        this.updateSectionEmptyState(this.acknowledgedPingsList, acknowledgedCount, 'No acknowledged pings');
        this.updateSectionEmptyState(this.completedPingsList, completedCount, 'No completed pings');
        
        // Update count badges
        this.updateCountBadges(activeCount, acknowledgedCount);
    }
    
    // Update count badges on tabs
    updateCountBadges(activeCount, acknowledgedCount) {
        const activeCountBadge = document.getElementById('activeCount');
        const acknowledgedCountBadge = document.getElementById('acknowledgedCount');
        
        if (activeCountBadge) {
            activeCountBadge.textContent = activeCount;
            activeCountBadge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
        }
        
        if (acknowledgedCountBadge) {
            acknowledgedCountBadge.textContent = acknowledgedCount;
            acknowledgedCountBadge.style.display = acknowledgedCount > 0 ? 'inline-flex' : 'none';
        }
    }
    
    // Update a single section's empty state
    updateSectionEmptyState(sectionList, count, message) {
        const existingMessage = sectionList.querySelector('.empty-state');
        
        if (count === 0) {
            if (!existingMessage) {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.textContent = message;
                sectionList.appendChild(emptyState);
            }
        } else {
            if (existingMessage) {
                existingMessage.remove();
            }
        }
    }

    buildPingContent(ping) {
        const timeString = ping.timestamp.toLocaleTimeString();
        const statusClass = ping.status || 'pending';
        
        let actionsHTML = '';
        let acknowledgeSection = '';
        
        // Active pings (pending, pingedlow, pingedmed, pingedhigh) show acknowledge button
        if (ping.status === 'pending' || !['acknowledged', 'resolved', 'unpinged'].includes(ping.status)) {
            actionsHTML = `
                <div class="ping-actions">
                    <button class="btn btn-primary btn-acknowledge">Acknowledge</button>
                </div>
            `;
        } else if (ping.status === 'acknowledged') {
            actionsHTML = `
                <div class="ping-actions">
                    <button class="btn btn-success btn-resolve">Mark as Resolved</button>
                    <button class="btn btn-secondary btn-unping">Unping</button>
                </div>
            `;
        } else if (ping.status === 'resolved') {
            // No action buttons for resolved status
            actionsHTML = '';
        } else if (ping.status === 'unpinged') {
            // No action buttons for unpinged status
            actionsHTML = '';
        }
        
        if (ping.status === 'acknowledged' && ping.resolution) {
            acknowledgeSection = `
                <div class="ping-acknowledge-section">
                    <strong>Resolution:</strong>
                    <p>${ping.resolution}</p>
                </div>
            `;
        }
        
        return `
            <div class="ping-header">
                <span class="ping-title">
                    <span class="ping-severity">${ping.severity || 'Low'}</span>
                    Case ${ping.caseNumber || 'Unknown'} - ${ping.title || 'Ping'}
                    <span class="ping-status ${statusClass}">${statusClass}</span>
                </span>
                <span class="ping-time">${timeString}</span>
            </div>
            <div class="ping-content">
                <p><strong>From:</strong> ${ping.sender || 'Unknown User'}</p>
                <p><strong>Description:</strong> ${ping.description || ping.message || 'No description'}</p>
                ${ping.todo ? `<p><strong>To Do:</strong> ${ping.todo}</p>` : ''}
                ${acknowledgeSection}
            </div>
            ${actionsHTML}
        `;
    }

    setupPingEventListeners(pingElement, ping) {
        // Mark as read on click
        pingElement.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                pingElement.classList.remove('unread');
                pingElement.classList.add('read');
                ping.read = true;
            }
        });

        // Acknowledge button
        const acknowledgeBtn = pingElement.querySelector('.btn-acknowledge');
        if (acknowledgeBtn) {
            acknowledgeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAcknowledgeModal(pingElement, ping);
            });
        }

        // Resolve button
        const resolveBtn = pingElement.querySelector('.btn-resolve');
        if (resolveBtn) {
            resolveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resolvePing(pingElement, ping);
            });
        }

        // Unping button
        const unpingBtn = pingElement.querySelector('.btn-unping');
        if (unpingBtn) {
            unpingBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.unping(pingElement, ping);
            });
        }
    }

    showAcknowledgeModal(pingElement, ping) {
        const acknowledgeSection = pingElement.querySelector('.ping-acknowledge-section');
        if (acknowledgeSection) {
            acknowledgeSection.style.display = 'block';
            return;
        }

        // Create acknowledge section
        const section = document.createElement('div');
        section.className = 'ping-acknowledge-section';
        section.innerHTML = `
            <textarea placeholder="What did you fix? (optional)" maxlength="1000"></textarea>
            <div class="ping-actions">
                <button class="btn btn-primary btn-submit-acknowledge">Submit</button>
                <button class="btn btn-secondary btn-cancel-acknowledge">Cancel</button>
            </div>
        `;

        pingElement.querySelector('.ping-content').appendChild(section);

        // Set up event listeners
        const submitBtn = section.querySelector('.btn-submit-acknowledge');
        const cancelBtn = section.querySelector('.btn-cancel-acknowledge');
        const textarea = section.querySelector('textarea');

        submitBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const resolution = textarea.value.trim();
            this.acknowledgePing(pingElement, ping, resolution);
        });

        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            section.remove();
        });
    }

    async acknowledgePing(pingElement, ping, resolution) {
        try {
            // Call backend to acknowledge the ping
            const response = await fetch(`${API_BASE_URL}/api/reviewedclaim/acknowledge/${ping.id}/`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    acknowledge_comment: resolution
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to acknowledge ping' }));
                throw new Error(errorData.error || 'Failed to acknowledge ping');
            }

            const updatedPing = await response.json();
            console.log('Backend response:', updatedPing);

            // Update local ping data with backend response
            ping.status = 'acknowledged';
            ping.acknowledgedBy = localStorage.getItem('username') || 'Current User';
            ping.acknowledgedAt = new Date();
            ping.resolution = resolution;
            
            // Update state
            this.pings.set(ping.id, ping);

            // Re-render all pings to move it to the Acknowledged section
            this.renderAllPings();

            console.log('Ping acknowledged successfully:', ping);

        } catch (error) {
            console.error('Error acknowledging ping:', error);
            alert(`Failed to acknowledge ping: ${error.message}`);
        }
    }

    async resolvePing(pingElement, ping) {
        try {
            // Call backend to resolve the ping
            const response = await fetch(`${API_BASE_URL}/api/reviewedclaim/resolve/${ping.id}/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to resolve ping' }));
                throw new Error(errorData.error || 'Failed to resolve ping');
            }

            const updatedPing = await response.json();
            console.log('Backend response:', updatedPing);

            // Update local ping data
            ping.status = 'resolved';
            ping.resolvedAt = new Date();
            
            // Update state
            this.pings.set(ping.id, ping);

            // Re-render all pings to move it to the Completed section
            this.renderAllPings();

            console.log('Ping resolved successfully:', ping);

        } catch (error) {
            console.error('Error resolving ping:', error);
            alert(`Failed to resolve ping: ${error.message}`);
        }
    }

    async unping(pingElement, ping) {
        try {
            // Remove the ping from the UI
            pingElement.remove();

            // Remove from state
            this.pings.delete(ping.id);

            console.log('Ping removed:', ping);

        } catch (error) {
            console.error('Error unpinging:', error);
            alert('Failed to unping');
        }
    }

    // Get ping by ID from state
    getPingById(pingId) {
        return this.pings.get(pingId);
    }

    // Get all pings from state
    getAllPings() {
        return Array.from(this.pings.values());
    }

    // WebSocket methods for real-time updates
    initializeWebSocket() {
        try {
            // Use the same 'caseflow' channel as other components
            this.websocket = websocketManager.getConnection('caseflow');
            
            if (!this.websocket) {
                console.log('Waiting for caseflow WebSocket connection...');
            }
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }

    handleWebSocketMessage(data) {
        console.log('Received WebSocket message (pings):', data);
        
        // Skip auth messages
        if (data.type === 'auth') return;
        
        switch (data.type) {
            case 'ping':
                if (data.event === 'create') {
                    // New ping created
                    this.addPing(data.ping);
                } else if (data.event === 'update') {
                    // Ping updated (acknowledged, resolved, etc.)
                    this.updatePing(data.ping);
                } else if (data.event === 'delete') {
                    // Ping deleted/unpinged
                    this.removePing(data.pingId);
                }
                break;
            default:
                console.log('Unknown WebSocket message type for pings:', data.type);
        }
    }

    updatePing(pingData) {
        // Update state
        this.pings.set(pingData.id, pingData);
        
        // Re-render all pings since status change may move ping to different section
        this.renderAllPings();
    }

    removePing(pingId) {
        // Try to find and remove the ping element from any of the lists
        const lists = [this.activePingsList, this.acknowledgedPingsList, this.completedPingsList];
        for (const list of lists) {
            const pingElement = list.querySelector(`[data-ping-id="${pingId}"]`);
            if (pingElement) {
                pingElement.remove();
                break;
            }
        }
        
        // Remove from state
        this.pings.delete(pingId);
        
        // Update empty states
        this.renderAllPings();
    }

    // Send ping via WebSocket (for real-time updates)
    sendPingViaWebSocket(ping) {
        const sent = websocketManager.send('caseflow', {
            type: 'ping',
            event: 'create',
            ping: ping
        });
        
        if (!sent) {
            console.warn('Failed to send ping via WebSocket');
        }
    }

    // Send ping update via WebSocket
    sendPingUpdateViaWebSocket(ping) {
        const sent = websocketManager.send('caseflow', {
            type: 'ping',
            event: 'update',
            ping: ping
        });
        
        if (!sent) {
            console.warn('Failed to send ping update via WebSocket');
        }
    }

    // Clean up WebSocket connection when component is destroyed
    destroy() {
        // WebSocket is managed by websocketManager and shared with other components
        // No manual cleanup needed
    }
} 