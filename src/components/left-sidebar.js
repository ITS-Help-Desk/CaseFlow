class Sidebar {
    constructor() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Remove active class from all items
                document.querySelectorAll('.sidebar-item').forEach(i => 
                    i.classList.remove('active'));
                
                // Add active class to clicked item
                item.classList.add('active');
                
                // Show corresponding view
                const view = item.getAttribute('data-view');
                if (view === 'claim') {
                    showClaimView();
                } else if (view === 'completed') {
                    showCompletedView();
                }
            });
        });
    }
}

const sidebar = new Sidebar();
export default sidebar; 