const carousels = document.querySelectorAll('[data-carousel]');

const pillarLabels = {
  content: 'Content-Centric Storage Virtualization',
  deduplication: 'Data Deduplication Virtualization',
  security: 'Contextual Security Virtualization',
  mobility: 'Data Mobility Virtualization',
  wearable: 'Wearable Aware Authentication'
};

const pillarOrder = ['content', 'deduplication', 'security', 'mobility', 'wearable'];

carousels.forEach((carousel) => {
  const sourceSlides = [...carousel.querySelectorAll('.slide')];
  const slides = carousel.dataset.carousel === 'hero'
    ? sourceSlides
        .map((slide, sourceIndex) => ({ slide, sourceIndex }))
        .sort((a, b) => {
          const pillarDifference = pillarOrder.indexOf(a.slide.dataset.pillar) - pillarOrder.indexOf(b.slide.dataset.pillar);
          return pillarDifference || a.sourceIndex - b.sourceIndex;
        })
        .map(({ slide }) => slide)
    : sourceSlides;
  const dotsHolder = carousel.querySelector('[data-dots]');
  const nextButtons = [...carousel.querySelectorAll('[data-next]')];
  const prevButtons = [...carousel.querySelectorAll('[data-prev]')];
  const presentationButton = carousel.querySelector('[data-hero-presentation]');
  let index = 0;
  let timer;
  let presentationUsesFullscreen = false;

  function updatePresentationButton(active) {
    if (!presentationButton) return;
    const label = active ? 'Exit full screen slideshow' : 'Play all HyperVault slides in full screen';
    presentationButton.classList.toggle('active', active);
    presentationButton.setAttribute('aria-label', label);
    presentationButton.title = label;
    const icon = presentationButton.querySelector('span');
    if (icon) icon.textContent = active ? '×' : '⛶';
  }

  async function closePresentation(exitNativeFullscreen = true) {
    if (!presentationButton) return;
    if (exitNativeFullscreen && document.fullscreenElement === carousel && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // The fixed presentation layer remains available if the browser rejects the exit request.
      }
    }
    carousel.classList.remove('is-presentation-mode');
    document.body.classList.remove('hero-presentation-open');
    presentationUsesFullscreen = false;
    updatePresentationButton(false);
  }

  async function openPresentation() {
    if (!presentationButton) return;
    carousel.classList.add('is-presentation-mode');
    document.body.classList.add('hero-presentation-open');
    updatePresentationButton(true);
    show(0, true);

    presentationUsesFullscreen = false;
    if (carousel.requestFullscreen) {
      try {
        await carousel.requestFullscreen();
        presentationUsesFullscreen = document.fullscreenElement === carousel;
      } catch {
        presentationUsesFullscreen = false;
      }
    }
  }

  if (carousel.dataset.carousel === 'hero') {
    const track = carousel.querySelector('.hero-carousel-track');
    const firstControl = track?.querySelector('.hero-slider-arrow, .hero-story-dots');
    slides.forEach((slide) => track?.insertBefore(slide, firstControl || null));
  }

  const dots = slides.map((slide, i) => {
    const button = document.createElement('button');
    button.className = 'dot';
    const pillar = slide.dataset.pillar;
    const slideTitle = slide.querySelector('.hero-slide-caption strong, .slide-copy h3')?.textContent?.trim();
    if (pillar) {
      button.dataset.pillar = pillar;
      if (i > 0 && slides[i - 1].dataset.pillar !== pillar) button.classList.add('pillar-start');
    }
    button.setAttribute('aria-label', pillar && slideTitle
      ? `${pillarLabels[pillar]}: ${slideTitle}`
      : `Go to slide ${i + 1}`);
    button.addEventListener('click', () => show(i, true));
    dotsHolder?.appendChild(button);
    return button;
  });

  const productLineHeader = carousel.querySelector('.product-line-header');
  const productLineEyebrow = productLineHeader?.querySelector('.eyebrow');
  const productLineTitle = productLineHeader?.querySelector('h3');
  const productLineCounter = productLineHeader?.querySelector('[data-product-counter]');
  const pillarHeading = carousel.querySelector('[data-pillar-heading]');

  function show(nextIndex, userInitiated = false) {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));

    const activePillar = slides[index]?.dataset.pillar;
    if (pillarHeading && activePillar && pillarLabels[activePillar]) {
      if (carousel.dataset.activePillar !== activePillar) {
        pillarHeading.classList.remove('pillar-heading-enter');
        void pillarHeading.offsetWidth;
        pillarHeading.classList.add('pillar-heading-enter');
      }
      carousel.dataset.activePillar = activePillar;
      pillarHeading.textContent = pillarLabels[activePillar];
    }

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

      if (productLineCounter) {
        productLineCounter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
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
  presentationButton?.addEventListener('click', () => {
    if (carousel.classList.contains('is-presentation-mode')) closePresentation();
    else openPresentation();
  });

  document.addEventListener('fullscreenchange', () => {
    if (presentationUsesFullscreen && document.fullscreenElement !== carousel) closePresentation(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && carousel.classList.contains('is-presentation-mode') && document.fullscreenElement !== carousel) {
      closePresentation(false);
    }
  });
  show(0);
  restart();
});

document.querySelectorAll('[data-product-ecosystem]').forEach((ecosystem) => {
  const tabs = [...ecosystem.querySelectorAll('[data-product-tab]')];
  const panels = [...ecosystem.querySelectorAll('[data-product-panel]')];

  function activateProduct(key, focusTab = false, revealPanel = false) {
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

    if (revealPanel) {
      const panelRegion = ecosystem.querySelector('.ecosystem-panels');
      requestAnimationFrame(() => panelRegion?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      }));
    }
  }

  tabs.forEach((tab, tabIndex) => {
    tab.addEventListener('click', () => activateProduct(tab.dataset.productTab, false, true));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : tabIndex + (event.key === 'ArrowRight' ? 1 : -1);
      nextIndex = (nextIndex + tabs.length) % tabs.length;
      activateProduct(tabs[nextIndex].dataset.productTab, true, true);
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

// ===== Full-screen product category showcase =====
const productShowcasePlayer = document.querySelector('[data-product-showcase-player]');

if (productShowcasePlayer) {
  const stage = productShowcasePlayer.querySelector('.product-showcase-stage');
  const image = productShowcasePlayer.querySelector('[data-showcase-image]');
  const category = productShowcasePlayer.querySelector('[data-showcase-category]');
  const title = productShowcasePlayer.querySelector('[data-showcase-title]');
  const description = productShowcasePlayer.querySelector('[data-showcase-description]');
  const features = productShowcasePlayer.querySelector('[data-showcase-features]');
  const progress = productShowcasePlayer.querySelector('[data-showcase-progress]');
  const timeline = productShowcasePlayer.querySelector('.product-showcase-timeline');
  const counter = productShowcasePlayer.querySelector('[data-showcase-counter]');
  const toggle = productShowcasePlayer.querySelector('[data-showcase-toggle]');
  const toggleIcon = toggle?.querySelector('span');
  const close = productShowcasePlayer.querySelector('[data-showcase-close]');
  const previous = productShowcasePlayer.querySelector('[data-showcase-prev]');
  const next = productShowcasePlayer.querySelector('[data-showcase-next]');
  const duration = 5200;
  let items = [];
  let activeIndex = 0;
  let playing = false;
  let elapsed = 0;
  let startedAt = 0;
  let frame = 0;
  let returnFocus;
  let enteredFullscreen = false;
  let closing = false;
  let pointerStartX = 0;

  function collectItems(key) {
    const productKeys = key === 'all' ? ['app', 'wearables', 'cloud'] : [key];
    return productKeys.flatMap((productKey) => {
      const panel = document.querySelector(`[data-product-panel="${productKey}"]`);
      return panel ? [...panel.querySelectorAll('.product-line-slide')].map((slide) => ({
        productKey,
        category: slide.dataset.productCategory || panel.querySelector('.eyebrow')?.textContent?.trim() || 'HyperVault Products',
        image: slide.querySelector('img')?.getAttribute('src') || '',
        alt: slide.querySelector('img')?.alt || '',
        title: slide.querySelector('.slide-copy h3')?.textContent?.trim() || '',
        description: slide.querySelector('.slide-copy p')?.textContent?.trim() || '',
        features: [...slide.querySelectorAll('.product-feature-list li')].map((item) => item.textContent.trim())
      })) : [];
    });
  }

  function setProgress(value) {
    const percent = Math.min(100, Math.max(0, value));
    if (progress) progress.style.width = `${percent}%`;
    timeline?.setAttribute('aria-valuenow', String(Math.round(percent)));
  }

  function render(animate = true) {
    const item = items[activeIndex];
    if (!item) return;

    productShowcasePlayer.dataset.showcaseProduct = item.productKey || 'app';
    if (image) {
      image.src = item.image;
      image.alt = item.alt;
    }
    if (category) category.textContent = item.category;
    if (title) title.textContent = item.title;
    if (description) description.textContent = item.description;
    if (features) {
      features.replaceChildren(...item.features.map((feature) => {
        const listItem = document.createElement('li');
        listItem.textContent = feature;
        return listItem;
      }));
    }
    if (counter) counter.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;

    elapsed = 0;
    startedAt = performance.now();
    setProgress(0);
    if (animate && stage) {
      stage.classList.remove('is-changing');
      void stage.offsetWidth;
      stage.classList.add('is-changing');
    }
  }

  function updateToggle() {
    if (!toggle || !toggleIcon) return;
    toggleIcon.textContent = playing ? '❚❚' : '▶';
    toggle.setAttribute('aria-label', playing ? 'Pause product showcase' : 'Play product showcase');
  }

  function tick(timestamp) {
    if (!playing) return;
    if (!startedAt) startedAt = timestamp - elapsed;
    elapsed = timestamp - startedAt;
    setProgress((elapsed / duration) * 100);
    if (elapsed >= duration) {
      activeIndex = (activeIndex + 1) % items.length;
      render();
    }
    frame = requestAnimationFrame(tick);
  }

  function play() {
    if (playing || !items.length) return;
    playing = true;
    startedAt = performance.now() - elapsed;
    updateToggle();
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(frame);
    updateToggle();
  }

  function goTo(nextIndex) {
    if (!items.length) return;
    activeIndex = (nextIndex + items.length) % items.length;
    render();
    if (playing) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    }
  }

  async function openShowcase(key, trigger) {
    items = collectItems(key);
    if (!items.length) return;
    activeIndex = 0;
    returnFocus = trigger;
    productShowcasePlayer.dataset.showcaseProduct = key;
    productShowcasePlayer.hidden = false;
    productShowcasePlayer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('product-showcase-open');
    render(false);
    play();
    close?.focus();

    enteredFullscreen = false;
    if (productShowcasePlayer.requestFullscreen) {
      try {
        await productShowcasePlayer.requestFullscreen();
        enteredFullscreen = document.fullscreenElement === productShowcasePlayer;
      } catch {
        enteredFullscreen = false;
      }
    }
  }

  async function closeShowcase() {
    if (closing || productShowcasePlayer.hidden) return;
    closing = true;
    pause();
    if (document.fullscreenElement === productShowcasePlayer) {
      try {
        await document.exitFullscreen();
      } catch {
        // The fixed overlay remains a complete fallback when fullscreen exits unexpectedly.
      }
    }
    productShowcasePlayer.hidden = true;
    productShowcasePlayer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('product-showcase-open');
    image?.removeAttribute('src');
    setProgress(0);
    returnFocus?.focus();
    closing = false;
    enteredFullscreen = false;
  }

  document.querySelectorAll('[data-product-showcase-launch]').forEach((button) => {
    button.addEventListener('click', () => openShowcase(button.dataset.productShowcaseLaunch, button));
  });

  toggle?.addEventListener('click', () => {
    if (playing) pause();
    else play();
  });
  previous?.addEventListener('click', () => goTo(activeIndex - 1));
  next?.addEventListener('click', () => goTo(activeIndex + 1));
  close?.addEventListener('click', closeShowcase);

  stage?.addEventListener('pointerdown', (event) => {
    pointerStartX = event.clientX;
  });
  stage?.addEventListener('pointerup', (event) => {
    const distance = event.clientX - pointerStartX;
    if (Math.abs(distance) < 55) return;
    goTo(activeIndex + (distance < 0 ? 1 : -1));
  });

  document.addEventListener('keydown', (event) => {
    if (productShowcasePlayer.hidden) return;
    if (event.key === 'Escape') closeShowcase();
    if (event.key === 'ArrowLeft') goTo(activeIndex - 1);
    if (event.key === 'ArrowRight') goTo(activeIndex + 1);
    if (event.key === ' ') {
      event.preventDefault();
      if (playing) pause();
      else play();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (enteredFullscreen && !document.fullscreenElement && !closing) closeShowcase();
  });
}

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
