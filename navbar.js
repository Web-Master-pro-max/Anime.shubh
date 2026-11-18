/**
 * Infinx Anime - Unified Master Header & Navigation Component
 * Single-source-of-truth navbar with:
 *  - Rich Desktop Navigation: Home, Anime, Genres Dropdown (14 genres),
 *    Categories Dropdown (7 categories), Watchlist, History, Live Chat (LIVE pulse),
 *    Get App, Otaku Passport, VIP Pass, and Admin Studio
 *  - Full Mobile Drawer Navigation with Collapsible Genres & Categories Accordions
 *  - Dynamic Auth States (Signed-Out vs Logged-In Aura Avatar & Profile)
 *  - Universal Keyboard Shortcuts (Cmd+K / Ctrl+K) & Live Search Routing
 *  - OLED Precision Scrollbar & Scroll-Lock Prevention Safety
 */
(function () {
  'use strict';

  // Determine relative root prefix based on directory depth
  function getPathPrefix() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/video-player/')) {
      return '../';
    }
    return '';
  }

  // Detect which navigation route matches the current page
  function getCurrentRoute() {
    const path = window.location.pathname.replace(/\\/g, '/').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const file = path.split('/').pop() || 'index.html';

    if (hash.includes('watchlist')) return 'watchlist';
    if (hash.includes('history')) return 'history';
    if (hash.includes('publiclivechatsection')) return 'chat';
    if (file === '' || file === 'index.html') return 'home';
    if (file.includes('anime')) return 'anime';
    if (file.includes('view')) return 'view';
    if (file.includes('download')) return 'download';
    if (file.includes('profile')) return 'passport';
    if (file.includes('admin')) return 'admin';
    return '';
  }

  // Master Genres & Categories Data (Consistent across all pages)
  const GENRES_LIST = [
    { name: 'Action', slug: 'action', icon: 'fa-fire' },
    { name: 'Adventure', slug: 'adventure', icon: 'fa-compass' },
    { name: 'Animation', slug: 'animation', icon: 'fa-magic' },
    { name: 'Comedy', slug: 'comedy', icon: 'fa-laugh-beam' },
    { name: 'Crime', slug: 'crime', icon: 'fa-user-ninja' },
    { name: 'Drama', slug: 'drama', icon: 'fa-theater-masks' },
    { name: 'Fantasy', slug: 'fantasy', icon: 'fa-dragon' },
    { name: 'Historical', slug: 'historical', icon: 'fa-landmark' },
    { name: 'Horror', slug: 'horror', icon: 'fa-ghost' },
    { name: 'Mystery', slug: 'mystery', icon: 'fa-user-secret' },
    { name: 'Political', slug: 'political', icon: 'fa-building-columns' },
    { name: 'Romance', slug: 'romance', icon: 'fa-heart' },
    { name: 'Sci-Fi', slug: 'sci-fi', icon: 'fa-atom' },
    { name: 'Thriller', slug: 'thriller', icon: 'fa-bolt' }
  ];

  const CATEGORIES_LIST = [
    { name: 'South Hindi Dubbed', slug: 'south-hindi-dubbed', icon: 'fa-language' },
    { name: 'Hollywood Movies', slug: 'hollywood', icon: 'fa-film' },
    { name: 'Bollywood Movies', slug: 'bollywood', icon: 'fa-clapperboard' },
    { name: 'Anime Hub', isAnimeHub: true, icon: 'fa-play-circle' },
    { name: 'Web Series', slug: 'web-series', icon: 'fa-tv' },
    { name: 'Kids & Family', slug: 'kids', icon: 'fa-child' },
    { name: 'Korean Drama', slug: 'kdrama', icon: 'fa-video' }
  ];

  // Inject essential Navbar & Scrollbar styles
  function injectNavbarStyles() {
    if (document.getElementById('infinxMasterNavStyles')) return;
    const style = document.createElement('style');
    style.id = 'infinxMasterNavStyles';
    style.textContent = `
      /* OLED Precision Cyberpunk Scrollbar */
      html {
        scroll-behavior: smooth;
        overflow-x: hidden;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.22) #0e0e0e;
      }
      body {
        min-height: 100vh;
        overflow-x: hidden;
        overscroll-behavior-y: auto;
        -webkit-font-smoothing: antialiased;
      }
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #0e0e0e;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.22);
        border-radius: 4px;
        border: 2px solid #0e0e0e;
        transition: background 0.2s ease;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #ff506e;
        box-shadow: 0 0 12px rgba(255, 80, 110, 0.6);
      }

      /* Desktop Dropdown Menus */
      .nav-item-dropdown {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .nav-item-dropdown:hover .dropdown-menu,
      .nav-item-dropdown.active .dropdown-menu {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: translateX(-50%) translateY(0) scale(1);
      }
      .nav-item-dropdown:hover .dropdown-chevron,
      .nav-item-dropdown.active .dropdown-chevron {
        transform: rotate(180deg);
        color: #00eefc;
      }
      .dropdown-menu {
        position: absolute;
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%) translateY(8px) scale(0.96);
        background: rgba(14, 14, 22, 0.97);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        padding: 12px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 238, 252, 0.15);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 1000;
      }
      .dropdown-menu.genres-menu {
        min-width: 350px;
      }
      .dropdown-menu.categories-menu {
        min-width: 250px;
      }
      .dropdown-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 10px;
        color: #c9c9d5;
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s ease;
      }
      .dropdown-item:hover {
        background: rgba(0, 238, 252, 0.12);
        color: #ffffff;
        transform: translateX(3px);
        box-shadow: 0 0 14px rgba(0, 238, 252, 0.25);
      }
      .dropdown-item i {
        font-size: 14px;
        color: #ff506e;
        width: 18px;
        text-align: center;
        transition: all 0.2s ease;
      }
      .dropdown-item:hover i {
        color: #00eefc;
        transform: scale(1.15);
      }

      /* Mobile Drawer Transitions */
      .mobile-drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.82);
        backdrop-filter: blur(14px);
        z-index: 998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .mobile-drawer-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .mobile-drawer {
        position: fixed;
        top: 0;
        bottom: 0;
        right: 0;
        width: 330px;
        max-width: 88vw;
        background: rgba(14, 14, 18, 0.98);
        backdrop-filter: blur(30px);
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 999;
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .mobile-drawer.active {
        transform: translateX(0);
      }

      /* Mobile & Android Safe Area & Layout Insets */
      .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
      .pt-safe { padding-top: env(safe-area-inset-top, 0px); }
      .px-gutter { padding-left: 1.5rem; padding-right: 1.5rem; }
      .px-gutter-mobile { padding-left: 0.75rem; padding-right: 0.75rem; }

      /* Aura Avatar Frames */
      .user-avatar.aura-gold {
        box-shadow: 0 0 16px rgba(255, 183, 0, 0.95), inset 0 0 8px rgba(255, 183, 0, 0.5) !important;
        border: 2.5px solid #ffd700 !important;
      }
      .user-avatar.aura-cyan, .user-avatar.aura-electric {
        box-shadow: 0 0 16px rgba(0, 238, 252, 0.95) !important;
        border: 2px solid #00eefc !important;
      }
      .user-avatar.aura-flame, .user-avatar.aura-fire {
        box-shadow: 0 0 16px rgba(255, 80, 110, 0.95) !important;
        border: 2px solid #ff506e !important;
      }
      .user-avatar.aura-void, .user-avatar.aura-purple {
        box-shadow: 0 0 16px rgba(160, 120, 255, 0.95) !important;
        border: 2px solid #a078ff !important;
      }
      .user-avatar.aura-sakura {
        box-shadow: 0 0 16px rgba(255, 182, 193, 0.95) !important;
        border: 2px solid #ffdadb !important;
      }
      .user-avatar.aura-default, .user-avatar.aura-neon {
        box-shadow: 0 0 12px rgba(0, 238, 252, 0.5) !important;
        border: 2px solid rgba(255, 255, 255, 0.4) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Generate Master Navbar HTML
  function renderNavbarMarkup() {
    const prefix = getPathPrefix();
    const activeRoute = getCurrentRoute();

    const activeClass = 'px-3.5 py-1.5 font-label-lg transition-all duration-200 bg-secondary-container/15 text-secondary-container shadow-[0_0_16px_rgba(0,238,252,0.25)] rounded-full font-bold inline-flex items-center gap-1.5';
    const inactiveClass = 'px-3 py-1.5 rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all duration-200 inline-flex items-center gap-1.5';

    // Genres grid items HTML
    const genresItemsHtml = GENRES_LIST.map(g => `
      <a href="${prefix}view.html#${g.slug}" class="dropdown-item">
        <i class="fas ${g.icon}"></i>
        <span>${g.name}</span>
      </a>
    `).join('');

    // Categories items HTML
    const categoriesItemsHtml = CATEGORIES_LIST.map(c => `
      <a href="${c.isAnimeHub ? `${prefix}anime.html` : `${prefix}view.html#${c.slug}`}" class="dropdown-item">
        <i class="fas ${c.icon}"></i>
        <span>${c.name}</span>
      </a>
    `).join('');

    return `
    <div class="h-16 sm:h-20 w-full px-3 sm:px-gutter flex items-center justify-between gap-2 sm:gap-space-md">
      <!-- Logo & Desktop Navigation Ribbon -->
      <div class="flex items-center gap-space-md xl:gap-space-lg flex-shrink-0">
        <a class="flex items-center gap-space-sm group" href="${prefix}index.html">
          <div class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-high/80 shadow-[0_0_16px_rgba(0,238,252,0.35)] group-hover:shadow-[0_0_24px_rgba(0,238,252,0.6)] transition-all duration-300">
            <svg class="w-6 h-6 transform -rotate-12 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.178 8c-1.38 0-2.61.644-3.414 1.645C13.606 8.167 11.758 7 9.5 7 5.91 7 3 9.91 3 13.5S5.91 20 9.5 20c2.258 0 4.106-1.167 5.264-2.645C15.568 18.356 16.798 19 18.178 19 20.84 19 23 16.84 23 14.178c0-2.662-2.16-4.178-4.822-4.178zm-8.678 9.5c-2.206 0-4-1.794-4-4s1.794-4 4-4c1.862 0 3.398 1.282 3.824 3.013a5.55 5.55 0 0 1 0 1.974c-.426 1.731-1.962 3.013-3.824 3.013zm8.678-1c-1.396 0-2.533-.946-2.85-2.23a4.015 4.015 0 0 1 0-1.54c.317-1.284 1.454-2.23 2.85-2.23 1.556 0 2.822 1.266 2.822 2.822 0 1.556-1.266 2.822-2.822 2.822z" fill="#00eefc"></path>
              <circle cx="9.5" cy="13.5" fill="#ff506e" r="1.5"></circle>
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="font-headline-sm text-headline-sm tracking-wider font-extrabold text-secondary-container drop-shadow-[0_0_12px_rgba(0,238,252,0.6)]">
              INFINX<span class="text-primary-container drop-shadow-[0_0_12px_rgba(255,80,110,0.6)] ml-1">ANIME</span>
            </span>
            <span class="font-label-sm text-label-sm tracking-widest uppercase text-outline">CINEMA LABS</span>
          </div>
        </a>

        <!-- Desktop Navigation Ribbon (>= 1280px) with Full Old Features Restored -->
        <nav class="hidden xl:flex items-center gap-1 p-1 rounded-full bg-surface-container-lowest/60 backdrop-blur-md">
          <!-- 1. Home -->
          <a class="${activeRoute === 'home' ? activeClass : inactiveClass}" ${activeRoute === 'home' ? 'aria-current="page"' : ''} href="${prefix}index.html">
            <i class="fas fa-home text-xs"></i>
            <span>Home</span>
          </a>

          <!-- 2. Anime -->
          <a class="${activeRoute === 'anime' ? activeClass : inactiveClass}" ${activeRoute === 'anime' ? 'aria-current="page"' : ''} href="${prefix}anime.html">
            <i class="fas fa-tv text-xs"></i>
            <span>Anime</span>
          </a>

          <!-- 3. Genres Dropdown (Restored) -->
          <div class="nav-item-dropdown">
            <button type="button" class="${inactiveClass} dropdown-toggle cursor-pointer" aria-haspopup="true" aria-expanded="false">
              <i class="fas fa-layer-group text-xs text-secondary-container"></i>
              <span>Genres</span>
              <i class="fas fa-chevron-down text-[10px] ml-0.5 transition-transform duration-200 dropdown-chevron"></i>
            </button>
            <div class="dropdown-menu genres-menu">
              <div class="grid grid-cols-2 gap-1">
                ${genresItemsHtml}
              </div>
            </div>
          </div>

          <!-- 4. Categories Dropdown (Restored) -->
          <div class="nav-item-dropdown">
            <button type="button" class="${inactiveClass} dropdown-toggle cursor-pointer" aria-haspopup="true" aria-expanded="false">
              <i class="fas fa-list-ul text-xs text-secondary-container"></i>
              <span>Categories</span>
              <i class="fas fa-chevron-down text-[10px] ml-0.5 transition-transform duration-200 dropdown-chevron"></i>
            </button>
            <div class="dropdown-menu categories-menu">
              <div class="flex flex-col gap-1">
                ${categoriesItemsHtml}
              </div>
            </div>
          </div>

          <!-- 5. Watchlist -->
          <a class="${activeRoute === 'watchlist' ? activeClass : inactiveClass}" href="${prefix}view.html#watchlist">
            <i class="fas fa-heart text-xs text-primary-container"></i>
            <span>Watchlist</span>
          </a>

          <!-- 6. History -->
          <a class="${activeRoute === 'history' ? activeClass : inactiveClass}" href="${prefix}view.html#history">
            <i class="fas fa-history text-xs text-secondary-container"></i>
            <span>History</span>
          </a>

          <!-- 7. Live Chat with Pulsing Live Dot -->
          <a class="${activeRoute === 'chat' ? activeClass : inactiveClass} nav-chat-link group" href="${prefix}index.html#publicLiveChatSection" id="navChatLink" onclick="if(typeof window.scrollToPublicChat==='function'){window.scrollToPublicChat(event);}">
            <i class="fas fa-comments text-xs text-secondary-container group-hover:scale-110 transition-transform"></i>
            <span>Live Chat</span>
            <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-primary-container to-red-600 shadow-[0_0_8px_#ff506e] animate-pulse ml-0.5">LIVE</span>
          </a>
        </nav>
      </div>

      <!-- Desktop Search Bar -->
      <div class="flex-1 max-w-md mx-space-md hidden md:block relative">
        <div class="relative flex items-center w-full">
          <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">search</span>
          <input id="searchInput" class="w-full pl-11 pr-14 py-2 bg-surface-container-low/90 backdrop-blur-xl rounded-full font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-secondary-container focus:shadow-[0_0_20px_rgba(0,238,252,0.3)] transition-all" placeholder="Search anime, shows, movies..." type="text" autocomplete="off" />
          <div class="absolute right-3 px-2 py-0.5 rounded bg-surface-container-highest/80 font-label-sm text-label-sm text-on-surface-variant shadow-inner pointer-events-none">⌘K</div>
        </div>
        <!-- Live Search Dropdown Panel -->
        <div id="liveSearchDropdown" class="live-search-dropdown absolute top-full left-0 right-0 mt-2 rounded-xl bg-surface-container-lowest/95 backdrop-blur-2xl border border-white/10 shadow-2xl z-50" style="display: none;"></div>
      </div>

      <!-- Right Action Items Cluster -->
      <div class="flex items-center gap-1 sm:gap-2 lg:gap-space-md flex-shrink-0">
        <!-- VIP Pass Button (Hidden) -->
        <a class="relative hidden items-center gap-space-xs px-3.5 py-1.5 rounded-full bg-surface-container-low text-primary shadow-[0_0_14px_rgba(255,80,110,0.35)] hover:bg-primary-container hover:text-on-primary-container transition-all duration-200 group" href="${prefix}view.html#vip" style="display: none !important;">
          <span class="material-symbols-outlined text-[16px] text-primary group-hover:text-on-primary-container">local_fire_department</span>
          <span class="font-label-sm text-label-sm tracking-wider uppercase font-bold">VIP PASS</span>
        </a>

        <!-- Notifications Bell Button (Hidden) -->
        <button class="relative hidden p-1.5 sm:p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer shrink-0" title="Notifications" id="headerNotificationsBtn" type="button" style="display: none !important;">
          <span class="material-symbols-outlined text-[20px] sm:text-[22px]">notifications</span>
          <span class="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 h-2 rounded-full bg-primary-container shadow-[0_0_8px_#ff506e]"></span>
        </button>

        <!-- Mobile Quick Search Trigger -->
        <button class="md:hidden p-1.5 sm:p-2 text-outline hover:text-white transition-colors cursor-pointer shrink-0" id="mobileHeaderSearchBtn" aria-label="Open Search" type="button">
          <span class="material-symbols-outlined text-[22px] sm:text-[24px]">search</span>
        </button>

        <!-- Dynamic Auth Cluster -->
        <div class="auth-buttons flex items-center gap-1.5 sm:gap-2 shrink-0" id="authHeader">
          <button class="px-3 sm:px-4 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-xs sm:text-label-sm font-semibold transition-all cursor-pointer shrink-0" id="masterSignInBtn" type="button">Sign In</button>
        </div>

        <!-- Mobile Hamburger Trigger (Visible on all screens < 1280px / xl) -->
        <button class="inline-flex xl:hidden p-1.5 sm:p-2 text-outline hover:text-secondary-container active:scale-95 transition-all cursor-pointer mobile-toggle shrink-0" id="mobileMenuToggle" aria-label="Open Menu" type="button">
          <span class="material-symbols-outlined text-[24px] sm:text-[26px]">menu</span>
        </button>
      </div>
    </div>
    `;
  }

  // Generate Mobile Drawer Markup (Full Navigation suite for Mobile)
  function renderMobileDrawerMarkup() {
    const prefix = getPathPrefix();

    const genresDrawerItems = GENRES_LIST.map(g => `
      <a href="${prefix}view.html#${g.slug}" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-white hover:bg-secondary-container/15 transition-all">
        <i class="fas ${g.icon} text-primary-container text-xs w-4"></i>
        <span>${g.name}</span>
      </a>
    `).join('');

    const categoriesDrawerItems = CATEGORIES_LIST.map(c => `
      <a href="${c.isAnimeHub ? `${prefix}anime.html` : `${prefix}view.html#${c.slug}`}" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-white hover:bg-primary-container/15 transition-all">
        <i class="fas ${c.icon} text-primary-container text-xs w-4"></i>
        <span>${c.name}</span>
      </a>
    `).join('');

    return `
      <div class="flex flex-col gap-4">
        <!-- Drawer Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shadow-[0_0_12px_rgba(0,238,252,0.35)]">
              <span class="material-symbols-outlined text-secondary-container text-[20px]">movie_filter</span>
            </div>
            <span class="font-headline-sm font-bold text-on-surface">INFINX ANIME</span>
          </div>
          <button id="closeDrawer" class="text-outline hover:text-on-surface text-2xl cursor-pointer drawer-close">&times;</button>
        </div>

        <!-- Drawer Navigation Items -->
        <nav class="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          <a href="${prefix}index.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all">
            <i class="fas fa-home text-sm text-secondary-container w-5"></i>
            <span>Home</span>
          </a>

          <a href="${prefix}anime.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all">
            <i class="fas fa-tv text-sm text-secondary-container w-5"></i>
            <span>Browse Anime</span>
          </a>

          <!-- Genres Accordion -->
          <div class="flex flex-col">
            <button type="button" class="drawer-accordion-toggle flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all cursor-pointer">
              <div class="flex items-center gap-3">
                <i class="fas fa-layer-group text-sm text-secondary-container w-5"></i>
                <span>Genres</span>
              </div>
              <i class="fas fa-chevron-down text-xs accordion-chevron transition-transform duration-200"></i>
            </button>
            <div class="hidden flex-col pl-4 py-1.5 gap-0.5 bg-surface-container-lowest/50 rounded-xl mt-1 border border-white/5">
              <div class="grid grid-cols-2 gap-0.5">
                ${genresDrawerItems}
              </div>
            </div>
          </div>

          <!-- Categories Accordion -->
          <div class="flex flex-col">
            <button type="button" class="drawer-accordion-toggle flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all cursor-pointer">
              <div class="flex items-center gap-3">
                <i class="fas fa-list-ul text-sm text-secondary-container w-5"></i>
                <span>Categories</span>
              </div>
              <i class="fas fa-chevron-down text-xs accordion-chevron transition-transform duration-200"></i>
            </button>
            <div class="hidden flex-col pl-3 py-1.5 gap-0.5 bg-surface-container-lowest/50 rounded-xl mt-1 border border-white/5">
              ${categoriesDrawerItems}
            </div>
          </div>

          <a href="${prefix}view.html#watchlist" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all">
            <i class="fas fa-heart text-sm text-primary-container w-5"></i>
            <span>Watchlist</span>
          </a>

          <a href="${prefix}view.html#history" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all">
            <i class="fas fa-history text-sm text-secondary-container w-5"></i>
            <span>History Hub</span>
          </a>

          <a href="${prefix}index.html#publicLiveChatSection" class="flex items-center justify-between px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all" onclick="if(typeof window.scrollToPublicChat==='function'){window.scrollToPublicChat(event); if(typeof window.closeMobileMenu==='function') window.closeMobileMenu();}">
            <div class="flex items-center gap-3">
              <i class="fas fa-comments text-sm text-secondary-container w-5"></i>
              <span>Live Chat</span>
            </div>
            <span class="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase text-white bg-gradient-to-r from-primary-container to-red-600 animate-pulse">LIVE</span>
          </a>

          <a href="${prefix}download.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all">
            <i class="fas fa-mobile-alt text-sm text-secondary-container w-5"></i>
            <span>Get Mobile App</span>
          </a>

          <a href="${prefix}profile.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all">
            <i class="fas fa-user-ninja text-sm text-secondary-container w-5"></i>
            <span>Otaku Passport</span>
          </a>

          <a href="${prefix}admin.html" id="drawerAdminLink" class="hidden items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-all">
            <i class="fas fa-user-shield text-sm text-secondary-container w-5"></i>
            <span>Admin Studio</span>
          </a>
        </nav>
      </div>

      <!-- Drawer Auth Footer -->
      <div id="drawerAuthHeader" class="pt-4 border-t border-white/[0.08] flex flex-col gap-2.5">
        <button class="w-full py-2.5 rounded-xl bg-secondary-container text-on-secondary-fixed font-label-md font-bold shadow-[0_0_16px_rgba(0,238,252,0.35)] cursor-pointer" onclick="if(typeof openModal === 'function'){openModal('login'); if(typeof closeMobileMenu === 'function') closeMobileMenu();}else{window.location.href='${prefix}login.html';}" type="button">
          Sign In
        </button>
        <button class="w-full py-2 rounded-xl bg-surface-container-high text-on-surface font-label-md font-medium cursor-pointer" onclick="if(typeof openModal === 'function'){openModal('register'); if(typeof closeMobileMenu === 'function') closeMobileMenu();}else{window.location.href='${prefix}login.html#register';}" type="button">
          Create Account
        </button>
      </div>
    `;
  }

  // Dynamic Auth State Engine
  function updateAuthHeader() {
    const authHeader = document.getElementById('authHeader');
    const drawerAuthHeader = document.getElementById('drawerAuthHeader');
    const drawerAdminLink = document.getElementById('drawerAdminLink');
    const prefix = getPathPrefix();

    const token = localStorage.getItem('infinx_token');
    const isLoggedIn = !!(token && token !== 'null' && token !== 'undefined');

    if (drawerAdminLink) {
      const role = localStorage.getItem('infinx_user_role');
      if (role === 'ADMIN') {
        drawerAdminLink.classList.remove('hidden');
        drawerAdminLink.classList.add('flex');
      } else {
        drawerAdminLink.classList.add('hidden');
        drawerAdminLink.classList.remove('flex');
      }
    }

    if (!authHeader && !drawerAuthHeader) return;

    if (isLoggedIn) {
      const email = localStorage.getItem('infinx_user_email') || 'User';
      const role = localStorage.getItem('infinx_user_role');
      const userRaw = localStorage.getItem('infinx_user');
      let user = null;
      try { if (userRaw) user = JSON.parse(userRaw); } catch (e) { }

      const username = localStorage.getItem('infinx_username') || (user && user.username) || (role === 'ADMIN' ? 'SUPRIMEHOKAGE' : email.split('@')[0]);
      const displayName = username.toUpperCase();
      const rawAvatar = localStorage.getItem('infinx_avatar') || (user && user.avatarUrl) || `${prefix}assets/avatars/av-jin-u-seong.png`;
      let avatarUrl = null;
      if (rawAvatar && typeof rawAvatar === 'string') {
        const trimmed = rawAvatar.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
          avatarUrl = trimmed;
        } else if (trimmed.startsWith('assets/') || trimmed.startsWith('uploads/') || trimmed.startsWith('Postes/')) {
          avatarUrl = prefix + trimmed;
        } else if (trimmed.startsWith('/assets/') || trimmed.startsWith('/uploads/') || trimmed.startsWith('/Postes/')) {
          avatarUrl = trimmed;
        } else if (trimmed.startsWith('av-') || trimmed.endsWith('.png') || trimmed.endsWith('.jpg') || trimmed.endsWith('.jpeg')) {
          avatarUrl = `${prefix}assets/avatars/${trimmed.replace(/^\/+/, '')}`;
        } else {
          avatarUrl = trimmed;
        }
      }
      if (!avatarUrl) {
        avatarUrl = `${prefix}assets/avatars/av-jin-u-seong.png`;
      }

      let rawFrame = localStorage.getItem('infinx_avatar_frame') || (user && user.avatarFrame) || (role === 'ADMIN' ? 'gold' : 'default');
      if (!rawFrame || rawFrame === 'default') {
        if (role === 'ADMIN' || username.toUpperCase().includes('HOKAGE')) {
          rawFrame = 'gold';
        }
      }
      const avatarFrame = (rawFrame || 'default').replace(/^aura-/, '');
      const initial = (displayName || email || 'U')[0].toUpperCase();
      const fallbackSrc = 'https://s4.anilist.co/file/anilistcdn/character/large/b129928-BCEjVaP0AQSw.png';

      const avatarHtml = `
        <div class="user-avatar aura-${avatarFrame}" style="width: 36px; height: 36px; min-width: 36px; min-height: 36px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;" title="${displayName} (${email})">
          <img src="${avatarUrl}" alt="${displayName}" class="w-full h-full object-cover" onerror="if(this.src!=='${fallbackSrc}'){this.src='${fallbackSrc}';}else{this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';}" />
          <span style="display:none; font-weight:700; font-size:13px;">${initial}</span>
        </div>
      `;

      const adminLink = role === 'ADMIN' ?
        `<a href="${prefix}admin.html" class="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-surface-container-high text-secondary hover:text-white font-label-sm text-xs font-semibold hover:bg-surface-container-highest transition-all shrink-0"><span class="material-symbols-outlined text-[15px]">admin_panel_settings</span>Admin</a>` : '';

      if (authHeader) {
        authHeader.innerHTML = `
          <div class="user-profile-menu flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            ${adminLink}
            <a href="${prefix}profile.html" class="profile-name-text text-xs sm:text-sm font-extrabold text-white hover:text-secondary-container transition-colors hidden sm:inline-flex items-center gap-1.5 shrink-0" title="View Profile (${displayName})">
              <i class="fas fa-user-ninja text-primary-container text-xs sm:text-sm" style="color: #ff0055;"></i>
              <span class="font-extrabold uppercase tracking-wide max-w-[85px] sm:max-w-[140px] md:max-w-[180px] truncate">${displayName}</span>
            </a>
            <a href="${prefix}profile.html" class="user-avatar-link shrink-0" title="View Profile (${displayName})">
              ${avatarHtml}
            </a>
            <button class="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-red-950/40 text-on-surface-variant hover:text-red-400 font-label-sm text-xs font-semibold transition-all cursor-pointer shrink-0" id="masterLogoutBtn" type="button" title="Sign Out">
              <span class="material-symbols-outlined text-[16px] align-middle">logout</span>
              <span class="hidden xl:inline">Logout</span>
            </button>
          </div>
        `;
        const logoutBtn = document.getElementById('masterLogoutBtn');
        if (logoutBtn) {
          logoutBtn.onclick = function (e) {
            e.preventDefault();
            localStorage.removeItem('infinx_token');
            localStorage.removeItem('infinx_user_role');
            localStorage.removeItem('infinx_user');
            updateAuthHeader();
            if (typeof window.showToast === 'function') {
              window.showToast('Logged out successfully.');
            }
            window.location.reload();
          };
        }
      }

      if (drawerAuthHeader) {
        drawerAuthHeader.innerHTML = `
          <a href="${prefix}profile.html" class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/60 border border-white/5 hover:border-secondary-container/40 transition-all">
            <div style="width: 38px; height: 38px; flex-shrink: 0;">${avatarHtml}</div>
            <div class="flex flex-col min-w-0">
              <span class="font-headline-sm text-sm font-bold text-on-surface truncate">${displayName}</span>
              <span class="font-body-sm text-xs text-outline truncate">${email}</span>
            </div>
          </a>
          <button class="w-full mt-1 py-2 rounded-xl bg-surface-container-high text-on-surface hover:text-red-400 font-label-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer" onclick="localStorage.removeItem('infinx_token'); localStorage.removeItem('infinx_user_role'); window.location.reload();">
            Sign Out
          </button>
        `;
      }
    } else {
      if (authHeader) {
        authHeader.innerHTML = `
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button class="px-3 sm:px-4 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-xs sm:text-label-sm font-semibold transition-all cursor-pointer shrink-0" id="masterSignInBtn" type="button">
              Sign In
            </button>
            <button class="hidden sm:inline-block px-3 sm:px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-xs sm:text-label-sm font-bold shadow-[0_0_14px_rgba(255,80,110,0.4)] hover:brightness-110 transition-all cursor-pointer shrink-0" id="masterRegisterBtn" type="button">
              Register
            </button>
          </div>
        `;

        const signInBtn = document.getElementById('masterSignInBtn');
        const registerBtn = document.getElementById('masterRegisterBtn');
        if (signInBtn) {
          signInBtn.onclick = function () {
            if (typeof window.openModal === 'function') {
              window.openModal('login');
            } else {
              window.location.href = prefix + 'login.html';
            }
          };
        }
        if (registerBtn) {
          registerBtn.onclick = function () {
            if (typeof window.openModal === 'function') {
              window.openModal('register');
            } else {
              window.location.href = prefix + 'login.html#register';
            }
          };
        }
      }

      if (drawerAuthHeader) {
        drawerAuthHeader.innerHTML = `
          <button class="w-full py-2.5 rounded-xl bg-secondary-container text-on-secondary-fixed font-label-md font-bold shadow-[0_0_16px_rgba(0,238,252,0.35)] cursor-pointer" onclick="if(typeof openModal === 'function'){openModal('login'); if(typeof closeMobileMenu === 'function') closeMobileMenu();}else{window.location.href='${prefix}login.html';}" type="button">
            Sign In
          </button>
          <button class="w-full py-2 rounded-xl bg-surface-container-high text-on-surface font-label-md font-medium cursor-pointer" onclick="if(typeof openModal === 'function'){openModal('register'); if(typeof closeMobileMenu === 'function') closeMobileMenu();}else{window.location.href='${prefix}login.html#register';}" type="button">
            Create Account
          </button>
        `;
      }
    }
  }

  // Setup Mobile Drawer & Menu Toggle with guaranteed overflow restore
  function setupMobileMenu() {
    const toggleBtn = document.getElementById('mobileMenuToggle') || document.querySelector('.mobile-toggle');
    const drawer = document.getElementById('mobileDrawer') || document.querySelector('.mobile-drawer') || document.getElementById('mainNavbar') || document.querySelector('.navbar');
    const overlay = document.getElementById('navOverlay') || document.querySelector('.mobile-drawer-overlay') || document.querySelector('.nav-overlay');
    const closeBtn = document.getElementById('closeDrawer') || document.querySelector('.drawer-close');

    function openMenu() {
      if (drawer) {
        drawer.classList.add('active');
        drawer.style.transform = 'translateX(0)';
      }
      if (overlay) {
        overlay.classList.add('active');
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
      }
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      if (drawer) {
        drawer.classList.remove('active');
        drawer.style.transform = '';
      }
      if (overlay) {
        overlay.classList.remove('active');
        overlay.style.opacity = '';
        overlay.style.pointerEvents = '';
      }
      document.body.style.overflow = '';
    }

    if (toggleBtn) {
      toggleBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const isActive = drawer && (drawer.classList.contains('active') || drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'translateX(0)');
        if (isActive) closeMenu();
        else openMenu();
      };
    }

    if (closeBtn) closeBtn.onclick = closeMenu;
    if (overlay) overlay.onclick = closeMenu;

    // Close menu when clicking normal links inside drawer (excluding accordion toggles)
    if (drawer) {
      drawer.querySelectorAll('a:not(.drawer-accordion-toggle)').forEach(link => {
        link.addEventListener('click', () => {
          setTimeout(closeMenu, 150);
        });
      });
    }

    window.openMobileMenu = openMenu;
    window.closeMobileMenu = closeMenu;
  }

  // Setup Drawer Accordions for Genres & Categories on mobile
  function setupDrawerAccordions() {
    document.querySelectorAll('.drawer-accordion-toggle').forEach(btn => {
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const content = this.nextElementSibling;
        const chevron = this.querySelector('.accordion-chevron');
        if (content) {
          const isHidden = content.classList.contains('hidden');
          if (isHidden) {
            content.classList.remove('hidden');
            content.classList.add('flex');
            if (chevron) chevron.style.transform = 'rotate(180deg)';
          } else {
            content.classList.add('hidden');
            content.classList.remove('flex');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
          }
        }
      };
    });
  }

  // Setup Dropdown Toggles (Click & Tap for desktop and mobile)
  function setupDropdowns() {
    document.querySelectorAll('.dropdown-toggle').forEach(btn => {
      btn.onclick = function (e) {
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
      };
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav-item-dropdown')) {
        document.querySelectorAll('.nav-item-dropdown').forEach(d => d.classList.remove('active'));
      }
    });
  }

  // Setup Keyboard Shortcuts (Cmd+K / Ctrl+K) & Enter key search
  function setupKeyboardShortcuts() {
    const prefix = getPathPrefix();
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput') || document.getElementById('mobileSearchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      if (e.key === 'Escape') {
        if (typeof window.closeMobileMenu === 'function') {
          window.closeMobileMenu();
        }
        document.querySelectorAll('.nav-item-dropdown').forEach(d => d.classList.remove('active'));
        document.body.style.overflow = '';
      }
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          const q = searchInput.value.trim();
          const route = getCurrentRoute();
          if (q && route !== 'anime') {
            window.location.href = prefix + 'anime.html?search=' + encodeURIComponent(q);
          }
        }
      });
    }

    const bellBtn = document.getElementById('headerNotificationsBtn');
    if (bellBtn) {
      bellBtn.onclick = function () {
        if (typeof window.showToast === 'function') {
          window.showToast('All system frequencies nominal. No unread neural alerts.');
        } else {
          alert('All Tokyo frequencies nominal. Zero unread alerts.');
        }
      };
    }
  }

  // Ensure DOM contains the mobile drawer and overlay elements
  function ensureDrawerDOM() {
    let overlay = document.getElementById('navOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'navOverlay';
      overlay.className = 'mobile-drawer-overlay nav-overlay';
      document.body.appendChild(overlay);
    }

    let drawer = document.getElementById('mobileDrawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.id = 'mobileDrawer';
      drawer.className = 'mobile-drawer navbar flex flex-col justify-between p-6 overflow-y-auto';
      document.body.appendChild(drawer);
    }
    drawer.innerHTML = renderMobileDrawerMarkup();
  }

  // Mount Navbar into DOM
  function initNavbar() {
    injectNavbarStyles();

    let header = document.getElementById('siteHeader');
    if (!header) {
      header = document.querySelector('header');
    }
    if (!header) {
      header = document.createElement('header');
      header.id = 'siteHeader';
      document.body.prepend(header);
    }

    header.id = 'siteHeader';
    header.className = 'fixed top-0 left-0 right-0 z-50 w-full bg-surface-container-lowest/80 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.85)] border-b border-surface-container-high/40 transition-all';
    header.innerHTML = renderNavbarMarkup();

    ensureDrawerDOM();
    updateAuthHeader();
    setupDropdowns();
    setupDrawerAccordions();
    setupMobileMenu();
    setupKeyboardShortcuts();

    // Universal safety: restore body scroll if no active modal/drawer is open
    if (!document.querySelector('.modal.active') && !document.querySelector('.mobile-drawer.active')) {
      document.body.style.overflow = '';
    }
  }

  // Listen for storage events (login/logout from other tabs/modals)
  window.addEventListener('storage', function (e) {
    if (e.key === 'infinx_token' || e.key === 'infinx_user' || e.key === 'infinx_avatar' || e.key === 'infinx_avatar_frame') {
      updateAuthHeader();
    }
  });

  // Global scrollToPublicChat fallback for pages where public-chat.js is not loaded
  if (typeof window.scrollToPublicChat !== 'function') {
    window.scrollToPublicChat = function (e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof window.closeMobileMenu === 'function') window.closeMobileMenu();
      const chatSec = document.getElementById('publicLiveChatSection');
      if (chatSec) {
        chatSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.location.href = (window.__NAV_PREFIX || '') + 'index.html#publicLiveChatSection';
      }
    };
  }

  // Re-export globally for all other scripts
  window.updateAuthHeader = updateAuthHeader;
  window.renderInfinxNavbar = initNavbar;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
  } else {
    initNavbar();
  }
})();
