// File: src/components/cases/claim-case.js
// Purpose: Manages active case claiming, unclaiming, and completion with API integration
// Dependencies: Django REST API
// Author: Aditya Prakash

// Import API configuration
import { API_BASE_URL } from '../../../config.js';

export default class ClaimCase {
    constructor() {
        // Initialize DOM elements
        this.claimSection = document.getElementById('claimSection');
        this.casesContainer = document.getElementById('casesContainer');
        this.claimModal = document.getElementById('claimModal');
        this.websocket = null;
        this.pendingClaims = new Set();

        // Set up modal structure
        this.setupModal();
        
        // Get input elements after HTML is set
        this.caseNumberInput = document.getElementById('caseNumberInput');
        this.errorMessage = document.getElementById('claimErrorMessage');
        
        // Bind methods to maintain context
        this.promptForClaim = this.promptForClaim.bind(this);
        this.submitClaim = this.submitClaim.bind(this);
        this.closeModal = this.closeModal.bind(this);
        
        // Initialize components
        this.initialize();
        this.loadActiveCases();
        this.initializeWebSocket();
    }

    setupModal() {
        this.claimModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Claim Case</h2>
                    <button class="close-button">×</button>
                </div>
                <div class="modal-body">
                    <div class="input-group">
                        <label>Case Number</label>
                        <input 
                            type="text" 
                            id="caseNumberInput" 
                            placeholder="Enter case number"
                            autocomplete="off"
                        />
                    </div>
                    <div class="error-message" id="claimErrorMessage"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel">Cancel</button>
                    <button class="btn btn-submit">Claim</button>
                </div>
            </div>
        `;
    }

    initialize() {
        // Add event listeners for claim buttons
        const claimButtons = document.querySelectorAll('.btn-claim');
        claimButtons.forEach(button => {
            button.addEventListener('click', this.promptForClaim);
        });

        // Modal button event listeners
        const submitButton = this.claimModal.querySelector('.btn-submit');
        const cancelButton = this.claimModal.querySelector('.btn-cancel');
        const closeButton = this.claimModal.querySelector('.close-button');

        submitButton?.addEventListener('click', this.submitClaim);
        cancelButton?.addEventListener('click', this.closeModal);
        closeButton?.addEventListener('click', this.closeModal);

        // Keyboard event listeners
        this.caseNumberInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitClaim();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.claimModal.style.display === 'flex') {
                this.closeModal();
            }
        });

        document.addEventListener('show-claim-view', () => this.loadActiveCases());
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

    // Load active cases from API
    async loadActiveCases() {
        try {
            console.log('Loading cases from:', `${API_BASE_URL}/api/activeclaim/list/`);
            
            const response = await fetch(`${API_BASE_URL}/api/activeclaim/list/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            console.log('Load cases response status:', response.status);
            
            // Get response text first to see what we're actually getting
            const responseText = await response.text();
            console.log('Load cases raw response:', responseText);

            if (!response.ok) {
                let errorMessage = `Failed to load cases: ${response.status}`;
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
                console.error('Cases response is not valid JSON:', responseText);
                throw new Error('Server returned invalid JSON response');
            }

            this.displayActiveCases(cases);
        } catch (error) {
            console.error('Error loading active cases:', error);
            // Don't show error to user for loading, just log it
            // this.showError('Failed to load active cases');
        }
    }

    // Display active cases from API data
    displayActiveCases(cases) {
        // Clear existing cases
        // this.casesContainer.innerHTML = '';
        
        // Debug: Log the API response to see the actual structure
        console.log('API Response for active cases:', cases);
        if (cases.length > 0) {
            console.log('First case data structure:', cases[0]);
        }

        const caseNumbersFromServer = new Set(cases.map(c => String(c.casenum)));
        const domCards = this.casesContainer.querySelectorAll('.case-card');
        const domCaseNumbers = new Set(Array.from(domCards).map(card => card.dataset.caseNumber));

        // Remove cards from the DOM that are no longer on the server
        domCards.forEach(card => {
            if (!caseNumbersFromServer.has(card.dataset.caseNumber)) {
                card.remove();
            }
        });

        // Add new cases from the server that aren't in the DOM yet
        cases.forEach(caseData => {
            if (!domCaseNumbers.has(String(caseData.casenum))) {
                this.createCaseCard(caseData);
            }
        });
    }

    promptForClaim() {
        this.claimModal.style.display = 'flex';
        this.caseNumberInput.value = '';
        this.errorMessage.textContent = '';
        this.errorMessage.style.display = 'none';
        this.caseNumberInput.focus();
    }

    closeModal() {
        this.claimModal.style.display = 'none';
        this.caseNumberInput.value = '';
        this.errorMessage.textContent = '';
        this.errorMessage.style.display = 'none';
    }

    async submitClaim() {
        try {
            const caseNumber = this.caseNumberInput.value.trim();
            if (!caseNumber) {
                this.showError('Please enter a case number');
                return;
            }

            this.pendingClaims.add(caseNumber);
            const submitButton = this.claimModal.querySelector('.btn-submit');
            submitButton.disabled = true;
            submitButton.textContent = 'Claiming...';

            console.log('Making request to:', `${API_BASE_URL}/api/activeclaim/create/${caseNumber}/`);
            console.log('With headers:', this.getAuthHeaders());

            const response = await fetch(`${API_BASE_URL}/api/activeclaim/create/${caseNumber}/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            // Get response text first to see what we're actually getting
            const responseText = await response.text();
            console.log('Raw response:', responseText);

            if (!response.ok) {
                // Try to parse as JSON, but if it fails, show the raw text
                let errorMessage = `Server returned ${response.status}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch (e) {
                    // If it's not JSON, it's probably an HTML error page
                    errorMessage = `Server error: ${response.status} - Check console for details`;
                    console.error('Non-JSON response:', responseText);
                }
                throw new Error(errorMessage);
            }

            // Try to parse the successful response as JSON
            let claimedCase;
            try {
                claimedCase = JSON.parse(responseText);
            } catch (e) {
                console.error('Response is not valid JSON:', responseText);
                throw new Error('Server returned invalid JSON response');
            }
            
            // Add the new case to the UI
            this.createCaseCard(claimedCase);
            this.closeModal();
            
        } catch (error) {
            this.showError(error.message || 'An error occurred while claiming the case.');
            console.error('Claim error:', error);
        } finally {
            const submitButton = this.claimModal.querySelector('.btn-submit');
            submitButton.disabled = false;
            submitButton.textContent = 'Claim';
            this.pendingClaims.delete(this.caseNumberInput.value.trim());
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }

    createCaseCard(caseData) {
        // Debug: Log the case data to see what fields are available
        console.log('Creating case card with data:', caseData);
        
        const card = document.createElement('div');
        card.className = 'case-card';
        card.dataset.caseNumber = caseData.casenum; // Store the case number for future operations
        
        // Get user info from the case data
        // For WebSocket data: data.user (from claim.lead_id.username)
        // For API response: might have user_name, username, etc.
        const userName = caseData.user_id?.username || 'Unknown User';
        const claimedTime = caseData.claim_time ? 
            new Date(caseData.claim_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Debug: Log what we're using for display
        console.log('Case number field (caseData.casenum):', caseData.casenum);
        console.log('Alternative case number field (caseData.case_number):', caseData.case_number);
        console.log('All available fields:', Object.keys(caseData));
        
        const caseNumber = caseData.casenum || caseData.case_number || caseData.number || 'Unknown';
        
        card.innerHTML = `
            <div class="profile-icon">
                <div class="profile-placeholder">
                    <i class="fas fa-user"></i>
                </div>
            </div>
            <div class="case-info">
                <div class="case-header">
                    <span class="case-number">${caseNumber}</span>
                </div>
                <div class="case-meta">
                    <span class="claimed-label">Claimed by ${userName}</span>
                    <span class="claimed-dot">•</span>
                    <span class="claimed-time">${claimedTime}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn btn-complete" data-text="Complete">
                    <i class="fas fa-check"></i>
                    <text>Complete</text>
                </button>
                <button class="btn btn-unclaim" data-text="Unclaim">
                    <i class="fas fa-times"></i>
                    <text>Unclaim</text>
                </button>
            </div>
        `;

        card.querySelector('.btn-complete').addEventListener('click', () => this.completeCase(card));
        card.querySelector('.btn-unclaim').addEventListener('click', () => this.unclaimCase(card));

        this.casesContainer.appendChild(card);
    }

    async completeCase(card) {
        if (!card) return;

        try {
            const caseNumber = card.dataset.caseNumber;
            const caseNumberDisplay = card.querySelector('.case-number').textContent;
            const userTag = card.querySelector('.user-tag');
            const userName = userTag ? userTag.textContent.replace('@', '') : 'Unknown User';

            // Add loading state
            const completeButton = card.querySelector('.btn-complete');
            completeButton.disabled = true;
            completeButton.textContent = 'Completing...';

            const response = await fetch(`${API_BASE_URL}/api/activeclaim/complete/${caseNumber}/`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to complete case');
            }

            // Add fade-out animation
            card.classList.add('fade-out');
            
            // Wait for animation to complete before removing and dispatching event
            setTimeout(() => {
                // Dispatch custom event for completed cases
                /* const completedEvent = new CustomEvent('case-completed', {
                    detail: {
                        caseNumber: caseNumberDisplay,
                        userName,
                        timestamp: new Date()
                    }
                });
                document.dispatchEvent(completedEvent); */
                
                card.remove();
            }, 200); // Match the CSS transition duration

        } catch (error) {
            console.error('Error completing case:', error);
            // Reset button state
            const completeButton = card.querySelector('.btn-complete');
            completeButton.disabled = false;
            completeButton.innerHTML = '<i class="fas fa-check"></i><text>Complete</text>';
            alert('Failed to complete case. Please try again.');
        }
    }

    async unclaimCase(card) {
        if (!card) return;

        try {
            const caseNumber = card.dataset.caseNumber;

            // Add loading state
            const unclaimButton = card.querySelector('.btn-unclaim');
            unclaimButton.disabled = true;
            unclaimButton.textContent = 'Unclaiming...';

            const response = await fetch(`${API_BASE_URL}/api/activeclaim/unclaim/${caseNumber}/`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to unclaim case');
            }

            // Add fade-out animation
            card.classList.add('fade-out');
            
            // Wait for animation to complete before removing
            setTimeout(() => {
                card.remove();
            }, 200); // Match the CSS transition duration

        } catch (error) {
            console.error('Error unclaiming case:', error);
            // Reset button state
            const unclaimButton = card.querySelector('.btn-unclaim');
            unclaimButton.disabled = false;
            unclaimButton.innerHTML = '<i class="fas fa-times"></i><text>Unclaim</text>';
            alert('Failed to unclaim case. Please try again.');
        }
    }

    // WebSocket methods for real-time updates
    initializeWebSocket() {
        try {
            // Use ws:// for development, wss:// for production
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = '10.41.16.153:8000'; // Your API host
            this.websocket = new WebSocket(`${wsProtocol}//${wsHost}/ws/caseflow/`);

            this.websocket.onopen = () => {
                console.log('WebSocket connected to caseflow channel');
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
        console.log('Received WebSocket message:', data);
        
        switch (data.type) {
            case 'activeclaim':
                if (data.event === 'claim') {
                    const currentUser = localStorage.getItem('username');
                    const claimerUser = data.user; // From API: claim.lead_id.username
                    
                    console.log('Claim event - Current user:', currentUser);
                    console.log('Claim event - Claimer user:', claimerUser);
                    
                    // Skip if this is a case we're currently claiming (to avoid duplicates with API response)
                    if (this.pendingClaims.has(data.casenum)) {
                        console.log('Skipping WebSocket update for pending claim:', data.casenum);
                        return;
                    }
                    
                    // Check if this case already exists in the UI to avoid duplicates
                    const existingCard = this.casesContainer.querySelector(`[data-case-number="${data.casenum}"]`);
                    
                    if (!existingCard) {
                        // Case doesn't exist in UI yet - add it
                        console.log('Adding case via WebSocket:', data.casenum);
                        this.createCaseCard(data);
                    } else {
                        console.log('Case already exists in UI, skipping duplicate:', data.casenum);
                    }
                } else if (data.event === 'complete') {
                    // Someone completed a case - remove it from the UI
                    this.removeCaseFromUI(data.casenum);
                } else if (data.event === 'unclaimed') {
                    // Someone unclaimed a case - remove it from the UI
                    this.removeCaseFromUI(data.casenum);
                }
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    removeCaseFromUI(caseNumber) {
        const card = this.casesContainer.querySelector(`[data-case-number="${caseNumber}"]`);
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