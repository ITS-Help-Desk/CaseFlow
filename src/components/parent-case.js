import { API_BASE_URL } from '../../config.js';

export default class ParentCase {
    constructor() {
        this.parentCasesList = document.querySelector('.parent-cases-list');
        this.modal = document.getElementById('parentCaseModal');
        this.deleteModal = document.getElementById('deleteConfirmModal');
        this.parentCases = new Map();
        this.editingCaseId = null;
        this.deletingCaseId = null;
        
        this.initialize();
    }

    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
        };
    }

    initialize() {
        document.querySelector('.add-parent-case-btn').addEventListener('click', () => {
            this.editingCaseId = null;
            this.showModal();
        });

        this.modal.querySelector('.btn-close').addEventListener('click', () => {
            this.hideModal();
        });
        this.modal.querySelector('.btn-cancel').addEventListener('click', () => {
            this.hideModal();
        });
        this.modal.querySelector('.btn-submit').addEventListener('click', () => {
            this.submitParentCase();
        });

        this.deleteModal.querySelector('.btn-close').addEventListener('click', () => {
            this.hideDeleteModal();
        });
        
        this.deleteModal.querySelector('.btn-cancel').addEventListener('click', () => {
            this.hideDeleteModal();
        });
        
        this.deleteModal.querySelector('.btn-confirm').addEventListener('click', () => {
            this.confirmDelete();
        });

        this.loadParentCases();
    }

    async loadParentCases() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/parentcase/active/`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to load parent cases');
            }

            const cases = await response.json();
            this.parentCasesList.innerHTML = '';
            this.parentCases.clear();

            cases.forEach(parentCase => {
                const mappedCase = {
                    id: parentCase.id,
                    caseNumber: parentCase.case_number,
                    description: parentCase.description,
                    solution: parentCase.solution,
                    active: parentCase.active,
                    timestamp: parentCase.time_created
                };
                this.parentCases.set(mappedCase.id, mappedCase);
                this.renderParentCase(mappedCase);
            });
        } catch (error) {
            console.error('Error loading parent cases:', error);
        }
    }

    showModal(existingCase = null) {
        this.modal.style.display = 'flex';
        const modalTitle = this.modal.querySelector('.modal-header h2');
        
        if (existingCase) {
            this.editingCaseId = existingCase.id;
            modalTitle.textContent = 'Edit Parent Case';
            document.getElementById('parentCaseNumber').value = existingCase.caseNumber;
            document.getElementById('parentCaseDescription').value = existingCase.description;
            document.getElementById('parentCaseSolution').value = existingCase.solution || '';
        } else {
            modalTitle.textContent = 'Add Parent Case';
            document.getElementById('parentCaseNumber').value = '';
            document.getElementById('parentCaseDescription').value = '';
            document.getElementById('parentCaseSolution').value = '';
        }
    }

    hideModal() {
        this.modal.style.display = 'none';
        this.editingCaseId = null;
    }

    async submitParentCase() {
        const caseNumber = document.getElementById('parentCaseNumber').value.trim();
        const description = document.getElementById('parentCaseDescription').value.trim();
        const solution = document.getElementById('parentCaseSolution').value.trim();

        if (!caseNumber || !description) {
            alert('Case number and description are required.');
            return;
        }

        try {
            if (this.editingCaseId) {
                await this.updateParentCaseAPI(this.editingCaseId, { description, solution });
            } else {
                await this.createParentCaseAPI({ case_number: caseNumber, description, solution });
            }
            this.hideModal();
            await this.loadParentCases();
        } catch (error) {
            console.error('Error saving parent case:', error);
            alert('Failed to save parent case. Please try again.');
        }
    }

    async createParentCaseAPI(data) {
        const response = await fetch(`${API_BASE_URL}/api/parentcase/create/`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create parent case');
        }

        return response.json();
    }

    async updateParentCaseAPI(caseId, data) {
        const existingCase = this.parentCases.get(caseId);
        if (!existingCase) {
            throw new Error('Case not found');
        }

        const response = await fetch(`${API_BASE_URL}/api/parentcase/update/${existingCase.caseNumber}/`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update parent case');
        }

        return response.json();
    }

    renderParentCase(parentCase) {
        const existingCase = this.parentCasesList.querySelector(`[data-case-id="${parentCase.id}"]`);
        if (existingCase) {
            existingCase.remove();
        }
        
        const caseElement = document.createElement('div');
        caseElement.className = 'parent-case-item';
        caseElement.dataset.caseId = parentCase.id;
        
        caseElement.innerHTML = `
            <div class="parent-case-header">
                <span class="case-number">${parentCase.caseNumber}</span>
                <div class="case-actions">
                    <button class="btn-edit" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="btn-delete" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="case-description">${parentCase.description}</div>
            ${parentCase.solution ? `<div class="case-solution">Solution: ${parentCase.solution}</div>` : ''}
        `;

        caseElement.querySelector('.btn-edit').addEventListener('click', () => {
            this.showModal(parentCase);
        });

        caseElement.querySelector('.btn-delete').addEventListener('click', () => {
            this.showDeleteModal(parentCase.id);
        });
        
        this.parentCasesList.appendChild(caseElement);
    }

    showDeleteModal(caseId) {
        this.deletingCaseId = caseId;
        this.deleteModal.style.display = 'flex';
    }

    hideDeleteModal() {
        this.deleteModal.style.display = 'none';
        this.deletingCaseId = null;
    }

    async confirmDelete() {
        if (!this.deletingCaseId) return;

        const existingCase = this.parentCases.get(this.deletingCaseId);
        if (!existingCase) {
            this.hideDeleteModal();
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/parentcase/set_inactive/${existingCase.caseNumber}/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to delete parent case');
            }

            const caseElement = this.parentCasesList.querySelector(`[data-case-id="${this.deletingCaseId}"]`);
            if (caseElement) {
                caseElement.remove();
            }
            this.parentCases.delete(this.deletingCaseId);
            this.hideDeleteModal();
        } catch (error) {
            console.error('Error deleting parent case:', error);
            alert('Failed to delete parent case. Please try again.');
            this.hideDeleteModal();
        }
    }
}
