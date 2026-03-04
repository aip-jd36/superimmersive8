// ============================
// Mobile Navigation
// ============================
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });

    // Close mobile menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        });
    });
}

// ============================
// Smooth Scroll for Safari
// ============================
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

// ============================
// Navbar Background on Scroll
// ============================
const nav = document.querySelector('.nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        nav.style.background = 'rgba(255, 255, 255, 0.98)';
    } else {
        nav.style.background = 'rgba(255, 255, 255, 0.96)';
    }

    lastScroll = currentScroll;
});

// ============================
// Intersection Observer for Animations
// ============================
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.service-card, .value-prop, .fest-feature, .buyer-type').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Add CSS class for animated elements
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// ============================
// Form Handling with Spam Protection
// ============================
const contactForm = document.querySelector('.contact-form');

// Set form load timestamp for spam detection
document.addEventListener('DOMContentLoaded', function() {
    const timestampField = document.getElementById('formLoadTime');
    if (timestampField) {
        timestampField.value = Date.now();
    }
});

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        // Show loading state
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(contactForm);
            const response = await fetch(contactForm.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.get('email'),
                    name: formData.get('name'),
                    company: formData.get('company'),
                    type: formData.get('type'),
                    message: formData.get('message'),
                    // Spam protection fields
                    website: formData.get('website'),
                    formLoadTime: formData.get('formLoadTime')
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Success - show confirmation message
                submitBtn.textContent = '✓ Message Sent!';
                submitBtn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';

                // Replace form with success message
                setTimeout(() => {
                    contactForm.innerHTML = `
                        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1)); border-radius: 8px; border: 2px solid #22c55e;">
                            <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
                            <h3 style="color: #16a34a; margin-bottom: 12px;">Message Sent Successfully!</h3>
                            <p style="color: #52504A; margin-bottom: 24px;">We'll respond within 24 hours.</p>
                            <p style="margin-bottom: 16px; color: #1a1918; font-weight: 500;">Want to book a call right now?</p>
                            <a href="https://calendly.com/aipenguins/superimmersive8" target="_blank" class="btn btn-primary" style="display: inline-block; text-decoration: none;">
                                📅 Book a Call on Calendly
                            </a>
                        </div>
                    `;
                }, 1000);
            } else {
                throw new Error(result.error || 'Form submission failed');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            submitBtn.textContent = '✗ Error - Please try again';
            submitBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            submitBtn.disabled = false;

            // Reset button after 3 seconds
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.style.background = '';
            }, 3000);
        }
    });
}

// ============================
// Parallax Effect for Orbs
// ============================
const orbs = document.querySelectorAll('.gradient-orb');

if (window.innerWidth > 768) {
    window.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        orbs.forEach((orb, index) => {
            const speed = (index + 1) * 10;
            const x = (mouseX - 0.5) * speed;
            const y = (mouseY - 0.5) * speed;

            orb.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
}

// ============================
// Console Easter Egg
// ============================
console.log('%cSuperImmersive 8', 'font-size: 24px; font-weight: bold; color: #C8900A;');
console.log('%cBuilding the infrastructure for AI film.', 'color: #52504A; font-size: 14px;');
console.log('%cInterested in joining? Visit superimmersive8.com/careers', 'color: #C8900A; font-size: 12px;');

// ============================
// Catalog Filter
// ============================
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.catalog-card').forEach(card => {
            card.style.display = (filter === 'all' || card.dataset.category === filter) ? '' : 'none';
        });
    });
});
