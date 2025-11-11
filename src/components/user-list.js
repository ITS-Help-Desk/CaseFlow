import { API_BASE_URL } from '../../config.js';

export default class UserList {
    constructor() {
        this.userListContainer = document.createElement('div');
        this.userListContainer.id = 'userListContainer';
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

        const currentUserString = localStorage.getItem('user');
        let currentUserRoles = [];
        if (currentUserString) {
            const currentUser = JSON.parse(currentUserString);
            currentUserRoles = currentUser.groups.map(group => group.name);
        }

        const canEditRoles = currentUserRoles.includes('Lead') || 
                             currentUserRoles.includes('Phone Analyst') || 
                             currentUserRoles.includes('Manager');

        if (this.users.length === 0) {
            this.userListContainer.innerHTML += '<p>No users found.</p>';
            return;
        }

        const userTable = document.createElement('table');
        userTable.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Roles</th>
                    ${canEditRoles ? '<th>Actions</th>' : ''}
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = userTable.querySelector('tbody');
        console.log("Table body found:", tbody);

        this.users.forEach(user => {
            console.log("Attempting to render user:", user.username);
            const userRow = document.createElement('tr');
            userRow.innerHTML = `
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.username}</td>
                <td>${user.groups.map(group => group.name).join(', ')}</td>
                ${canEditRoles ? `<td><button class="edit-roles-btn" data-user-id="${user.id}">Edit Roles</button></td>` : ''}
            `;
            tbody.appendChild(userRow);
            console.log("Appended user row for:", user.username);
        });

        this.userListContainer.appendChild(userTable);
        console.log("User table appended to container.");

        // Attach event listeners for edit buttons only if user can edit roles
        if (canEditRoles) {
            this.userListContainer.querySelectorAll('.edit-roles-btn').forEach(button => {
                button.addEventListener('click', (event) => this.handleEditRoles(event.target.dataset.userId));
            });
        }
    }

    handleEditRoles(userId) {
        const userToEdit = this.users.find(user => user.id == userId);
        if (!userToEdit) return;

        const userRow = this.userListContainer.querySelector(`button[data-user-id="${userId}"]`).closest('tr');
        if (!userRow) return;

        // Remove any existing editor rows to ensure only one is open at a time
        const existingEditorRow = this.userListContainer.querySelector('.roles-editor-row');
        if (existingEditorRow) {
            existingEditorRow.remove();
        }

        const editorRow = document.createElement('tr');
        editorRow.className = 'roles-editor-row';
        editorRow.innerHTML = `
            <td colspan="4">
                <div class="roles-editor">
                    <h4>Edit Roles for ${userToEdit.first_name} ${userToEdit.last_name} (${userToEdit.username})</h4>
                    <div class="role-checkboxes">
                        ${this.roles.map(role => `
                            <label>
                                <input type="checkbox" value="${role.name}" ${userToEdit.groups.some(g => g.name === role.name) ? 'checked' : ''}>
                                ${role.name}
                            </label>
                        `).join('')}
                    </div>
                    <div class="roles-editor-actions">
                        <button class="btn btn-primary save-roles-btn" data-user-id="${userId}">Save</button>
                        <button class="btn btn-secondary cancel-edit-btn">Cancel</button>
                    </div>
                </div>
            </td>
        `;

        userRow.insertAdjacentElement('afterend', editorRow);

        // Attach event listeners to the new buttons
        editorRow.querySelector('.save-roles-btn').addEventListener('click', (event) => this.saveUserRoles(event.target.dataset.userId, editorRow));
        editorRow.querySelector('.cancel-edit-btn').addEventListener('click', () => editorRow.remove());
    }

    async saveUserRoles(userId, editorRow) {
        const selectedRoleCheckboxes = editorRow.querySelectorAll('.role-checkboxes input[type="checkbox"]:checked');
        const newRoles = Array.from(selectedRoleCheckboxes).map(checkbox => checkbox.value);

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

            // Refresh the user list after successful update
            await this.fetchUsers();
            this.render();
            console.log(`Roles for user ${userId} updated successfully.`);
        } catch (error) {
            console.error("Error updating user roles:", error);
        }
    }

    getContainer() {
        return this.userListContainer;
    }
}
