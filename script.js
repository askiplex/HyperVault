const carousels = document.querySelectorAll('[data-carousel]');

carousels.forEach((carousel) => {
  const slides = [...carousel.querySelectorAll('.slide')];
  const dotsHolder = carousel.querySelector('[data-dots]');
  const next = carousel.querySelector('[data-next]');
  const prev = carousel.querySelector('[data-prev]');
  let index = 0;
  let timer;

  const dots = slides.map((_, i) => {
    const button = document.createElement('button');
    button.className = 'dot';
    button.setAttribute('aria-label', `Go to slide ${i + 1}`);
    button.addEventListener('click', () => show(i, true));
    dotsHolder?.appendChild(button);
    return button;
  });

  function show(nextIndex, userInitiated = false) {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    if (userInitiated) restart();
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(() => show(index + 1), carousel.dataset.carousel === 'features' ? 5200 : 4600);
  }

  next?.addEventListener('click', () => show(index + 1, true));
  prev?.addEventListener('click', () => show(index - 1, true));
  show(0);
  restart();
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.13 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

function closeNavMenu() {
  navLinks?.classList.remove('open');
  document.body.classList.remove('nav-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Open navigation');
}

menuToggle?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  document.body.classList.toggle('nav-open', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    closeNavMenu();
  });
});

document.addEventListener('click', (event) => {
  if (!navLinks?.classList.contains('open')) return;
  if (navLinks.contains(event.target) || menuToggle?.contains(event.target)) return;
  closeNavMenu();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 1180) closeNavMenu();
});

// ===== Requested Enhancements: progress bar, newsletter popup, top button, static forms =====
const scrollProgress = document.getElementById('scrollProgress');
const topButton = document.getElementById('topButton');
const newsletterModal = document.getElementById('newsletterModal');
const newsletterClose = document.getElementById('newsletterClose');
const newsletterNote = document.getElementById('newsletterNote');
const imageLightbox = document.getElementById('imageLightbox');
const imageLightboxImg = document.getElementById('imageLightboxImg');
const imageLightboxTitle = document.getElementById('imageLightboxTitle');
const imageLightboxClose = document.getElementById('imageLightboxClose');

let newsletterShown = sessionStorage.getItem('hypervaultNewsletterShown') === 'yes';

function getThanksPageUrl() {
  const currentPath = window.location.pathname;
  const basePath = currentPath.endsWith('/')
    ? currentPath
    : currentPath.slice(0, currentPath.lastIndexOf('/') + 1);
  return `${window.location.origin}${basePath}thanks.html`;
}

document.querySelectorAll('.form-next-url').forEach((field) => {
  field.value = getThanksPageUrl();
});

function openNewsletter() {
  if (!newsletterModal || newsletterShown) return;

  newsletterModal.classList.add('open');
  newsletterModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  newsletterShown = true;
  sessionStorage.setItem('hypervaultNewsletterShown', 'yes');
}

function updateScrollEnhancements() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

  if (scrollProgress) scrollProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;

  if (topButton) topButton.classList.toggle('visible', scrollTop > 520);

  if (!newsletterShown && scrollTop > 520 && progress > 18) openNewsletter();
}

window.addEventListener('scroll', updateScrollEnhancements, { passive: true });
window.addEventListener('load', updateScrollEnhancements);

topButton?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function closeNewsletter() {
  newsletterModal?.classList.remove('open');
  newsletterModal?.setAttribute('aria-hidden', 'true');
  if (!imageLightbox?.classList.contains('open')) document.body.style.overflow = '';
}

newsletterClose?.addEventListener('click', closeNewsletter);
newsletterModal?.addEventListener('click', (event) => {
  if (event.target === newsletterModal) closeNewsletter();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeNavMenu();
    closeNewsletter();
    closeImageLightbox();
  }
});

document.querySelectorAll('#newsletterForm, #contactForm').forEach((form) => {
  form.addEventListener('submit', () => {
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Sending...';
      submitButton.disabled = true;
      setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = form.id === 'newsletterForm' ? 'Subscribe' : 'Send Inquiry';
      }, 8000);
    }
    if (form.id === 'newsletterForm' && newsletterNote) {
      newsletterNote.textContent = 'Sending your subscription request...';
    }
  });
});

document.querySelectorAll('.faq-item').forEach((item) => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    document.querySelectorAll('.faq-item[open]').forEach((openItem) => {
      if (openItem !== item) openItem.open = false;
    });
  });
});


// ===== Click-to-zoom image popup =====
function openImageLightbox(image) {
  if (!imageLightbox || !imageLightboxImg) return;

  imageLightboxImg.src = image.currentSrc || image.src;
  imageLightboxImg.alt = image.alt || 'Expanded HyperVault visual';
  if (imageLightboxTitle) imageLightboxTitle.textContent = image.alt || '';
  imageLightbox.classList.add('open');
  imageLightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeImageLightbox() {
  if (!imageLightbox || !imageLightboxImg) return;

  imageLightbox.classList.remove('open');
  imageLightbox.setAttribute('aria-hidden', 'true');
  if (!newsletterModal?.classList.contains('open')) document.body.style.overflow = '';
  setTimeout(() => {
    if (!imageLightbox.classList.contains('open')) imageLightboxImg.removeAttribute('src');
  }, 220);
}

document.querySelectorAll('main img').forEach((image) => {
  image.setAttribute('tabindex', '0');
  image.setAttribute('role', 'button');
  image.setAttribute('aria-label', `${image.alt || 'Image'} - open larger preview`);

  image.addEventListener('click', () => openImageLightbox(image));
  image.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openImageLightbox(image);
    }
  });
});

imageLightboxClose?.addEventListener('click', closeImageLightbox);
imageLightboxImg?.addEventListener('click', closeImageLightbox);
imageLightbox?.addEventListener('click', (event) => {
  if (event.target === imageLightbox) closeImageLightbox();
});
