export default class ParentCase {
    constructor() {
        this.parentCasesList = document.querySelector('.parent-cases-list');
        this.modal = document.getElementById('parentCaseModal');
        this.deleteModal = document.getElementById('deleteConfirmModal');
        this.parentCases = new Map(); // Store parent cases with their IDs
        this.editingCaseId = null; // Track which case is being edited
        this.deletingCaseId = null;
        
        this.initialize();
    }

    initialize() {
        // Add button event listener
        document.querySelector('.add-parent-case-btn').addEventListener('click', () => {
            this.editingCaseId = null; // Reset editing ID for new case
            this.showModal();
        });

        // Modal buttons
        this.modal.querySelector('.btn-close').addEventListener('click', () => {
            this.hideModal();
        });
        this.modal.querySelector('.btn-cancel').addEventListener('click', () => {
            this.hideModal();
        });
        this.modal.querySelector('.btn-submit').addEventListener('click', () => {
            this.submitParentCase();
        });

        // Delete confirmation modal buttons
        this.deleteModal.querySelector('.btn-close').addEventListener('click', () => {
            this.hideDeleteModal();
        });
        
        this.deleteModal.querySelector('.btn-cancel').addEventListener('click', () => {
            this.hideDeleteModal();
        });
        
        this.deleteModal.querySelector('.btn-confirm').addEventListener('click', () => {
            this.confirmDelete();
        });
    }

    showModal(existingCase = null) {
        this.modal.style.display = 'flex';
        if (existingCase) {
            this.editingCaseId = existingCase.id;
            document.getElementById('parentCaseNumber').value = existingCase.caseNumber;
            document.getElementById('parentCaseDescription').value = existingCase.description;
            document.getElementById('parentCaseSolution').value = existingCase.solution || '';
        } else {
            document.getElementById('parentCaseNumber').value = '';
            document.getElementById('parentCaseDescription').value = '';
            document.getElementById('parentCaseSolution').value = '';
        }
    }

    hideModal() {
        this.modal.style.display = 'none';
        this.editingCaseId = null;
    }

    submitParentCase() {
        const caseNumber = document.getElementById('parentCaseNumber').value.trim();
        const description = document.getElementById('parentCaseDescription').value.trim();
        const solution = document.getElementById('parentCaseSolution').value.trim();

        if (caseNumber && description) {
            const parentCase = {
                id: this.editingCaseId || Date.now(), // Use existing ID if editing
                caseNumber,
                description,
                solution,
                timestamp: new Date()
            };

            if (this.editingCaseId) {
                this.updateParentCase(this.editingCaseId, parentCase);
            } else {
                this.addParentCase(parentCase);
            }
            this.hideModal();
        }
    }

    addParentCase(parentCase) {
        this.parentCases.set(parentCase.id, parentCase);
        this.renderParentCase(parentCase);
    }

    renderParentCase(parentCase) {
        // Remove existing case if updating
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
                    <button class="btn-edit">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="btn-delete">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="case-description">${parentCase.description}</div>
            ${parentCase.solution ? `<div class="case-solution">Solution: ${parentCase.solution}</div>` : ''}
        `;

        // Add event listeners for edit and delete
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

    confirmDelete() {
        if (this.deletingCaseId) {
            const caseElement = this.parentCasesList.querySelector(`[data-case-id="${this.deletingCaseId}"]`);
            if (caseElement) {
                caseElement.remove();
                this.parentCases.delete(this.deletingCaseId);
            }
            this.hideDeleteModal();
        }
    }

    updateParentCase(caseId, updatedCase) {
        this.parentCases.set(caseId, updatedCase);
        this.renderParentCase(updatedCase);
    }
} 