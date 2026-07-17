const carousels = document.querySelectorAll('[data-carousel]');

carousels.forEach((carousel) => {
  const slides = [...carousel.querySelectorAll('.slide')];
  const dotsHolder = carousel.querySelector('[data-dots]');
  const nextButtons = [...carousel.querySelectorAll('[data-next]')];
  const prevButtons = [...carousel.querySelectorAll('[data-prev]')];
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

  const productLineHeader = carousel.querySelector('.product-line-header');
  const productLineEyebrow = productLineHeader?.querySelector('.eyebrow');
  const productLineTitle = productLineHeader?.querySelector('h3');

  function show(nextIndex, userInitiated = false) {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));

    if (carousel.dataset.carousel === 'product-line' && slides[index]) {
      const currentSlide = slides[index];
      const category = currentSlide.dataset.productCategory;
      const subtitle = currentSlide.dataset.productSubtitle;

      if (productLineEyebrow && category) {
        productLineEyebrow.textContent = category;
      }

      if (productLineTitle && subtitle) {
        productLineTitle.textContent = subtitle;
      }
    }

    if (userInitiated) restart();
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(() => show(index + 1), carousel.dataset.carousel === 'features' ? 5200 : 4600);
  }

  nextButtons.forEach((next) => next.addEventListener('click', () => show(index + 1, true)));
  prevButtons.forEach((prev) => prev.addEventListener('click', () => show(index - 1, true)));
  show(0);
  restart();
});

document.querySelectorAll('[data-product-ecosystem]').forEach((ecosystem) => {
  const tabs = [...ecosystem.querySelectorAll('[data-product-tab]')];
  const panels = [...ecosystem.querySelectorAll('[data-product-panel]')];

  function activateProduct(key, focusTab = false) {
    ecosystem.dataset.activeProduct = key;

    tabs.forEach((tab) => {
      const active = tab.dataset.productTab === key;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focusTab) tab.focus();
    });

    panels.forEach((panel) => {
      const active = panel.dataset.productPanel === key;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  }

  tabs.forEach((tab, tabIndex) => {
    tab.addEventListener('click', () => activateProduct(tab.dataset.productTab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : tabIndex + (event.key === 'ArrowRight' ? 1 : -1);
      nextIndex = (nextIndex + tabs.length) % tabs.length;
      activateProduct(tabs[nextIndex].dataset.productTab, true);
    });
  });

  const initialTab = tabs.find((tab) => tab.classList.contains('active')) || tabs[0];
  if (initialTab) activateProduct(initialTab.dataset.productTab);
});

const pillarCarousel = document.querySelector('[data-pillar-carousel]');

if (pillarCarousel) {
  const titleEl = pillarCarousel.querySelector('[data-pillar-title]');
  const descriptionEl = pillarCarousel.querySelector('[data-pillar-description]');
  const dotsHolder = pillarCarousel.querySelector('[data-dots]');
  const nextButtons = [...pillarCarousel.querySelectorAll('[data-next]')];
  const prevButtons = [...pillarCarousel.querySelectorAll('[data-prev]')];
  const eyebrowEl = pillarCarousel.querySelector('.eyebrow');
  let index = 0;
  let timer;

  const pillars = [
    {
      number: '01',
      title: 'Content-Centric Storage Virtualization',
      description: 'Organizes photos, documents, videos, downloads, and app-originated files by meaning and source.'
    },
    {
      number: '02',
      title: 'Data Deduplication Virtualization',
      description: 'Reduces duplicate clutter through logical references while protecting user continuity.'
    },
    {
      number: '03',
      title: 'Contextual Security Virtualization',
      description: 'Applies contextual vault behavior around sensitive files, categories, and app workflows.'
    },
    {
      number: '04',
      title: 'Data Mobility Virtualization',
      description: 'Moves content through trusted, context-aware transfer paths across devices and destinations.'
    },
    {
      number: '05',
      title: 'Wearable-Aware Authentication',
      description: 'Uses wearable proximity and trust signals for secure access, continuity, and emergency actions.'
    }
  ];

  const dots = [];

  function show(nextIndex, userInitiated = false) {
    index = (nextIndex + pillars.length) % pillars.length;
    const pillar = pillars[index];

    if (titleEl) titleEl.textContent = pillar.title;
    if (descriptionEl) descriptionEl.textContent = pillar.description;
    if (eyebrowEl) eyebrowEl.textContent = `Pillar ${pillar.number}`;

    dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index));

    if (userInitiated) restart();
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(() => show(index + 1), 5200);
  }

  if (dotsHolder) {
    pillars.forEach((_, dotIndex) => {
      const button = document.createElement('button');
      button.className = 'dot';
      button.setAttribute('aria-label', `Go to pillar ${dotIndex + 1}`);
      button.addEventListener('click', () => show(dotIndex, true));
      dotsHolder.appendChild(button);
      dots.push(button);
    });
  }

  nextButtons.forEach((nextButton) => nextButton.addEventListener('click', () => show(index + 1, true)));
  prevButtons.forEach((prevButton) => prevButton.addEventListener('click', () => show(index - 1, true)));

  show(0);
  restart();
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.13 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const navDropdowns = document.querySelectorAll('.nav-dropdown');
const desktopNavQuery = window.matchMedia('(min-width: 1181px) and (hover: hover) and (pointer: fine)');

function closeNavMenu() {
  navLinks?.classList.remove('open');
  navDropdowns.forEach((dropdown) => dropdown.removeAttribute('open'));
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

navDropdowns.forEach((dropdown) => {
  let closeTimer;

  function openDropdown() {
    clearTimeout(closeTimer);
    dropdown.setAttribute('open', '');
  }

  function closeDropdown(delay = 180) {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      dropdown.removeAttribute('open');
    }, delay);
  }

  dropdown.addEventListener('mouseenter', () => {
    if (desktopNavQuery.matches) openDropdown();
  });

  dropdown.addEventListener('mouseleave', () => {
    if (desktopNavQuery.matches) closeDropdown();
  });

  dropdown.addEventListener('focusout', (event) => {
    if (desktopNavQuery.matches && !dropdown.contains(event.relatedTarget)) {
      closeDropdown(80);
    }
  });
});

document.addEventListener('click', (event) => {
  if (event.target.closest('.nav-dropdown')) return;
  navDropdowns.forEach((dropdown) => dropdown.removeAttribute('open'));
});

document.addEventListener('click', (event) => {
  if (!navLinks?.classList.contains('open')) return;
  if (navLinks.contains(event.target) || menuToggle?.contains(event.target)) return;
  closeNavMenu();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 1180) closeNavMenu();
});

document.querySelectorAll('[data-hero-video-player]').forEach((player) => {
  const video = player.querySelector('[data-hero-video]');
  const toggle = player.querySelector('[data-video-toggle]');
  const restart = player.querySelector('[data-video-restart]');
  const zoomOut = player.querySelector('[data-video-zoom-out]');
  const zoomIn = player.querySelector('[data-video-zoom-in]');
  const zoomReset = player.querySelector('[data-video-zoom-reset]');
  const fullscreen = player.querySelector('[data-video-fullscreen]');
  const zoomLabel = player.querySelector('[data-video-zoom-label]');
  const status = player.querySelector('[data-video-status]');
  let zoom = 1;

  if (!video) return;

  function updateVideoState() {
    if (toggle) toggle.textContent = video.paused ? 'Play' : 'Pause';
    if (status) status.textContent = video.paused ? 'Paused slideshow' : 'Playing slideshow';
  }

  function setZoom(nextZoom) {
    zoom = Math.min(1.8, Math.max(1, Number(nextZoom.toFixed(2))));
    video.style.setProperty('--hero-video-zoom', zoom);
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }

  toggle?.addEventListener('click', () => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    updateVideoState();
  });

  restart?.addEventListener('click', () => {
    video.currentTime = 0;
    video.play().catch(() => {});
    updateVideoState();
  });

  zoomOut?.addEventListener('click', () => setZoom(zoom - 0.1));
  zoomIn?.addEventListener('click', () => setZoom(zoom + 0.1));
  zoomReset?.addEventListener('click', () => setZoom(1));

  fullscreen?.addEventListener('click', () => {
    const frame = player.querySelector('.hero-video-frame') || player;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      frame.requestFullscreen?.();
    }
  });

  video.addEventListener('play', updateVideoState);
  video.addEventListener('pause', updateVideoState);
  setZoom(1);
  updateVideoState();
});

// ===== Requested Enhancements: progress bar, top button, static forms =====
const scrollProgress = document.getElementById('scrollProgress');
const topButton = document.getElementById('topButton');
const newsletterNote = document.getElementById('newsletterNote');
const imageLightbox = document.getElementById('imageLightbox');
const imageLightboxImg = document.getElementById('imageLightboxImg');
const imageLightboxTitle = document.getElementById('imageLightboxTitle');
const imageLightboxClose = document.getElementById('imageLightboxClose');

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

function updateScrollEnhancements() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

  if (scrollProgress) scrollProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;

  if (topButton) topButton.classList.toggle('visible', scrollTop > 520);
}

window.addEventListener('scroll', updateScrollEnhancements, { passive: true });
window.addEventListener('load', updateScrollEnhancements);

topButton?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeNavMenu();
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
  document.body.style.overflow = '';
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

document.querySelectorAll('.hero-carousel .slide').forEach((slide) => {
  slide.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    if (event.target.closest('img')) return;
    const image = slide.querySelector('img');
    if (image) openImageLightbox(image);
  });
});

imageLightboxClose?.addEventListener('click', closeImageLightbox);
imageLightboxImg?.addEventListener('click', closeImageLightbox);
imageLightbox?.addEventListener('click', (event) => {
  if (event.target === imageLightbox) closeImageLightbox();
});

// Investor financial projection selector
document.querySelectorAll('[data-financial-projections]').forEach((widget) => {
  const rows = [...widget.querySelectorAll('.projection-row')];
  const dots = [...widget.querySelectorAll('.projection-dots button')];
  const fields = {
    year: widget.querySelector('[data-finance-year]'),
    timeline: widget.querySelector('[data-finance-timeline]'),
    phase: widget.querySelector('[data-finance-phase]'),
    deliverables: widget.querySelector('[data-finance-deliverables]'),
    spend: widget.querySelector('[data-finance-spend]'),
    revenue: widget.querySelector('[data-finance-revenue]'),
    outcome: widget.querySelector('[data-finance-outcome]'),
    spendBar: widget.querySelector('[data-finance-spend-bar]'),
    revenueBar: widget.querySelector('[data-finance-revenue-bar]')
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = 0;
  let timer;

  function selectProjection(nextIndex, userInitiated = false) {
    activeIndex = (nextIndex + rows.length) % rows.length;
    const row = rows[activeIndex];
    if (!row) return;

    rows.forEach((item, index) => {
      const active = index === activeIndex;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    dots.forEach((dot, index) => {
      const active = index === activeIndex;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-pressed', String(active));
    });

    if (fields.year) fields.year.textContent = row.dataset.year;
    if (fields.timeline) fields.timeline.textContent = row.dataset.timeline;
    if (fields.phase) fields.phase.textContent = row.dataset.phase;
    if (fields.deliverables) fields.deliverables.textContent = row.dataset.deliverables;
    if (fields.spend) fields.spend.textContent = row.dataset.spend;
    if (fields.revenue) fields.revenue.textContent = row.dataset.revenue;
    if (fields.outcome) fields.outcome.textContent = row.dataset.outcome;
    if (fields.spendBar) fields.spendBar.style.width = `${row.dataset.spendFill}%`;
    if (fields.revenueBar) fields.revenueBar.style.width = `${row.dataset.revenueFill}%`;

    if (userInitiated) restartProjectionTimer();
  }

  function stopProjectionTimer() {
    clearInterval(timer);
  }

  function startProjectionTimer() {
    stopProjectionTimer();
    if (reducedMotion.matches || rows.length < 2) return;
    timer = setInterval(() => selectProjection(activeIndex + 1), 5600);
  }

  function restartProjectionTimer() {
    stopProjectionTimer();
    startProjectionTimer();
  }

  rows.forEach((row, index) => {
    row.addEventListener('click', () => selectProjection(index, true));
  });

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => selectProjection(index, true));
  });

  widget.addEventListener('mouseenter', stopProjectionTimer);
  widget.addEventListener('mouseleave', startProjectionTimer);
  widget.addEventListener('focusin', stopProjectionTimer);
  widget.addEventListener('focusout', (event) => {
    if (!widget.contains(event.relatedTarget)) startProjectionTimer();
  });
  reducedMotion.addEventListener?.('change', startProjectionTimer);

  selectProjection(0);
  startProjectionTimer();
});
