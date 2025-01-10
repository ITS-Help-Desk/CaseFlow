export default class CompletedCases {
    constructor() {
        this.completedContainer = document.getElementById('completedContainer');
        this.completedView = document.getElementById('completedView');
        
        this.initialize();
    }

    initialize() {
        // Add event listener for the completed cases tab
        document.querySelector('[data-view="completed"]').addEventListener('click', () => this.showCompletedView());
        // Add event listener for the claim tab to hide completed view
        document.querySelector('[data-view="claim"]').addEventListener('click', () => this.hideCompletedView());
        
        // Listen for completed cases
        document.addEventListener('case-completed', (event) => {
            const { caseNumber, userName } = event.detail;
            this.addCompletedCase(caseNumber, userName);
        });
    }

    showCompletedView() {
        document.getElementById('claimView').style.display = 'none';
        this.completedView.style.display = 'block';
        // Update active states
        document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
        document.querySelector('[data-view="completed"]').classList.add('active');
    }

    hideCompletedView() {
        document.getElementById('claimView').style.display = 'block';
        this.completedView.style.display = 'none';
        // Update active states
        document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
        document.querySelector('[data-view="claim"]').classList.add('active');
    }

    addCompletedCase(caseNumber, userName) {
        const completedItem = document.createElement('div');
        completedItem.className = 'completed-list-item';
        
        completedItem.innerHTML = `
            <span class="completed-case-number">${caseNumber}</span>
            <span class="user-tag">${userName}</span>
            <span class="completed-info">
                Completed • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        `;
        
        this.completedContainer.insertBefore(completedItem, this.completedContainer.firstChild);
    }
} 