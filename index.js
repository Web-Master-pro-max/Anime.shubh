
const getLocalBackend = () => {
  const saved = localStorage.getItem('infinx_server_url');
  if (saved && !saved.startsWith('file:')) return saved.replace(/\/$/, '');
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  return 'http://16.179.30.197:8000';
};
const DEFAULT_BACKEND = getLocalBackend();
const isHttps = window.location.protocol === 'https:';
const hasCustomServer = !!localStorage.getItem('infinx_server_url');
const SERVER_ORIGIN = (isHttps && !hasCustomServer)
  ? ''
  : ((window.location.protocol === 'file:' || window.location.origin === 'null' || (!window.location.origin.includes(':8000') && !isHttps))
    ? DEFAULT_BACKEND
    : '');
const API_BASE = `${SERVER_ORIGIN}/api`;

window.formatMediaUrl = function (url) {
  const fallback = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500';
  if (!url) return fallback;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return url.startsWith('/') ? `${SERVER_ORIGIN}${url}` : `${SERVER_ORIGIN}/${url}`;
};
let userWatchlist = [];

document.addEventListener('DOMContentLoaded', function () {
  // Load homepage configurations
  initApp();

  // Redirect to login page if redirected with login=true param
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('login') === 'true' && !isLoggedIn()) {
    window.location.href = 'login.html';
  }

  // Header scroll effect
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile Menu Toggle
  const mobileToggle = document.querySelector('.mobile-toggle') || document.getElementById('mobileMenuToggle');
  const navbar = document.querySelector('.navbar') || document.getElementById('mobileDrawer');
  const closeDrawer = document.getElementById('closeDrawer');
  const navOverlay = document.getElementById('navOverlay');

  function openMobileMenu() {
    if (navbar) {
      navbar.classList.add('active');
      navbar.style.transform = 'translateX(0)';
    }
    if (navOverlay) {
      navOverlay.classList.add('active');
      navOverlay.style.opacity = '1';
      navOverlay.style.pointerEvents = 'auto';
    }
    document.body.style.overflow = 'hidden';
  }

  window.closeMobileMenu = function () {
    if (navbar) {
      navbar.classList.remove('active');
      navbar.style.transform = '';
    }
    if (navOverlay) {
      navOverlay.classList.remove('active');
      navOverlay.style.opacity = '';
      navOverlay.style.pointerEvents = '';
    }
    document.body.style.overflow = '';
  }

  if (mobileToggle) mobileToggle.addEventListener('click', openMobileMenu);
  if (closeDrawer) closeDrawer.addEventListener('click', closeMobileMenu);
  if (navOverlay) navOverlay.addEventListener('click', closeMobileMenu);

  // Dropdown toggle click/tap handlers (for desktop & mobile)
  document.querySelectorAll('.dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const parent = this.closest('.nav-item-dropdown');
      if (parent) {
        const wasActive = parent.classList.contains('active');
        document.querySelectorAll('.nav-item-dropdown').forEach(d => d.classList.remove('active'));
        if (!wasActive) {
          parent.classList.add('active');
        }
      }
    });
  });

  // Close open dropdowns when tapping outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-item-dropdown')) {
      document.querySelectorAll('.nav-item-dropdown').forEach(d => d.classList.remove('active'));
    }
  });

  // Close menu when clicking direct nav links or dropdown items inside the drawer (only on mobile)
  const navLinks = document.querySelectorAll('.navbar .nav-link:not(.dropdown-toggle), .navbar .dropdown-item');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 992) {
        closeMobileMenu();
      }
    });
  });

  // Search logic with live auto-suggest
  const searchInput = document.getElementById('searchInput');
  const liveDropdown = document.getElementById('liveSearchDropdown');
  let searchDebounceTimeout = null;

  async function performLiveSearch(query, targetContainer) {
    if (!query || query.length < 2) {
      targetContainer.innerHTML = '';
      targetContainer.style.display = 'none';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/shows/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      const results = await res.json();

      if (!results || results.length === 0) {
        targetContainer.innerHTML = `
                            <div style="padding: 16px; text-align: center; color: var(--gray-text); font-size: 1.3rem;">
                                No matching anime or shows found for "${query}"
                            </div>
                        `;
        targetContainer.style.display = 'block';
        return;
      }

      const itemsHtml = results.slice(0, 7).map(item => {
        const posterUrl = (item.poster && (item.poster.startsWith('http://') || item.poster.startsWith('https://')))
          ? item.poster
          : window.formatMediaUrl(item.poster);
        const isAnime = item.isLunar || (typeof item.id === 'string' && item.id.startsWith('lunar-')) || item.anilistId;
        const badge = isAnime ? 'Anime' : (item.badge || 'HD');
        const anilistId = item.anilistId || (typeof item.id === 'string' ? item.id.replace('lunar-', '') : item.id);
        const safeTitle = (item.title || '').replace(/'/g, "\\'");
        const safePoster = (item.poster || '').replace(/'/g, "\\'");
        const safeBanner = (item.banner || '').replace(/'/g, "\\'");

        return `
              <div class="search-item flex items-center gap-3 p-3 hover:bg-surface-container-high transition-colors cursor-pointer border-b border-white/5" onclick="if(window.openShowDetails) window.openShowDetails({ id: '${item.id}', anilistId: ${anilistId || 'null'}, title: '${safeTitle}', poster: '${safePoster}', banner: '${safeBanner}', isLunar: ${isAnime ? 'true' : 'false'} })">
                <img src="${posterUrl}" alt="${item.title}" class="w-11 h-14 object-cover rounded-lg bg-surface-container-high flex-shrink-0" onerror="this.src='Postes/spyfamS3p.jpg';">
                <div class="flex-1 flex flex-col min-w-0">
                  <div class="font-headline-sm text-sm font-bold text-on-surface truncate">${item.title}</div>
                  <div class="flex items-center gap-2 font-label-sm text-xs text-outline mt-0.5">
                    <span class="text-secondary font-bold">★ ${item.rating || '9.8'}</span>
                    <span>•</span>
                    <span>${item.year || '2025'}</span>
                    <span class="px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary-container font-semibold uppercase text-[10px]">${badge}</span>
                  </div>
                </div>
              </div>
            `;
      }).join('');

      const viewAllUrl = `anime.html?search=${encodeURIComponent(query)}`;
      targetContainer.innerHTML = `
            ${itemsHtml}
            <div class="p-3 text-center font-label-md text-xs text-secondary-container hover:text-secondary hover:bg-surface-container cursor-pointer transition-colors" onclick="window.location.href='${viewAllUrl}'">
              View all results for "${query}" →
            </div>
          `;
      targetContainer.style.display = 'block';
    } catch (err) {
      console.warn('Live search error:', err);
    }
  }

  if (searchInput && liveDropdown) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchDebounceTimeout);
      const term = this.value.trim();
      searchDebounceTimeout = setTimeout(() => {
        performLiveSearch(term, liveDropdown);
      }, 220);
    });

    searchInput.addEventListener('keyup', function (e) {
      if (e.key === 'Enter') {
        const term = this.value.trim();
        if (term) {
          if (liveDropdown) liveDropdown.style.display = 'none';
          window.location.href = `anime.html?search=${encodeURIComponent(term)}`;
        }
      }
    });

    document.addEventListener('click', function (e) {
      if (!searchInput.contains(e.target) && !liveDropdown.contains(e.target)) {
        liveDropdown.style.display = 'none';
      }
    });

    searchInput.addEventListener('focus', function () {
      if (this.value.trim().length >= 2) {
        liveDropdown.style.display = 'block';
      }
    });
  }

  // Mobile Search Overlay listeners
  const tabSearch = document.getElementById('tabSearch');
  const mobileHeaderSearchBtn = document.getElementById('mobileHeaderSearchBtn');
  const mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
  const closeSearchOverlay = document.getElementById('closeSearchOverlay');
  const clearMobileSearch = document.getElementById('clearMobileSearch');
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  const mobileSearchResults = document.getElementById('mobileSearchResults');

  const openMobileSearch = (e) => {
    if (e) e.preventDefault();
    if (mobileSearchOverlay) {
      mobileSearchOverlay.classList.add('active');
      if (mobileSearchInput) {
        setTimeout(() => mobileSearchInput.focus(), 60);
      }
    }
  };

  if (tabSearch) {
    tabSearch.addEventListener('click', openMobileSearch);
  }
  if (mobileHeaderSearchBtn) {
    mobileHeaderSearchBtn.addEventListener('click', openMobileSearch);
  }

  if (closeSearchOverlay && mobileSearchOverlay) {
    closeSearchOverlay.addEventListener('click', () => {
      mobileSearchOverlay.classList.remove('active');
    });
  }

  let mobileSearchDebounce = null;
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', function () {
      const q = this.value.trim();
      if (clearMobileSearch) {
        clearMobileSearch.style.display = q ? 'flex' : 'none';
      }

      clearTimeout(mobileSearchDebounce);
      mobileSearchDebounce = setTimeout(() => {
        if (mobileSearchResults) {
          performLiveSearch(q, mobileSearchResults);
        }
      }, 220);
    });

    mobileSearchInput.addEventListener('keyup', function (e) {
      if (e.key === 'Enter') {
        const term = this.value.trim();
        if (term) {
          if (mobileSearchOverlay) mobileSearchOverlay.classList.remove('active');
          window.location.href = `anime.html?search=${encodeURIComponent(term)}`;
        }
      }
    });
  }

  if (clearMobileSearch) {
    clearMobileSearch.addEventListener('click', () => {
      if (mobileSearchInput) {
        mobileSearchInput.value = '';
        mobileSearchInput.focus();
      }
      clearMobileSearch.style.display = 'none';
      if (mobileSearchResults) {
        mobileSearchResults.innerHTML = '';
        mobileSearchResults.style.display = 'none';
      }
    });
  }

  // Handle forms
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
});

// Initialize user status & catalog content
let globalLunarData = null;
let currentLunarTab = 'popularThisSeason';
let top10Swiper = null;

function initTop10Swiper() {
  const sliderEl = document.querySelector('.top10-slider');
  if (!sliderEl) return;
  if (typeof Swiper === 'undefined') return;

  if (top10Swiper && typeof top10Swiper.destroy === 'function') {
    try {
      top10Swiper.destroy(true, true);
    } catch (e) { }
    top10Swiper = null;
  }

  try {
    top10Swiper = new Swiper(sliderEl, {
      slidesPerView: 'auto',
      spaceBetween: 14,
      grabCursor: true,
      watchSlidesProgress: true,
      watchOverflow: true,
      touchRatio: 1.2,
      resistanceRatio: 0.85,
      navigation: {
        nextEl: '.top10-next-btn',
        prevEl: '.top10-prev-btn'
      },
      keyboard: {
        enabled: true,
        onlyInViewport: true
      },
      breakpoints: {
        640: {
          spaceBetween: 16
        },
        1024: {
          spaceBetween: 20
        }
      }
    });
  } catch (err) {
    console.warn('Failed to init top10 swiper:', err);
  }
}

function setupTop10FallbackNav() {
  const prevBtn = document.querySelector('.top10-prev-btn');
  const nextBtn = document.querySelector('.top10-next-btn');
  const slider = document.querySelector('.top10-slider');
  if (prevBtn && slider && !prevBtn._hasFallbackListener) {
    prevBtn._hasFallbackListener = true;
    prevBtn.addEventListener('click', () => {
      if (!top10Swiper) {
        slider.scrollBy({ left: -slider.clientWidth * 0.75, behavior: 'smooth' });
      }
    });
  }
  if (nextBtn && slider && !nextBtn._hasFallbackListener) {
    nextBtn._hasFallbackListener = true;
    nextBtn.addEventListener('click', () => {
      if (!top10Swiper) {
        slider.scrollBy({ left: slider.clientWidth * 0.75, behavior: 'smooth' });
      }
    });
  }
}

// Navigation Arrow Controls for Continue Watching Slide Rail
function setupContinueNav() {
  const prevBtn = document.getElementById('continuePrevBtn') || document.querySelector('.continue-prev-btn');
  const nextBtn = document.getElementById('continueNextBtn') || document.querySelector('.continue-next-btn');
  const rail = document.getElementById('continueWatchingGrid');
  if (!rail) return;

  function updateArrowState() {
    if (!prevBtn || !nextBtn) return;
    const atStart = rail.scrollLeft <= 6;
    const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 6;
    prevBtn.disabled = atStart;
    nextBtn.disabled = atEnd;
    prevBtn.style.opacity = atStart ? '0.2' : '1';
    nextBtn.style.opacity = atEnd ? '0.2' : '1';
  }

  if (prevBtn && !prevBtn._hasNavListener) {
    prevBtn._hasNavListener = true;
    prevBtn.addEventListener('click', () => {
      const scrollAmount = Math.max(260, rail.clientWidth * 0.75);
      rail.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      setTimeout(updateArrowState, 350);
    });
  }

  if (nextBtn && !nextBtn._hasNavListener) {
    nextBtn._hasNavListener = true;
    nextBtn.addEventListener('click', () => {
      const scrollAmount = Math.max(260, rail.clientWidth * 0.75);
      rail.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(updateArrowState, 350);
    });
  }

  rail.removeEventListener('scroll', updateArrowState);
  rail.addEventListener('scroll', updateArrowState, { passive: true });
  updateArrowState();
}

function initContinueSwiper() {
  // Deprecated in favor of high-performance native CSS touch slide rail
  setupContinueNav();
}

function setupContinueFallbackNav() {
  setupContinueNav();
}

async function loadLunarTrending() {
  const container = document.getElementById('lunarAnimeSection');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/lunarx/trending`);
    if (!res.ok) return;
    const data = await res.json();
    globalLunarData = data;
    renderLunarSection();
  } catch (err) {
    console.warn('Lunar trending fetch failed:', err);
  }
}

function switchLunarTab(tabName) {
  currentLunarTab = tabName;
  renderLunarSection();
}

function renderLunarSection() {
  const container = document.getElementById('lunarAnimeSection');
  if (!container || !globalLunarData) return;

  const list = globalLunarData[currentLunarTab] || [];
  if (list.length === 0) return;

  const cardsHtml = list.slice(0, 10).map((show, i) => {
    const rank = i + 1;
    const playUrl = `/watch?id=${show.anilistId}&ep=1`;
    const posterUrl = show.poster || 'Postes/spyfamS3p.jpg';
    const safeTitle = (show.title || show.englishTitle || show.romajiTitle || 'Anime Masterpiece').replace(/'/g, "\\'");
    const safePoster = (show.poster || '').replace(/'/g, "\\'");
    const safeBanner = (show.banner || '').replace(/'/g, "\\'");
    const hoverGlow = (i % 3 === 0) ? 'group-hover:text-[#00eefc]/30' : ((i % 3 === 1) ? 'group-hover:text-[#ff506e]/30' : 'group-hover:text-[#a078ff]/30');
    const hoverShadow = (i % 3 === 0) ? 'group-hover:shadow-[0_12px_28px_rgba(0,238,252,0.22)]' : ((i % 3 === 1) ? 'group-hover:shadow-[0_12px_28px_rgba(255,80,110,0.22)]' : 'group-hover:shadow-[0_12px_28px_rgba(160,120,255,0.22)]');
    const hoverBorder = (i % 3 === 0) ? 'group-hover:border-[#00eefc]/50' : ((i % 3 === 1) ? 'group-hover:border-[#ff506e]/50' : 'group-hover:border-[#a078ff]/50');
    const score = show.score ? (show.score / 10).toFixed(2) : (9.92 - i * 0.03).toFixed(2);

    return `
          <div class="swiper-slide w-[150px] sm:w-[185px] md:w-[210px] lg:w-[225px] shrink-0">
            <div class="top10-card-wrap group cursor-pointer" onclick="window.openShowDetails({ id: 'lunar-${show.anilistId}', anilistId: ${show.anilistId}, title: '${safeTitle}', poster: '${safePoster}', banner: '${safeBanner}', isLunar: true })">
              <!-- Giant Rank Typography Numeral Behind Card -->
              <span class="absolute -left-2 sm:-left-3 top-0 font-display-hero text-[88px] sm:text-[112px] leading-none font-black text-surface-container-highest/35 select-none pointer-events-none ${hoverGlow} transition-colors drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] z-0">
                ${rank}
              </span>
              <!-- Vertical Portrait Card Body -->
              <div class="top10-card-body ${hoverShadow} ${hoverBorder}">
                <div class="top10-poster-wrap">
                  <img class="group-hover:scale-105 transition-transform duration-500" src="${posterUrl}" alt="${safeTitle}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='Postes/spyfamS3p.jpg'" />
                  <div class="absolute inset-0 bg-gradient-to-t from-[#0f111e]/90 via-transparent to-transparent pointer-events-none"></div>
                  <!-- Rank Pill Badge -->
                  <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary-container text-on-primary-container font-label-sm text-[10px] sm:text-xs font-black shadow-md tracking-wider">
                    RANK #${rank}
                  </span>
                  <!-- Score & Audio Tags -->
                  <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <span class="px-2 py-0.5 rounded bg-surface-container-lowest/85 text-secondary font-label-sm text-[11px] font-bold backdrop-blur-md border border-white/5">
                      ★ ${score}
                    </span>
                    <div class="flex items-center gap-1">
                      <span class="px-1.5 py-0.5 rounded bg-surface-container-high/90 text-on-surface font-label-sm text-[10px] font-bold">SUB</span>
                      <span class="px-1.5 py-0.5 rounded bg-surface-container-high/90 text-on-surface-variant font-label-sm text-[10px] font-bold">DUB</span>
                    </div>
                  </div>
                </div>
                <!-- Footer Info -->
                <div class="top10-card-footer">
                  <span class="font-headline-sm text-xs sm:text-sm font-bold text-white truncate group-hover:text-secondary-container transition-colors" title="${safeTitle}">${safeTitle}</span>
                  <span class="font-body-sm text-[11px] sm:text-xs text-outline truncate mt-0.5">${show.format || 'Tokyo Master'} • OLED Cut</span>
                </div>
              </div>
            </div>
          </div>
        `;
  }).join('');

  container.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-3 sm:mb-4 gap-2.5 sm:gap-3">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5 font-label-sm text-[11px] sm:text-xs text-secondary-container uppercase tracking-widest font-bold">
              <span class="material-symbols-outlined text-[15px] sm:text-[16px]">equalizer</span>
              <span class="whitespace-nowrap">Tokyo &amp; Global Metrics</span>
            </div>
            <h2 class="font-headline-sm sm:font-headline-md md:font-headline-lg text-lg sm:text-2xl md:text-3xl tracking-tight font-extrabold text-white mt-0.5 whitespace-nowrap">
              Top 10 Masterpieces Today
            </h2>
          </div>

          <div class="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <!-- Filter Pills -->
            <div class="flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-white/5">
              <button class="px-2.5 sm:px-3 py-1 rounded-full ${currentLunarTab === 'popularThisSeason' ? 'bg-secondary-container text-black font-bold shadow-[0_0_12px_rgba(0,238,252,0.35)]' : 'text-on-surface-variant hover:text-white'} font-label-sm sm:font-label-md text-xs cursor-pointer transition-all active:scale-95" onclick="switchLunarTab('popularThisSeason')">Popular</button>
              <button class="px-2.5 sm:px-3 py-1 rounded-full ${currentLunarTab === 'trendingNow' ? 'bg-secondary-container text-black font-bold shadow-[0_0_12px_rgba(0,238,252,0.35)]' : 'text-on-surface-variant hover:text-white'} font-label-sm sm:font-label-md text-xs cursor-pointer transition-all active:scale-95" onclick="switchLunarTab('trendingNow')">Trending</button>
              <button class="px-2.5 sm:px-3 py-1 rounded-full ${currentLunarTab === 'upcomingNextSeason' ? 'bg-secondary-container text-black font-bold shadow-[0_0_12px_rgba(0,238,252,0.35)]' : 'text-on-surface-variant hover:text-white'} font-label-sm sm:font-label-md text-xs cursor-pointer transition-all active:scale-95" onclick="switchLunarTab('upcomingNextSeason')">Upcoming</button>
            </div>

            <!-- Navigation Arrow Buttons (Never floating on top of cards) -->
            <div class="flex items-center gap-1 shrink-0">
              <button class="top10-prev-btn w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-container-high/90 hover:bg-secondary-container hover:text-black text-white border border-white/10 flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer active:scale-90" aria-label="Previous masterpiece" type="button">
                <span class="material-symbols-outlined text-[16px] sm:text-[18px]">chevron_left</span>
              </button>
              <button class="top10-next-btn w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-container-high/90 hover:bg-secondary-container hover:text-black text-white border border-white/10 flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer active:scale-90" aria-label="Next masterpiece" type="button">
                <span class="material-symbols-outlined text-[16px] sm:text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Vertical Cards Slides Carousel (Android & PC) -->
        <div class="relative w-full">
          <!-- Swiper Slider Container -->
          <div class="swiper top10-slider">
            <div class="swiper-wrapper">
              ${cardsHtml}
            </div>
          </div>
        </div>
      `;

  setupTop10FallbackNav();

  requestAnimationFrame(() => {
    initTop10Swiper();
  });
}

async function syncFreshUserProfile() {
  const token = localStorage.getItem('infinx_token');
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const profile = await res.json();
      if (profile) {
        localStorage.setItem('infinx_user', JSON.stringify(profile));
        if (profile.username) localStorage.setItem('infinx_username', profile.username);
        if (profile.email) localStorage.setItem('infinx_user_email', profile.email);
        if (profile.role) localStorage.setItem('infinx_user_role', profile.role);
        if (profile.avatarUrl) localStorage.setItem('infinx_avatar', profile.avatarUrl);
        if (profile.avatarFrame) localStorage.setItem('infinx_avatar_frame', profile.avatarFrame);
        if (profile.accentColor) localStorage.setItem('infinx_accent_color', profile.accentColor);
        if (profile.vipRank) localStorage.setItem('infinx_vip_rank', profile.vipRank);
        if (profile.level) localStorage.setItem('infinx_level', String(profile.level));
        updateAuthHeader();
      }
    }
  } catch (e) {
    console.warn('Failed to sync user profile:', e);
  }
}

async function initApp() {
  updateAuthHeader();
  syncFreshUserProfile();
  initTop10Swiper();
  setupTop10FallbackNav();
  initContinueSwiper();
  setupContinueFallbackNav();

  await Promise.all([
    loadCarousel(),
    loadLunarTrending(),
    loadCategories(),
    loadContinueWatching()
  ]);

  if (isLoggedIn()) {
    loadWatchlist();
  }
}

function isLoggedIn() {
  return !!localStorage.getItem('infinx_token');
}

function getAuthHeader() {
  const token = localStorage.getItem('infinx_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function updateAuthHeader() {
  const headerDiv = document.getElementById('authHeader');
  const drawerDiv = document.getElementById('drawerAuthHeader');

  if (isLoggedIn()) {
    const email = localStorage.getItem('infinx_user_email') || 'User';
    const role = localStorage.getItem('infinx_user_role');
    const userRaw = localStorage.getItem('infinx_user');
    let user = null;
    try { if (userRaw) user = JSON.parse(userRaw); } catch (e) { }

    const username = localStorage.getItem('infinx_username') || (user && user.username) || (role === 'ADMIN' ? 'SUPRIMEHOKAGE' : email.split('@')[0]);
    const displayName = username.toUpperCase();
    const rawAvatar = localStorage.getItem('infinx_avatar') || (user && user.avatarUrl) || '/assets/avatars/av-jin-u-seong.png';
    let avatarUrl = null;
    if (rawAvatar && typeof rawAvatar === 'string') {
      const trimmed = rawAvatar.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
        avatarUrl = trimmed;
      } else if (trimmed.startsWith('assets/') || trimmed.startsWith('uploads/') || trimmed.startsWith('Postes/')) {
        avatarUrl = '/' + trimmed;
      } else if (trimmed.startsWith('/assets/') || trimmed.startsWith('/uploads/') || trimmed.startsWith('/Postes/')) {
        avatarUrl = trimmed;
      } else if (trimmed.startsWith('av-') || trimmed.endsWith('.png') || trimmed.endsWith('.jpg') || trimmed.endsWith('.jpeg')) {
        avatarUrl = `/assets/avatars/${trimmed.replace(/^\/+/, '')}`;
      } else {
        avatarUrl = trimmed;
      }
    }
    if (!avatarUrl) {
      avatarUrl = '/assets/avatars/av-jin-u-seong.png';
    }

    let rawFrame = localStorage.getItem('infinx_avatar_frame') || (user && user.avatarFrame) || (role === 'ADMIN' ? 'gold' : 'default');
    if (!rawFrame || rawFrame === 'default') {
      if (role === 'ADMIN' || username.toUpperCase().includes('HOKAGE')) {
        rawFrame = 'gold';
      }
    }
    const avatarFrame = (rawFrame || 'default').replace(/^aura-/, '');
    const vipRank = localStorage.getItem('infinx_vip_rank') || (user && user.vipRank) || 'GENIN';
    const level = localStorage.getItem('infinx_level') || (user && user.level) || 1;

    const adminLink = role === 'ADMIN' ? `<a href="admin.html" class="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-surface-container-high text-secondary hover:text-white font-label-sm text-xs font-semibold hover:bg-surface-container-highest transition-all shrink-0"><span class="material-symbols-outlined text-[15px]">admin_panel_settings</span>Admin</a>` : '';

    const initial = (displayName || email || 'U')[0].toUpperCase();
    const fallbackSrc = 'https://s4.anilist.co/file/anilistcdn/character/large/b129928-BCEjVaP0AQSw.png';
    const avatarHtml = `
          <div class="user-avatar aura-${avatarFrame}" title="${displayName} (${email})">
            <img src="${avatarUrl}" alt="${displayName}" onerror="if(this.src!=='${fallbackSrc}'){this.src='${fallbackSrc}';}else{this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';}" />
            <span style="display:none;">${initial}</span>
          </div>
        `;

    headerDiv.innerHTML = `
          <div class="user-profile-menu flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            ${adminLink}
            <a href="/profile.html" class="profile-name-text text-xs sm:text-sm font-extrabold text-white hover:text-secondary-container transition-colors hidden sm:inline-flex items-center gap-1.5 shrink-0" title="View Profile (${displayName})">
              <i class="fas fa-user-ninja text-primary-container text-xs sm:text-sm" style="color: #ff0055;"></i>
              <span class="font-extrabold uppercase tracking-wide max-w-[85px] sm:max-w-[140px] md:max-w-[180px] truncate">${displayName}</span>
            </a>
            <a href="/profile.html" class="user-avatar-link shrink-0" title="View Profile (${displayName})">
              ${avatarHtml}
            </a>
            <button class="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-label-sm text-xs sm:text-label-sm font-semibold transition-all cursor-pointer shrink-0" onclick="handleLogout(event)" title="Logout">Logout</button>
          </div>
        `;

    if (drawerDiv) {
      drawerDiv.innerHTML = `
            <a href="/profile.html" class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/60 border border-white/5 hover:border-secondary-container/40 transition-all">
              <div style="width: 44px; height: 44px; flex-shrink: 0;">${avatarHtml}</div>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-1.5">
                  <i class="fas fa-user-ninja text-primary-container text-xs" style="color: #ff0055;"></i>
                  <span class="font-headline-sm text-sm font-extrabold text-on-surface truncate uppercase">${displayName}</span>
                </div>
                <span class="font-body-sm text-xs text-outline truncate">${email}</span>
              </div>
            </a>
            <a href="/profile.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all">
              <span class="material-symbols-outlined text-[20px]">person</span>
              <span>Otaku Passport</span>
            </a>
            ${role === 'ADMIN' ? `<a href="/admin.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-secondary hover:bg-surface-container font-label-md transition-all"><span class="material-symbols-outlined text-[20px]">admin_panel_settings</span><span>Admin Studio</span></a>` : ''}
            <button class="w-full py-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md font-semibold hover:bg-surface-container-highest transition-all uppercase tracking-wider cursor-pointer" onclick="handleLogout(event)">
              Logout
            </button>
          `;
    }
  } else {
    headerDiv.innerHTML = `
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button class="px-3 sm:px-4 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-xs sm:text-label-sm font-semibold transition-all cursor-pointer shrink-0" onclick="window.location.href='login.html'">
              Sign In
            </button>
            <button class="hidden sm:inline-block px-3 sm:px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-xs sm:text-label-sm font-bold shadow-[0_0_14px_rgba(255,80,110,0.4)] hover:brightness-110 transition-all cursor-pointer shrink-0" onclick="window.location.href='login.html#register'">
              Register
            </button>
          </div>
        `;

    if (drawerDiv) {
      drawerDiv.innerHTML = `
            <button class="w-full py-2.5 rounded-xl bg-secondary-container text-on-secondary-fixed font-label-md font-bold shadow-[0_0_16px_rgba(0,238,252,0.35)] cursor-pointer" onclick="closeMobileMenu(); window.location.href='login.html';">
              Sign In
            </button>
            <button class="w-full py-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md font-medium cursor-pointer" onclick="closeMobileMenu(); window.location.href='login.html#register';">
              Create Account
            </button>
          `;
    }
  }
}

// Fetch Watchlist items
async function loadWatchlist() {
  try {
    const res = await fetch(`${API_BASE}/user/watchlist`, { headers: getAuthHeader() });
    if (res.status === 401) {
      handleLogout();
      return;
    }
    if (res.ok) {
      const data = await res.json();
      userWatchlist = data.map(show => show.id);

      // update favorite heart states across all rendered movie cards
      document.querySelectorAll('.btn-watchlist-toggle').forEach(btn => {
        const showId = parseInt(btn.dataset.showId);
        if (userWatchlist.includes(showId)) {
          btn.classList.add('active');
          const icon = btn.querySelector('i');
          if (icon) icon.className = 'fas fa-heart';
        } else {
          btn.classList.remove('active');
          const icon = btn.querySelector('i');
          if (icon) icon.className = 'far fa-heart';
        }
      });
    }
  } catch (e) {
    console.error(e);
  }
}

// Fetch Continue Watching List (Unified for Shows & Anime)
async function loadContinueWatching() {
  try {
    let serverHistory = [];
    const token = localStorage.getItem('infinx_token');
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/user/history`, { headers: getAuthHeader() });
        if (res.ok) {
          serverHistory = await res.json();
        }
      } catch (e) { }
    }

    // Also load local continue watching (covers guests, offline, and immediate updates)
    let localHistory = [];
    try {
      const raw = localStorage.getItem('@infinx_continue_watching');
      if (raw) localHistory = JSON.parse(raw);
      if (!Array.isArray(localHistory)) localHistory = [];
    } catch (e) { localHistory = []; }

    // Merge server and local history, deduplicating by show/anime ID
    const mergedMap = new Map();

    // Add local history first
    localHistory.forEach(item => {
      if (!item) return;
      const key = item.isLunar ? `lunar-${item.lunarId || item.anilistId}` : `show-${item.showId || item.id}`;
      mergedMap.set(key, { ...item, source: 'local' });
    });

    // Merge server history
    serverHistory.forEach(item => {
      if (!item) return;
      const isLunar = !!(item.isLunar || (item.episode?.show?.isLunar));
      const anilistId = item.lunarId || item.episode?.show?.anilistId;
      const key = isLunar ? `lunar-${anilistId}` : `show-${item.episode?.show?.id || item.episodeId}`;

      if (!mergedMap.has(key)) {
        mergedMap.set(key, item);
      } else {
        const existing = mergedMap.get(key);
        const existingTime = existing.lastWatchedAt || (existing.watchedAt ? new Date(existing.watchedAt).getTime() : 0);
        const serverTime = item.watchedAt ? new Date(item.watchedAt).getTime() : 0;
        if (serverTime > existingTime) {
          mergedMap.set(key, item);
        }
      }
    });

    const allItems = Array.from(mergedMap.values());
    const container = document.getElementById('continueWatchingSection');
    const grid = document.getElementById('continueWatchingGrid');
    const countBadge = document.getElementById('continueCountBadge');

    if (allItems.length > 0) {
      container.classList.remove('hidden');
      if (countBadge) countBadge.textContent = `${allItems.length} In-Flight`;
      let html = '';
      allItems.slice(0, 16).forEach(item => {
        const isLunar = !!(item.isLunar || (item.episode?.show?.isLunar) || item.lunarId);
        const duration = item.duration || 1;
        const progress = item.progress || 0;
        const percent = item.percent !== undefined ? Math.round(item.percent) : Math.min(100, Math.max(0, Math.round((progress / duration) * 100)));

        let showTitle = '';
        let posterUrl = '';
        let epNum = 1;
        let resumeUrl = '';

        if (isLunar) {
          const anilistId = item.lunarId || item.anilistId || item.episode?.show?.anilistId;
          epNum = item.episodeNumber || item.episode?.episodeNumber || 1;
          showTitle = item.title || item.showTitle || item.episode?.show?.title || 'Anime Series';
          posterUrl = item.poster || item.episode?.show?.poster || 'Postes/spyfamS3p.jpg';
          const seekParam = progress > 5 ? `&t=${Math.floor(progress)}` : '';
          resumeUrl = `/watch?id=${anilistId}&ep=${epNum}${seekParam}`;
        } else {
          if (!item.episode || !item.episode.show) return;
          const show = item.episode.show;
          showTitle = show.title;
          posterUrl = window.formatMediaUrl(show.poster);
          epNum = item.episode.episodeNumber;
          const seekParam = progress > 5 ? `&t=${Math.floor(progress)}` : '';
          resumeUrl = `/watch?id=${item.episodeId}${seekParam}`;
        }

        html += `
              <div class="continue-card group relative flex flex-col rounded-xl overflow-hidden bg-surface-container-low border border-white/5 hover:border-secondary-container/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,238,252,0.18)] cursor-pointer active:scale-95 select-none" onclick="window.requireAuthPlay(event, '${resumeUrl}')">
                <div class="relative w-full aspect-[2/3] overflow-hidden bg-surface-container-highest">
                  <img src="${posterUrl}" alt="${showTitle}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.onerror=null; this.src='Postes/spyfamS3p.jpg';" loading="lazy" decoding="async">
                  <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 pointer-events-none"></div>

                  <!-- Episode & Type Badge -->
                  <div class="absolute top-1.5 left-1.5 z-10 pointer-events-none flex items-center gap-1">
                    <span class="px-1.5 py-0.5 rounded bg-primary-container text-white font-label-sm text-[9px] font-bold shadow-md tracking-wider">Ep ${epNum}</span>
                    <span class="px-1 py-0.5 rounded bg-black/60 text-outline-variant font-label-sm text-[8px] uppercase font-bold">${isLunar ? 'Anime' : 'HD'}</span>
                  </div>

                  <!-- Hover Play Overlay -->
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-xs pointer-events-none">
                    <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-container text-white flex items-center justify-center shadow-[0_0_14px_#ff506e] transform group-hover:scale-110 transition-transform">
                      <span class="material-symbols-outlined text-[20px] sm:text-[22px]" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                    </div>
                  </div>

                  <!-- Integrated Bottom Progress Bar -->
                  <div class="absolute bottom-0 left-0 right-0 h-1 bg-black/80 z-10 pointer-events-none">
                    <div class="h-full bg-gradient-to-r from-primary-container to-secondary-container shadow-[0_0_6px_#00eefc]" style="width: ${percent}%;"></div>
                  </div>
                </div>

                <!-- Card Body Info -->
                <div class="p-2 sm:p-2.5 flex flex-col gap-0.5 bg-surface-container-low">
                  <h4 class="font-headline-sm text-xs sm:text-sm font-bold text-white truncate group-hover:text-secondary-container transition-colors" title="${showTitle}">${showTitle}</h4>
                  <div class="flex items-center justify-between font-label-sm text-[10px] text-outline mt-0.5">
                    <span class="text-on-surface-variant font-medium">Episode ${epNum}</span>
                    <span class="text-secondary-container font-semibold">${percent}%</span>
                  </div>
                </div>
              </div>
            `;
      });
      if (html) grid.innerHTML = html;
      requestAnimationFrame(() => {
        setupContinueNav();
      });
    } else {
      container.classList.add('hidden');
    }
  } catch (e) {
    console.error('Error loading continue watching:', e);
  }
}

// Fetch carousel featured items
let heroSwiper = null;
async function loadCarousel() {
  try {
    let slideDelay = 6000;
    try {
      const settingsRes = await fetch(`${API_BASE}/settings`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.bannerSlideTime) slideDelay = settingsData.bannerSlideTime;
      }
    } catch (err) { console.error('Error loading settings', err); }

    const res = await fetch(`${API_BASE}/shows/carousel`);
    const data = await res.json();
    const wrapper = document.getElementById('carouselWrapper');

    if (data && data.length > 0) {
      let html = '';
      data.forEach((show, index) => {
        const playLink = show.episodes && show.episodes.length > 0
          ? `/watch?id=${show.episodes[0].id}`
          : '#';
        const rawBanner = show.banner || show.poster;
        const bannerImg = rawBanner ? encodeURI(window.formatMediaUrl(rawBanner)) : '';
        const isVideo = rawBanner && (rawBanner.toLowerCase().endsWith('.mp4') || rawBanner.toLowerCase().endsWith('.webm'));

        const videoOrImg = isVideo
          ? `<video class="absolute inset-0 w-full h-full object-cover" autoplay loop muted playsinline><source src="${bannerImg}" type="video/mp4"></video>`
          : '';

        html += `
              <div class="swiper-slide relative w-full min-h-[580px] h-[85vh] max-h-[780px] sm:h-[720px] lg:h-[840px] overflow-hidden">
                <!-- Inner Background Layer (Animated independently without disrupting Swiper positioning) -->
                <div class="hero-bg-layer absolute inset-0 w-full h-full bg-cover bg-center" style="${bannerImg && !isVideo ? `background-image: url('${bannerImg}');` : 'background: linear-gradient(135deg, #151829 0%, #0d0f1b 100%);'}">
                  ${videoOrImg}
                </div>
                <!-- Deep Multistage Scrim Overlays for Pure AMOLED Blend -->
                <div class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 sm:via-surface-container-lowest/40 to-transparent pointer-events-none"></div>
                <div class="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest/60 to-transparent pointer-events-none"></div>
                <div class="absolute inset-0 bg-gradient-to-b from-surface-container-lowest/90 via-transparent to-transparent h-28 sm:h-48 pointer-events-none"></div>

                <!-- Hero Content Plate -->
                <div class="hero-content-plate relative z-10 w-full h-full max-w-7xl mx-auto px-4 sm:px-gutter flex flex-col justify-end pb-4 sm:pb-12 lg:pb-20 pt-20 sm:pt-28 lg:pt-32">
                  <div class="flex flex-col max-w-2xl gap-2 sm:gap-3 lg:gap-space-md">
                    <!-- Metatags / Master Badges -->
                    <div class="flex flex-wrap items-center gap-1.5 sm:gap-space-xs">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-secondary-container/15 text-secondary-container shadow-[0_0_16px_rgba(0,238,252,0.35)] font-label-sm text-xs sm:text-label-sm uppercase tracking-wider font-bold">
                        <span class="w-1.5 h-1.5 rounded-full bg-secondary-container animate-ping"></span>
                        #${index + 1} Trending
                      </span>
                      <span class="px-2 py-0.5 sm:py-1 rounded bg-surface-container-high/90 text-on-surface font-label-sm text-xs sm:text-label-sm tracking-widest uppercase">
                        ${show.type === 'movie' ? 'Feature' : 'Simulcast'}
                      </span>
                      <span class="hidden sm:inline-block px-2 py-1 rounded bg-surface-container-high/90 text-primary font-label-sm text-label-sm tracking-widest uppercase font-bold">
                        4K HDR
                      </span>
                      <span class="hidden sm:inline-block px-2 py-1 rounded bg-surface-container-high/90 text-tertiary font-label-sm text-label-sm tracking-widest uppercase font-bold">
                        Dolby Vision • Atmos
                      </span>
                      <div class="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded bg-surface-container-high/90 text-secondary">
                        <span class="material-symbols-outlined text-[13px] sm:text-[14px]" style="font-variation-settings: 'FILL' 1;">star</span>
                        <span class="font-label-sm text-xs sm:text-label-sm font-bold">${show.rating || '9.85'}</span>
                      </div>
                    </div>

                    <!-- Title Presentation with Editorial Drop Shadow -->
                    <div class="flex flex-col">
                      <span class="hidden sm:block font-label-md text-label-md text-secondary-container tracking-[0.3em] uppercase">Tokyo Broadcast Master • 60 FPS</span>
                      <h1 class="text-3xl sm:text-5xl lg:text-display-hero font-extrabold text-on-surface drop-shadow-[0_8px_32px_rgba(0,0,0,0.9)] tracking-tight leading-[1.15] sm:leading-tight lg:leading-[72px]">
                        ${show.title}
                      </h1>
                    </div>

                    <!-- Series Metadata line -->
                    <div class="flex items-center gap-2 sm:gap-space-sm font-label-md sm:font-label-lg text-xs sm:text-label-lg text-outline">
                      <span class="text-secondary-fixed font-bold">${show.year || '2025'}</span>
                      <span>•</span>
                      <span>${show.runtime || 'Ultra HD'}</span>
                      <span>•</span>
                      <span class="text-primary-fixed uppercase font-bold">${show.badge || 'HD'}</span>
                      ${show.dubsub ? '<span class="hidden xs:inline">•</span><span class="hidden xs:inline text-on-surface font-semibold">SUB/DUB</span>' : ''}
                    </div>

                    <!-- Synopsis snippet -->
                    <p class="font-body-md sm:font-body-lg text-xs sm:text-body-lg text-on-surface-variant max-w-xl line-clamp-2 sm:line-clamp-3 leading-relaxed">
                      ${show.description || 'Theatre Grade OLED Anime & Movie Streaming. Pure AMOLED zero-floor masterings, uncompressed audio bitrate, and simultaneous Tokyo transmissions.'}
                    </p>

                    <!-- Dual Primary CTAs & Transport Action -->
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-space-md pt-1 sm:pt-space-xs w-full max-w-xl">
                      <a href="${playLink}" class="relative inline-flex items-center justify-center gap-space-sm px-6 py-2.5 sm:py-3.5 rounded-full bg-primary-container text-on-primary-container font-label-lg text-sm sm:text-label-lg shadow-[0_0_24px_rgba(255,80,110,0.5)] hover:shadow-[0_0_36px_rgba(255,80,110,0.8)] active:scale-95 transition-all duration-300 group cursor-pointer w-full sm:w-auto" onclick="return window.requireAuthPlay(event, '${playLink}')">
                        <span class="material-symbols-outlined text-[20px] sm:text-[22px] group-hover:scale-110 transition-transform" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                        <span class="tracking-wider uppercase font-bold">Watch Now</span>
                      </a>
                      <div class="flex items-center gap-2 sm:gap-space-md w-full sm:w-auto">
                        <button class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-space-xs sm:gap-space-sm px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-full bg-surface-container-high/80 text-on-surface hover:text-secondary-container hover:bg-surface-container-highest active:scale-95 transition-all duration-300 font-label-md sm:font-label-lg text-xs sm:text-label-lg backdrop-blur-xl shadow-lg cursor-pointer" onclick="window.toggleWatchlist(${show.id})">
                          <span class="material-symbols-outlined text-[18px] sm:text-[20px]">bookmark_add</span>
                          <span class="tracking-wide">Add to Watchlist</span>
                        </button>
                        <button class="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface-container-low/90 text-on-surface hover:text-secondary hover:bg-surface-container-high active:scale-95 transition-all duration-200 cursor-pointer shadow-md group shrink-0" onclick="window.openShowDetails(${show.id})" title="Details &amp; Episodes">
                          <span class="material-symbols-outlined text-[18px] sm:text-[22px] group-hover:rotate-12 transition-transform">theaters</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Spotlight Indicators & Horizontal Deck Controls -->
                  <div class="flex items-center justify-between w-full pt-3 sm:pt-6 mt-1 sm:mt-2">
                    <div class="flex items-center gap-space-xs hero-pagination"></div>
                    <div class="flex items-center gap-1.5 sm:gap-space-xs">
                      <button class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-high/80 flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-bright active:scale-90 transition-all cursor-pointer hero-prev-btn" aria-label="Previous slide">
                        <span class="material-symbols-outlined text-[18px] sm:text-[20px]">chevron_left</span>
                      </button>
                      <button class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-high/80 flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-bright active:scale-90 transition-all cursor-pointer hero-next-btn" aria-label="Next slide">
                        <span class="material-symbols-outlined text-[18px] sm:text-[20px]">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `;
      });
      wrapper.innerHTML = html;

      if (heroSwiper && typeof heroSwiper.destroy === 'function') {
        try { heroSwiper.destroy(true, true); } catch (e) { }
        heroSwiper = null;
      }

      heroSwiper = new Swiper('.hero-slider', {
        loop: true,
        autoplay: { delay: slideDelay, disableOnInteraction: false },
        pagination: { el: '.hero-pagination', clickable: true },
        navigation: { nextEl: '.hero-next-btn', prevEl: '.hero-prev-btn' },
        effect: 'fade',
        fadeEffect: { crossFade: true },
        speed: 800,
        touchRatio: 1,
        resistanceRatio: 0.85,
        passiveListeners: true
      });
    }
  } catch (e) {
    console.error('Error fetching carousel:', e);
  }
}

// Fetch categories with shows & dynamic section renderer with sorting
let globalCategoriesData = [];
let currentSortOrder = 'default';

const CATEGORY_MAP = {
  // Categories
  'south-hindi-dubbed': { name: 'South Hindi Dubbed', icon: 'fa-language', color: '#ff793f' },
  'hollywood': { name: 'Hollywood Movies', icon: 'fa-film', color: '#9c27b0' },
  'bollywood': { name: 'Bollywood Movies', icon: 'fa-clapperboard', color: '#ff5252' },
  'anime': { name: 'Anime Series', icon: 'fa-play-circle', color: '#00a8ff' },
  'web-series': { name: 'Web Series', icon: 'fa-tv', color: '#2ecc71' },
  'kids': { name: 'Kids & Family', icon: 'fa-child', color: '#f1c40f' },
  'kdrama': { name: 'Korean Drama', icon: 'fa-video', color: '#e67e22' },
  // Genres
  'action': { name: 'Action', icon: 'fa-fire', color: '#ff0055' },
  'adventure': { name: 'Adventure', icon: 'fa-compass', color: '#e67e22' },
  'animation': { name: 'Animation', icon: 'fa-magic', color: '#9b59b6' },
  'comedy': { name: 'Comedy', icon: 'fa-laugh-beam', color: '#f1c40f' },
  'crime': { name: 'Crime', icon: 'fa-user-ninja', color: '#34495e' },
  'drama': { name: 'Drama', icon: 'fa-theater-masks', color: '#e74c3c' },
  'fantasy': { name: 'Fantasy', icon: 'fa-dragon', color: '#a200ff' },
  'historical': { name: 'Historical', icon: 'fa-landmark', color: '#d35400' },
  'horror': { name: 'Horror', icon: 'fa-ghost', color: '#2c3e50' },
  'mystery': { name: 'Mystery', icon: 'fa-user-secret', color: '#8e44ad' },
  'political': { name: 'Political', icon: 'fa-building-columns', color: '#7f8c8d' },
  'romance': { name: 'Romance', icon: 'fa-heart', color: '#ff4757' },
  'sci-fi': { name: 'Sci-Fi', icon: 'fa-atom', color: '#00f0ff' },
  'thriller': { name: 'Thriller', icon: 'fa-bolt', color: '#ff6b6b' }
};

function sortShowsList(shows, sortOption) {
  let list = [...shows];
  if (sortOption === 'rating-desc') {
    return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortOption === 'newest') {
    return list.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0) || b.id - a.id);
  } else if (sortOption === 'views-desc') {
    return list.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (sortOption === 'title-asc') {
    return list.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortOption === 'title-desc') {
    return list.sort((a, b) => b.title.localeCompare(a.title));
  }
  return list;
}

function changeHomeSort(val) {
  currentSortOrder = val;
  renderDynamicHomeSections();
}

async function loadCategories() {
  const container = document.getElementById('homeDynamicSections');
  if (!container) return;

  // Render skeleton sections
  let skeletonHtml = '';
  for (let i = 0; i < 3; i++) {
    skeletonHtml += `
          <section class="w-full max-w-7xl mx-auto px-gutter py-space-md">
            <div class="flex items-center justify-between mb-space-md">
              <div class="flex items-center gap-space-sm">
                <div class="w-1 h-5 rounded-full skeleton"></div>
                <div class="skeleton h-6 w-44 rounded-md"></div>
              </div>
              <div class="skeleton h-5 w-20 rounded-md"></div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-space-md">
              ${Array(6).fill(`
                <div class="flex flex-col rounded-xl overflow-hidden bg-surface-container-low border border-white/5">
                  <div class="aspect-[2/3] w-full skeleton"></div>
                  <div class="p-2.5 sm:p-3 flex flex-col gap-2 bg-surface-container-low">
                    <div class="skeleton h-3.5 w-3/4 rounded"></div>
                    <div class="skeleton h-2.5 w-1/2 rounded"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        `;
  }
  container.innerHTML = skeletonHtml;

  try {
    const res = await fetch(`${API_BASE}/shows/categories`);
    if (res.ok) {
      globalCategoriesData = await res.json();
      renderQuickPills();
      renderDynamicHomeSections();
    }
  } catch (e) {
    console.error('Error fetching categories:', e);
    container.innerHTML = `<div class="container"><p style="color: var(--primary); text-align: center; padding: 40px 0;"><i class="fas fa-exclamation-circle"></i> Failed to load show categories.</p></div>`;
  }
}

function renderQuickPills() {
  const pillsContainer = document.getElementById('genreQuickPills');
  if (!pillsContainer) return;

  let pillsHtml = `<button class="px-4 py-2 rounded-full bg-secondary-container text-on-secondary-fixed font-label-md text-label-md uppercase tracking-wider shadow-[0_0_16px_rgba(0,238,252,0.35)] shrink-0 cursor-pointer pill-btn active" onclick="window.location.href='index.html'">All Catalog</button>`;
  globalCategoriesData.forEach(cat => {
    if (cat.shows && cat.shows.length > 0) {
      const info = CATEGORY_MAP[cat.slug] || { name: cat.name };
      pillsHtml += `<a href="#section-${cat.slug}" class="px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high font-label-md text-label-md uppercase tracking-wider shrink-0 transition-all cursor-pointer pill-btn">${info.name} (${cat.shows.length})</a>`;
    }
  });
  pillsContainer.innerHTML = pillsHtml;
}

function renderDynamicHomeSections() {
  const container = document.getElementById('homeDynamicSections');
  if (!container) return;

  if (!globalCategoriesData || globalCategoriesData.length === 0) {
    container.innerHTML = `<div class="w-full max-w-7xl mx-auto px-gutter py-8"><p class="text-outline text-center">No categories available in Tokyo vault.</p></div>`;
    return;
  }

  let sectionsHtml = '';

  globalCategoriesData.forEach(cat => {
    const shows = cat.shows || [];
    if (shows.length > 0) {
      const info = CATEGORY_MAP[cat.slug] || { name: cat.name, icon: 'fa-layer-group', color: '#ff0055' };
      const sortedShows = sortShowsList(shows, currentSortOrder);

      let cardsHtml = '';
      sortedShows.slice(0, 6).forEach(show => {
        const isFav = userWatchlist.includes(show.id);
        const hasEpisodes = show.episodes && show.episodes.length > 0;
        const playUrl = hasEpisodes ? `/watch?id=${show.episodes[0].id}` : '#';

        cardsHtml += `
              <div class="movie-card category-card group relative flex flex-col rounded-xl overflow-hidden bg-surface-container-low shadow-xl transition-all duration-300 cursor-pointer" onclick="if(!event.target.closest('.action-btn')) window.openShowDetails(${show.id})">
                <div class="relative aspect-[2/3] w-full overflow-hidden">
                  <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${window.formatMediaUrl(show.poster)}" alt="${show.title}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='Postes/spyfamS3p.jpg'">
                  <div class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
                  <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 text-secondary font-label-sm text-label-sm font-bold shadow-md">
                    ${show.badge || '4K UHD'}
                  </span>
                  <button class="action-btn absolute top-2 right-2 w-8 h-8 rounded-full bg-surface-container-lowest/80 text-outline hover:text-primary-container flex items-center justify-center transition-all ${isFav ? 'text-primary-container' : ''}" onclick="event.stopPropagation(); window.toggleWatchlist(this, ${show.id})">
                    <span class="material-symbols-outlined text-[18px]">${isFav ? 'favorite' : 'favorite_border'}</span>
                  </button>
                  <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span class="px-2 py-0.5 rounded bg-surface-container-lowest/80 text-secondary font-label-sm text-label-sm font-bold backdrop-blur-md">
                      ★ ${show.rating || '9.8'}
                    </span>
                    ${show.dubsub ? '<span class="px-1.5 py-0.5 rounded bg-surface-container-high/90 text-on-surface font-label-sm text-label-sm font-bold">SUB/DUB</span>' : '<span class="px-1.5 py-0.5 rounded bg-surface-container-high/90 text-on-surface font-label-sm text-label-sm font-bold">SUB</span>'}
                  </div>
                </div>
                <div class="p-3 bg-surface-container-low flex flex-col gap-0.5">
                  <span class="font-headline-sm text-headline-sm font-bold truncate group-hover:text-secondary-container transition-colors">${show.title}</span>
                  <div class="flex items-center justify-between text-outline font-label-sm text-label-sm">
                    <span>${show.year || '2024'}</span>
                    <span>${show.runtime || '24m'}</span>
                  </div>
                </div>
              </div>
            `;
      });

      // Determine correct routing for "View All":
      // All dynamic home sections from categories should route to anime.html?category=slug
      // (or anime.html for anime / anime-hub) so the actual category shows are displayed
      let viewAllUrl = `anime.html?category=${encodeURIComponent(cat.slug)}`;
      if (cat.slug === 'anime' || cat.slug === 'anime-hub') {
        viewAllUrl = 'anime.html';
      }

      sectionsHtml += `
            <section class="w-full max-w-7xl mx-auto px-gutter pt-space-xl" id="section-${cat.slug}">
              <div class="flex items-center justify-between mb-space-md">
                <div class="flex items-center gap-space-sm">
                  <div class="w-1 h-5 rounded-full bg-secondary-container shadow-[0_0_10px_#00eefc]"></div>
                  <h2 class="font-headline-md text-headline-md tracking-tight font-bold text-on-surface">${info.name}</h2>
                  <span class="font-label-sm text-label-sm text-outline px-2 py-0.5 rounded bg-surface-container-low">${shows.length} Masterpieces</span>
                </div>
                <a class="font-label-md text-label-md text-secondary-container hover:text-secondary flex items-center gap-0.5 transition-colors" href="${viewAllUrl}">
                  <span>View All</span>
                  <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                </a>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-space-md">
                ${cardsHtml}
              </div>
            </section>
          `;
    }
  });

  container.innerHTML = sectionsHtml || `<div class="w-full max-w-7xl mx-auto px-gutter py-8"><p class="text-outline text-center">No shows available in Tokyo vault.</p></div>`;
  requestAnimationFrame(() => initScrollReveal());
}


// Toggle favorite watchlist item
async function toggleWatchlist(btnOrId, maybeShowId) {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  let btn = null;
  let showId = null;
  if (typeof btnOrId === 'number' || (typeof btnOrId === 'string' && !isNaN(parseInt(btnOrId)))) {
    showId = parseInt(btnOrId, 10);
  } else {
    btn = btnOrId;
    showId = parseInt(maybeShowId, 10);
  }

  if (!showId) return;

  try {
    const res = await fetch(`${API_BASE}/user/watchlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ showId })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'added') {
        if (btn) {
          btn.classList.add('active');
          const icon = btn.querySelector('.material-symbols-outlined') || btn.querySelector('i');
          if (icon) {
            if (icon.tagName === 'SPAN') icon.textContent = 'favorite';
            else icon.className = 'fas fa-heart';
          }
        }
        if (!userWatchlist.includes(showId)) userWatchlist.push(showId);
      } else {
        if (btn) {
          btn.classList.remove('active');
          const icon = btn.querySelector('.material-symbols-outlined') || btn.querySelector('i');
          if (icon) {
            if (icon.tagName === 'SPAN') icon.textContent = 'favorite_border';
            else icon.className = 'far fa-heart';
          }
        }
        userWatchlist = userWatchlist.filter(id => id !== showId);
      }
      loadWatchlist();
    }
  } catch (e) {
    console.error(e);
  }
}

// Intercept playback for unauthenticated users (strict sign-up gate)
window.requireAuthPlay = function (e, playUrl) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!isLoggedIn()) {
    if (playUrl && playUrl !== '#') {
      sessionStorage.setItem('infinx_redirect_after_auth', playUrl);
    }
    window.location.href = 'login.html';
    return false;
  }
  if (playUrl && playUrl !== '#') {
    window.location.href = playUrl;
  }
  return true;
};

// Authentication Handlers
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('infinx_token', data.token);
      localStorage.setItem('infinx_user_email', data.user.email);
      localStorage.setItem('infinx_user_role', data.user.role);
      if (data.user) {
        localStorage.setItem('infinx_user', JSON.stringify(data.user));
        if (data.user.username) localStorage.setItem('infinx_username', data.user.username);
        if (data.user.avatarUrl) localStorage.setItem('infinx_avatar', data.user.avatarUrl);
        if (data.user.avatarFrame) localStorage.setItem('infinx_avatar_frame', data.user.avatarFrame);
        if (data.user.vipRank) localStorage.setItem('infinx_vip_rank', data.user.vipRank);
        if (data.user.level) localStorage.setItem('infinx_level', String(data.user.level));
      }

      closeModal('login');
      initApp();

      const target = sessionStorage.getItem('infinx_redirect_after_auth');
      if (target) {
        sessionStorage.removeItem('infinx_redirect_after_auth');
        window.location.href = target;
        return;
      }
    } else {
      alert(data.error || 'Login failed');
    }
  } catch (err) {
    console.error(err);
    alert('Connection error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('infinx_token', data.token);
      localStorage.setItem('infinx_user_email', data.user.email);
      localStorage.setItem('infinx_user_role', data.user.role);
      if (data.user) {
        localStorage.setItem('infinx_user', JSON.stringify(data.user));
        if (data.user.username) localStorage.setItem('infinx_username', data.user.username);
        if (data.user.avatarUrl) localStorage.setItem('infinx_avatar', data.user.avatarUrl);
        if (data.user.avatarFrame) localStorage.setItem('infinx_avatar_frame', data.user.avatarFrame);
        if (data.user.vipRank) localStorage.setItem('infinx_vip_rank', data.user.vipRank);
        if (data.user.level) localStorage.setItem('infinx_level', String(data.user.level));
      }

      closeModal('register');
      initApp();

      const target = sessionStorage.getItem('infinx_redirect_after_auth');
      if (target) {
        sessionStorage.removeItem('infinx_redirect_after_auth');
        window.location.href = target;
        return;
      }
    } else {
      alert(data.error || 'Registration failed');
    }
  } catch (err) {
    console.error(err);
    alert('Connection error');
  }
}

function handleLogout(e) {
  if (e) e.stopPropagation();
  localStorage.clear();
  updateAuthHeader();
  document.getElementById('continueWatchingSection').classList.add('hidden');
  // Remove active classes from hearts
  document.querySelectorAll('.btn-watchlist-toggle').forEach(btn => {
    btn.classList.remove('active');
    btn.querySelector('i').className = 'far fa-heart';
  });
  userWatchlist = [];
}

// Modal triggers
function openModal(type) {
  if (type === 'login') {
    window.location.href = 'login.html';
    return;
  }
  if (type === 'register') {
    window.location.href = 'login.html#register';
    return;
  }
  const modal = document.getElementById(`${type}Modal`);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(type) {
  const modal = document.getElementById(`${type}Modal`);
  if (modal) {
    modal.classList.remove('active');
  }
  if (!document.querySelector('.modal.active') && !document.querySelector('.mobile-drawer.active')) {
    document.body.style.overflow = '';
  }
}

function switchModal(closeType, openType) {
  closeModal(closeType);
  setTimeout(() => openModal(openType), 100);
}

// Modal backdrop click-to-close handler
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', function (e) {
    if (e.target === this) {
      this.classList.remove('active');
      if (!document.querySelector('.modal.active') && !document.querySelector('.mobile-drawer.active')) {
        document.body.style.overflow = '';
      }
    }
  });
});

// Explicitly expose functions to window for inline HTML handlers
window.openModal = typeof openModal !== 'undefined' ? openModal : window.openModal;
window.closeModal = typeof closeModal !== 'undefined' ? closeModal : window.closeModal;
window.switchModal = typeof switchModal !== 'undefined' ? switchModal : window.switchModal;
window.changeHomeSort = typeof changeHomeSort !== 'undefined' ? changeHomeSort : window.changeHomeSort;
window.performLiveSearch = typeof performLiveSearch !== 'undefined' ? performLiveSearch : window.performLiveSearch;
window.loadLunarTrending = typeof loadLunarTrending !== 'undefined' ? loadLunarTrending : window.loadLunarTrending;
window.switchLunarTab = typeof switchLunarTab !== 'undefined' ? switchLunarTab : window.switchLunarTab;
window.openMobileMenu = typeof openMobileMenu !== 'undefined' ? openMobileMenu : window.openMobileMenu;
window.toggleWatchlist = typeof toggleWatchlist !== 'undefined' ? toggleWatchlist : window.toggleWatchlist;


// Cyberpunk Smooth Scroll Entrance Reveal
function initScrollReveal() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });

  document.querySelectorAll('#continueWatchingSection, #lunarAnimeSection, #homeDynamicSections section, #simulcastSchedule, #publicLiveChatSection').forEach(sec => {
    if (!sec.classList.contains('reveal-fade-up')) {
      sec.classList.add('reveal-fade-up');
      observer.observe(sec);
    }
  });
}
