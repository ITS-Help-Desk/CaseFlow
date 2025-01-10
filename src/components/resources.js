export default class Resources {
    constructor() {
        this.resourcesContainer = document.getElementById('resourcesContainer');
        this.resourcesView = document.getElementById('resourcesView');
        
        this.initialize();
    }

    initialize() {
        // Add sample resources (replace with real data later)
        this.addResource({
            title: 'Documentation',
            link: '#',
            description: 'Access system documentation'
        });
    }

    showResourcesView() {
        // Hide all other views
        document.querySelectorAll('[id$="View"]').forEach(view => {
            view.style.display = 'none';
        });
        this.resourcesView.style.display = 'block';
    }

    addResource(resource) {
        const resourceElement = document.createElement('div');
        resourceElement.className = 'resource-item';
        
        resourceElement.innerHTML = `
            <h3>${resource.title}</h3>
            <p>${resource.description}</p>
            <a href="${resource.link}" class="resource-link">Access Resource</a>
        `;
        
        this.resourcesContainer.appendChild(resourceElement);
    }
} 