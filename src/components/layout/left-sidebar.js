class Sidebar {
    constructor() {
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
                this.showView(view);
            });
        });
    }

    showView(view) {
        // Hide all views first
        document.querySelectorAll('[id$="View"]').forEach(viewElement => {
            viewElement.style.display = 'none';
        });

        // Show selected view
        const selectedView = document.getElementById(`${view}View`);
        if (selectedView) {
            selectedView.style.display = 'block';
        }

        // Update active states in sidebar
        document.querySelectorAll('.sidebar-item').forEach(item => {
            if (item.getAttribute('data-view') === view) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

export default Sidebar; 