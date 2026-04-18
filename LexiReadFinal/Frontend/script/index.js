/* ============================================================
   LEXINOTE HOME & DASHBOARD LOGIC
   Handles session security and local storage notes
   ============================================================ */

// document.addEventListener("DOMContentLoaded", () => {
//     // 1. SESSION & PERSONALIZATION
//     const token = localStorage.getItem('token');
//     const userName = localStorage.getItem('userName');
//     const userMenu = document.getElementById('userMenu');

//     // Security Guard: Redirect to login if no token
//     if (!token) {
//         window.location.replace('auth.html');
//         return;
//     }

//     // Update Dropdown UI with user's name
//     if (userName && userMenu) {
//         userMenu.innerHTML = `👤 Hi, ${userName}`;
//     }

//     // 2. INITIALIZE DASHBOARD
//     window.loadNotes();
// });

/**
 * Fetches and renders notes from LocalStorage
 * Attached to window so it can be called by the "Refresh" button
 */
window.loadNotes = function() {
    const container = document.getElementById('notesContainer');
    if (!container) return;

    const savedNotes = JSON.parse(localStorage.getItem('lexi_saved_notes') || '[]');

    if (savedNotes.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <p class="text-muted italic" style="font-family: 'OpenDyslexic', sans-serif;">
                    No saved notes found yet. Converted notes will appear here.
                </p>
            </div>`;
        return;
    }

    container.innerHTML = savedNotes.map((note, index) => `
        <div class="note-item d-flex justify-content-between align-items-center animate-fade-in">
            <div>
                <h5 class="mb-1" style="color: var(--navy); font-weight: bold;">${note.name || 'Untitled Note'}</h5>
                <small class="text-muted">Saved: ${note.date || 'N/A'} | ${note.type || 'Text'}</small>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-navy px-3" onclick="viewNote(${index})">View</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteNote(${index})">Delete</button>
            </div>
        </div>
    `).join('');
};

/**
 * Deletes a note and refreshes the UI
 */
window.deleteNote = function(index) {
    if (confirm("Are you sure you want to delete this note?")) {
        let savedNotes = JSON.parse(localStorage.getItem('lexi_saved_notes') || '[]');
        savedNotes.splice(index, 1);
        localStorage.setItem('lexi_saved_notes', JSON.stringify(savedNotes));
        window.loadNotes();
    }
};

/**
 * Placeholder for viewing notes
 */
window.viewNote = function(index) {
    const savedNotes = JSON.parse(localStorage.getItem('lexi_saved_notes') || '[]');
    if (savedNotes[index]) {
        alert(`Opening "${savedNotes[index].name}"... \n\nThis will soon redirect you to the specialized reader view!`);
    }
};

window.handleLogout = function() {
    // Clear all local storage data (token, username, etc.)
    localStorage.clear();
    
    // window.location.replace prevents the user from clicking 'Back' to see the dashboard
    // window.location.replace('auth.html');
};