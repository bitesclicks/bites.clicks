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
   -------------------------------------------------------------------------- */
function initCinematicHero() {
  const canvas = document.getElementById('heroCanvas');
  const heroSection = document.getElementById('hero');
  const stage = document.getElementById('heroPinnedStage');
  if (!canvas || !heroSection || !stage) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const preloader = document.getElementById('sequencePreloader');
  const preloaderBarFill = document.getElementById('preloaderBarFill');
  const preloaderCounter = document.getElementById('preloaderCounter');
  const hudFrameText = document.getElementById('hudFrameText');
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

  // 1. Responsive Canvas Sizing with DPI support
  let canvasWidth = window.innerWidth;
  let canvasHeight = window.innerHeight;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (currentDrawnFrame > 0 && frames[currentDrawnFrame]) {
      drawCoverImage(frames[currentDrawnFrame]);
    }
  }

  // 2. object-fit: cover algorithm for canvas
  function drawCoverImage(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const hRatio = canvasWidth / imgW;
    const vRatio = canvasHeight / imgH;
    const ratio = Math.max(hRatio, vRatio);

    const renderW = imgW * ratio;
    const renderH = imgH * ratio;
    const offsetX = (canvasWidth - renderW) / 2;
    const offsetY = (canvasHeight - renderH) / 2;

    ctx.fillStyle = '#140E0A';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, 0, 0, imgW, imgH, offsetX, offsetY, renderW, renderH);
  }

  // Draw nearest available loaded frame
  function renderFrame(targetIndex) {
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

  // 3. Preload 300 PNG frames
  function getFramePath(idx) {
    return `split/ezgif-frame-${idx}.png`;
  }

  function preloadFrames() {
    let completed = 0;

    function handleImageLoad(idx, img) {
      completed++;
      loadedCount = completed;

      const pct = Math.round((completed / TOTAL_FRAMES) * 100);
      if (preloaderBarFill) preloaderBarFill.style.width = pct + '%';
      if (preloaderCounter) preloaderCounter.textContent = pct + '%';

      // First frame ready: render immediately!
      if (idx === 1 && !isInitialRenderDone) {
        isInitialRenderDone = true;
        renderFrame(1);
      }

      // Hide preloader once first 20 frames are ready
      if (completed >= 20 && preloader && !preloader.classList.contains('loaded')) {
        preloader.classList.add('loaded');
      }

      if (completed === TOTAL_FRAMES && preloader) {
        preloader.classList.add('loaded');
      }
    }

    // Load initial 10 frames first for instant first-paint
    for (let i = 1; i <= 10; i++) {
      loadSingleFrame(i);
    }

    // Then preload remaining frames in progressive batches
    setTimeout(() => {
      for (let i = 11; i <= TOTAL_FRAMES; i++) {
        loadSingleFrame(i);
      }
    }, 40);

    function loadSingleFrame(i) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        frames[i] = img;
        handleImageLoad(i, img);
      };
      img.onerror = () => {
        // Fallback to padded format if unpadded failed
        const padded = String(i).padStart(3, '0');
        const altImg = new Image();
        altImg.src = `split/ezgif-frame-${padded}.png`;
        altImg.onload = () => {
          frames[i] = altImg;
          handleImageLoad(i, altImg);
        };
        altImg.onerror = () => {
          completed++;
        };
      };
    }
  }

  // 4. Smooth Fade & Slide Transitions for Feature Overlays
  function updateOverlayState(el, frame, start, fadeInEnd, fadeOutStart, end) {
    if (!el) return;
    if (frame < start || frame > end) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.pointerEvents = 'none';
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
    el.style.transform = `translateY(${translateY.toFixed(1)}px)`;
    el.style.pointerEvents = opacity > 0.25 ? 'auto' : 'none';
  }

  // 5. Scroll Loop with requestAnimationFrame for 60fps
  let isTicking = false;

  function onScroll() {
    if (!isTicking) {
      requestAnimationFrame(updateScrollSequence);
      isTicking = true;
    }
  }

  function updateScrollSequence() {
    isTicking = false;

    const rect = heroSection.getBoundingClientRect();
    const scrollDistance = heroSection.offsetHeight - window.innerHeight;
    const scrolled = -rect.top;

    // Normalized progress: 0.0 at top to 1.0 right before unpinning
    const progress = Math.max(0, Math.min(1, scrolled / scrollDistance));

    // Map to 1..300 frame index
    const targetFrame = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(progress * (TOTAL_FRAMES - 1)) + 1));

    // Draw canvas cover
    renderFrame(targetFrame);

    // Update HUD frame badge
    if (hudFrameText) {
      hudFrameText.textContent = `Frame ${targetFrame} / ${TOTAL_FRAMES}`;
    }

    // Scroll cue indicator fades out after scrolling begins
    if (scrollCue) {
      scrollCue.style.opacity = targetFrame > 10 ? '0' : '1';
    }

    // Overlays linked directly to user's frame requirements:
    // Intro card: Frames 1 - 32
    updateOverlayState(overlayIntro, targetFrame, 1, 1, 20, 32);

    // Feature 1 (Frames 1 - 100): "Savor the Flavors"
    updateOverlayState(overlay1, targetFrame, 25, 40, 85, 100);

    // Feature 2 (Frames 101 - 200): "Frame the Beauty"
    updateOverlayState(overlay2, targetFrame, 101, 120, 180, 200);

    // Feature 3 (Frames 201 - 300): "Join the Journey"
    updateOverlayState(overlay3, targetFrame, 201, 220, 300, 300);
  }

  // Event Listeners
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  resizeCanvas();
  preloadFrames();
  updateScrollSequence();

  // Safety fallback: ensure preloader is dismissed after 3.5s
  setTimeout(() => {
    if (preloader && !preloader.classList.contains('loaded')) {
      preloader.classList.add('loaded');
    }
  }, 3500);
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

    // Prepare FormData for process_feedback.php
    const formData = new FormData(form);
    formData.set('name', name);
    formData.set('email', email);
    formData.set('feedback', message);
    formData.set('message', message);

    displayFeedback('Submitting your feedback to the server...', 'info');

    try {
      // Attempt asynchronous submission to PHP backend
      const response = await fetch('process_feedback.php', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        displayFeedback(data.message || 'Thank you! Your feedback has been successfully received.', 'success');
        form.reset();
      } else {
        let errMessage = 'Server error occurred.';
        try {
          const errData = await response.json();
          errMessage = errData.message || errMessage;
        } catch {
          errMessage = `Server returned status ${response.status}.`;
        }
        displayFeedback(errMessage, 'error');
      }
    } catch (networkError) {
      // Fallback for offline testing or file:// protocol: Launch mailto
      console.warn('Backend endpoint unavailable. Falling back to email client.', networkError);
      
      const mailtoSubject = encodeURIComponent(`[Bites & Clicks Feedback] ${subject} - from ${name}`);
      const mailtoBody = encodeURIComponent(`Hi Bites & Clicks Team,\n\nName: ${name}\nEmail: ${email}\nInquiry Type: ${subject}\n\nMessage / Feedback:\n${message}\n\nSent from Bites & Clicks Website`);
      const mailtoUrl = `mailto:bites.clicks@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;

      displayFeedback(`Opening your email client to send directly to bites.clicks@gmail.com...`, 'success');
      setTimeout(() => {
        window.location.href = mailtoUrl;
      }, 1000);
      form.reset();
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
