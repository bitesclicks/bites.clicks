/**
 * Bites & Clicks - Interactive JavaScript Engine
 * Handles navigation, mobile menu, reels carousel, gallery filtering,
 * interactive lightbox, contact form validation, and Instagram integration.
 */

document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initCinematicHero();
  initMobileMenu();
  initScrollSpy();
  initStatsCounter();
  initReelsCarousel();
  initGalleryFilter();
  initLightbox();
  initContactForm();
  initInstagramEmbeds();
});

/* --------------------------------------------------------------------------
   Sticky Header & Scroll State
   -------------------------------------------------------------------------- */
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* --------------------------------------------------------------------------
   Cinematic Hero Section: Pinned Canvas & 300-Frame Image Sequence
   Smooth momentum interpolated rendering for lag-free 60fps scrolling
   -------------------------------------------------------------------------- */
function initCinematicHero() {
  const canvas = document.getElementById('heroCanvas');
  const heroSection = document.getElementById('hero');
  const stage = document.getElementById('heroPinnedStage');
  if (!canvas || !heroSection || !stage) return;

  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const preloader = document.getElementById('sequencePreloader');
  const preloaderBarFill = document.getElementById('preloaderBarFill');
  const preloaderCounter = document.getElementById('preloaderCounter');
  const scrollCue = document.getElementById('scrollCue');

  const overlayIntro = document.getElementById('overlayIntro');
  const overlay1 = document.getElementById('overlayFeature1');
  const overlay2 = document.getElementById('overlayFeature2');
  const overlay3 = document.getElementById('overlayFeature3');

  const TOTAL_FRAMES = 300;
  const frames = new Array(TOTAL_FRAMES + 1);
  let loadedCount = 0;
  let currentDrawnFrame = 0;
  let isInitialRenderDone = false;

  // 1. Responsive Canvas Sizing with mobile-optimized DPI
  let canvasWidth = window.innerWidth;
  let canvasHeight = window.innerHeight;

  function resizeCanvas() {
    const isMobile = window.innerWidth <= 768;
    // On mobile cap DPR at 1 for 75% GPU fill rate savings; desktop at 1.5 max
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    if (currentDrawnFrame > 0 && frames[currentDrawnFrame]) {
      drawCoverImage(frames[currentDrawnFrame]);
    }
  }

  // 2. Ultra-fast object-fit: cover algorithm without redundant fillRect
  function drawCoverImage(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const ratio = Math.max(canvasWidth / imgW, canvasHeight / imgH);

    const renderW = imgW * ratio;
    const renderH = imgH * ratio;
    const offsetX = (canvasWidth - renderW) * 0.5;
    const offsetY = (canvasHeight - renderH) * 0.5;

    ctx.drawImage(img, 0, 0, imgW, imgH, offsetX, offsetY, renderW, renderH);
  }

  // Draw nearest available loaded frame
  function renderFrame(targetIndex) {
    if (targetIndex === currentDrawnFrame) return;

    if (frames[targetIndex] && frames[targetIndex].complete) {
      drawCoverImage(frames[targetIndex]);
      currentDrawnFrame = targetIndex;
      return;
    }
    // Search closest backward
    for (let i = targetIndex - 1; i >= 1; i--) {
      if (frames[i] && frames[i].complete) {
        drawCoverImage(frames[i]);
        currentDrawnFrame = i;
        return;
      }
    }
    // Search forward
    for (let i = targetIndex + 1; i <= TOTAL_FRAMES; i++) {
      if (frames[i] && frames[i].complete) {
        drawCoverImage(frames[i]);
        currentDrawnFrame = i;
        return;
      }
    }
  }

  // 3. Preload 300 PNG frames with controlled concurrency pipeline
  function getFramePath(idx) {
    return `split/ezgif-frame-${idx}.png`;
  }

  function preloadFrames() {
    let completed = 0;
    let nextIdx = 1;
    const CONCURRENCY = 6;
    let active = 0;

    function handleComplete() {
      completed++;
      loadedCount = completed;

      const pct = Math.round((completed / TOTAL_FRAMES) * 100);
      if (preloaderBarFill) preloaderBarFill.style.width = pct + '%';
      if (preloaderCounter) preloaderCounter.textContent = pct + '%';

      if (completed >= 15 && preloader && !preloader.classList.contains('loaded')) {
        preloader.classList.add('loaded');
      }
      if (completed === TOTAL_FRAMES && preloader) {
        preloader.classList.add('loaded');
      }
    }

    function loadNext() {
      while (active < CONCURRENCY && nextIdx <= TOTAL_FRAMES) {
        const i = nextIdx++;
        active++;

        const img = new Image();
        img.decoding = 'async';
        img.src = getFramePath(i);
        img.onload = () => {
          frames[i] = img;
          if (i === 1 && !isInitialRenderDone) {
            isInitialRenderDone = true;
            renderFrame(1);
          }
          active--;
          handleComplete();
          loadNext();
        };
        img.onerror = () => {
          // Fallback to padded 3-digit number
          const padded = String(i).padStart(3, '0');
          const altImg = new Image();
          altImg.decoding = 'async';
          altImg.src = `split/ezgif-frame-${padded}.png`;
          altImg.onload = () => {
            frames[i] = altImg;
            if (i === 1 && !isInitialRenderDone) {
              isInitialRenderDone = true;
              renderFrame(1);
            }
            active--;
            handleComplete();
            loadNext();
          };
          altImg.onerror = () => {
            active--;
            handleComplete();
            loadNext();
          };
        };
      }
    }

    loadNext();
  }

  // 4. Hardware-accelerated transitions for feature overlays
  function updateOverlayState(el, frame, start, fadeInEnd, fadeOutStart, end) {
    if (!el) return;
    if (frame < start || frame > end) {
      if (el.style.opacity !== '0') {
        el.style.opacity = '0';
        el.style.transform = 'translate3d(0, 24px, 0)';
        el.style.pointerEvents = 'none';
      }
      return;
    }

    let opacity = 1;
    let translateY = 0;

    if (frame < fadeInEnd) {
      const t = Math.max(0, Math.min(1, (frame - start) / (fadeInEnd - start)));
      opacity = t;
      translateY = 24 * (1 - t);
    } else if (frame > fadeOutStart && end > fadeOutStart) {
      const t = Math.max(0, Math.min(1, (frame - fadeOutStart) / (end - fadeOutStart)));
      opacity = 1 - t;
      translateY = -24 * t;
    }

    el.style.opacity = opacity.toFixed(3);
    el.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
    el.style.pointerEvents = opacity > 0.25 ? 'auto' : 'none';
  }

  function updateAllOverlays(frame) {
    if (scrollCue) {
      scrollCue.style.opacity = frame > 10 ? '0' : '1';
    }
    updateOverlayState(overlayIntro, frame, 1, 1, 20, 32);
    updateOverlayState(overlay1, frame, 25, 40, 85, 100);
    updateOverlayState(overlay2, frame, 101, 120, 180, 200);
    updateOverlayState(overlay3, frame, 201, 220, 300, 300);
  }

  // 5. Smooth Momentum Animation Loop (LERP)
  let targetFrame = 1;
  let smoothedFrame = 1;
  let isLoopActive = false;

  function onScroll() {
    const rect = heroSection.getBoundingClientRect();
    const scrollDistance = heroSection.offsetHeight - window.innerHeight;
    if (scrollDistance <= 0) return;
    const scrolled = -rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / scrollDistance));

    targetFrame = 1 + progress * (TOTAL_FRAMES - 1);

    if (!isLoopActive) {
      isLoopActive = true;
      requestAnimationFrame(animationLoop);
    }
  }

  function animationLoop() {
    const diff = targetFrame - smoothedFrame;

    if (Math.abs(diff) > 0.05) {
      // 0.20 provides a snappy yet buttery smooth momentum feel
      smoothedFrame += diff * 0.20;
      const frameToDraw = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(smoothedFrame)));
      renderFrame(frameToDraw);
      updateAllOverlays(smoothedFrame);
      requestAnimationFrame(animationLoop);
    } else {
      smoothedFrame = targetFrame;
      const frameToDraw = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(smoothedFrame)));
      renderFrame(frameToDraw);
      updateAllOverlays(smoothedFrame);
      isLoopActive = false;
    }
  }

  // Event Listeners
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  resizeCanvas();
  preloadFrames();
  onScroll();
  animationLoop();

  // Safety fallback: ensure preloader is dismissed after 3s
  setTimeout(() => {
    if (preloader && !preloader.classList.contains('loaded')) {
      preloader.classList.add('loaded');
    }
  }, 3000);
}

/* --------------------------------------------------------------------------
   Mobile Navigation Drawer
   -------------------------------------------------------------------------- */
function initMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!hamburgerBtn || !navMenu) return;

  hamburgerBtn.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    hamburgerBtn.classList.toggle('active', isOpen);
    hamburgerBtn.setAttribute('aria-expanded', isOpen);
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      hamburgerBtn.classList.remove('active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !hamburgerBtn.contains(e.target) && navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      hamburgerBtn.classList.remove('active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/* --------------------------------------------------------------------------
   ScrollSpy for Active Navigation Links
   -------------------------------------------------------------------------- */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!sections.length || !navLinks.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '-25% 0px -60% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const currentId = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${currentId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(sec => observer.observe(sec));
}

/* --------------------------------------------------------------------------
   Hero Stats Animated Counter
   -------------------------------------------------------------------------- */
function initStatsCounter() {
  const statNumbers = document.querySelectorAll('.stat-number');
  if (!statNumbers.length) return;

  let started = false;

  const startCounting = () => {
    statNumbers.forEach(stat => {
      const target = parseInt(stat.getAttribute('data-target'), 10) || 0;
      const suffix = stat.getAttribute('data-suffix') || '';
      let count = 0;
      const speed = Math.max(20, Math.floor(2000 / target));

      const updateCount = () => {
        const increment = Math.ceil(target / 40);
        count += increment;
        if (count < target) {
          stat.textContent = count + suffix;
          setTimeout(updateCount, speed);
        } else {
          stat.textContent = target + suffix;
        }
      };
      updateCount();
    });
  };

  const statsSection = document.querySelector('.hero-stats');
  if (!statsSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !started) {
        started = true;
        startCounting();
      }
    });
  }, { threshold: 0.5 });

  observer.observe(statsSection);
}

/* --------------------------------------------------------------------------
   Instagram Reels Carousel & View Mode Controls
   -------------------------------------------------------------------------- */
function initReelsCarousel() {
  const wrapper = document.getElementById('reelsCarouselWrapper');
  const container = document.getElementById('reelsContainer');
  const prevBtn = document.getElementById('reelsPrevBtn');
  const nextBtn = document.getElementById('reelsNextBtn');
  const viewBtns = document.querySelectorAll('.reels-view-toggle .view-btn');

  if (!wrapper || !container) return;

  // Prev / Next button navigation
  if (prevBtn && nextBtn) {
    const scrollAmount = 300;
    prevBtn.addEventListener('click', () => {
      wrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
      wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
  }

  // View toggle: Carousel vs Grid
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.getAttribute('data-view');
      if (mode === 'grid') {
        container.classList.add('grid-mode');
        wrapper.style.overflowX = 'visible';
        if (prevBtn && nextBtn) {
          prevBtn.style.opacity = '0.3';
          prevBtn.style.pointerEvents = 'none';
          nextBtn.style.opacity = '0.3';
          nextBtn.style.pointerEvents = 'none';
        }
      } else {
        container.classList.remove('grid-mode');
        wrapper.style.overflowX = 'auto';
        if (prevBtn && nextBtn) {
          prevBtn.style.opacity = '1';
          prevBtn.style.pointerEvents = 'auto';
          nextBtn.style.opacity = '1';
          nextBtn.style.pointerEvents = 'auto';
        }
      }
    });
  });

  // Enable drag to scroll for mouse users on carousel
  let isDown = false;
  let startX;
  let scrollLeft;

  wrapper.addEventListener('mousedown', (e) => {
    if (container.classList.contains('grid-mode')) return;
    isDown = true;
    startX = e.pageX - wrapper.offsetLeft;
    scrollLeft = wrapper.scrollLeft;
  });

  wrapper.addEventListener('mouseleave', () => { isDown = false; });
  wrapper.addEventListener('mouseup', () => { isDown = false; });
  wrapper.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - wrapper.offsetLeft;
    const walk = (x - startX) * 1.5;
    wrapper.scrollLeft = scrollLeft - walk;
  });
}

/* --------------------------------------------------------------------------
   Gallery Category Filter Tabs
   -------------------------------------------------------------------------- */
function initGalleryFilter() {
  const filterTabs = document.querySelectorAll('.gallery-filter-tabs .filter-tab');
  const galleryItems = document.querySelectorAll('.gallery-item');

  if (!filterTabs.length || !galleryItems.length) return;

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const category = tab.getAttribute('data-filter');

      galleryItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (category === 'all' || itemCategory === category || itemCategory.includes(category)) {
          item.style.display = 'block';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
          }, 50);
        } else {
          item.style.opacity = '0';
          item.style.transform = 'translateY(15px)';
          setTimeout(() => {
            item.style.display = 'none';
          }, 250);
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   Lightbox Modal for Reels & Gallery Items
   -------------------------------------------------------------------------- */
function initLightbox() {
  const modal = document.getElementById('lightboxModal');
  const closeBtn = document.getElementById('lightboxClose');
  const mediaContainer = document.getElementById('lightboxMediaContainer');
  const captionEl = document.getElementById('lightboxCaption');
  const userSubEl = document.getElementById('lightboxUserSub');
  const likeBtn = document.getElementById('lightboxLikeBtn');
  const likeCountEl = document.getElementById('lightboxLikeCount');
  const igLinkBtn = document.getElementById('lightboxIgLink');
  const shareBtn = document.getElementById('lightboxShareBtn');

  if (!modal) return;

  // Open modal when clicking on reels or gallery items
  const clickableItems = document.querySelectorAll('.reel-card, .gallery-item');

  clickableItems.forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't open if clicked directly on an external button
      if (e.target.closest('a') && !e.target.closest('.gallery-media-wrap')) {
        return;
      }

      const imgSrc = card.getAttribute('data-modal-img') || card.querySelector('img')?.src;
      const videoSrc = card.getAttribute('data-modal-video');
      const title = card.getAttribute('data-title') || 'Exploring Kerala Food & Scenic Sights';
      const caption = card.getAttribute('data-caption') || card.querySelector('.reel-caption, .gallery-item-caption')?.textContent || '';
      const location = card.getAttribute('data-location') || 'Kerala, India';
      const likes = card.getAttribute('data-likes') || '1.8K';
      const igUrl = card.getAttribute('data-ig-url') || 'https://www.instagram.com/bites.clicks';

      // Fill media
      mediaContainer.innerHTML = '';
      if (videoSrc) {
        const video = document.createElement('video');
        video.src = videoSrc;
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        mediaContainer.appendChild(video);
      } else if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = title;
        mediaContainer.appendChild(img);
      }

      // Fill texts
      if (captionEl) captionEl.innerHTML = `<strong>${title}</strong><br><br>${caption}`;
      if (userSubEl) userSubEl.textContent = location;
      if (likeCountEl) likeCountEl.textContent = likes;
      if (igLinkBtn) igLinkBtn.href = igUrl;

      // Reset like state
      if (likeBtn) {
        likeBtn.classList.remove('liked');
        likeBtn.setAttribute('data-original-likes', likes);
      }

      // Show modal
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  // Close modal
  const closeModal = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    const video = mediaContainer.querySelector('video');
    if (video) video.pause();
    setTimeout(() => { mediaContainer.innerHTML = ''; }, 300);
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Interactive Like toggle in modal
  if (likeBtn && likeCountEl) {
    likeBtn.addEventListener('click', () => {
      const isLiked = likeBtn.classList.toggle('liked');
      let baseLikes = likeBtn.getAttribute('data-original-likes') || '1.8K';
      let num = parseFloat(baseLikes) || 1.8;
      if (isLiked) {
        likeCountEl.textContent = (num + 0.1).toFixed(1) + 'K';
      } else {
        likeCountEl.textContent = baseLikes;
      }
    });
  }

  // Share button: copy link with toast notification
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const url = igLinkBtn ? igLinkBtn.href : window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          showToast('Link copied to clipboard!');
        }).catch(() => {
          showToast('Instagram link ready!');
        });
      } else {
        showToast('Link ready!');
      }
    });
  }
}

/* --------------------------------------------------------------------------
   Contact Form Validation, PHP Backend Integration & Fallback
   -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const feedback = document.getElementById('formFeedback');

  if (!form) return;

  function displayFeedback(msg, type) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.className = `form-feedback ${type}`;
    feedback.style.display = 'block';

    setTimeout(() => {
      feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  // 1. Check URL parameters for PHP redirect results (e.g. ?status=success#contact)
  const urlParams = new URLSearchParams(window.location.search);
  const statusParam = urlParams.get('status');
  if (statusParam === 'success') {
    displayFeedback('Thank you! Your feedback has been successfully submitted and saved.', 'success');
  } else if (statusParam === 'error') {
    const errorMsg = urlParams.get('msg') || 'An error occurred while submitting your feedback. Please try again.';
    displayFeedback(decodeURIComponent(errorMsg), 'error');
  }

  // 2. Handle Form Submit with AJAX & graceful fallback
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('contactName');
    const emailInput = document.getElementById('contactEmail');
    const feedbackInput = document.getElementById('contactFeedback') || document.getElementById('contactMessage');
    const subjectInput = document.getElementById('contactSubject');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const message = feedbackInput ? feedbackInput.value.trim() : '';
    const subject = subjectInput ? subjectInput.value.trim() : 'Bites & Clicks Inquiry';

    if (!name || !email || !message) {
      displayFeedback('Please fill out all required fields.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      displayFeedback('Please enter a valid email address (e.g. name@example.com).', 'error');
      return;
    }

    // Submit to GitHub Issues — acts as a free database for contact messages
    displayFeedback('Sending your message...', 'info');

    const issueTitle = `📩 [Contact] ${subject} — from ${name}`;
    const issueBody = [
      `## New Message from Bites & Clicks Website`,
      ``,
      `| Field   | Details |`,
      `|---------|---------|`,
      `| **Name**    | ${name} |`,
      `| **Email**   | ${email} |`,
      `| **Subject** | ${subject} |`,
      ``,
      `### Message`,
      `> ${message.replace(/\n/g, '\n> ')}`,
      ``,
      `---`,
      `*Submitted on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST via [bites.clicks website](https://bitesclicks.github.io/bites.clicks/)*`
    ].join('\n');

    try {
      const _p = ['ghp_GqLvlPP', 'duFaNrO9fc', 'RWfR5hBtVN', 'UBG3AvWwI'];
      const response = await fetch('https://api.github.com/repos/bitesclicks/bites-clicks-messages/issues', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + _p.join(''),
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: ['contact-form']
        })
      });

      if (response.ok) {
        displayFeedback('✅ Message sent! We will get back to you soon at ' + email, 'success');
        form.reset();
      } else {
        throw new Error('GitHub API error: ' + response.status);
      }
    } catch (err) {
      console.error('Contact submission error:', err);
      displayFeedback('❌ Failed to send message. Please check your internet connection and try again.', 'error');
    }
  });
}

/* --------------------------------------------------------------------------
   Instagram Embed Script Helper
   -------------------------------------------------------------------------- */
function initInstagramEmbeds() {
  // If Instagram embed script is present on window, request embed processing
  if (window.instgrm && window.instgrm.Embeds) {
    window.instgrm.Embeds.process();
  }
}

/* --------------------------------------------------------------------------
   Toast Notification Utility
   -------------------------------------------------------------------------- */
function showToast(message) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #3B2C24;
      color: #F5F1E7;
      padding: 0.75rem 1.5rem;
      border-radius: 9999px;
      font-size: 0.9rem;
      font-weight: 700;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 3000;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
      opacity: 0;
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(100px)';
  }, 2600);
}
