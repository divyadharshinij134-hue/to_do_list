// Homepage JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userName = localStorage.getItem('userName') || 'User';
    const userSection = document.getElementById('userSection');
    const authSection = document.getElementById('authSection');

    if (isLoggedIn) {
        // Show user section, hide auth section
        if (userSection) userSection.style.display = 'flex';
        if (authSection) authSection.style.display = 'none';
        document.getElementById('userName').textContent = userName;
        
        // Show dashboard and todos links
        const dashboardLink = document.getElementById('dashboardLink');
        const todosLink = document.getElementById('todosLink');
        if (dashboardLink) dashboardLink.style.display = 'block';
        if (todosLink) todosLink.style.display = 'block';
    } else {
        // Show auth section, hide user section
        if (userSection) userSection.style.display = 'none';
        if (authSection) authSection.style.display = 'block';
        
        // Hide dashboard and todos links
        const dashboardLink = document.getElementById('dashboardLink');
        const todosLink = document.getElementById('todosLink');
        if (dashboardLink) dashboardLink.style.display = 'none';
        if (todosLink) todosLink.style.display = 'none';
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('userName');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('rememberMe');
                window.location.href = '/';
            }
        });
    }

    // Search functionality (could redirect to todos with search param)
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `/todos.html?search=${encodeURIComponent(query)}`;
            }
        }
    });

    // Smooth scroll for "Learn More" button
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Update CTA buttons based on auth state
    const ctaButtons = document.querySelectorAll('.btn-primary, .btn-cta');
    ctaButtons.forEach(btn => {
        if (btn.textContent.includes('Start') || btn.textContent.includes('Get Started')) {
            if (isLoggedIn) {
                btn.href = '/dashboard.html';
            } else {
                btn.href = '/auth.html';
            }
        }
    });
});

