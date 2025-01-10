export default class Announcements {
    constructor() {
        this.announcementsContainer = document.getElementById('announcementsContainer');
        this.announcementsView = document.getElementById('announcementsView');
        
        this.initialize();
    }

    initialize() {
        // Add sample announcements (replace with real data later)
        this.addAnnouncement({
            title: 'System Update',
            content: 'New features coming next week',
            date: new Date()
        });
    }

    showAnnouncementsView() {
        // Hide all other views
        document.querySelectorAll('[id$="View"]').forEach(view => {
            view.style.display = 'none';
        });
        this.announcementsView.style.display = 'block';
    }

    addAnnouncement(announcement) {
        const announcementElement = document.createElement('div');
        announcementElement.className = 'announcement-item';
        
        announcementElement.innerHTML = `
            <h3>${announcement.title}</h3>
            <p>${announcement.content}</p>
            <span class="announcement-date">
                ${announcement.date.toLocaleDateString()}
            </span>
        `;
        
        this.announcementsContainer.insertBefore(announcementElement, this.announcementsContainer.firstChild);
    }
} 