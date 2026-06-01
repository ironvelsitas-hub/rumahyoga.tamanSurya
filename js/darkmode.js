// Dark Mode Toggle
const darkModeToggle = document.querySelector('.dark-mode-toggle');
const body = document.body;

// Check for saved dark mode preference
if (localStorage.getItem('darkMode') === 'enabled') {
    body.classList.add('dark-mode');
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        
        // Update navbar background for dark mode
        const navbar = document.getElementById('mainNav');
        if (navbar) {
            navbar.style.background = 'rgba(26, 26, 26, 0.95)';
        }
    } else {
        localStorage.setItem('darkMode', 'disabled');
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        
        // Update navbar background for light mode
        const navbar = document.getElementById('mainNav');
        if (navbar) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        }
    }
});

// Update dark mode styles for dynamic elements
function updateDarkModeStyles() {
    if (body.classList.contains('dark-mode')) {
        // Add dark mode specific styles
        const cards = document.querySelectorAll('.class-card, .membership-card, .testimonial-card, .contact-info, .contact-form');
        cards.forEach(card => {
            card.style.backgroundColor = 'var(--dark-card)';
        });
    } else {
        // Remove dark mode specific styles
        const cards = document.querySelectorAll('.class-card, .membership-card, .testimonial-card, .contact-info, .contact-form');
        cards.forEach(card => {
            card.style.backgroundColor = '';
        });
    }
}

// Watch for DOM changes
const darkModeObserver = new MutationObserver(updateDarkModeStyles);
darkModeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });