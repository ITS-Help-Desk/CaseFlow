// File: src/components/cases/claim-case.js
// Purpose: Manages active case claiming, unclaiming, and completion locally
// Dependencies: None
// Author: Aditya Prakash

export default class ClaimCase {
    constructor() {
        this.claimSection = document.getElementById('claimSection');
        this.casesContainer = document.getElementById('casesContainer');
        this.claimModal = document.getElementById('claimModal');
        
        // Set up modal structure first
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
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel">Cancel</button>
                    <button class="btn btn-submit">Claim</button>
                </div>
            </div>
        `;

        // Get input element after HTML is set
        this.caseNumberInput = document.getElementById('caseNumberInput');
        
        // Bind methods
        this.promptForClaim = this.promptForClaim.bind(this);
        this.submitClaim = this.submitClaim.bind(this);
        this.closeModal = this.closeModal.bind(this);
        
        this.initialize();
    }

    initialize() {
        // Add event listeners for the main claim button
        const claimButtons = document.querySelectorAll('.btn-claim');
        claimButtons.forEach(button => {
            button.addEventListener('click', this.promptForClaim);
        });

        // Modal buttons
        const submitButton = this.claimModal.querySelector('.btn-submit');
        submitButton?.addEventListener('click', this.submitClaim);

        const cancelButton = this.claimModal.querySelector('.btn-cancel');
        cancelButton?.addEventListener('click', this.closeModal);

        const closeButton = this.claimModal.querySelector('.close-button');
        closeButton?.addEventListener('click', this.closeModal);

        // Keyboard events
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
    }

    promptForClaim() {
        if (this.claimModal) {
            this.claimModal.style.display = 'flex';
            this.caseNumberInput.value = '';
            this.caseNumberInput.focus();
        }
    }

    closeModal() {
        if (this.claimModal) {
            this.claimModal.style.display = 'none';
            this.caseNumberInput.value = '';
        }
    }

    submitClaim() {
        try {
            const caseNumber = this.caseNumberInput.value.trim();
            if (!caseNumber) {
                this.errorMessage.textContent = 'Please enter a case number';
                return;
            }

            if (this.isDuplicateCase(caseNumber)) {
                this.errorMessage.textContent = 'This case has already been claimed';
                return;
            }

            const userName = "Aditya Prakash";
            this.createCaseCard(caseNumber, userName);
            this.closeModal();
        } catch (error) {
            this.errorMessage.textContent = 'An error occurred while claiming the case.';
            console.error('Claim error:', error);
        }
    }

    isDuplicateCase(caseNumber) {
        const existingCases = this.casesContainer.querySelectorAll('.case-number');
        return Array.from(existingCases).some(caseEl => caseEl.textContent === caseNumber);
    }

    createCaseCard(caseNumber, userName) {
        const card = document.createElement('div');
        card.className = 'case-card';
        card.innerHTML = `
            <div class="case-info">
                <div class="case-header">
                    <span class="case-number">${caseNumber}</span>
                    <span class="status-text">Is being worked on by <span class="user-tag">@${userName}</span></span>
                </div>
                <div class="case-meta">
                    <span class="claimed-label">Claimed by ${userName}</span>
                    <span class="claimed-dot">•</span>
                    <span class="claimed-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

    completeCase(card) {
        if (card) {
            const caseNumber = card.querySelector('.case-number').textContent;
            const userTag = card.querySelector('.user-tag');
            const userName = userTag ? userTag.textContent.replace('@', '') : 'Unknown User';
            
            // Add fade-out animation
            card.classList.add('fade-out');
            
            // Wait for animation to complete before removing and dispatching event
            setTimeout(() => {
                // Dispatch custom event for completed cases
                const completedEvent = new CustomEvent('case-completed', {
                    detail: {
                        caseNumber,
                        userName,
                        timestamp: new Date()
                    }
                });
                document.dispatchEvent(completedEvent);
                
                card.remove();
            }, 200); // Match the CSS transition duration
        }
    }

    unclaimCase(card) {
        if (card) {
            // Add fade-out animation
            card.classList.add('fade-out');
            
            // Wait for animation to complete before removing
            setTimeout(() => {
                card.remove();
            }, 200); // Match the CSS transition duration
        }
    }
} 