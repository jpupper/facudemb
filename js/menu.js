document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navbar = document.querySelector('.navbar');
    const body = document.body;
    
    if (!menuToggle || !navbar) return;

    menuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        navbar.classList.toggle('menu-open');
        body.style.overflow = navbar.classList.contains('menu-open') ? 'hidden' : '';
    });

    // Close menu when clicking a link
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navbar.classList.remove('menu-open');
            body.style.overflow = '';
        });
    });
});
