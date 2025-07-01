/**
 * CompletedCases Component
 * 
 * Manages the display and interaction of completed cases in the application.
 * This component handles:
 * - Loading completed cases from Django API
 * - Displaying completed cases in a list
 * - QA functionality for completed cases
 * - Review submission to backend
 * - Animations and transitions for case cards
 * - Scroll behavior management
 */

// Add base URL for API endpoints
const API_BASE_URL = 'http://10.41.16.153:8000';

export default class CompletedCases {
    /**
     * Initialize the CompletedCases component
     * Sets up DOM references and event listeners
     */
    constructor() {
        // Main container references
        this.completedContainer = document.getElementById('completedContainer');
        this.completedView = document.getElementById('completedView');
        this.websocket = null;
        
        this.initialize();
        this.loadCompletedCases();
        this.initializeWebSocket();
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

    // Load completed cases from API
    async loadCompletedCases() {
        try {
            console.log('Loading completed cases from:', `${API_BASE_URL}/api/completeclaim/list/`);
            
            const response = await fetch(`${API_BASE_URL}/api/completeclaim/list/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            console.log('Load completed cases response status:', response.status);
            
            // Get response text first to see what we're actually getting
            const responseText = await response.text();
            console.log('Load completed cases raw response:', responseText);

            if (!response.ok) {
                let errorMessage = `Failed to load completed cases: ${response.status}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch (e) {
                    console.error('Non-JSON error response:', responseText);
                }
                throw new Error(errorMessage);
            }

            // Try to parse as JSON
            let cases;
            try {
                cases = JSON.parse(responseText);
            } catch (e) {
                console.error('Completed cases response is not valid JSON:', responseText);
                throw new Error('Server returned invalid JSON response');
            }

            this.displayCompletedCases(cases);
        } catch (error) {
            console.error('Error loading completed cases:', error);
            // Don't show error to user for loading, just log it
        }
    }

    // Display completed cases from API data
    displayCompletedCases(cases) {
        // Clear existing cases
        this.completedContainer.innerHTML = '';
        
        // Debug: Log the API response to see the actual structure
        console.log('API Response for completed cases:', cases);
        if (cases.length > 0) {
            console.log('First completed case data structure:', cases[0]);
        }
        
        cases.forEach(caseData => {
            this.createCompletedCaseCard(caseData);
        });
    }

    /**
     * Set up event listeners and initialize the component
     * Handles view switching and case completion events
     */
    initialize() {
        // View switching event listeners
        document.querySelector('[data-view="completed"]').addEventListener('click', () => this.showCompletedView());
        document.querySelector('[data-view="claim"]').addEventListener('click', () => this.hideCompletedView());
        
        // Listen for case completion events from other components
        document.addEventListener('case-completed', (event) => {
            const { caseNumber, userName, timestamp } = event.detail;
            this.addCompletedCase(caseNumber, userName, timestamp);
        });
    }

    /**
     * Show the completed cases view and update UI state
     */
    showCompletedView() {
        document.getElementById('claimView').style.display = 'none';
        this.completedView.style.display = 'block';
        // Update active states in sidebar
        document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
        document.querySelector('[data-view="completed"]').classList.add('active');
        
        // Reload completed cases when switching to this view
        this.loadCompletedCases();
    }

    /**
     * Hide the completed cases view and update UI state
     */
    hideCompletedView() {
        document.getElementById('claimView').style.display = 'block';
        this.completedView.style.display = 'none';
        // Update active states in sidebar
        document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
        document.querySelector('[data-view="claim"]').classList.add('active');
    }

    /**
     * Create a completed case card from API data
     * @param {Object} caseData - The case data from the API
     */
    createCompletedCaseCard(caseData) {
        // Debug: Log the case data to see what fields are available
        console.log('Creating completed case card with data:', caseData);
        console.log('Available user fields:', {
            user: caseData.user,
            user_name: caseData.user_name,
            username: caseData.username,
            tech: caseData.tech,
            'claim.lead_id.username': caseData.claim && caseData.claim.lead_id && caseData.claim.lead_id.username,
            'lead_id.username': caseData.lead_id && caseData.lead_id.username,
            'claim.user': caseData.claim && caseData.claim.user
        });
        
        const card = document.createElement('div');
        card.className = 'case-card';
        card.dataset.caseNumber = caseData.casenum || caseData.case_number;
        card.dataset.caseId = caseData.id; // Store the database ID for API operations
        
        // Get user info from the case data
        // For WebSocket data: data.user (from claim.lead_id.username)
        // For API response: might have user_name, username, tech, etc.
        // Also check nested structures like claim.lead_id.username
        const userName = caseData.user || 
                        caseData.user_name || 
                        caseData.username || 
                        caseData.tech || 
                        (caseData.claim && caseData.claim.lead_id && caseData.claim.lead_id.username) ||
                        (caseData.lead_id && caseData.lead_id.username) ||
                        (caseData.claim && caseData.claim.user) ||
                        'Unknown User';
        const completedTime = caseData.complete_time || caseData.claim_time || caseData.timestamp ? 
            new Date(caseData.complete_time || caseData.claim_time || caseData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const caseNumber = caseData.casenum || caseData.case_number || caseData.number || 'Unknown';
        
        card.innerHTML = `
            <div class="case-details">
                <div class="profile-icon">
                    <div class="profile-placeholder">
                        <i class="fas fa-user"></i>
                    </div>
                </div>
                <div class="case-info">
                    <div class="case-header">
                        <span class="case-number">${caseNumber}</span>
                        <span class="status-text">Is completed by <span class="user-tag">@${userName}</span></span>
                    </div>
                    <div class="case-meta">
                        <span class="completed-label">Completed by ${userName}</span>
                        <span class="completed-dot">•</span>
                        <span class="completed-time">${completedTime}</span>
                    </div>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn btn-approve" title="Approve">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/>
                    </svg>
                </button>
                <button class="btn btn-qa" title="Add QA Comments">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                </button>
                <button class="btn btn-neutral" title="Done">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
                    </svg>
                </button>
                <button class="btn btn-reject" title="Ping">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
                    </svg>
                </button>
            </div>
            <div class="comment-actions" style="display: none;">
                <button class="btn btn-secondary btn-cancel">Cancel</button>
                <button class="btn btn-primary btn-submit">Submit</button>
            </div>
            <div class="comment-section" style="display: none;">
                <textarea 
                    class="comment-input" 
                    placeholder="Add your QA comments here..."
                ></textarea>
            </div>
        `;

        // Get references to card elements
        const qaButton = card.querySelector('.btn-qa');
        const cancelButton = card.querySelector('.btn-cancel');
        const commentSection = card.querySelector('.comment-section');
        const cardActions = card.querySelector('.card-actions');
        const commentActions = card.querySelector('.comment-actions');
        const approveButton = card.querySelector('.btn-approve');
        const neutralButton = card.querySelector('.btn-neutral');
        const rejectButton = card.querySelector('.btn-reject');
        const container = this.completedContainer;

        // Store original actions
        const originalActionsHTML = cardActions.innerHTML;

        // Create comment actions HTML
        const commentActionsHTML = `
            <button class="btn btn-secondary btn-cancel">Cancel</button>
            <button class="btn btn-primary btn-submit">Submit</button>
        `;

        // Handle approve button click
        approveButton.addEventListener('click', () => this.reviewCase(card, 'approved', ''));

        // Handle done button click
        neutralButton.addEventListener('click', () => this.reviewCase(card, 'reviewed', ''));

        // Handle reject/ping button click
        rejectButton.addEventListener('click', () => this.reviewCase(card, 'rejected', ''));

        // Handle QA button click
        qaButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click events
            
            const card = e.currentTarget.closest('.case-card');
            const commentSection = card.querySelector('.comment-section');
            const commentInput = card.querySelector('.comment-input');
            const cardActions = card.querySelector('.card-actions');
            
            // Show comment section and swap buttons
            commentSection.style.display = 'block';
            card.classList.add('with-comment');
            commentInput.focus();
            cardActions.innerHTML = commentActionsHTML;

            // Add event listeners for new buttons
            card.querySelector('.btn-cancel').addEventListener('click', (e) => {
                e.stopPropagation();
                commentSection.style.display = 'none';
                card.classList.remove('with-comment');
                cardActions.innerHTML = originalActionsHTML;
                // Re-attach original listeners - this is complex, let's re-query for simplicity
                this.rebindCardActions(card);
            });

            card.querySelector('.btn-submit').addEventListener('click', (e) => {
                e.stopPropagation();
                const comment = commentInput.value.trim();
                if (comment) {
                    this.reviewCase(card, 'commented', comment);
                }
            });
        });

        this.completedContainer.appendChild(card);
    }

    rebindCardActions(card) {
        const qaButton = card.querySelector('.btn-qa');
        if (qaButton) {
             // The old listener is gone, so we re-bind it.
             // This is a simplified approach. A more robust solution might use event delegation.
            qaButton.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const currentCard = e.currentTarget.closest('.case-card');
                const commentSection = currentCard.querySelector('.comment-section');
                const commentInput = currentCard.querySelector('.comment-input');
                const cardActions = currentCard.querySelector('.card-actions');
                
                const originalActionsHTML = cardActions.innerHTML;
                const commentActionsHTML = `
                    <button class="btn btn-secondary btn-cancel">Cancel</button>
                    <button class="btn btn-primary btn-submit">Submit</button>
                `;

                commentSection.style.display = 'block';
                currentCard.classList.add('with-comment');
                commentInput.focus();
                cardActions.innerHTML = commentActionsHTML;

                currentCard.querySelector('.btn-cancel').addEventListener('click', (e) => {
                    e.stopPropagation();
                    commentSection.style.display = 'none';
                    currentCard.classList.remove('with-comment');
                    cardActions.innerHTML = originalActionsHTML;
                    this.rebindCardActions(currentCard);
                });

                currentCard.querySelector('.btn-submit').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const comment = commentInput.value.trim();
                    if (comment) {
                        this.reviewCase(currentCard, 'commented', comment);
                    }
                });
            });
        }

        const approveButton = card.querySelector('.btn-approve');
        if(approveButton) approveButton.addEventListener('click', () => this.reviewCase(card, 'approved', ''));
        
        const neutralButton = card.querySelector('.btn-neutral');
        if(neutralButton) neutralButton.addEventListener('click', () => this.reviewCase(card, 'reviewed', ''));
        
        const rejectButton = card.querySelector('.btn-reject');
        if(rejectButton) rejectButton.addEventListener('click', () => this.reviewCase(card, 'rejected', ''));
    }

    /**
     * Submit a review for a completed case to the Django API
     * @param {HTMLElement} card - The case card element
     * @param {string} status - The review status ('approved', 'rejected', 'reviewed')
     * @param {string} comment - Optional comment for the review
     */
    async reviewCase(card, status, comment = '') {
        if (!card) return;

        try {
            const caseId = card.dataset.caseId;
            const caseNumber = card.dataset.caseNumber;

            console.log('Reviewing case:', { caseId, caseNumber, status, comment });

            const response = await fetch(`${API_BASE_URL}/api/completeclaim/review/${caseId}/`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    status: status,
                    comment: comment
                })
            });

            console.log('Review response status:', response.status);

            // Get response text first to see what we're actually getting
            const responseText = await response.text();
            console.log('Review raw response:', responseText);

            if (!response.ok) {
                let errorMessage = `Failed to review case: ${response.status}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch (e) {
                    console.error('Non-JSON error response:', responseText);
                }
                throw new Error(errorMessage);
            }

            // Add fade-out animation and remove card
            card.classList.add('fade-out');
            setTimeout(() => {
                card.remove();
            }, 200);

        } catch (error) {
            console.error('Error reviewing case:', error);
            alert('Failed to review case. Please try again.');
        }
    }

    /**
     * Add a new completed case to the view (called from other components)
     * @param {string} caseNumber - The unique identifier for the case
     * @param {string} userName - The name of the user who completed the case
     * @param {Date} timestamp - When the case was completed
     */
    addCompletedCase(caseNumber, userName, timestamp = new Date()) {
        // This method is called when a case is completed from the active cases
        // We'll create a temporary case object for immediate display
        const tempCaseData = {
            casenum: caseNumber,
            user_name: userName,
            complete_time: timestamp.toISOString(),
            id: `temp_${Date.now()}` // Temporary ID
        };

        this.createCompletedCaseCard(tempCaseData);
        
        // Optionally reload from API to get the actual data
        // setTimeout(() => this.loadCompletedCases(), 1000);
    }

    // WebSocket methods for real-time updates
    initializeWebSocket() {
        try {
            // Use ws:// for development, wss:// for production
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = '10.41.16.153:8000'; // Your API host
            this.websocket = new WebSocket(`${wsProtocol}//${wsHost}/ws/caseflow/`);

            this.websocket.onopen = () => {
                console.log('WebSocket connected to caseflow channel (completed cases)');
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.websocket.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                // Attempt to reconnect after 3 seconds
                setTimeout(() => {
                    console.log('Attempting to reconnect WebSocket...');
                    this.initializeWebSocket();
                }, 3000);
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }

    handleWebSocketMessage(data) {
        console.log('Received WebSocket message (completed cases):', data);
        
        switch (data.type) {
            case 'completeclaim':
                if (data.event === 'begin-review') {
                    // Someone started reviewing a case - add it to completed cases view
                    this.createCompletedCaseCard(data);
                } else if (data.event === 'review') {
                    // Someone finished reviewing a case - remove it from completed cases view
                    this.removeCompletedCaseFromUI(data.casenum);
                }
                break;
            case 'activeclaim':
                if (data.event === 'complete') {
                    // Someone completed a case - add it to completed cases view
                    this.createCompletedCaseCard(data);
                }
                break;
            default:
                console.log('Unknown WebSocket message type for completed cases:', data.type);
        }
    }

    removeCompletedCaseFromUI(caseNumber) {
        const card = this.completedContainer.querySelector(`[data-case-number="${caseNumber}"]`);
        if (card) {
            card.classList.add('fade-out');
            setTimeout(() => {
                card.remove();
            }, 200);
        }
    }

    // Clean up WebSocket connection when component is destroyed
    destroy() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }
} 