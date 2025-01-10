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
        this.initializeDragAndDrop();
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

    initializeDragAndDrop() {
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        
        sidebarItems.forEach(item => {
            item.setAttribute('draggable', 'true');
            
            item.addEventListener('dragstart', (e) => {
                e.target.classList.add('dragging');
                e.dataTransfer.setData('text/plain', ''); // Required for Firefox
            });

            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingItem = document.querySelector('.dragging');
                const sidebar = document.querySelector('.sidebar');
                const afterElement = this.getDragAfterElement(sidebar, e.clientY);
                
                if (afterElement == null) {
                    sidebar.appendChild(draggingItem);
                } else {
                    sidebar.insertBefore(draggingItem, afterElement);
                }
            });
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.sidebar-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}

const sidebar = new Sidebar();
export default sidebar;