export default class ClaimCase {
    constructor() {
        this.claimSection = document.getElementById('claimSection');
        this.casesContainer = document.getElementById('casesContainer');
        this.claimModal = document.getElementById('claimModal');
        this.caseNumberInput = document.getElementById('caseNumberInput');
        
        this.initialize();
    }

    initialize() {
        // Add event listeners
        document.querySelector('.btn-claim').addEventListener('click', () => this.promptForClaim());
        document.getElementById('claimModal').querySelector('.btn-claim').addEventListener('click', () => this.submitClaim());
        document.getElementById('claimModal').querySelector('.btn-unclaim').addEventListener('click', () => this.closeModal());
    }

    promptForClaim() {
        this.claimModal.style.display = 'flex';
        this.caseNumberInput.focus();
    }

    closeModal() {
        this.claimModal.style.display = 'none';
        this.caseNumberInput.value = '';
    }

    submitClaim() {
        const caseNumber = this.caseNumberInput.value.trim();
        if (caseNumber) {
            const userName = "Aditya Prakash"; // This could be made dynamic later
            this.createCaseCard(caseNumber, userName);
            this.closeModal();
        }
    }

    createCaseCard(caseNumber, userName) {
        const card = document.createElement('div');
        card.className = 'case-card';
        card.innerHTML = `
            <div class="case-header">
                <img src="path/to/default-avatar.png" class="user-avatar" alt="User Avatar">
                <span class="case-number">${caseNumber}</span>
            </div>
            <div class="status-text">
                Is being worked on by <span class="user-tag">@${userName}</span>
            </div>
            <div class="claimed-info">
                Claimed • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div class="button-group">
                <button class="btn btn-complete">Complete</button>
                <button class="btn btn-unclaim">Unclaim</button>
            </div>
        `;

        // Add event listeners to the buttons
        card.querySelector('.btn-complete').addEventListener('click', () => this.completeCase(caseNumber));
        card.querySelector('.btn-unclaim').addEventListener('click', () => this.unclaimCase(caseNumber));

        this.casesContainer.appendChild(card);
    }

    completeCase(caseNumber) {
        const card = event.target.closest('.case-card');
        if (card) {
            const userName = card.querySelector('.user-tag').textContent;
            // Dispatch a custom event that CompletedCases can listen to
            const completedEvent = new CustomEvent('case-completed', {
                detail: { caseNumber, userName }
            });
            document.dispatchEvent(completedEvent);
            card.remove();
        }
    }

    unclaimCase(caseNumber) {
        const card = event.target.closest('.case-card');
        if (card) {
            card.remove();
        }
    }
} 