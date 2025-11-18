import { API_BASE_URL } from '../../config.js';
import { hasMinimumRole } from '../utils/permissions.js';

export default class UserList {
    constructor() {
        this.userListContainer = document.createElement('div');
        this.userListContainer.id = 'userListContainer';
        this.userListContainer.className = 'users-list-container custom-scrollbar';
        this.users = [];
        this.roles = [];

        this.initialize();
    }

    async initialize() {
        await this.fetchRoles();
        await this.fetchUsers();
        this.render();
    }

    async fetchRoles() {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/user/roles/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.roles = await response.json();
        } catch (error) {
            console.error("Error fetching roles:", error);
        }
    }

    async fetchUsers() {
        try {
            const authToken = localStorage.getItem('authToken');
            console.log("Fetching users with token:", authToken ? "Present" : "Missing");
            const response = await fetch(`${API_BASE_URL}/api/user/users/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                }
            });
            
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.users = await response.json();
            console.log("Fetched users:", this.users);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }

    render() {
        console.log("Rendering UserList. Users to render:", this.users.length);

        // Clear the container
        this.userListContainer.innerHTML = '';

        // Check if current user can edit roles (hierarchical)
        const currentUsername = localStorage.getItem('username');
        const currentUser = this.users.find(u => u.username === currentUsername);
        let canEditRoles = false;
        
        if (currentUser && currentUser.groups) {
            canEditRoles = hasMinimumRole(currentUser.groups, 'Lead');
        }

        if (this.users.length === 0) {
            this.userListContainer.innerHTML = '<div class="empty-state">No users found.</div>';
            return;
        }

        // Create user cards
        this.users.forEach(user => {
            this.createUserCard(user, canEditRoles);
        });

        console.log("User cards rendered successfully.");
    }

    createUserCard(user, canEditRoles) {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.dataset.userId = user.id;

        // Get user's current roles
        const userRoleNames = user.groups.map(g => g.name);
        const displayRoles = userRoleNames.length > 0 ? userRoleNames.join(', ') : 'No roles assigned';

        card.innerHTML = `
            <div class="user-card-left">
                <div class="profile-icon">
                    <div class="profile-placeholder">
                        <i class="fas fa-user"></i>
                    </div>
                </div>
                <div class="user-info">
                    <div class="user-header">
                        <span class="user-name">${user.first_name} ${user.last_name}</span>
                        <span class="username-text">@${user.username}</span>
                    </div>
                    <div class="user-meta">
                        <span class="user-email">${user.email}</span>
                    </div>
                </div>
            </div>
            <div class="user-card-right">
                <div class="user-roles-display">
                    <span class="roles-label">Roles:</span>
                    <span class="roles-value">${displayRoles}</span>
                </div>
                <div class="role-selector">
                    <div class="role-dropdown-wrapper ${canEditRoles ? '' : 'disabled'}">
                        <button class="role-dropdown-button" type="button" ${canEditRoles ? '' : 'disabled'}>
                            <span class="dropdown-label">Select Roles</span>
                            <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 12 12">
                                <path fill="currentColor" d="M6 9L1 4h10z"/>
                            </svg>
                        </button>
                        <div class="role-dropdown-menu" style="display: none;">
                            ${this.roles.map(role => `
                                <label class="role-option">
                                    <input type="checkbox" 
                                           value="${role.name}" 
                                           ${userRoleNames.includes(role.name) ? 'checked' : ''}
                                           ${canEditRoles ? '' : 'disabled'}>
                                    <span>${role.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    ${canEditRoles ? `
                        <button class="btn btn-primary btn-save-roles">Save Roles</button>
                    ` : `
                        <span class="permission-note">Requires Lead role or higher</span>
                    `}
                </div>
            </div>
        `;

        // Add event listeners for dropdown and save button
        const dropdownButton = card.querySelector('.role-dropdown-button');
        const dropdownMenu = card.querySelector('.role-dropdown-menu');
        
        // Toggle dropdown on button click
        if (dropdownButton && canEditRoles) {
            dropdownButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdownMenu.style.display === 'block';
                
                // Close all other dropdowns first
                document.querySelectorAll('.role-dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
                
                // Toggle current dropdown
                dropdownMenu.style.display = isOpen ? 'none' : 'block';
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!card.contains(e.target)) {
                if (dropdownMenu) {
                    dropdownMenu.style.display = 'none';
                }
            }
        });
        
        // Add event listener for save button if user can edit
        if (canEditRoles) {
            const saveButton = card.querySelector('.btn-save-roles');
            
            saveButton.addEventListener('click', async () => {
                const checkboxes = card.querySelectorAll('.role-option input[type="checkbox"]:checked');
                const selectedRoles = Array.from(checkboxes).map(cb => cb.value);
                await this.updateUserRoles(user.id, selectedRoles);
                dropdownMenu.style.display = 'none'; // Close dropdown after save
            });
        }

        this.userListContainer.appendChild(card);
    }

    async updateUserRoles(userId, newRoles) {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/user/users/${userId}/edit_roles/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                },
                body: JSON.stringify({ roles: newRoles })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedUser = await response.json();
            console.log(`Roles updated successfully for user ${userId}:`, updatedUser);

            // Refresh the user list to show updated roles
            await this.fetchUsers();
            this.render();
            
            // Show success message
            this.showNotification('Roles updated successfully!', 'success');
        } catch (error) {
            console.error("Error updating user roles:", error);
            this.showNotification('Failed to update roles. Please try again.', 'error');
        }
    }

    showNotification(message, type) {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background-color: ${type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'};
            color: white;
            border-radius: var(--radius-base);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getContainer() {
        return this.userListContainer;
    }
}
