/**
 * CompletedCases Component
 * 
 * Manages the display and interaction of completed cases in the application.
 * This component handles:
 * - Displaying completed cases in a list
 * - QA functionality for completed cases
 * - Animations and transitions for case cards
 * - Scroll behavior management
 */
export default class CompletedCases {
    /**
     * Initialize the CompletedCases component
     * Sets up DOM references and event listeners
     */
    constructor() {
        // Main container references
        this.completedContainer = document.getElementById('completedContainer');
        this.completedView = document.getElementById('completedView');
        
        this.initialize();
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
     * Add a new completed case to the view
     * @param {string} caseNumber - The unique identifier for the case
     * @param {string} userName - The name of the user who completed the case
     * @param {Date} timestamp - When the case was completed
     */
    addCompletedCase(caseNumber, userName, timestamp = new Date()) {
        const card = document.createElement('div');
        card.className = 'case-card';
        
        // Create card HTML structure
        card.innerHTML = `
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
                    <span class="completed-time">${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="comment-section" style="display: none;">
                    <textarea 
                        class="comment-input" 
                        placeholder="Add your QA comments here..."
                    ></textarea>
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
                <button class="btn btn-cancel" title="Cancel" style="display: none;">Cancel</button>
            </div>
        `;

        // Get references to card elements
        const qaButton = card.querySelector('.btn-qa');
        const cancelButton = card.querySelector('.btn-cancel');
        const commentSection = card.querySelector('.comment-section');
        const approveButton = card.querySelector('.btn-approve');
        const neutralButton = card.querySelector('.btn-neutral');
        const rejectButton = card.querySelector('.btn-reject');
        const container = this.completedContainer;

        // Handle done button click
        neutralButton.addEventListener('click', () => {
            card.classList.add('fade-out');
            setTimeout(() => {
                card.remove();
            }, 200);
        });

        // Handle QA button click
        qaButton.addEventListener('click', (e) => {
            if (qaButton.classList.contains('btn-submit')) {
                // Handle submit action
                const commentText = commentSection.querySelector('.comment-input').value;
                card.classList.add('fade-out');
                setTimeout(() => {
                    card.remove();
                }, 200);
            } else {
                // Handle toggle comment section
                const isVisible = commentSection.style.display === 'block';
                commentSection.style.display = isVisible ? 'none' : 'block';
                card.classList.toggle('with-comment', !isVisible);
                
                if (!isVisible) {
                    // Hide other buttons
                    approveButton.classList.add('hidden');
                    neutralButton.classList.add('hidden');
                    rejectButton.classList.add('hidden');
                    
                    // Show submit button
                    qaButton.innerHTML = 'Submit';
                    qaButton.classList.add('btn-submit');
                    qaButton.classList.remove('btn-qa');
                    qaButton.title = 'Submit QA Comments';
                    cancelButton.style.display = 'block';

                    // Handle scrolling for comment section
                    setTimeout(() => {
                        const cardBottom = card.offsetTop + card.offsetHeight;
                        const containerHeight = container.offsetHeight;
                        const currentScroll = container.scrollTop;
                        const bottomOffset = cardBottom - (currentScroll + containerHeight) + 20;

                        if (bottomOffset > 0) {
                            container.scrollBy({
                                top: bottomOffset,
                                behavior: 'smooth'
                            });
                        }
                    }, 0);
                } else {
                    resetToInitialState();
                }
            }
        });

        /**
         * Reset the card to its initial state
         * Hides comment section and restores button visibility
         */
        const resetToInitialState = () => {
            commentSection.style.display = 'none';
            card.classList.remove('with-comment');
            qaButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
            `;
            qaButton.classList.add('btn-qa');
            qaButton.classList.remove('btn-submit');
            qaButton.title = 'Add QA Comments';
            cancelButton.style.display = 'none';
            
            // Show other buttons
            approveButton.classList.remove('hidden');
            neutralButton.classList.remove('hidden');
            rejectButton.classList.remove('hidden');
        };

        // Add cancel button handler
        cancelButton.addEventListener('click', resetToInitialState);
        
        // Add the new card to the container
        this.completedContainer.insertBefore(card, this.completedContainer.firstChild);
    }
} 