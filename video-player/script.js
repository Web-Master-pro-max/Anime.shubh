// Android-fix removed; using standard player logic below
// script.js - Dynamic HLS Video Player with Multiple Audio Tracks and API Sync
window.addEventListener('error', function (e) {
  try { console.error('Unhandled error:', e.message, e.error || e); } catch (err) { }
});
window.addEventListener('unhandledrejection', function (e) {
  try { console.error('Unhandled promise rejection:', e.reason); } catch (err) { }
});

document.addEventListener('DOMContentLoaded', async function () {
  try {
    const getSavedServer = () => {
      const saved = localStorage.getItem('infinx_server_url');
      return (saved && !saved.startsWith('file:')) ? saved.replace(/\/$/, '') : null;
    };
    const isHttps = window.location.protocol === 'https:';
    const savedServer = getSavedServer();
    // On HTTPS (Vercel, production domain), never use an insecure http:// savedServer as browsers block mixed content
    const safeSavedServer = (isHttps && savedServer && savedServer.startsWith('http://')) ? null : savedServer;
    const isLocalFrontendPort = ['5000', '5500', '3000', '5173'].includes(window.location.port);
    const SERVER_ORIGIN = isHttps
      ? (safeSavedServer || '')
      : (isLocalFrontendPort
        ? (savedServer || 'http://localhost:8000')
        : ((window.location.protocol === 'file:' || window.location.origin === 'null' || !window.location.origin.includes(':'))
          ? (savedServer || 'http://13.202.95.5:8000')
          : ''));
    const API_BASE = `${SERVER_ORIGIN}/api`;

    // Strict Horizontal Viewport Lock: Guarantee window and document never scroll horizontally
    function enforceZeroHorizontalScroll() {
      if (window.scrollX !== 0 || window.pageXOffset !== 0) {
        window.scrollTo({ left: 0, top: window.scrollY });
      }
      if (document.documentElement.scrollLeft > 0) document.documentElement.scrollLeft = 0;
      if (document.body.scrollLeft > 0) document.body.scrollLeft = 0;
    }
    window.addEventListener('scroll', enforceZeroHorizontalScroll, { passive: true });
    window.addEventListener('resize', enforceZeroHorizontalScroll, { passive: true });

    // Global stream URL sanitizer to prevent mixed content on HTTPS deployments (Vercel, custom domain)
    function sanitizeStreamUrl(url) {
      if (!url || typeof url !== 'string') return url;
      if (window.location.protocol === 'https:') {
        // Rewrite proxy endpoints (/api/stream/...) to current secure origin
        if (url.includes('/api/stream/') || url.includes('/api/anime/') || url.includes('/api/lunarx/') || url.includes('/api/shows/') || url.includes('/uploads/')) {
          return url.replace(/^http:\/\/[^/]+(\/.*)$/i, `${window.location.origin}$1`);
        }
        // Rewrite direct EC2 / localhost backend references to current HTTPS origin
        if (url.startsWith('http://13.202.95.5') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
          return url.replace(/^http:\/\/[^/]+/i, window.location.origin);
        }
      }
      return url;
    }

    // Clean HTML tags from anime descriptions for clean text presentation
    function stripHtmlTags(str) {
      if (!str) return '';
      return String(str)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }


    // Get episode ID or Lunar Anime ID from URL params (supports clean /watch?id=1735&ep=1&t=681)
    const urlParams = new URLSearchParams(window.location.search);
    const rawId = urlParams.get('id');
    const epParam = urlParams.get('ep') || urlParams.get('epNum');
    const isLunarFromId = rawId && (rawId.startsWith('lunar-') || epParam || isNaN(parseInt(rawId)));
    const episodeId = parseInt(urlParams.get('episodeId') || (!isLunarFromId && rawId ? rawId : null));
    const lunarId = urlParams.get('lunarId') || urlParams.get('anilistId') || (isLunarFromId ? String(rawId).replace(/^lunar-/, '') : null);
    let epNum = parseInt(epParam || '1', 10);

    if (!episodeId && !lunarId) {
      alert('No episode selected to watch. Redirecting to home.');
      window.location.href = '/index.html';
      return;
    }

    // Video player elements
    const mainVideo = document.getElementById('main-video');
    const playPauseBtn = document.querySelector('.play-pause');
    const volumeBtn = document.querySelector('.volume-btn');
    const volumeSlider = document.querySelector('.volume-range');
    const progressBarContainer = document.querySelector('.progress-bar-container') || document.querySelector('.progress-bar');
    const progressBar = document.querySelector('.progress-bar');
    const progressEl = document.querySelector('.progress');
    const progressBufferedEl = document.querySelector('.progress-buffered');
    const progressHoverTime = document.querySelector('.progress-hover-time');
    const currentTimeEl = document.querySelector('.current-time');
    const durationEl = document.querySelector('.duration');
    const fullscreenBtn = document.querySelector('.fullscreen-btn');
    const videoPlayer = document.querySelector('.video-player');

    // Navigation buttons
    const prevBtn = document.querySelector('.prev-btn');
    const rewind10Btn = document.querySelector('.rewind-10');
    const nextBtn = document.querySelector('.next-btn');
    const forward10Btn = document.querySelector('.forward-10');

    // Animated Player Loader & Autoplay Recovery Elements
    const playerLoadingOverlay = document.getElementById('playerLoadingOverlay');
    const playerLoadingTitle = document.getElementById('playerLoadingTitle');
    const playerLoadingSubtitle = document.getElementById('playerLoadingSubtitle');
    const playerUnmuteBanner = document.getElementById('playerUnmuteBanner');
    const playerUnmuteBtn = document.getElementById('playerUnmuteBtn');
    const playerClickToPlayOverlay = document.getElementById('playerClickToPlayOverlay');
    const playerClickToPlayBtn = document.getElementById('playerClickToPlayBtn');

    function showPlayerLoader(title = 'Loading Episode...', subtitle = 'Connecting to high-speed stream') {
      if (playerLoadingTitle) playerLoadingTitle.textContent = title;
      if (playerLoadingSubtitle) playerLoadingSubtitle.textContent = subtitle;
      if (playerLoadingOverlay) {
        playerLoadingOverlay.classList.remove('hidden');
        playerLoadingOverlay.classList.add('active');
      }
      if (videoPlayer) videoPlayer.classList.add('loading');
    }

    function hidePlayerLoader() {
      if (playerLoadingOverlay) {
        playerLoadingOverlay.classList.remove('active');
      }
      if (videoPlayer) videoPlayer.classList.remove('loading');
    }

    function hideUnmuteBanner() {
      if (playerUnmuteBanner) playerUnmuteBanner.classList.add('hidden');
    }

    function showUnmuteBanner() {
      if (playerUnmuteBanner) playerUnmuteBanner.classList.remove('hidden');
    }

    function hideClickToPlayOverlay() {
      if (playerClickToPlayOverlay) playerClickToPlayOverlay.classList.add('hidden');
    }

    function showClickToPlayOverlay() {
      if (playerClickToPlayOverlay) playerClickToPlayOverlay.classList.remove('hidden');
    }

    // Persist and apply user volume and mute preferences across episodes and sessions
    function saveUserVolumePreference() {
      if (!mainVideo) return;
      try {
        localStorage.setItem('infinx_player_volume', mainVideo.volume.toString());
        localStorage.setItem('infinx_player_muted', mainVideo.muted ? 'true' : 'false');
      } catch (e) {
        console.warn('[Volume] Failed to save volume preference:', e);
      }
    }

    function applyUserVolumePreference() {
      if (!mainVideo) return;
      try {
        const savedVol = localStorage.getItem('infinx_player_volume');
        const savedMuted = localStorage.getItem('infinx_player_muted');

        if (savedVol !== null && savedVol !== '') {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            mainVideo.volume = parsed;
          }
        } else {
          mainVideo.volume = 1.0;
        }

        // Never auto-mute; only mute if user explicitly saved muted === 'true'
        if (savedMuted === 'true') {
          mainVideo.muted = true;
        } else {
          mainVideo.muted = false;
        }

        updateVolumeUI();
      } catch (e) {
        console.warn('[Volume] Failed to apply volume preference:', e);
      }
    }

    function updateVolumeUI() {
      if (!mainVideo) return;
      const isMuted = mainVideo.muted || mainVideo.volume === 0;
      const vol = mainVideo.volume;

      if (volumeBtn) {
        if (isMuted) {
          volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (vol < 0.5) {
          volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
          volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
      }

      if (volumeSlider) {
        volumeSlider.value = isMuted ? 0 : Math.round(vol * 100);
      }
    }

    if (playerUnmuteBtn) {
      playerUnmuteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (mainVideo) {
          mainVideo.muted = false;
          const savedVol = parseFloat(localStorage.getItem('infinx_player_volume'));
          mainVideo.volume = (!isNaN(savedVol) && savedVol > 0) ? savedVol : 1;
          saveUserVolumePreference();
          updateVolumeUI();
        }
        hideUnmuteBanner();
        showPlayerToast('Audio Unmuted 🔊');
      });
    }

    if (playerClickToPlayBtn) {
      playerClickToPlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideClickToPlayOverlay();
        if (mainVideo) {
          applyUserVolumePreference();
          mainVideo.play().catch(err => {
            console.warn('[Player] Manual play attempt failed:', err);
          });
        }
      });
    }

    function attemptAutoplay(videoEl = mainVideo) {
      if (!videoEl) return;
      hideClickToPlayOverlay();
      applyUserVolumePreference();

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          hidePlayerLoader();
          hideUnmuteBanner();
          hideClickToPlayOverlay();
          if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }).catch(err => {
          console.warn('[Autoplay] Autoplay blocked by browser policy:', err);
          hidePlayerLoader();
          // Never auto-mute; prompt user with click-to-play overlay so playback starts with unmuted sound
          showClickToPlayOverlay();
          if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        });
      }
    }

    // Attach buffer, seek, and loading lifecycle listeners to mainVideo
    if (mainVideo) {
      mainVideo.addEventListener('waiting', () => {
        if (!mainVideo.paused && !mainVideo.ended) {
          showPlayerLoader('Buffering...', 'Synchronizing stream buffer...');
        }
      });
      mainVideo.addEventListener('stalled', () => {
        if (!mainVideo.paused && !mainVideo.ended) {
          showPlayerLoader('Buffering...', 'Re-establishing stream connection...');
        }
      });
      mainVideo.addEventListener('seeking', () => {
        showPlayerLoader('Seeking...', 'Jumping to timeline position...');
      });
      mainVideo.addEventListener('playing', () => {
        hidePlayerLoader();
        hideClickToPlayOverlay();
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      });
      mainVideo.addEventListener('canplay', () => {
        if (!mainVideo.paused) {
          hidePlayerLoader();
        }
      });
      mainVideo.addEventListener('timeupdate', () => {
        if (!mainVideo.paused && mainVideo.currentTime > 0) {
          hidePlayerLoader();
        }
      });
    }

    // Auto-next checkbox
    const autoNextCheckbox = document.getElementById('auto-next');
    const autoNextLabel = document.querySelector('.auto-next-label');

    // Settings menu elements
    const settingsBtn = document.querySelector('.settings-btn');
    const settingsMenu = document.querySelector('.settings-menu');
    const settingsDropdown = document.querySelector('.settings-dropdown');

    // Playlist elements
    const playlistContainer = document.getElementById('playlist-items-container');
    const videoTitle = document.getElementById('current-video-title');
    const episodeElement = document.querySelector('.episode');

    // Mobile elements
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    const mobileNavClose = document.querySelector('.mobile-nav-close');
    const mobileTouchControls = document.querySelectorAll('.mobile-touch-controls div');

    // Keyboard shortcuts help
    const shortcutsHelp = document.querySelector('.shortcuts-help');
    const keyboardShortcutsBtn = document.querySelector('.keyboard-shortcuts-btn');
    const closeShortcutsBtn = document.querySelector('.close-shortcuts-btn');

    // Auth helpers (Strict User Authentication Gate)
    let token = localStorage.getItem('infinx_token');
    let authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    function checkIsLoggedIn() {
      token = localStorage.getItem('infinx_token');
      authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      return !!token;
    }

    let currentAuthTab = 'register';

    window.switchPlayerAuthTab = function (mode) {
      currentAuthTab = mode;
      const tabReg = document.getElementById('playerTabRegister');
      const tabLogin = document.getElementById('playerTabLogin');
      const title = document.getElementById('playerAuthTitle');
      const submitText = document.getElementById('playerAuthSubmitText');
      const errorBox = document.getElementById('playerAuthError');
      if (errorBox) {
        errorBox.textContent = '';
        errorBox.style.display = 'none';
      }

      if (mode === 'register') {
        if (tabReg) tabReg.classList.add('active');
        if (tabLogin) tabLogin.classList.remove('active');
        if (title) title.textContent = 'Sign Up to Start Watching';
        if (submitText) submitText.textContent = 'Sign Up & Watch Now';
      } else {
        if (tabLogin) tabLogin.classList.add('active');
        if (tabReg) tabReg.classList.remove('active');
        if (title) title.textContent = 'Sign In to Continue Watching';
        if (submitText) submitText.textContent = 'Sign In & Watch';
      }
    };

    window.showPlayerAuthLock = function () {
      const modal = document.getElementById('playerAuthModal');
      if (modal) modal.style.display = 'flex';
      if (videoPlayer) videoPlayer.classList.remove('loading');
      if (mainVideo) {
        mainVideo.pause();
        try { mainVideo.removeAttribute('src'); mainVideo.load(); } catch (e) { }
      }
      if (hls) {
        try { hls.destroy(); } catch (e) { }
        hls = null;
      }
    };

    window.hidePlayerAuthLock = function () {
      const modal = document.getElementById('playerAuthModal');
      if (modal) modal.style.display = 'none';
    };

    window.handlePlayerAuthSubmit = async function (e) {
      if (e) e.preventDefault();
      const emailInput = document.getElementById('playerAuthEmail');
      const passwordInput = document.getElementById('playerAuthPassword');
      const errorBox = document.getElementById('playerAuthError');
      const submitBtn = document.getElementById('playerAuthSubmitBtn');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        if (errorBox) {
          errorBox.textContent = 'Please enter both email and password.';
          errorBox.style.display = 'block';
        }
        return;
      }

      try {
        if (submitBtn) submitBtn.disabled = true;
        if (errorBox) {
          errorBox.textContent = '';
          errorBox.style.display = 'none';
        }

        const endpoint = currentAuthTab === 'register' ? '/auth/register' : '/auth/login';
        const res = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed. Please check your credentials.');
        }

        // Store tokens
        localStorage.setItem('infinx_token', data.token);
        if (data.user) {
          localStorage.setItem('infinx_user_email', data.user.email);
          localStorage.setItem('infinx_user_role', data.user.role);
        }

        token = data.token;
        authHeaders = { 'Authorization': `Bearer ${token}` };

        hidePlayerAuthLock();

        // Boot and play!
        startAuthenticatedPlayback();
      } catch (err) {
        if (errorBox) {
          errorBox.textContent = err.message || 'Authentication error';
          errorBox.style.display = 'block';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    };

    // Load dynamic episode data
    let currentEpisode = null;
    let siblingEpisodes = [];
    let showId = null;

    try {
      if (lunarId) {
        // Fetch complete anime metadata and episodes from Stream API
        const allRes = await fetch(`${API_BASE}/stream/all/${lunarId}`);
        if (!allRes.ok) throw new Error(`Stream API returned ${allRes.status}`);
        const animeData = await allRes.json();
        const eps = animeData.episodes || [];
        const thisEp = eps.find(e => (e.number || e.episodeNumber) === epNum) || eps[0] || {
          number: epNum,
          title: `Episode ${epNum}`,
          description: stripHtmlTags(animeData.description)
        };

        const resolvedEpNum = thisEp.number || thisEp.episodeNumber || epNum;

        currentEpisode = {
          id: `lunar-${lunarId}-${resolvedEpNum}`,
          episodeNumber: resolvedEpNum,
          title: thisEp.title || `Episode ${resolvedEpNum}`,
          description: stripHtmlTags(thisEp.description || animeData.description),
          thumbnail: thisEp.thumbnail || animeData.poster,
          isLunar: true,
          anilistId: lunarId,
          show: {
            id: `lunar-${lunarId}`,
            title: animeData.title,
            description: stripHtmlTags(animeData.description),
            poster: animeData.poster,
            banner: animeData.banner,
            artworks: animeData.artworks,
            seasons: animeData.seasons || [],
            relations: animeData.relations || [],
            rating: animeData.rating,
            year: animeData.year,
            categories: (animeData.genres || []).map(g => ({
              name: g,
              slug: g.toLowerCase().replace(/\s+/g, '-'),
              category: { name: g, slug: g.toLowerCase().replace(/\s+/g, '-') }
            })),
            episodes: eps
          },
          servers: [
            { id: 'server-1', name: 'Server 1 (1080p Ultra)', shortName: 'Server 1', badge: '1080p HD', host: 'zuna', type: 'hls' },
            { id: 'server-2', name: 'Server 2 (English Dub / Fast)', shortName: 'Server 2', badge: 'English Dub', host: 'yuki', type: 'hls' },
            { id: 'server-3', name: 'Server 3 (Dual Audio / 1080p)', shortName: 'Server 3', badge: 'Dual Audio', host: '3rdprovider', type: 'hls' },
            { id: 'server-4', name: 'Server 4 (HD Backup)', shortName: 'Server 4', badge: 'Fast Stream', host: 'sora', type: 'hls' }
          ]
        };

        siblingEpisodes = (eps && eps.length > 0) ? eps.map(e => ({
          ...e,
          id: e.id || `lunar-${lunarId}-${e.number || e.episodeNumber}`,
          episodeNumber: e.number || e.episodeNumber,
          videoUrl: ''
        })) : [{
          id: `lunar-${lunarId}-${resolvedEpNum}`,
          number: resolvedEpNum,
          episodeNumber: resolvedEpNum,
          title: thisEp.title || `Episode ${resolvedEpNum}`,
          thumbnail: thisEp.thumbnail || animeData.poster || '',
          videoUrl: ''
        }];
        showId = `lunar-${lunarId}`;
      } else {
        // 1. Fetch current episode info with resilient handling
        const epRes = await fetch(`${API_BASE}/shows/episodes/${episodeId}`);
        if (!epRes.ok) {
          throw new Error(`Server returned HTTP ${epRes.status}`);
        }
        const rawData = await epRes.json();

        // Normalize if response has nested episode or flat structure
        if (rawData.episode) {
          currentEpisode = {
            ...rawData.episode,
            show: rawData.show || rawData.episode.show,
            servers: rawData.servers || rawData.episode.servers
          };
        } else {
          currentEpisode = rawData;
        }

        showId = currentEpisode.showId || (currentEpisode.show && currentEpisode.show.id);

        // Sibling episodes from embedded show object if present
        if (currentEpisode.show && Array.isArray(currentEpisode.show.episodes) && currentEpisode.show.episodes.length > 0) {
          siblingEpisodes = currentEpisode.show.episodes;
        } else if (showId) {
          try {
            const showRes = await fetch(`${API_BASE}/shows/${showId}`);
            if (showRes.ok) {
              const showData = await showRes.json();
              siblingEpisodes = showData.episodes || [];
            }
          } catch (showErr) {
            console.warn('Could not load sibling episodes for showId:', showId, showErr);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load episode metadata:', err);
      // Attempt recovery: fallback to dummy object so player doesn't hard-crash if partial data exists
      currentEpisode = currentEpisode || {
        id: lunarId ? `lunar-${lunarId}-${epNum}` : episodeId,
        title: `Episode ${lunarId ? epNum : episodeId}`,
        episodeNumber: lunarId ? epNum : 1,
        videoUrl: '',
        isLunar: !!lunarId,
        anilistId: lunarId,
        show: {
          id: lunarId ? `lunar-${lunarId}` : `show-${episodeId}`,
          title: `Episode ${lunarId ? epNum : episodeId}`,
          categories: [],
          episodes: []
        },
        servers: [
          { id: 'server-1', name: 'Server 1 (1080p Ultra)', shortName: 'Server 1', badge: '1080p HD', host: 'zuna', type: 'hls' },
          { id: 'server-2', name: 'Server 2 (English Dub / Fast)', shortName: 'Server 2', badge: 'English Dub', host: 'yuki', type: 'hls' },
          { id: 'server-3', name: 'Server 3 (Dual Audio / 1080p)', shortName: 'Server 3', badge: 'Dual Audio', host: '3rdprovider', type: 'hls' },
          { id: 'server-4', name: 'Server 4 (HD Backup)', shortName: 'Server 4', badge: 'Fast Stream', host: 'sora', type: 'hls' }
        ]
      };
      // Show user-friendly notification inside the UI instead of hard-killing the tab
      const errorBanner = document.createElement('div');
      errorBanner.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#e11d48;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 10px 25px rgba(0,0,0,0.5);display:flex;align-items:center;gap:10px;';
      errorBanner.innerHTML = `<span>⚠️ Could not load episode metadata from server.</span> <button style="background:#fff;color:#e11d48;border:none;padding:4px 10px;border-radius:6px;font-weight:700;cursor:pointer;" onclick="location.reload()">Retry</button>`;
      document.body.appendChild(errorBanner);
      setTimeout(() => { if (errorBanner.parentNode) errorBanner.remove(); }, 8000);
    }


    // Variables
    let isSettingsMenuOpen = false;
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    let hls = null; // HLS.js instance
    let audioTracks = []; // Available audio tracks
    let currentAudioTrack = 0;
    const urlAudioParam = (urlParams.get('type') || urlParams.get('audio') || '').toLowerCase();
    let currentAudioType = (urlAudioParam === 'dub' || urlAudioParam === 'sub')
      ? urlAudioParam
      : (localStorage.getItem('infinx_preferred_audio_type') || 'sub');
    let subtitleTracks = []; // Available subtitle tracks
    let currentSubtitleTrack = -1; // -1 means no subtitle
    let qualities = []; // Available quality levels
    let hideControlsTimeout;
    let isFullscreen = false;
    let lastProgressReportTime = 0;
    const episodesPerPage = 6;

    // URL resolver for local vs cloud media
    function resolveMediaUrl(url) {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return sanitizeStreamUrl(url);
      return sanitizeStreamUrl(`${SERVER_ORIGIN}${url}`);
    }

    // Available streaming servers for current episode
    let availableServers = [];
    let activeServerId = 's3';

    function getAvailableServers(ep) {
      if (!ep) return [];
      if (ep.servers && Array.isArray(ep.servers) && ep.servers.length > 0) {
        return ep.servers;
      }
      const isS3 = (u) => u && (u.includes('amazonaws.com') || (u.startsWith('http') && !u.includes('/uploads/')));
      const isLocal = (u) => u && (u.startsWith('/uploads') || u.includes('/uploads/'));

      const s3Url = ep.s3Url || (isS3(ep.videoUrl) ? ep.videoUrl : null);
      const localUrl = ep.localUrl || (isLocal(ep.videoUrl) ? ep.videoUrl : null);

      const list = [];
      if (s3Url) {
        list.push({
          id: 's3',
          name: 'Server 1',
          shortName: 'Server 1',
          badge: 'AWS S3',
          url: s3Url,
          type: 'cloud'
        });
      }
      if (localUrl) {
        list.push({
          id: 'local',
          name: 'Server 2',
          shortName: 'Server 2',
          badge: 'Local Disk',
          url: localUrl,
          type: 'local'
        });
      }
      if (list.length === 0 && ep.videoUrl) {
        list.push({
          id: 'default',
          name: 'Default Server',
          shortName: 'Server 1',
          badge: 'Online',
          url: ep.videoUrl,
          type: 'default'
        });
      }
      return list;
    }

    function updateServerOptions() {
      availableServers = getAvailableServers(currentEpisode);
      const serverDropdown = document.getElementById('server-dropdown');
      const playerServerOptions = document.getElementById('player-server-options');
      const serverSelector = document.getElementById('server-selector');
      const playerServerSection = document.getElementById('player-server-section');

      // Always keep the server selector visible on the frontend as requested
      if (serverSelector) serverSelector.style.display = 'inline-block';
      if (playerServerSection) playerServerSection.style.display = 'block';

      if (!availableServers || availableServers.length === 0) {
        if (currentEpisode && currentEpisode.videoUrl) {
          availableServers = [{
            id: 's3',
            name: 'Server 1',
            shortName: 'Server 1',
            badge: 'AWS S3',
            url: currentEpisode.videoUrl,
            type: 'cloud'
          }];
        } else {
          return;
        }
      }

      // Pick preferred server if available, else first available
      const preferred = localStorage.getItem('infinx_preferred_server');
      const match = availableServers.find(s => s.id === preferred) || availableServers[0];
      activeServerId = match ? match.id : availableServers[0].id;

      // Update button text
      const curDisplay = document.getElementById('current-server-display');
      if (curDisplay && match) {
        curDisplay.textContent = match.shortName || match.name;
      }
      const miniServerDisp = document.getElementById('current-server-mini-display');
      if (miniServerDisp && match) {
        miniServerDisp.textContent = match.shortName || match.name;
      }

      const hasS3 = availableServers.some(s => s.id === 's3');
      const hasLocal = availableServers.some(s => s.id === 'local');

      const renderServerItem = (s) => {
        const isActive = s.id === activeServerId;
        const icon = s.id === 's3' ? 'fas fa-cloud' : 'fas fa-laptop';
        const badgeClass = s.id === 's3' ? 'server-badge-cloud' : 'server-badge-local';
        return `
          <div class="server-option ${isActive ? 'active' : ''}" data-server-id="${s.id}">
            <i class="${icon}"></i>
            <span>${s.name}</span>
            <span class="server-badge-pill ${badgeClass}">${s.badge}</span>
          </div>
        `;
      };

      let html = availableServers.map(renderServerItem).join('');

      // If Server 2 has not been uploaded yet for this episode, show it clearly as not uploaded yet
      if (hasS3 && !hasLocal) {
        html += `
          <div class="server-option disabled" style="opacity: 0.5; cursor: not-allowed;" title="Not uploaded to Server 2 yet">
            <i class="fas fa-laptop"></i>
            <span>Server 2</span>
            <span class="server-badge-pill" style="background: rgba(255,255,255,0.1); color: #888; font-size: 10px;">Not Added</span>
          </div>
        `;
      } else if (!hasS3 && hasLocal) {
        html += `
          <div class="server-option disabled" style="opacity: 0.5; cursor: not-allowed;" title="Not hosted on Server 1">
            <i class="fas fa-cloud"></i>
            <span>Server 1</span>
            <span class="server-badge-pill" style="background: rgba(255,255,255,0.1); color: #888; font-size: 10px;">Not Added</span>
          </div>
        `;
      }

      if (serverDropdown) {
        serverDropdown.innerHTML = html;
      }
      if (playerServerOptions) {
        playerServerOptions.innerHTML = html;
      }

      const serverPills = document.getElementById('settings-server-pills');
      const serverBadge = document.getElementById('settings-server-badge');
      if (serverBadge && match) {
        serverBadge.textContent = match.shortName || match.name;
      }
      if (serverPills) {
        serverPills.innerHTML = '';
        availableServers.forEach(s => {
          const pill = document.createElement('button');
          pill.className = `settings-pill ${s.id === activeServerId ? 'active' : ''}`;
          pill.setAttribute('data-server-id', s.id);
          pill.textContent = s.shortName || s.name;
          pill.onclick = (e) => { e.stopPropagation(); switchServer(s.id, true); };
          serverPills.appendChild(pill);
        });
      }
    }


    function switchServer(serverId, preserveTime = true) {
      if (!availableServers || availableServers.length === 0) return;
      const target = availableServers.find(s => s.id === serverId);
      if (!target) {
        showPlayerToast('Selected server is not available for this episode.');
        return;
      }

      if (target.id === activeServerId && hls && hls.url) {
        closeAllDropdowns();
        closeSettingsDropdown();
        return;
      }

      activeServerId = target.id;
      localStorage.setItem('infinx_preferred_server', target.id);

      const curDisplay = document.getElementById('current-server-display');
      if (curDisplay) {
        curDisplay.textContent = target.shortName || target.name;
      }
      const miniServerDisp = document.getElementById('current-server-mini-display');
      if (miniServerDisp) {
        miniServerDisp.textContent = target.shortName || target.name;
      }
      const serverBadge = document.getElementById('settings-server-badge');
      if (serverBadge) {
        serverBadge.textContent = target.shortName || target.name;
      }
      document.querySelectorAll('#settings-server-pills .settings-pill').forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-server-id') === target.id);
      });

      document.querySelectorAll('.server-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-server-id') === target.id);
      });

      closeAllDropdowns();
      if (typeof window.switchSettingsView === 'function') {
        window.switchSettingsView('main', true);
      }

      const savedTime = (preserveTime && !isNaN(mainVideo.currentTime)) ? mainVideo.currentTime : null;
      const wasPlaying = !mainVideo.paused;

      async function executeSwitch() {
        if (currentEpisode && currentEpisode.isLunar && target.host) {
          try {
            const epNumVal = currentEpisode.episodeNumber || epNum || 1;
            const isDubServer = target.id === 'server-2' || (target.badge && target.badge.toLowerCase().includes('dub'));
            if (isDubServer) {
              currentAudioType = 'dub';
              localStorage.setItem('infinx_preferred_audio_type', 'dub');
              updateAudioOptions();
            } else if (target.id === 'server-1' || target.id === 'server-4') {
              currentAudioType = 'sub';
              localStorage.setItem('infinx_preferred_audio_type', 'sub');
              updateAudioOptions();
            }
            const hostParam = (currentAudioType === 'dub' && target.host === 'zuna') ? 'yuki' : target.host;
            const sRes = await fetch(`${API_BASE}/stream/watch/${currentEpisode.anilistId}/${epNumVal}?host=${hostParam}&type=${currentAudioType}`);
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData.streamUrl) {
                target.url = sData.streamUrl;
                if (sData.intro || sData.outro) {
                  detectedIntroOutro = { intro: sData.intro, outro: sData.outro };
                  updateTimelineMarkers();
                }
                if (sData.subtitles && sData.subtitles.length > 0) {
                  subtitleTracks = sData.subtitles;
                  updateSubtitleOptions();
                }
                if (sData.isFallbackSub && currentAudioType === 'dub') {
                  showPlayerToast('English Dub not available for this episode. Playing Japanese Sub.');
                }
              }
            }
            if (!target.url && currentAudioType === 'dub') {
              console.log('[Player] Dub unavailable on server switch, falling back to Japanese Sub...');
              try {
                const fbRes = await fetch(`${API_BASE}/stream/watch/${currentEpisode.anilistId}/${epNumVal}?host=zuna&type=sub`);
                if (fbRes.ok) {
                  const fbData = await fbRes.json();
                  if (fbData.streamUrl) {
                    target.url = fbData.streamUrl;
                    currentAudioType = 'sub';
                    localStorage.setItem('infinx_preferred_audio_type', 'sub');
                    updateAudioOptions();
                    showPlayerToast('English Dub not available on this server. Playing Japanese Sub.');
                  }
                }
              } catch (fbErr) {}
            }
          } catch (e) {
            console.warn('Switch lunar stream failed:', e);
          }
        }
        showPlayerToast(`Switched to ${target.name}`);
        initHLS(target.url, savedTime, wasPlaying);
      }
      executeSwitch();
    }

    function setupServerEventListeners() {
      const handleServerClick = (e) => {
        const opt = e.target.closest('.server-option');
        if (!opt) return;
        if (opt.classList.contains('disabled')) {
          showPlayerToast('This server stream has not been uploaded yet.');
          return;
        }
        e.stopPropagation();
        const sId = opt.getAttribute('data-server-id');
        if (sId) switchServer(sId, true);
      };

      const serverDropdown = document.getElementById('server-dropdown');
      if (serverDropdown) {
        serverDropdown.addEventListener('click', handleServerClick);
      }

      const playerServerOptions = document.getElementById('player-server-options');
      if (playerServerOptions) {
        playerServerOptions.addEventListener('click', handleServerClick);
      }
    }

    // Streaming Server Auto-Fallback Handler (Deep Fix for server stalls)
    function autoFallbackNextServer() {
      if (!currentEpisode || !currentEpisode.servers) return;
      const order = (currentAudioType === 'dub')
        ? ['server-2', 'server-3', 'server-1', 'server-4']
        : ['server-1', 'server-4', 'server-2', 'server-3'];
      const curIdx = order.indexOf(activeServerId);
      const nextId = (curIdx >= 0 && curIdx < order.length - 1) ? order[curIdx + 1] : (curIdx !== 0 ? order[0] : null);
      if (nextId && nextId !== activeServerId) {
        showPlayerToast(`Stream interrupted, auto-switching to ${nextId.toUpperCase()}...`);
        showPlayerLoader('Switching Server...', 'Connecting to backup streaming host...');
        switchServer(nextId, true);
      } else {
        showPlayerToast('All streaming servers temporarily unavailable. Please retry shortly.');
        hidePlayerLoader();
      }
    }

    // Seamless In-Player Episode Switching (Deep Fix for next episode loading)
    let isSwitchingEpisode = false;

    async function switchEpisode(targetEpNum, targetAudioType = null, targetSeekTime = null) {
      targetEpNum = parseInt(targetEpNum, 10);
      if (isNaN(targetEpNum) || targetEpNum < 1) return;
      if (isSwitchingEpisode) return;
      isSwitchingEpisode = true;
      currentEpisodeXpAwarded = false;
      const targetEpKey = getEpisodeWatchKey(null, lunarId, targetEpNum, true);
      loadEpisodeWatchMetrics(targetEpKey);
      lastActivePlaybackTick = null;

      try {
        saveUserVolumePreference();
        if (targetAudioType) {
          currentAudioType = targetAudioType;
          localStorage.setItem('infinx_preferred_audio_type', targetAudioType);
        }

        cancelOutroCountdown();
        showPlayerLoader(`Loading Episode ${targetEpNum}...`, 'Connecting to high-speed stream...');

        // Pause and cleanly tear down current playback
        if (mainVideo) {
          try { mainVideo.pause(); } catch (e) { }
        }
        if (hls) {
          try { hls.destroy(); } catch (e) { }
          hls = null;
        }

        epNum = targetEpNum;

        // Find episode metadata in siblingEpisodes
        const epData = (siblingEpisodes || []).find(e => parseInt(e.episodeNumber || e.number, 10) === targetEpNum);
        const epTitle = epData?.title ? `Episode ${targetEpNum}: ${epData.title}` : `Episode ${targetEpNum}`;
        const cleanTitle = epData?.title || `Episode ${targetEpNum}`;

        if (currentEpisode) {
          currentEpisode.episodeNumber = targetEpNum;
          currentEpisode.id = `lunar-${lunarId}-${targetEpNum}`;
          currentEpisode.title = epTitle;
          if (epData?.thumbnail) currentEpisode.thumbnail = epData.thumbnail;
          if (epData?.description) currentEpisode.description = stripHtmlTags(epData.description);
        }

        // Update URL in browser address bar without hard page reload (preserves user gesture activation & fullscreen)
        try {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('ep', targetEpNum);
          if (currentAudioType) newUrl.searchParams.set('type', currentAudioType);
          if (targetSeekTime && targetSeekTime > 0) {
            newUrl.searchParams.set('t', Math.floor(targetSeekTime));
          } else {
            newUrl.searchParams.delete('t');
          }
          window.history.pushState({ ep: targetEpNum, id: lunarId }, '', newUrl.toString());
        } catch (e) { }

        // Update Document Title
        const animeTitle = currentEpisode?.show?.title || 'Watch Anime';
        document.title = `${animeTitle} - Episode ${targetEpNum}: ${cleanTitle}`;

        // Update In-Player Title & Meta elements
        if (videoTitle) videoTitle.textContent = epTitle;
        if (episodeElement) episodeElement.textContent = `Episode ${targetEpNum}`;
        const descText = document.querySelector('.description-text');
        if (descText && epData?.description) {
          descText.textContent = stripHtmlTags(epData.description);
        }

        // Update Playlist Items active state in Sidebar & Drawer
        document.querySelectorAll('.playlist-item, .drawer-episode-card').forEach(item => {
          const durationEl = item.querySelector('.item-duration') || item.querySelector('.drawer-ep-duration');
          const titleEl = item.querySelector('.item-title') || item.querySelector('.drawer-ep-title');
          const isThisEp = (durationEl && durationEl.textContent.trim().startsWith(`Ep ${targetEpNum}`)) ||
                           (titleEl && (titleEl.textContent.startsWith(`Episode ${targetEpNum}:`) || titleEl.textContent === `Episode ${targetEpNum}`));
          item.classList.toggle('active', !!isThisEp);
        });

        // Safely scroll ONLY the playlist container vertically without ever shifting the window horizontally
        try {
          const playlistContainer = document.getElementById('playlist-items-container') || document.querySelector('.playlist-items');
          if (playlistContainer) {
            const activeSidebarItem = playlistContainer.querySelector('.playlist-item.active');
            if (activeSidebarItem) {
              const containerRect = playlistContainer.getBoundingClientRect();
              const itemRect = activeSidebarItem.getBoundingClientRect();
              const relativeOffset = itemRect.top - containerRect.top + playlistContainer.scrollTop;
              playlistContainer.scrollTo({
                top: Math.max(0, relativeOffset - (playlistContainer.clientHeight / 2) + (activeSidebarItem.clientHeight / 2)),
                behavior: 'smooth'
              });
            }
          }
        } catch (scrollErr) { }

        // Safely scroll in-player drawer container vertically if open/present
        try {
          const drawerGrid = document.querySelector('.drawer-episodes-grid, #drawer-episodes-grid, .drawer-episodes-container');
          if (drawerGrid) {
            const activeDrawerItem = drawerGrid.querySelector('.drawer-episode-card.active, .playlist-item.active');
            if (activeDrawerItem) {
              const gridRect = drawerGrid.getBoundingClientRect();
              const itemRect = activeDrawerItem.getBoundingClientRect();
              const relOffset = itemRect.top - gridRect.top + drawerGrid.scrollTop;
              drawerGrid.scrollTo({
                top: Math.max(0, relOffset - (drawerGrid.clientHeight / 2) + (activeDrawerItem.clientHeight / 2)),
                behavior: 'smooth'
              });
            }
          }
        } catch (drawerScrollErr) { }

        // Hard reset any horizontal page drift to guarantee UI is never shifted
        if (window.scrollX !== 0 || window.pageXOffset !== 0) {
          window.scrollTo({ left: 0, top: window.scrollY });
        }
        if (document.documentElement.scrollLeft > 0) document.documentElement.scrollLeft = 0;
        if (document.body.scrollLeft > 0) document.body.scrollLeft = 0;

        // Update Nav button states (Prev / Next disabled states)
        updateNavButtonsState();

        // Reset intro/outro detection markers and state for new episode
        detectedIntroOutro = { intro: null, outro: null };
        streamIntroOutro = { intro: null, outro: null };
        introAutoSkipped = false;
        preSkipTime = null;
        outroDismissed = false;
        outroCountdownActive = false;
        if (outroCountdownInterval) {
          clearInterval(outroCountdownInterval);
          outroCountdownInterval = null;
        }
        const outroCard = document.getElementById('outro-countdown-card');
        if (outroCard) outroCard.classList.add('hidden');
        const undoToast = document.getElementById('undo-skip-toast');
        if (undoToast) undoToast.classList.add('hidden');
        const skipBtnEl = document.getElementById('skip-intro-btn');
        if (skipBtnEl) skipBtnEl.classList.add('hidden');
        updateTimelineMarkers();

        // Fetch stream for new episode
        let streamUrl = null;
        const hostParam = (currentAudioType === 'dub') ? 'yuki' : (currentEpisode?.servers?.find(s => s.id === activeServerId)?.host || 'zuna');

        try {
          const sRes = await fetch(`${API_BASE}/stream/watch/${currentEpisode?.anilistId || lunarId}/${targetEpNum}?host=${hostParam}&type=${currentAudioType}`);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.streamUrl) {
              streamUrl = sData.streamUrl;
              const validIntro = sanitizeIntroOutro(sData.intro);
              const validOutro = sanitizeIntroOutro(sData.outro);
              if (validIntro || validOutro) {
                streamIntroOutro = { intro: validIntro, outro: validOutro };
                detectedIntroOutro = { intro: validIntro, outro: validOutro };
                updateTimelineMarkers();
              }
              if (sData.subtitles && sData.subtitles.length > 0) {
                subtitleTracks = sData.subtitles;
                updateSubtitleOptions();
              }
            }
          }
        } catch (fetchErr) {
          console.warn('[switchEpisode] Primary stream fetch failed:', fetchErr);
        }

        // Fallback to sub or other hosts if initial stream was empty
        if (!streamUrl && currentAudioType === 'dub') {
          try {
            const fbRes = await fetch(`${API_BASE}/stream/watch/${currentEpisode?.anilistId || lunarId}/${targetEpNum}?host=zuna&type=sub`);
            if (fbRes.ok) {
              const fbData = await fbRes.json();
              if (fbData.streamUrl) {
                streamUrl = fbData.streamUrl;
                currentAudioType = 'sub';
                activeServerId = 'server-1';
                updateAudioOptions();
                showPlayerToast('English Dub unavailable for this episode. Playing Japanese Sub.');
              }
            }
          } catch (e) { }
        }

        if (!streamUrl) {
          for (const altHost of ['sora', '3rdprovider']) {
            try {
              const altRes = await fetch(`${API_BASE}/stream/watch/${currentEpisode?.anilistId || lunarId}/${targetEpNum}?host=${altHost}&type=sub`);
              if (altRes.ok) {
                const altData = await altRes.json();
                if (altData.streamUrl) {
                  streamUrl = altData.streamUrl;
                  break;
                }
              }
            } catch (e) { }
          }
        }

        if (streamUrl) {
          showPlayerToast(`Now Playing Episode ${targetEpNum}`);
          applyUserVolumePreference();
          initHLS(streamUrl, targetSeekTime, true);
          if (typeof updateAndTrackEpisodeViews === 'function') {
            updateAndTrackEpisodeViews();
          }
          if (typeof loadComments === 'function') {
            loadComments();
          }
        } else {
          showPlayerToast(`Could not load stream for Episode ${targetEpNum}. Please try selecting another server.`);
          hidePlayerLoader();
        }
      } catch (err) {
        console.error('[switchEpisode] Error:', err);
        showPlayerToast('Failed to switch episode. Please try again.');
        hidePlayerLoader();
      } finally {
        isSwitchingEpisode = false;
      }
    }

    window.switchPlayerEpisode = switchEpisode;

    // Listen for browser Back/Forward navigation
    window.addEventListener('popstate', (e) => {
      const stateParams = new URLSearchParams(window.location.search);
      const poppedEp = parseInt(stateParams.get('ep') || stateParams.get('epNum'), 10);
      if (poppedEp && poppedEp !== epNum && lunarId) {
        switchEpisode(poppedEp, stateParams.get('type') || currentAudioType, parseFloat(stateParams.get('t')) || 0);
      }
    });

    // Initialize HLS
    function initHLS(videoSrc, seekTime = null, autoPlay = true) {
      if (!checkIsLoggedIn()) {
        showPlayerAuthLock();
        return;
      }

      if (!videoSrc) {
        videoPlayer.classList.remove('loading');
        const container = document.querySelector('.video-container') || videoPlayer;
        let overlay = document.getElementById('transcode-fallback-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'transcode-fallback-overlay';
          overlay.style.position = 'absolute';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.background = 'rgba(15, 15, 26, 0.96)';
          overlay.style.display = 'flex';
          overlay.style.flexDirection = 'column';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          overlay.style.zIndex = '10';
          overlay.style.padding = '20px';
          overlay.style.textAlign = 'center';
          overlay.innerHTML = `
            <div style="font-size: 4.5rem; margin-bottom: 16px; color: var(--primary);"><i class="fas fa-server"></i></div>
            <h2 style="font-size: 2.2rem; font-family: 'Outfit'; color: white; margin-bottom: 10px;">Stream Not Available on This Server</h2>
            <p style="font-size: 1.4rem; color: var(--gray-text); max-width: 440px; line-height: 1.6; margin-bottom: 22px;">This episode stream is not accessible on the selected server. Try switching to Server 1 (Sub) or reload.</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
              <button id="retry-server-1-btn" style="background: var(--primary); color: white; border: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1.3rem; transition: transform 0.2s;">Try Server 1 (Sub)</button>
              <button id="retry-reload-btn" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.25); padding: 10px 22px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1.3rem;">Retry</button>
            </div>
          `;
          container.appendChild(overlay);
          const btn1 = document.getElementById('retry-server-1-btn');
          if (btn1) {
            btn1.onclick = () => {
              if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
              switchServer('server-1', true);
            };
          }
          const btnReload = document.getElementById('retry-reload-btn');
          if (btnReload) {
            btnReload.onclick = () => window.location.reload();
          }
        }
        return;
      }

      const resolvedVideoSrc = resolveMediaUrl(videoSrc);

      // Manually parse master playlist for subtitles as a robust fallback for raw VTTs
      async function parseMasterPlaylist(videoSrc) {
        try {
          const safeManifestUrl = sanitizeStreamUrl(videoSrc);
          console.log("Manually fetching and parsing HLS manifest for subtitles:", safeManifestUrl);
          const response = await fetch(safeManifestUrl);
          if (!response.ok) throw new Error('Failed to fetch manifest');
          const text = await response.text();

          const parsedSubtitles = [];
          const lines = text.split('\n');

          lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('#EXT-X-MEDIA:TYPE=SUBTITLES')) {
              const nameMatch = trimmed.match(/NAME="([^"]+)"/);
              const langMatch = trimmed.match(/LANGUAGE="([^"]+)"/);
              const uriMatch = trimmed.match(/URI="([^"]+)"/);

              if (uriMatch) {
                const name = nameMatch ? nameMatch[1] : 'Subtitle';
                const lang = langMatch ? langMatch[1] : 'en';
                const uri = uriMatch[1];
                // Resolve relative URI to absolute URL and sanitize against mixed content
                const absoluteUrl = sanitizeStreamUrl(new URL(uri, safeManifestUrl).href);

                parsedSubtitles.push({
                  name: name,
                  lang: lang,
                  url: absoluteUrl
                });
              }
            }
          });

          console.log("Manually parsed subtitle tracks:", parsedSubtitles);
          if (parsedSubtitles.length > 0) {
            // Guard: Never overwrite direct Lunar VTT subtitles with HLS master manifest streams
            if (!currentEpisode || !currentEpisode.isLunar || !subtitleTracks || subtitleTracks.length === 0) {
              subtitleTracks = parsedSubtitles;
              updateSubtitleOptions();
            }
          }
        } catch (err) {
          console.warn('Manual manifest parsing failed:', err);
        }
      }

      // Start manual parsing immediately for raw VTT track resolution
      parseMasterPlaylist(resolvedVideoSrc);

      videoPlayer.classList.add('loading');

      const existingOverlay = document.getElementById('transcode-fallback-overlay');
      if (existingOverlay && existingOverlay.parentNode) {
        existingOverlay.parentNode.removeChild(existingOverlay);
      }

      if (hls) {
        hls.destroy();
      }

      if (Hls.isSupported()) {
        const BaseLoader = Hls.DefaultConfig.loader;
        class SecureHlsLoader extends BaseLoader {
          load(context, config, callbacks) {
            if (context && context.url) {
              context.url = sanitizeStreamUrl(context.url);
            }
            super.load(context, config, callbacks);
          }
        }

        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startLevel: -1, // Auto
          capLevelToPlayerSize: false,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 5,
          loader: SecureHlsLoader,
          pLoader: SecureHlsLoader,
          fLoader: SecureHlsLoader,
        });

        currentEpisodeXpAwarded = false;
        hls.loadSource(resolvedVideoSrc);
        hls.attachMedia(mainVideo);

        hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
          videoPlayer.classList.remove('loading');
          qualities = data.levels || [];
          updateQualityOptions();

          if (hls.audioTracks && hls.audioTracks.length > 0) {
            audioTracks = hls.audioTracks;
            const preferredIndex = matchPreferredAudioTrack(audioTracks);
            hls.audioTrack = preferredIndex;
            currentAudioTrack = preferredIndex;
            updateAudioOptions();
            updateAudioDisplay(currentAudioTrack);
          } else {
            updateAudioOptions();
          }

          if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
            subtitleTracks = hls.subtitleTracks;
            updateSubtitleOptions();
          } else {
            updateSubtitleOptions();
          }

          // Restore position when switching servers or resume saved progress (supports ?t=seconds)
          const urlParams = new URLSearchParams(window.location.search);
          const paramT = parseFloat(urlParams.get('t'));
          if (seekTime !== null && !isNaN(seekTime) && seekTime > 0) {
            mainVideo.currentTime = seekTime;
          } else if (!isNaN(paramT) && paramT > 0) {
            mainVideo.currentTime = paramT;
          } else {
            resumeSavedProgress();
          }

          applyUserVolumePreference();

          if (autoPlay) {
            attemptAutoplay(mainVideo);
          }
        });

        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, function (event, data) {
          if (data.audioTracks && data.audioTracks.length > 0) {
            audioTracks = data.audioTracks;
            const preferredIndex = matchPreferredAudioTrack(audioTracks);
            if (hls.audioTrack !== preferredIndex && preferredIndex >= 0) {
              hls.audioTrack = preferredIndex;
              currentAudioTrack = preferredIndex;
            } else if (hls.audioTrack >= 0 && hls.audioTrack < audioTracks.length) {
              currentAudioTrack = hls.audioTrack;
            }
            updateAudioOptions();
            updateAudioDisplay(currentAudioTrack);
          }
        });

        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, function (event, data) {
          currentAudioTrack = data.id;
          if (currentEpisode && currentEpisode.isLunar && hls.audioTracks && hls.audioTracks.length > 1 && hls.audioTracks[data.id]) {
            const trackObj = hls.audioTracks[data.id];
            const l = (trackObj.lang || trackObj.language || '').toLowerCase().trim();
            const n = (trackObj.name || '').toLowerCase().trim();
            if (l.startsWith('en') || n.includes('english') || n.includes('dub')) {
              currentAudioType = 'dub';
              localStorage.setItem('infinx_preferred_audio_type', 'dub');
            } else if (l.startsWith('jp') || l.startsWith('ja') || n.includes('japan')) {
              currentAudioType = 'sub';
              localStorage.setItem('infinx_preferred_audio_type', 'sub');
            }
            updateAudioOptions();
          }
          updateAudioDisplay(data.id);
          document.querySelectorAll('.audio-option').forEach(option => {
            option.classList.remove('active');
            const optionIndex = parseInt(option.getAttribute('data-audio-index'));
            const optionType = option.getAttribute('data-audio-type');
            if (optionType && optionType === currentAudioType) {
              option.classList.add('active');
            } else if (!isNaN(optionIndex) && optionIndex === data.id) {
              option.classList.add('active');
            }
          });
        });

        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, function (event, data) {
          if (currentEpisode && currentEpisode.isLunar && subtitleTracks && subtitleTracks.length > 0 && subtitleTracks[0].url) {
            return; // Protect Lunar VTT subtitles from being wiped by HLS internal tracks
          }
          if (data.subtitleTracks && data.subtitleTracks.length > 0) {
            subtitleTracks = data.subtitleTracks || hls.subtitleTracks || [];
            updateSubtitleOptions();
          }
        });

        hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, function (event, data) {
          currentSubtitleTrack = data.id;
          document.querySelectorAll('.subtitle-option').forEach(option => {
            option.classList.remove('active');
            const optionIndex = option.getAttribute('data-subtitle');
            if (parseInt(optionIndex) === data.id) {
              option.classList.add('active');
            }
          });
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, function (event, data) {
          if (hls.autoLevelEnabled || hls.currentLevel === -1) {
            const activeLevel = (qualities && qualities[data.level]) ? qualities[data.level] : null;
            if (activeLevel && activeLevel.height) {
              document.querySelectorAll('.current-quality').forEach(el => {
                el.textContent = `Auto (${activeLevel.height}p)`;
              });
            }
          }
        });

        hls.on(Hls.Events.FRAG_LOADED, function () {
          window._hlsFragFailCount = 0;
          window._hlsNetworkRetryCount = 0;
        });

        hls.on(Hls.Events.ERROR, function (event, data) {
          console.error('HLS error:', data);
          videoPlayer.classList.remove('loading');

          if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
            console.warn('HLS buffer stalled, nudging playhead forward...');
            if (!mainVideo.paused && mainVideo.readyState >= 2) {
              mainVideo.currentTime = Math.min(mainVideo.duration || Infinity, mainVideo.currentTime + 0.1);
            }
          }

          if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
            const statusCode = (data.response && data.response.code) ? data.response.code : 0;
            if (statusCode === 403 || statusCode === 404 || statusCode === 502) {
              if (window._hlsFragFailCount === undefined) window._hlsFragFailCount = 0;
              window._hlsFragFailCount++;
              console.warn(`[HLS] Fragment load error (${statusCode}), count: ${window._hlsFragFailCount}`);
              if (window._hlsFragFailCount >= 3) {
                window._hlsFragFailCount = 0;
                console.warn('[HLS] Multiple segment load errors (403/404), triggering auto fallback...');
                showPlayerLoader('Switching Server...', 'Stream segment error, auto-connecting to backup server...');
                hls.destroy();
                autoFallbackNextServer();
                return;
              }
            }
          }

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (window._hlsNetworkRetryCount === undefined) window._hlsNetworkRetryCount = 0;
                window._hlsNetworkRetryCount++;
                if (window._hlsNetworkRetryCount <= 2) {
                  showPlayerLoader('Reconnecting Stream...', 'Retrying network connection...');
                  hls.startLoad();
                } else {
                  window._hlsNetworkRetryCount = 0;
                  console.warn('[HLS] Network retries exhausted, auto-switching to fallback server...');
                  autoFallbackNextServer();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                autoFallbackNextServer();
                break;
            }
          }
        });

      } else if (mainVideo.canPlayType('application/vnd.apple.mpegurl')) {
        currentEpisodeXpAwarded = false;
        mainVideo.src = resolvedVideoSrc;
        mainVideo.addEventListener('loadedmetadata', function () {
          if (seekTime !== null && !isNaN(seekTime) && seekTime > 0) {
            mainVideo.currentTime = seekTime;
          } else {
            resumeSavedProgress();
          }
          applyUserVolumePreference();
          if (autoPlay) {
            attemptAutoplay(mainVideo);
          }

          if (mainVideo.audioTracks && mainVideo.audioTracks.length > 0) {
            audioTracks = Array.from(mainVideo.audioTracks);
            updateAudioOptions();
          }
          if (mainVideo.textTracks && mainVideo.textTracks.length > 0) {
            subtitleTracks = Array.from(mainVideo.textTracks).filter(track => track.kind === 'subtitles' || track.kind === 'captions');
            updateSubtitleOptions();
          }
        });
      } else {
        videoPlayer.classList.remove('loading');
        alert('Your browser does not support HLS video streaming. Please use Chrome, Firefox, or Safari.');
      }
    }

    // Try resuming user progress
    // Try resuming user progress with Smart Resume (local first, then API)
    async function resumeSavedProgress() {
      try {
        if (showId) {
          const storageKey = `@infinx_episodes_progress_${showId}`;
          const localData = JSON.parse(localStorage.getItem(storageKey) || '{}');
          const currentKey = currentEpisode?.id || episodeId;
          const epProg = localData.episodes && (localData.episodes[currentKey] || localData.episodes[episodeId]);
          if (epProg && epProg.positionSeconds > 5 && !epProg.completed) {
            console.log(`Resuming playback from local progress: ${epProg.positionSeconds}s`);
            mainVideo.currentTime = epProg.positionSeconds;
            showPlayerToast(`Resuming at ${formatTime(epProg.positionSeconds)}`);
            return;
          }
        }
      } catch (e) { }

      if (!token || currentEpisode?.isLunar || isNaN(parseInt(episodeId))) return;
      try {
        const historyRes = await fetch(`${API_BASE}/user/history`, { headers: authHeaders });
        if (historyRes.ok) {
          const historyList = await historyRes.json();
          const savedProgress = historyList.find(h => h.episodeId === parseInt(episodeId));
          if (savedProgress && savedProgress.progress > 5) {
            console.log(`Resuming playback from: ${savedProgress.progress}s`);
            mainVideo.currentTime = savedProgress.progress;
            showPlayerToast(`Resuming at ${formatTime(savedProgress.progress)}`);
          }
        }
      } catch (err) {
        console.warn('Could not restore saved progress:', err);
      }
    }

    // Save episode watch progress locally & update series progress card
    function saveEpisodeWatchProgress(epId, currentSec, durSec) {
      if (!showId || !epId || isNaN(durSec) || durSec <= 0) return;
      try {
        const storageKey = `@infinx_episodes_progress_${showId}`;
        let data = {};
        try {
          data = JSON.parse(localStorage.getItem(storageKey) || '{}');
        } catch (e) { }
        if (!data.episodes) data.episodes = {};

        const percent = Math.min(100, Math.max(1, Math.round((currentSec / durSec) * 100)));
        const isCompleted = percent >= 88;

        data.episodes[epId] = {
          episodeId: epId,
          positionSeconds: Math.floor(currentSec),
          durationSeconds: Math.floor(durSec),
          progressPercent: percent,
          completed: isCompleted,
          lastWatchedAt: Date.now()
        };
        data.lastWatched = data.episodes[epId];

        localStorage.setItem(storageKey, JSON.stringify(data));
        updateSeriesProgressUI(data);

        // Update unified continue watching list for Home Page & Catalog
        try {
          const cwKey = '@infinx_continue_watching';
          let cwList = [];
          try {
            cwList = JSON.parse(localStorage.getItem(cwKey) || '[]');
            if (!Array.isArray(cwList)) cwList = [];
          } catch (e) { cwList = []; }

          const isLunarShow = !!(currentEpisode?.isLunar || (lunarId && lunarId !== 'null'));
          const anilistIdVal = currentEpisode?.anilistId || lunarId || null;
          const resolvedShowId = isLunarShow ? `lunar-${anilistIdVal}` : (showId || `show-${episodeId}`);
          const epNumVal = currentEpisode?.episodeNumber || epNum || 1;
          const showTitle = currentEpisode?.show?.title || currentEpisode?.title || 'Anime Series';
          const posterUrl = currentEpisode?.show?.poster || currentEpisode?.thumbnail || '';
          const bannerUrl = currentEpisode?.show?.banner || '';

          const cwItem = {
            id: resolvedShowId,
            showId: resolvedShowId,
            isLunar: isLunarShow,
            lunarId: anilistIdVal,
            anilistId: anilistIdVal,
            episodeId: epId,
            episodeNumber: epNumVal,
            episodeTitle: currentEpisode?.title || `Episode ${epNumVal}`,
            title: showTitle,
            poster: posterUrl,
            banner: bannerUrl,
            progress: Math.floor(currentSec),
            duration: Math.floor(durSec),
            percent: percent,
            lastWatchedAt: Date.now()
          };

          cwList = cwList.filter(item => {
            if (!item) return false;
            if (isLunarShow && item.isLunar && String(item.lunarId || item.anilistId) === String(anilistIdVal)) return false;
            return item.showId !== resolvedShowId;
          });

          cwList.unshift(cwItem);
          if (cwList.length > 25) cwList = cwList.slice(0, 25);
          localStorage.setItem(cwKey, JSON.stringify(cwList));
        } catch (cwErr) { }
      } catch (e) { }
    }

    // Update series watch progress card & In-Player drawer tracker
    function updateSeriesProgressUI(progressData) {
      if (!siblingEpisodes || siblingEpisodes.length === 0) return;
      const totalEpisodes = siblingEpisodes.length;
      const episodesMap = (progressData && progressData.episodes) ? progressData.episodes : {};

      let completedCount = 0;
      let totalWeightedProgress = 0;

      siblingEpisodes.forEach(ep => {
        const epNumVal = ep.episodeNumber || ep.number;
        const p = episodesMap[ep.id] ||
          (epNumVal && episodesMap[epNumVal]) ||
          (epNumVal && episodesMap[String(epNumVal)]) ||
          (lunarId && epNumVal && episodesMap[`lunar-${lunarId}-${epNumVal}`]);
        if (p) {
          if (p.completed || (p.progressPercent && p.progressPercent >= 88)) {
            completedCount++;
            totalWeightedProgress += 1;
          } else if (p.progressPercent && p.progressPercent > 0) {
            totalWeightedProgress += Math.min(0.99, p.progressPercent / 100);
          }
        }
      });

      const remainingCount = Math.max(0, totalEpisodes - completedCount);
      // Incorporates completed episodes and partial progress so active watching is visible
      const overallPercent = totalEpisodes > 0 ? Math.min(100, Math.round((totalWeightedProgress / totalEpisodes) * 100)) : 0;

      // Update Sidebar Series Progress Card
      const card = document.getElementById('series-progress-card');
      if (card) {
        card.style.display = 'block';
        const percentEl = document.getElementById('series-progress-percent');
        if (percentEl) percentEl.textContent = `${overallPercent}%`;
        const fillEl = document.getElementById('series-progress-fill');
        if (fillEl) fillEl.style.width = `${overallPercent}%`;
        const totalEl = document.getElementById('stat-total-episodes');
        if (totalEl) totalEl.textContent = totalEpisodes;
        const watchedEl = document.getElementById('stat-watched-episodes');
        if (watchedEl) watchedEl.textContent = completedCount;
        const remEl = document.getElementById('stat-remaining-episodes');
        if (remEl) remEl.textContent = remainingCount;
      }

      // Update In-Player Drawer Progress
      const drawerProgress = document.getElementById('drawer-series-progress');
      if (drawerProgress) {
        drawerProgress.innerHTML = `
          <div class="series-progress-card" style="margin: 0; background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08);">
            <div class="series-progress-header">
              <div class="series-progress-title">
                <i class="fas fa-chart-line"></i>
                <span>Watch Progress</span>
              </div>
              <span class="series-progress-percent">${overallPercent}%</span>
            </div>
            <div class="series-progress-track">
              <div class="series-progress-fill" style="width: ${overallPercent}%;"></div>
            </div>
            <div class="series-progress-stats">
              <div class="stat-chip">
                <i class="fas fa-layer-group stat-icon stat-total"></i>
                <div class="stat-content">
                  <span class="stat-label">Total</span>
                  <span class="stat-value">${totalEpisodes}</span>
                </div>
              </div>
              <div class="stat-chip">
                <i class="fas fa-check-circle stat-icon stat-watched"></i>
                <div class="stat-content">
                  <span class="stat-label">Watched</span>
                  <span class="stat-value">${completedCount}</span>
                </div>
              </div>
              <div class="stat-chip">
                <i class="fas fa-clock stat-icon stat-left"></i>
                <div class="stat-content">
                  <span class="stat-label">Left</span>
                  <span class="stat-value">${remainingCount}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // Live update currently playing playlist item thumbnail progress bar
      try {
        const activeItems = document.querySelectorAll('.playlist-item.active, .drawer-episode-card.active');
        activeItems.forEach(activeItem => {
          const thumb = activeItem.querySelector('.item-thumbnail') || activeItem.querySelector('.drawer-ep-thumb');
          if (thumb && mainVideo && mainVideo.duration > 0) {
            let track = thumb.querySelector('.item-progress-track');
            if (!track) {
              track = document.createElement('div');
              track.className = 'item-progress-track';
              track.innerHTML = '<div class="item-progress-fill" style="width: 0%; background: var(--primary);"></div>';
              thumb.appendChild(track);
            }
            const fill = track.querySelector('.item-progress-fill');
            if (fill) {
              const livePercent = Math.min(100, Math.max(1, Math.round((mainVideo.currentTime / mainVideo.duration) * 100)));
              fill.style.width = `${livePercent}%`;
              if (livePercent >= 88) fill.style.background = '#00ff88';
            }
          }
        });
      } catch (domErr) { }
    }

    // Track whether XP was already awarded for the currently loaded episode in this session
    let currentEpisodeXpAwarded = false;

    // ========================================================
    // WATCH-TIME & ANTI-CHEAT XP REWARD ENGINE
    // ========================================================
    let currentEpisodeActiveWatchSeconds = 0;
    let currentEpisodeWatchedBuckets = new Set();
    let lastActivePlaybackTick = null;
    let lastNoticeToastTime = 0;

    function getEpisodeWatchKey(epId, anilistId, epNumVal, isLunar) {
      return isLunar ? `lunar_${anilistId}_${epNumVal}` : `db_${epId}`;
    }

    function loadEpisodeWatchMetrics(key) {
      if (!key) return;
      try {
        const raw = sessionStorage.getItem(`infinx_watch_metrics_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          currentEpisodeActiveWatchSeconds = parsed.seconds || 0;
          currentEpisodeWatchedBuckets = new Set(parsed.buckets || []);
          return;
        }
      } catch (_) {}
      currentEpisodeActiveWatchSeconds = 0;
      currentEpisodeWatchedBuckets = new Set();
    }

    function saveEpisodeWatchMetrics(key) {
      if (!key) return;
      try {
        sessionStorage.setItem(`infinx_watch_metrics_${key}`, JSON.stringify({
          seconds: Math.floor(currentEpisodeActiveWatchSeconds),
          buckets: Array.from(currentEpisodeWatchedBuckets)
        }));
      } catch (_) {}
    }

    function recordActiveWatchTick() {
      if (!mainVideo || isNaN(mainVideo.duration) || mainVideo.duration <= 0) return;
      if (!mainVideo.paused && !mainVideo.seeking && !isScrubbing) {
        const now = Date.now();
        if (lastActivePlaybackTick) {
          const deltaMs = now - lastActivePlaybackTick;
          // Count only natural real-time playback ticks (between 50ms and 2500ms)
          if (deltaMs >= 50 && deltaMs <= 2500) {
            const speed = Math.max(0.25, Math.min(3.0, mainVideo.playbackRate || 1));
            currentEpisodeActiveWatchSeconds += (deltaMs / 1000) * speed;
          }
        }
        lastActivePlaybackTick = now;

        // Record 10-second segment coverage
        if (mainVideo.currentTime >= 0) {
          const bucket = Math.floor(mainVideo.currentTime / 10);
          currentEpisodeWatchedBuckets.add(bucket);
        }

        const isLunar = !!(currentEpisode?.isLunar || (lunarId && lunarId !== 'null'));
        const effectiveEpId = currentEpisode?.id || episodeId;
        const anilistIdVal = currentEpisode?.anilistId || lunarId;
        const epNumVal = currentEpisode?.episodeNumber || epNum || 1;
        const epKey = getEpisodeWatchKey(effectiveEpId, anilistIdVal, epNumVal, isLunar);
        saveEpisodeWatchMetrics(epKey);
      } else {
        lastActivePlaybackTick = null;
      }
    }

    function getEpisodeWatchCoverage(duration) {
      if (!duration || duration <= 0) return 0;
      const watchSeconds = currentEpisodeActiveWatchSeconds;
      const bucketSeconds = currentEpisodeWatchedBuckets.size * 10;
      const effectiveWatched = Math.max(watchSeconds, bucketSeconds);
      return Math.min(1.0, effectiveWatched / duration);
    }

    // Toast notification for XP gained and level ups
    function showXpAwardToast(gained, currentXp, nextXp, level, inParty, leveledUp) {
      try {
        const existing = document.querySelector('.player-xp-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `player-xp-toast ${inParty ? 'party' : ''} ${leveledUp ? 'levelup' : ''}`;
        
        const titleText = leveledUp
          ? `LEVEL UP! LEVEL ${level}`
          : (inParty ? `+${gained} XP • WATCH PARTY BONUS` : `+${gained} XP EARNED`);
        
        const subText = leveledUp
          ? `Congratulations! You unlocked new Otaku tier rewards.`
          : `Otaku XP: ${(currentXp || 0).toLocaleString()} / ${(nextXp || (level * 200)).toLocaleString()} XP`;

        const iconHtml = leveledUp
          ? '<i class="fas fa-crown"></i>'
          : (inParty ? '<i class="fas fa-users-viewfinder"></i>' : '<i class="fas fa-bolt"></i>');

        toast.innerHTML = `
          <div class="player-xp-icon">${iconHtml}</div>
          <div class="player-xp-details">
            <span class="player-xp-title">${titleText}</span>
            <span class="player-xp-sub">${subText}</span>
          </div>
        `;

        const playerWrapper = document.querySelector('.video-player') || document.body;
        playerWrapper.appendChild(toast);

        setTimeout(() => {
          toast.classList.add('fade-out');
          setTimeout(() => { toast.remove(); }, 600);
        }, 4500);
      } catch (err) {
        console.warn('Error showing XP toast:', err);
      }
    }

    // Toast notification when user skips entire episode without watching required time
    function showXpWarningToast(title, message) {
      try {
        const existing = document.querySelector('.player-xp-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'player-xp-toast warning';
        toast.innerHTML = `
          <div class="player-xp-icon"><i class="fas fa-hourglass-half"></i></div>
          <div class="player-xp-details">
            <span class="player-xp-title">${title}</span>
            <span class="player-xp-sub">${message}</span>
          </div>
        `;

        const playerWrapper = document.querySelector('.video-player') || document.body;
        playerWrapper.appendChild(toast);

        setTimeout(() => {
          toast.classList.add('fade-out');
          setTimeout(() => { toast.remove(); }, 600);
        }, 4800);
      } catch (_) {}
    }

    // Award XP to user for watching episode (threshold >= 70% reached AND watched at least 50% of episode)
    async function checkAndAwardEpisodeXp(forced = false) {
      if (!mainVideo || isNaN(mainVideo.duration) || mainVideo.duration <= 0) return;
      if (!token) return;

      const duration = mainVideo.duration;
      const effectiveEpId = currentEpisode?.id || episodeId;
      const isLunar = !!(currentEpisode?.isLunar || (lunarId && lunarId !== 'null'));
      const anilistIdVal = currentEpisode?.anilistId || lunarId;
      const epNumVal = currentEpisode?.episodeNumber || epNum || 1;
      const epKey = getEpisodeWatchKey(effectiveEpId, anilistIdVal, epNumVal, isLunar);

      const sessionKey = `infinx_xp_awarded_${epKey}`;
      if (currentEpisodeXpAwarded || sessionStorage.getItem(sessionKey)) {
        return;
      }

      const progressRatio = mainVideo.currentTime / duration;
      const watchCoverage = getEpisodeWatchCoverage(duration);

      // ANTI-CHEAT CHECK 1: Must have reached at least 70% of the episode or ended
      const reachedEnd = progressRatio >= 0.70 || mainVideo.ended || forced;
      if (!reachedEnd) {
        return;
      }

      // ANTI-CHEAT CHECK 2: Must have actively watched at least 50% of the episode duration!
      // This allows legitimate viewers to skip intro (85-90s) & outro (90s) and small sections,
      // while completely blocking anyone who skips/scrubs to the end to farm XP.
      const hasSufficientWatchTime = (duration <= 60) || (watchCoverage >= 0.50);

      if (!hasSufficientWatchTime) {
        // If user reached the end (ended, playNext, or scrubbed past 70%) without watching 50%:
        // Inform them with an anti-skip notice so they understand XP requires actual watching.
        if (forced || mainVideo.ended || progressRatio >= 0.85) {
          const now = Date.now();
          if (now - lastNoticeToastTime > 8000) {
            lastNoticeToastTime = now;
            showXpWarningToast(
              'STREAM MORE TO EARN XP',
              `Watched ${Math.round(watchCoverage * 100)}% • Stream at least 50% of the episode naturally to earn Otaku XP!`
            );
          }
        }
        return;
      }

      const inWatchParty = Boolean(window.__infinxWatchPartyActive || (new URLSearchParams(window.location.search)).get('party'));
      const xpAmount = inWatchParty ? 25 : 10;
      const xpReason = inWatchParty ? 'watch_party' : 'episode_watched';

      currentEpisodeXpAwarded = true;
      try { sessionStorage.setItem(sessionKey, 'true'); } catch (_) {}

      try {
        const payload = {
          amount: xpAmount,
          reason: xpReason,
          inWatchParty,
          episodeId: isLunar ? `lunar-${anilistIdVal}-${epNumVal}` : effectiveEpId,
          lunarId: anilistIdVal,
          episodeNumber: epNumVal,
          episodeTitle: currentEpisode?.title || `Episode ${epNumVal}`,
          showTitle: currentEpisode?.show?.title || currentEpisode?.showTitle || 'Anime Series',
          progress: Math.floor(mainVideo.currentTime),
          duration: Math.floor(duration),
          watchTime: Math.floor(currentEpisodeActiveWatchSeconds),
          watchCoverage: Math.round(watchCoverage * 100) / 100,
          completed: true
        };

        const res = await fetch(`${API_BASE}/user/xp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && (data.xpGained > 0 || data.leveledUp)) {
            showXpAwardToast(
              data.xpGained || xpAmount,
              data.xp,
              data.xpNextLevel || (data.level * 200),
              data.level,
              inWatchParty,
              data.leveledUp
            );
            try {
              localStorage.setItem('infinx_last_xp_gain', JSON.stringify({
                xp: data.xp,
                level: data.level,
                gained: data.xpGained || xpAmount,
                timestamp: Date.now()
              }));
              window.dispatchEvent(new CustomEvent('infinx:xp-updated', { detail: data }));
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('Failed to award episode XP:', err);
      }
    }

    // Periodically post progress updates to API & local storage
    async function reportPlaybackProgress() {
      if (isNaN(mainVideo.duration) || mainVideo.duration <= 0) return;
      const effectiveEpId = currentEpisode?.id || episodeId;
      saveEpisodeWatchProgress(effectiveEpId, mainVideo.currentTime, mainVideo.duration);

      if (!token) return;
      const now = Date.now();
      // Report every 8 seconds
      if (now - lastProgressReportTime < 8000) return;

      lastProgressReportTime = now;
      try {
        const inWatchParty = Boolean(window.__infinxWatchPartyActive || (new URLSearchParams(window.location.search)).get('party'));
        const progressRatio = mainVideo.currentTime / mainVideo.duration;
        const watchCoverage = getEpisodeWatchCoverage(mainVideo.duration);
        // Only mark completed if progress reached near end AND user watched at least 50%
        const isCompleted = (progressRatio >= 0.85 || mainVideo.ended) && (watchCoverage >= 0.50);
        const isLunar = !!(currentEpisode?.isLunar || (lunarId && lunarId !== 'null'));
        const payload = isLunar ? {
          isLunar: true,
          lunarId: currentEpisode?.anilistId || lunarId,
          episodeId: effectiveEpId,
          episodeNumber: currentEpisode?.episodeNumber || epNum || 1,
          episodeTitle: currentEpisode?.title,
          showTitle: currentEpisode?.show?.title,
          poster: currentEpisode?.show?.poster || currentEpisode?.thumbnail,
          progress: Math.floor(mainVideo.currentTime),
          duration: Math.floor(mainVideo.duration),
          watchTime: Math.floor(currentEpisodeActiveWatchSeconds),
          watchCoverage: Math.round(watchCoverage * 100) / 100,
          inWatchParty,
          completed: isCompleted
        } : {
          episodeId: parseInt(episodeId),
          progress: Math.floor(mainVideo.currentTime),
          duration: Math.floor(mainVideo.duration),
          watchTime: Math.floor(currentEpisodeActiveWatchSeconds),
          watchCoverage: Math.round(watchCoverage * 100) / 100,
          inWatchParty,
          completed: isCompleted
        };

        if (!isLunar && isNaN(payload.episodeId)) return;

        const res = await fetch(`${API_BASE}/user/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.xpResult && (resData.xpResult.xpGained > 0 || resData.xpResult.leveledUp)) {
            const xpRes = resData.xpResult;
            currentEpisodeXpAwarded = true;
            showXpAwardToast(
              xpRes.xpGained,
              xpRes.xp,
              xpRes.xpNextLevel || (xpRes.level * 200),
              xpRes.level,
              inWatchParty,
              xpRes.leveledUp
            );
            try {
              localStorage.setItem('infinx_last_xp_gain', JSON.stringify({
                xp: xpRes.xp,
                level: xpRes.level,
                gained: xpRes.xpGained,
                timestamp: Date.now()
              }));
              window.dispatchEvent(new CustomEvent('infinx:xp-updated', { detail: xpRes }));
            } catch (_) {}
          }
        }
      } catch (e) {
        console.warn('Failed to save playback progress:', e);
      }
    }

    // Update quality options
    function updateQualityOptions() {
      const qualityDropdown = document.getElementById('quality-dropdown');
      const settingsQualitySection = document.querySelector('.settings-dropdown .quality-options');

      if (!qualityDropdown) return;

      qualityDropdown.innerHTML = '';
      if (settingsQualitySection) {
        settingsQualitySection.innerHTML = '';
      }

      // Check saved user preference (e.g. 'auto', '1080p', '720p', etc.)
      const savedPref = localStorage.getItem('infinx_preferred_quality') || 'auto';

      // Auto Option
      const autoOption = document.createElement('div');
      autoOption.className = 'quality-option' + (savedPref === 'auto' ? ' active' : '');
      autoOption.setAttribute('data-quality', 'auto');
      autoOption.innerHTML = '<i class="fas fa-magic" style="font-size: 11px; opacity: 0.8; margin-right: 6px;"></i><span>Auto</span><span class="quality-badge badge-auto">Optimal</span>';
      qualityDropdown.appendChild(autoOption);

      if (settingsQualitySection) {
        const settingsAutoOption = document.createElement('div');
        settingsAutoOption.className = 'quality-option' + (savedPref === 'auto' ? ' active' : '');
        settingsAutoOption.setAttribute('data-quality', 'auto');
        settingsAutoOption.textContent = 'Auto';
        settingsQualitySection.appendChild(settingsAutoOption);
      }

      if (!qualities || qualities.length === 0) {
        document.querySelectorAll('.current-quality').forEach(el => { el.textContent = 'Auto'; });
        return;
      }

      // Map levels with their original index and compute label + badge
      const mappedLevels = qualities.map((level, originalIndex) => {
        let height = level.height;
        if (!height && level.attrs && level.attrs.RESOLUTION) {
          const parts = level.attrs.RESOLUTION.split('x');
          if (parts.length === 2) height = parseInt(parts[1], 10);
        }

        let badge = '';
        let badgeClass = '';
        if (height >= 1080) {
          badge = 'FHD';
          badgeClass = 'badge-fhd';
        } else if (height >= 720) {
          badge = 'HD';
          badgeClass = 'badge-hd';
        } else if (height >= 480) {
          badge = 'SD';
          badgeClass = 'badge-sd';
        } else if (height > 0) {
          badge = 'SD';
          badgeClass = 'badge-sd';
        }

        const label = height ? `${height}p` : (level.name || `Stream ${originalIndex + 1}`);

        return {
          index: originalIndex,
          height: height || 0,
          label: label,
          badge: badge,
          badgeClass: badgeClass
        };
      });

      // Sort descending by resolution (highest quality first)
      mappedLevels.sort((a, b) => b.height - a.height);

      let matchedLevelIndex = null;

      mappedLevels.forEach(lvl => {
        const isSelected = (savedPref !== 'auto' && (savedPref === lvl.label || parseInt(savedPref, 10) === lvl.height));
        if (isSelected && matchedLevelIndex === null) {
          matchedLevelIndex = lvl.index;
        }

        // Quick bar dropdown item
        const option = document.createElement('div');
        option.className = 'quality-option' + (isSelected ? ' active' : '');
        option.setAttribute('data-quality', lvl.index);
        option.innerHTML = `
          <i class="fas fa-tv" style="font-size: 11px; opacity: 0.7; margin-right: 6px;"></i>
          <span>${lvl.label}</span>
          ${lvl.badge ? `<span class="quality-badge ${lvl.badgeClass}">${lvl.badge}</span>` : ''}
        `;
        qualityDropdown.appendChild(option);

        // Settings gear dropdown item
        if (settingsQualitySection) {
          const settingsOption = document.createElement('div');
          settingsOption.className = 'quality-option' + (isSelected ? ' active' : '');
          settingsOption.setAttribute('data-quality', lvl.index);
          settingsOption.textContent = `${lvl.label}${lvl.badge ? ' ' + lvl.badge : ''}`;
          settingsQualitySection.appendChild(settingsOption);
        }
      });

      const qualityPills = document.getElementById('settings-quality-pills');
      const qualityBadge = document.getElementById('settings-quality-badge');
      if (qualityPills) {
        qualityPills.innerHTML = '';
        const autoPill = document.createElement('button');
        autoPill.className = 'settings-pill' + (savedPref === 'auto' ? ' active' : '');
        autoPill.setAttribute('data-quality', 'auto');
        autoPill.textContent = 'Auto';
        autoPill.onclick = (e) => { e.stopPropagation(); setQuality('auto'); };
        qualityPills.appendChild(autoPill);

        if (mappedLevels && mappedLevels.length > 0) {
          mappedLevels.forEach(lvl => {
            const isSelected = (savedPref !== 'auto' && lvl.index === matchedLevelIndex);
            const pill = document.createElement('button');
            pill.className = 'settings-pill' + (isSelected ? ' active' : '');
            pill.setAttribute('data-quality', lvl.index);
            pill.textContent = lvl.label;
            pill.onclick = (e) => { e.stopPropagation(); setQuality(lvl.index); };
            qualityPills.appendChild(pill);
          });
        }
      }
      if (qualityBadge) {
        qualityBadge.textContent = savedPref === 'auto' ? 'Auto' : savedPref;
      }

      // Restore user's preferred quality
      if (savedPref !== 'auto' && matchedLevelIndex !== null) {
        setQuality(matchedLevelIndex, false);
      } else {
        setQuality('auto', false);
      }
    }

    function getFriendlyLanguageName(langCode) {
      if (!langCode) return null;
      const cleanCode = langCode.toLowerCase().trim();
      const languageMap = {
        'hin': 'Hindi',
        'hi': 'Hindi',
        'hindi': 'Hindi',
        'eng': 'English',
        'en': 'English',
        'english': 'English',
        'jpn': 'Japanese',
        'ja': 'Japanese',
        'jp': 'Japanese',
        'japanese': 'Japanese',
        'zho': 'Chinese',
        'zh': 'Chinese',
        'kor': 'Korean',
        'ko': 'Korean',
        'spa': 'Spanish',
        'es': 'Spanish',
        'fra': 'French',
        'fr': 'French',
        'deu': 'German',
        'de': 'German',
        'rus': 'Russian',
        'ru': 'Russian'
      };
      return languageMap[cleanCode] || cleanCode.toUpperCase();
    }

    function getTrackDisplayName(track, fallbackIndex, isSub = false) {
      if (!track) return isSub ? `Subtitle ${fallbackIndex + 1}` : `Track ${fallbackIndex + 1}`;
      const label = track.label || track.name || '';
      const langCode = track.lang || track.language || '';
      const friendlyLang = getFriendlyLanguageName(langCode);
      if (label && friendlyLang && label.toLowerCase() !== friendlyLang.toLowerCase()) {
        if (!label.toLowerCase().includes('vegamovies')) {
          return `${friendlyLang} (${label})`;
        }
        return friendlyLang;
      }
      if (friendlyLang) return friendlyLang;
      if (label) return label;
      return isSub ? `Subtitle ${fallbackIndex + 1}` : `Track ${fallbackIndex + 1}`;
    }

    // Audio Preference Memory (Global & Per-Series)
    function getSavedAudioPreference() {
      try {
        if (showId) {
          const showPref = localStorage.getItem(`@infinx_audio_pref_show_${showId}`);
          if (showPref) return JSON.parse(showPref);
        }
        const globalPref = localStorage.getItem('@infinx_audio_pref_global');
        if (globalPref) return JSON.parse(globalPref);
      } catch (e) { }
      return null;
    }

    function matchPreferredAudioTrack(tracks) {
      if (!tracks || tracks.length === 0) return 0;

      // Special handling for anime shows with sub/dub audio selection
      if (currentEpisode && currentEpisode.isLunar) {
        if (currentAudioType === 'dub') {
          const engIdx = tracks.findIndex(t => {
            const l = (t.lang || t.language || '').toLowerCase().trim();
            const n = (t.name || '').toLowerCase().trim();
            return l.startsWith('en') || n.includes('english') || n.includes('dub');
          });
          if (engIdx >= 0) return engIdx;
        } else {
          const jpnIdx = tracks.findIndex(t => {
            const l = (t.lang || t.language || '').toLowerCase().trim();
            const n = (t.name || '').toLowerCase().trim();
            return l.startsWith('jp') || l.startsWith('ja') || n.includes('japan') || n.includes('native') || n.includes('original');
          });
          if (jpnIdx >= 0) return jpnIdx;
        }
      }

      const pref = getSavedAudioPreference();
      if (!pref) return 0;

      const targetLang = (pref.lang || '').toLowerCase().trim();
      const targetName = (pref.name || '').toLowerCase().trim();
      const targetDisplay = (pref.displayName || '').toLowerCase().trim();

      // 1. Language code match (e.g. 'hin', 'hi', 'eng', 'en')
      let matchIdx = tracks.findIndex(t => {
        const l = (t.lang || t.language || '').toLowerCase().trim();
        return l && (l === targetLang || (targetLang.startsWith('hi') && l.startsWith('hi')) || (targetLang.startsWith('en') && l.startsWith('en')));
      });
      if (matchIdx >= 0) return matchIdx;

      // 2. Name match (e.g. contains 'hindi' or 'english')
      matchIdx = tracks.findIndex(t => {
        const n = (t.name || '').toLowerCase().trim();
        return n && (n.includes(targetName) || (targetDisplay && n.includes(targetDisplay.toLowerCase())));
      });
      if (matchIdx >= 0) return matchIdx;

      // 3. Saved index fallback if valid
      if (typeof pref.index === 'number' && pref.index >= 0 && pref.index < tracks.length) {
        return pref.index;
      }

      return 0;
    }

    // Update audio options
    function updateAudioOptions() {
      const audioDropdown = document.getElementById('audio-dropdown');
      const audioList = document.getElementById('audio-track-list');
      const audioPills = document.getElementById('settings-audio-pills');
      const audioBadge = document.getElementById('settings-audio-badge');

      if (audioDropdown) audioDropdown.innerHTML = '';
      if (audioList) audioList.innerHTML = '';
      if (audioPills) audioPills.innerHTML = '';

      if (currentEpisode && currentEpisode.isLunar) {
        // Anime catalog: Switch between Japanese (Original Audio / Sub) and English (Dub)
        const animeAudioOptions = [
          { type: 'sub', label: 'Japanese (Original Audio)', shortLabel: 'Japanese (Sub)' },
          { type: 'dub', label: 'English (Dub)', shortLabel: 'English (Dub)' }
        ];

        animeAudioOptions.forEach(opt => {
          const isCurrentActive = opt.type === currentAudioType;

          if (audioDropdown) {
            const audioOption = document.createElement('div');
            audioOption.className = `audio-option ${isCurrentActive ? 'active' : ''}`;
            audioOption.setAttribute('data-audio-type', opt.type);
            audioOption.innerHTML = `<i class="fas fa-volume-up"></i> ${opt.label}`;
            audioDropdown.appendChild(audioOption);
          }

          if (audioList) {
            const settingsAudioOption = document.createElement('div');
            settingsAudioOption.className = `audio-option ${isCurrentActive ? 'active' : ''}`;
            settingsAudioOption.setAttribute('data-audio-type', opt.type);
            settingsAudioOption.innerHTML = `${opt.label}`;
            audioList.appendChild(settingsAudioOption);
          }

          if (audioPills) {
            const pill = document.createElement('button');
            pill.className = `settings-pill ${isCurrentActive ? 'active' : ''}`;
            pill.setAttribute('data-audio-type', opt.type);
            const icon = opt.type === 'dub' ? 'fa-microphone' : 'fa-closed-captioning';
            pill.innerHTML = `<i class="fas ${icon}"></i> ${opt.shortLabel}`;
            pill.onclick = (e) => { e.stopPropagation(); switchAudioType(opt.type); };
            audioPills.appendChild(pill);
          }
        });

        const activeOpt = animeAudioOptions.find(o => o.type === currentAudioType) || animeAudioOptions[0];
        if (audioBadge) audioBadge.textContent = currentAudioType === 'dub' ? 'Dub' : 'Sub';
        document.querySelectorAll('.current-audio').forEach(el => { el.textContent = activeOpt.shortLabel; });
        const currentAudioDisp = document.querySelector('.current-audio-display');
        if (currentAudioDisp) {
          currentAudioDisp.innerHTML = `<i class="fas fa-volume-up"></i> ${activeOpt.label}`;
        }
        return;
      }

      if (audioTracks && audioTracks.length > 0) {
        audioTracks.forEach((track, index) => {
          const isCurrentActive = index === currentAudioTrack;
          const trackLabel = getTrackDisplayName(track, index, false);

          if (audioDropdown) {
            const audioOption = document.createElement('div');
            audioOption.className = `audio-option ${isCurrentActive ? 'active' : ''}`;
            audioOption.setAttribute('data-audio-index', index);
            audioOption.innerHTML = `<i class="fas fa-volume-up"></i> ${trackLabel}`;
            audioDropdown.appendChild(audioOption);
          }

          if (audioList) {
            const settingsAudioOption = document.createElement('div');
            settingsAudioOption.className = `audio-option ${isCurrentActive ? 'active' : ''}`;
            settingsAudioOption.setAttribute('data-audio-index', index);
            settingsAudioOption.innerHTML = `${trackLabel}`;
            audioList.appendChild(settingsAudioOption);
          }

          if (audioPills) {
            const pill = document.createElement('button');
            pill.className = `settings-pill ${isCurrentActive ? 'active' : ''}`;
            pill.setAttribute('data-audio-index', index);
            pill.innerHTML = trackLabel;
            pill.onclick = (e) => { e.stopPropagation(); setAudioTrack(index); };
            audioPills.appendChild(pill);
          }
        });
      }

      const activeTrackObj = (audioTracks && audioTracks[currentAudioTrack]) || (audioTracks && audioTracks[0]);
      const activeLabel = activeTrackObj ? getTrackDisplayName(activeTrackObj, currentAudioTrack, false) : 'Default Stream';
      if (audioBadge) audioBadge.textContent = activeLabel;
      document.querySelectorAll('.current-audio').forEach(el => { el.textContent = activeLabel; });
      const currentAudioDisp = document.querySelector('.current-audio-display');
      if (currentAudioDisp) {
        currentAudioDisp.innerHTML = `<i class="fas fa-volume-up"></i> ${activeLabel}`;
      }
    }

    // Switch between Japanese (Sub) and English (Dub) audio streams seamlessly
    async function switchAudioType(targetType) {
      if (!currentEpisode || !currentEpisode.isLunar) return;

      const previousAudioType = currentAudioType;
      currentAudioType = targetType;
      localStorage.setItem('infinx_preferred_audio_type', targetType);
      const targetLabel = targetType === 'dub' ? 'English (Dub)' : 'Japanese (Original Audio)';

      // 1. Instant track switch if currently loaded HLS stream already contains multiple tracks
      if (hls && hls.audioTracks && hls.audioTracks.length > 1) {
        let matchingTrackIdx = -1;
        if (targetType === 'dub') {
          matchingTrackIdx = hls.audioTracks.findIndex(t => {
            const l = (t.lang || t.language || '').toLowerCase().trim();
            const n = (t.name || '').toLowerCase().trim();
            return l.startsWith('en') || n.includes('english') || n.includes('dub');
          });
        } else {
          matchingTrackIdx = hls.audioTracks.findIndex(t => {
            const l = (t.lang || t.language || '').toLowerCase().trim();
            const n = (t.name || '').toLowerCase().trim();
            return l.startsWith('jp') || l.startsWith('ja') || n.includes('japan') || n.includes('native') || n.includes('original');
          });
        }

        if (matchingTrackIdx >= 0) {
          hls.audioTrack = matchingTrackIdx;
          currentAudioTrack = matchingTrackIdx;
          updateAudioOptions();
          updateAudioDisplay(matchingTrackIdx);
          showPlayerToast(`Audio: ${targetLabel}`);
          closeAllDropdowns();
          closeSettingsDropdown();
          return;
        }
      }

      // 2. Otherwise load stream from provider supporting dub (prefer 3rdprovider)
      updateAudioOptions();

      const savedTime = (mainVideo && !isNaN(mainVideo.currentTime) && mainVideo.currentTime > 0) ? mainVideo.currentTime : null;
      const wasPlaying = mainVideo && !mainVideo.paused;

      showPlayerToast(`Switching to ${targetLabel}...`);
      if (videoPlayer) videoPlayer.classList.add('loading');

      try {
        const epNumVal = currentEpisode.episodeNumber || epNum || 1;
        const hostParam = targetType === 'dub' ? 'yuki' : 'zuna';
        const res = await fetch(`${API_BASE}/stream/watch/${currentEpisode.anilistId}/${epNumVal}?host=${hostParam}&type=${targetType}`);

        if (res.ok) {
          const data = await res.json();
          if (data && data.streamUrl) {
            // Also sync active server indicator with the chosen audio
            if (targetType === 'dub') {
              activeServerId = 'server-2';
              const curDisplay = document.getElementById('current-server-display');
              if (curDisplay) curDisplay.textContent = 'Server 2';
              const miniServerDisp = document.getElementById('current-server-mini-display');
              if (miniServerDisp) miniServerDisp.textContent = 'Server 2';
              document.querySelectorAll('.server-option').forEach(opt => {
                opt.classList.toggle('active', opt.getAttribute('data-server-id') === 'server-2');
              });
            } else {
              activeServerId = 'server-1';
              const curDisplay = document.getElementById('current-server-display');
              if (curDisplay) curDisplay.textContent = 'Server 1';
              const miniServerDisp = document.getElementById('current-server-mini-display');
              if (miniServerDisp) miniServerDisp.textContent = 'Server 1';
              document.querySelectorAll('.server-option').forEach(opt => {
                opt.classList.toggle('active', opt.getAttribute('data-server-id') === 'server-1');
              });
            }

            const activeServer = (availableServers && availableServers.find(s => s.id === activeServerId)) || (availableServers && availableServers[0]);
            if (activeServer) activeServer.url = data.streamUrl;
            const validIntro = sanitizeIntroOutro(data.intro);
            const validOutro = sanitizeIntroOutro(data.outro);
            if (validIntro || validOutro) {
              streamIntroOutro = { intro: validIntro, outro: validOutro };
              detectedIntroOutro = { intro: validIntro, outro: validOutro };
              updateTimelineMarkers();
            }
            if (data.subtitles && data.subtitles.length > 0) {
              subtitleTracks = data.subtitles;
              updateSubtitleOptions();
              if (targetType === 'sub') {
                const defaultIdx = subtitleTracks.findIndex(t => {
                  const lang = (t.lang || t.language || '').toLowerCase();
                  const label = (t.label || t.name || '').toLowerCase();
                  return t.default || lang.startsWith('en') || label.includes('english');
                });
                setSubtitle(defaultIdx >= 0 ? defaultIdx : 0);
              } else {
                setSubtitle(-1);
              }
            }
            updateAudioOptions();
            initHLS(data.streamUrl, savedTime, wasPlaying);
            if (data.isFallbackSub && targetType === 'dub') {
              showPlayerToast(`English Dub not available for this episode. Playing Japanese.`);
            } else {
              showPlayerToast(`Audio: ${targetLabel}`);
            }
            closeAllDropdowns();
            closeSettingsDropdown();
            return;
          }
        }
        throw new Error('Stream response lacked streamUrl');
      } catch (err) {
        console.warn(`Could not switch audio to ${targetType}:`, err);
        currentAudioType = previousAudioType;
        localStorage.setItem('infinx_preferred_audio_type', previousAudioType);
        updateAudioOptions();
        showPlayerToast(`English Dub not available for this episode. Staying on Japanese.`);
        if (videoPlayer) videoPlayer.classList.remove('loading');
        closeAllDropdowns();
        closeSettingsDropdown();
      }
    }

    // Close all dropdowns
    function closeAllDropdowns() {
      document.querySelectorAll('.server-dropdown, .quality-dropdown, .audio-dropdown, .subtitle-dropdown, .speed-dropdown').forEach(dropdown => {
        dropdown.style.display = 'none';
      });
      document.querySelectorAll('.server-selector, .quality-selector, .audio-selector, .subtitle-selector, .playback-speed-selector').forEach(selector => {
        selector.classList.remove('active');
      });
    }

    // Close settings dropdown
    function closeSettingsDropdown() {
      isSettingsMenuOpen = false;
      if (settingsMenu) settingsMenu.classList.remove('active');
      if (settingsDropdown) {
        settingsDropdown.classList.remove('active');
        settingsDropdown.style.right = '';
        settingsDropdown.style.maxHeight = '';
      }
      const backdrop = document.getElementById('settings-mobile-backdrop');
      if (backdrop) backdrop.classList.remove('active');
      document.body.style.overflow = '';
      const controls = document.querySelector('.custom-controls');
      if (controls) {
        controls.classList.remove('settings-open');
      }
      if (mainVideo && !mainVideo.paused) {
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = setTimeout(hideControls, 3000);
      }
    }

    // Set video quality
    function setQuality(qualityLevel, shouldCloseMenus = true) {
      if (hls) {
        let displayLabel = 'Auto';

        if (qualityLevel === 'auto') {
          hls.currentLevel = -1;
          localStorage.setItem('infinx_preferred_quality', 'auto');
          displayLabel = 'Auto';
        } else {
          const lvlIdx = parseInt(qualityLevel, 10);
          hls.currentLevel = lvlIdx;
          const quality = (qualities && qualities[lvlIdx]) ? qualities[lvlIdx] : null;
          let height = quality ? quality.height : null;
          if (!height && quality && quality.attrs && quality.attrs.RESOLUTION) {
            const parts = quality.attrs.RESOLUTION.split('x');
            if (parts.length === 2) height = parseInt(parts[1], 10);
          }
          displayLabel = height ? `${height}p` : `Stream ${lvlIdx + 1}`;
          localStorage.setItem('infinx_preferred_quality', displayLabel);
        }

        // Keep active audio track locked across quality level switch
        if (currentAudioTrack >= 0 && hls.audioTracks && currentAudioTrack < hls.audioTracks.length) {
          hls.audioTrack = currentAudioTrack;
        }

        document.querySelectorAll('.current-quality').forEach(el => {
          el.textContent = displayLabel;
        });

        const qualityBadge = document.getElementById('settings-quality-badge');
        if (qualityBadge) qualityBadge.textContent = displayLabel;
        document.querySelectorAll('#settings-quality-pills .settings-pill').forEach(pill => {
          pill.classList.remove('active');
          const q = pill.getAttribute('data-quality');
          if (qualityLevel === 'auto' && q === 'auto') pill.classList.add('active');
          else if (qualityLevel !== 'auto' && parseInt(q, 10) === parseInt(qualityLevel, 10)) pill.classList.add('active');
        });

        document.querySelectorAll('.quality-option').forEach(option => {
          option.classList.remove('active');
          const optionQuality = option.getAttribute('data-quality');
          if (qualityLevel === 'auto') {
            if (optionQuality === 'auto') option.classList.add('active');
          } else {
            if (optionQuality !== 'auto' && parseInt(optionQuality, 10) === parseInt(qualityLevel, 10)) {
              option.classList.add('active');
            }
          }
        });

        if (shouldCloseMenus) {
          closeAllDropdowns();
          if (typeof window.switchSettingsView === 'function') {
            window.switchSettingsView('main', true);
          }
        }
      }
    }

    // Update audio display
    function updateAudioDisplay(trackIndex) {
      let trackName;
      let shortName;
      if (currentEpisode && currentEpisode.isLunar) {
        trackName = currentAudioType === 'dub' ? 'English (Dub)' : 'Japanese (Original Audio)';
        shortName = currentAudioType === 'dub' ? 'English (Dub)' : 'Japanese';
      } else {
        trackName = audioTracks[trackIndex] ? getTrackDisplayName(audioTracks[trackIndex], trackIndex, false) : 'Default Stream';
        shortName = trackName;
      }
      document.querySelectorAll('.current-audio').forEach(el => { el.textContent = shortName; });
      const currentAudioDisp = document.querySelector('.current-audio-display');
      if (currentAudioDisp) {
        currentAudioDisp.innerHTML = `<i class="fas fa-volume-up"></i> ${trackName}`;
      }
    }

    // Set audio track with global and per-series persistence
    function setAudioTrack(trackIndex) {
      if (hls && hls.audioTracks && hls.audioTracks.length > 0) {
        if (trackIndex < hls.audioTracks.length) {
          hls.audioTrack = trackIndex;
          currentAudioTrack = trackIndex;
          updateAudioDisplay(trackIndex);
        }
      } else if (mainVideo.audioTracks && mainVideo.audioTracks.length > 0) {
        if (trackIndex < mainVideo.audioTracks.length) {
          for (let i = 0; i < mainVideo.audioTracks.length; i++) {
            mainVideo.audioTracks[i].enabled = false;
          }
          mainVideo.audioTracks[trackIndex].enabled = true;
          currentAudioTrack = trackIndex;
          updateAudioDisplay(trackIndex);
        }
      }

      // Persist user audio preference
      const track = audioTracks[trackIndex];
      if (track) {
        const langCode = (track.lang || track.language || '').toLowerCase().trim();
        const friendlyName = getFriendlyLanguageName(langCode) || track.name;
        const prefObj = {
          lang: langCode,
          name: track.name || '',
          displayName: friendlyName || '',
          index: trackIndex
        };
        try {
          localStorage.setItem('@infinx_audio_pref_global', JSON.stringify(prefObj));
          if (showId) {
            localStorage.setItem(`@infinx_audio_pref_show_${showId}`, JSON.stringify(prefObj));
          }
        } catch (e) { }
        showPlayerToast(`Audio: ${friendlyName}`);
      }

      document.querySelectorAll('.audio-option').forEach(option => {
        option.classList.remove('active');
        const optionIndex = parseInt(option.getAttribute('data-audio-index'));
        if (optionIndex === trackIndex) {
          option.classList.add('active');
        }
      });

      closeAllDropdowns();
      if (typeof window.switchSettingsView === 'function') {
        window.switchSettingsView('main', true);
      }
    }

    // Direct VTT subtitle engine storage & globally scoped caption renderer
    let activeSubCues = [];
    let activeSubUrl = '';
    let currentRenderedCaptionText = '';

    function getCaptionOverlay() {
      let overlay = document.getElementById('caption-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'caption-overlay';
        overlay.className = 'caption-overlay hidden';
        overlay.setAttribute('aria-hidden', 'true');
        const vp = document.querySelector('.video-player') || document.querySelector('.main-video-container');
        if (vp) vp.appendChild(overlay);
      }
      return overlay;
    }

    function formatSubtitleHtml(rawText) {
      if (!rawText) return '';
      let s = String(rawText);

      // 1. Strip ASS/SSA override tags like {\an8}, {\pos(..)}, {\i1}, etc.
      s = s.replace(/\{[^}\n]*\}/g, '');

      // 2. Strip WebVTT timestamp tags like <00:19.000> or <00:01:23.456>
      s = s.replace(/<\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?>/g, '');

      // 3. Strip WebVTT voice/class/lang/ruby/rt/font tags while preserving inner text
      s = s.replace(/<\/?(?:v|c|lang|ruby|rt|font)(?:\.[^>\s]+|\s+[^>]+)?>/gi, '');

      // 4. Safely escape special HTML characters
      s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // 5. Restore safe formatting tags so <i>, <b>, <u> render properly as styled text
      s = s.replace(/&lt;(\/?)i(?:\s+[^&>]*)?&gt;/gi, '<$1i>');
      s = s.replace(/&lt;(\/?)em(?:\s+[^&>]*)?&gt;/gi, '<$1em>');
      s = s.replace(/&lt;(\/?)b(?:\s+[^&>]*)?&gt;/gi, '<$1b>');
      s = s.replace(/&lt;(\/?)strong(?:\s+[^&>]*)?&gt;/gi, '<$1strong>');
      s = s.replace(/&lt;(\/?)u(?:\s+[^&>]*)?&gt;/gi, '<$1u>');

      // 6. Ensure matching closing tags for open formatting tags
      ['i', 'b', 'u', 'em', 'strong'].forEach(tag => {
        const openCount = (s.match(new RegExp(`<${tag}>`, 'gi')) || []).length;
        const closeCount = (s.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
        if (openCount > closeCount) {
          s += `</${tag}>`.repeat(openCount - closeCount);
        }
      });

      // 7. Convert line breaks
      s = s.replace(/\r\n|\r|\n/g, '<br>');

      return s;
    }
    window.formatSubtitleHtml = formatSubtitleHtml;

    function showCaption(text) {
      const captionOverlay = getCaptionOverlay();
      if (!captionOverlay) return;
      if (!text || !text.trim()) {
        hideCaption();
        return;
      }

      let presetCfg = { fontSize: 'medium', textColor: '#ffffff', backdropStyle: 'shadow', position: 'bottom' };
      try {
        const raw = localStorage.getItem('@infinx_subtitle_presets');
        if (raw) presetCfg = Object.assign(presetCfg, JSON.parse(raw));
      } catch (e) { }

      const sizeMap = { small: '16px', medium: '20px', large: '25px', huge: '30px' };
      const fs = sizeMap[presetCfg.fontSize] || '20px';

      captionOverlay.classList.remove('pos-raised', 'pos-bottom');
      if (presetCfg.position === 'raised') captionOverlay.classList.add('pos-raised');

      if (currentRenderedCaptionText === text && !captionOverlay.classList.contains('hidden')) {
        return;
      }
      currentRenderedCaptionText = text;

      captionOverlay.innerHTML = `<div class="caption-text style-${presetCfg.backdropStyle || 'shadow'}" style="font-size: ${fs}; color: ${presetCfg.textColor || '#ffffff'};">${formatSubtitleHtml(text)}</div>`;
      captionOverlay.classList.remove('hidden');
    }
    window.showCaption = showCaption;

    function hideCaption() {
      const captionOverlay = getCaptionOverlay();
      if (!captionOverlay) return;
      if (currentRenderedCaptionText === '' && captionOverlay.classList.contains('hidden')) return;
      currentRenderedCaptionText = '';
      captionOverlay.classList.add('hidden');
      captionOverlay.innerHTML = '';
    }
    window.hideCaption = hideCaption;

    function parseVttTimestamp(timeStr) {
      if (!timeStr) return 0;
      const clean = timeStr.trim().split(/\s+/)[0];
      const parts = clean.split(':');
      let hours = 0, minutes = 0, seconds = 0;
      if (parts.length === 3) {
        hours = parseFloat(parts[0]) || 0;
        minutes = parseFloat(parts[1]) || 0;
        seconds = parseFloat(parts[2].replace(',', '.')) || 0;
      } else if (parts.length === 2) {
        minutes = parseFloat(parts[0]) || 0;
        seconds = parseFloat(parts[1].replace(',', '.')) || 0;
      } else if (parts.length === 1) {
        seconds = parseFloat(parts[0].replace(',', '.')) || 0;
      }
      return hours * 3600 + minutes * 60 + seconds;
    }

    function parseVttCues(vttText) {
      if (!vttText) return [];
      const cues = [];
      const rawLines = vttText.replace(/\r\n|\r/g, '\n').split('\n');
      let i = 0;
      while (i < rawLines.length) {
        const line = rawLines[i].trim();
        if (line.includes('-->')) {
          const parts = line.split('-->');
          if (parts.length >= 2) {
            const start = parseVttTimestamp(parts[0]);
            const end = parseVttTimestamp(parts[1]);
            i++;
            const textLines = [];
            while (i < rawLines.length && rawLines[i].trim() !== '') {
              textLines.push(rawLines[i].trim());
              i++;
            }
            if (textLines.length > 0) {
              cues.push({ start, end, text: textLines.join('\n') });
            }
          }
        }
        i++;
      }
      return cues;
    }

    function updateActiveSubtitleDisplay() {
      if (currentSubtitleTrack === -1) {
        hideCaption();
        return;
      }
      if (!activeSubCues || activeSubCues.length === 0) {
        return;
      }
      if (!mainVideo) return;
      const cur = mainVideo.currentTime;
      const matches = activeSubCues.filter(c => cur >= (c.start - 0.05) && cur <= (c.end + 0.05));
      if (matches.length > 0) {
        const text = matches.map(c => c.text).join('\n');
        showCaption(text);
      } else {
        hideCaption();
      }
    }

    // Update subtitle options in all panels (all-in-one pills, bottom bar dropdown, mobile)
    function updateSubtitleOptions() {
      const subtitleDropdown = document.getElementById('subtitle-dropdown');
      const subtitleList = document.getElementById('subtitle-track-list');
      const subtitlePills = document.getElementById('settings-subtitle-pills');

      if (subtitleDropdown) subtitleDropdown.innerHTML = '';
      if (subtitleList) subtitleList.innerHTML = '';
      if (subtitlePills) subtitlePills.innerHTML = '';

      // Off option
      if (subtitleDropdown) {
        const offOptionDropdown = document.createElement('div');
        offOptionDropdown.className = 'subtitle-option' + (currentSubtitleTrack === -1 ? ' active' : '');
        offOptionDropdown.setAttribute('data-subtitle', 'off');
        offOptionDropdown.innerHTML = '<i class="fas fa-ban"></i> Off';
        subtitleDropdown.appendChild(offOptionDropdown);
      }

      if (subtitleList) {
        const offOptionList = document.createElement('div');
        offOptionList.className = 'subtitle-option' + (currentSubtitleTrack === -1 ? ' active' : '');
        offOptionList.setAttribute('data-subtitle', 'off');
        offOptionList.innerHTML = 'Off';
        subtitleList.appendChild(offOptionList);
      }

      if (subtitlePills) {
        const offPill = document.createElement('button');
        offPill.className = 'settings-pill' + (currentSubtitleTrack === -1 ? ' active' : '');
        offPill.setAttribute('data-subtitle', 'off');
        offPill.textContent = 'Off';
        offPill.onclick = (e) => { e.stopPropagation(); setSubtitle(-1); };
        subtitlePills.appendChild(offPill);
      }

      if (subtitleTracks && subtitleTracks.length > 0) {
        subtitleTracks.forEach((track, index) => {
          const trackName = getTrackDisplayName(track, index, true);
          const isAct = currentSubtitleTrack === index;

          if (subtitleDropdown) {
            const dropdownOption = document.createElement('div');
            dropdownOption.className = 'subtitle-option' + (isAct ? ' active' : '');
            dropdownOption.setAttribute('data-subtitle', index);
            dropdownOption.setAttribute('data-track-index', index);
            dropdownOption.innerHTML = `<i class="fas fa-closed-captioning"></i> ${trackName}`;
            subtitleDropdown.appendChild(dropdownOption);
          }

          if (subtitleList) {
            const listOption = document.createElement('div');
            listOption.className = 'subtitle-option' + (isAct ? ' active' : '');
            listOption.setAttribute('data-subtitle', index);
            listOption.setAttribute('data-track-index', index);
            listOption.innerHTML = trackName;
            subtitleList.appendChild(listOption);
          }

          if (subtitlePills) {
            const pill = document.createElement('button');
            pill.className = 'settings-pill' + (isAct ? ' active' : '');
            pill.setAttribute('data-subtitle', index);
            pill.textContent = trackName;
            pill.onclick = (e) => { e.stopPropagation(); setSubtitle(index); };
            subtitlePills.appendChild(pill);
          }
        });
      }

      // Add Subtitle Appearance Style option in footer dropdown
      if (subtitleDropdown) {
        const styleBtnDropdown = document.createElement('div');
        styleBtnDropdown.className = 'subtitle-option subtitle-style-trigger';
        styleBtnDropdown.setAttribute('role', 'button');
        styleBtnDropdown.setAttribute('tabindex', '0');
        styleBtnDropdown.innerHTML = '<i class="fas fa-palette"></i> Customize Subtitle Style...';
        subtitleDropdown.appendChild(styleBtnDropdown);
      }
    }

    function detachAllTextTrackListeners() {
      if (!mainVideo || !mainVideo.textTracks) return;
      for (let i = 0; i < mainVideo.textTracks.length; i++) {
        try { mainVideo.textTracks[i].oncuechange = null; } catch (e) { }
      }
    }

    function removeCustomTrackElement() {
      const existing = document.getElementById('custom-subtitle-track');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    }

    // Set subtitle track and render via custom styles
    function setSubtitle(trackIndex) {
      if (typeof trackIndex === 'string') {
        if (trackIndex === 'off') trackIndex = -1;
        else trackIndex = parseInt(trackIndex, 10);
      }
      if (isNaN(trackIndex)) trackIndex = -1;

      const subtitleBtn = document.querySelector('.subtitle-btn');

      if (trackIndex === -1) {
        activeSubCues = [];
        activeSubUrl = '';
        currentRenderedCaptionText = '';
        if (hls && typeof hls.subtitleTrack !== 'undefined') {
          try { hls.subtitleTrack = -1; } catch (e) { }
        }
        if (mainVideo.textTracks) {
          for (let i = 0; i < mainVideo.textTracks.length; i++) {
            try { mainVideo.textTracks[i].mode = 'disabled'; } catch (e) { }
            try { mainVideo.textTracks[i].oncuechange = null; } catch (e) { }
          }
        }
        removeCustomTrackElement();
        detachAllTextTrackListeners();
        hideCaption();
        currentSubtitleTrack = -1;
        document.querySelectorAll('.current-subtitle').forEach(el => { el.textContent = 'Off'; });
        if (subtitleBtn) {
          subtitleBtn.classList.remove('active');
          subtitleBtn.innerHTML = '<i class="far fa-closed-captioning"></i>';
        }
        showPlayerToast('Subtitles: Off');
      } else if (subtitleTracks && subtitleTracks[trackIndex]) {
        const trackInfo = subtitleTracks[trackIndex];
        const trackName = getTrackDisplayName(trackInfo, trackIndex, true);

        // Keep all native textTracks completely disabled so they never render duplicate native cues or cause flicker
        removeCustomTrackElement();
        detachAllTextTrackListeners();

        if (trackInfo && trackInfo.url) {
          const rawUrl = (trackInfo.url.startsWith('http://') || trackInfo.url.startsWith('https://'))
            ? trackInfo.url
            : `${SERVER_ORIGIN}${trackInfo.url.startsWith('/') ? '' : '/'}${trackInfo.url}`;
          const fetchUrl = sanitizeStreamUrl(rawUrl);
          activeSubUrl = fetchUrl;
          fetch(fetchUrl)
            .then(r => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.text();
            })
            .then(text => {
              if (activeSubUrl === fetchUrl) {
                activeSubCues = parseVttCues(text);
                console.log(`[Player Subtitles] Direct VTT engine loaded ${activeSubCues.length} cues for: ${trackName}`);
                currentRenderedCaptionText = '';
                updateActiveSubtitleDisplay();
                if (!isValidTimeWindow(detectedIntroOutro.intro) || !isValidTimeWindow(detectedIntroOutro.outro)) {
                  detectedIntroOutro = computeIntroOutroWindows();
                  updateTimelineMarkers();
                }
              }
            })
            .catch(err => {
              console.warn('[Player Subtitles] Direct fetch failed:', err);
            });
        }

        currentSubtitleTrack = trackIndex;
        document.querySelectorAll('.current-subtitle').forEach(el => { el.textContent = trackName; });
        if (subtitleBtn) {
          subtitleBtn.classList.add('active');
          subtitleBtn.innerHTML = '<i class="fas fa-closed-captioning"></i>';
        }
        showPlayerToast(`Subtitles: ${trackName}`);
      }

      document.querySelectorAll('.subtitle-option, #settings-subtitle-pills .settings-pill').forEach(option => {
        option.classList.remove('active');
        const optionIndex = option.getAttribute('data-subtitle');
        const trackIndexAttr = option.getAttribute('data-track-index');
        if (trackIndex === -1 && optionIndex === 'off') {
          option.classList.add('active');
        } else if (parseInt(optionIndex, 10) === trackIndex || parseInt(trackIndexAttr, 10) === trackIndex) {
          option.classList.add('active');
        }
      });
    }

    // Format time function
    function formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return "0:00";
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      if (hrs > 0) {
        return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Timeline Scrubbing & Buffer Management
    let isScrubbing = false;

    function getTimelineFraction(e) {
      if (!progressBarContainer || isNaN(mainVideo.duration) || mainVideo.duration <= 0) return 0;
      const rect = progressBarContainer.getBoundingClientRect();
      const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
      const offsetX = clientX - rect.left;
      return Math.min(Math.max(offsetX / rect.width, 0), 1);
    }

    function updateBufferBar() {
      if (!mainVideo || !progressBufferedEl || isNaN(mainVideo.duration) || mainVideo.duration <= 0) return;
      try {
        if (mainVideo.buffered.length > 0) {
          const bufferedEnd = mainVideo.buffered.end(mainVideo.buffered.length - 1);
          const percent = Math.min((bufferedEnd / mainVideo.duration) * 100, 100);
          progressBufferedEl.style.width = `${percent}%`;
        }
      } catch (e) { }
    }

    // Seek By
    function seekBy(seconds) {
      if (!mainVideo) return;
      const dur = mainVideo.duration || Infinity;
      let target = (mainVideo.currentTime || 0) + seconds;
      if (target < 0) target = 0;
      if (target > dur) target = dur;
      mainVideo.currentTime = target;
      try { updateTime(); } catch (e) { }
    }

    // YouTube-Style Double-Tap Seek (±10s) with Cumulative Ripple HUD
    let seekAccumulator = {
      direction: null,
      seconds: 0,
      timer: null
    };

    function triggerSeekRipple(direction, accumulatedSeconds) {
      const leftRipple = document.getElementById('left-seek-ripple');
      const rightRipple = document.getElementById('right-seek-ripple');
      const leftText = document.getElementById('left-ripple-text');
      const rightText = document.getElementById('right-ripple-text');

      if (direction === 'rewind') {
        if (rightRipple) rightRipple.classList.remove('active');
        if (leftText) leftText.textContent = `${accumulatedSeconds} seconds`;
        if (leftRipple) {
          leftRipple.classList.remove('active');
          void leftRipple.offsetWidth;
          leftRipple.classList.add('active');
        }
      } else {
        if (leftRipple) leftRipple.classList.remove('active');
        if (rightText) rightText.textContent = `${accumulatedSeconds} seconds`;
        if (rightRipple) {
          rightRipple.classList.remove('active');
          void rightRipple.offsetWidth;
          rightRipple.classList.add('active');
        }
      }
    }

    function handleDoubleSeek(direction) {
      if (!mainVideo) return;
      if (seekAccumulator.timer) {
        clearTimeout(seekAccumulator.timer);
      }

      if (seekAccumulator.direction === direction) {
        seekAccumulator.seconds += 10;
      } else {
        seekAccumulator.direction = direction;
        seekAccumulator.seconds = 10;
      }

      const delta = direction === 'rewind' ? -10 : 10;
      seekBy(delta);
      triggerSeekRipple(direction, seekAccumulator.seconds);

      seekAccumulator.timer = setTimeout(() => {
        const leftRipple = document.getElementById('left-seek-ripple');
        const rightRipple = document.getElementById('right-seek-ripple');
        if (leftRipple) leftRipple.classList.remove('active');
        if (rightRipple) rightRipple.classList.remove('active');
        seekAccumulator = { direction: null, seconds: 0, timer: null };
      }, 750);
    }

    // Smart Anime Intro & Outro Detection Engine (Netflix / Crunchyroll Style)
    let streamIntroOutro = { intro: null, outro: null };
    let detectedIntroOutro = { intro: null, outro: null };
    let introAutoSkipped = false;
    let outroCountdownActive = false;
    let outroCountdownInterval = null;
    let outroCountdownSeconds = 5;
    let outroDismissed = false;
    let preSkipTime = null;
    let undoToastTimeout = null;

    function hasPreviousEpisode() {
      if (lunarId) {
        const curEp = parseInt(currentEpisode?.episodeNumber || epNum, 10) || 1;
        return curEp > 1;
      }
      const curIndex = siblingEpisodes.findIndex(e => e.id === episodeId);
      return curIndex > 0;
    }

    function hasNextEpisode() {
      if (lunarId) {
        const curEp = parseInt(currentEpisode?.episodeNumber || epNum, 10) || 1;
        const total = siblingEpisodes?.length || 0;
        return total > 0 ? curEp < total : false;
      }
      const curIndex = siblingEpisodes.findIndex(e => e.id === episodeId);
      return curIndex >= 0 && curIndex < siblingEpisodes.length - 1;
    }

    function updateNavButtonsState() {
      const hasPrev = hasPreviousEpisode();
      const hasNext = hasNextEpisode();

      if (prevBtn) {
        prevBtn.disabled = !hasPrev;
        prevBtn.classList.toggle('disabled', !hasPrev);
        prevBtn.setAttribute('aria-disabled', (!hasPrev).toString());
        prevBtn.title = hasPrev ? 'Previous Episode (P)' : 'First Episode';
      }

      if (nextBtn) {
        nextBtn.disabled = !hasNext;
        nextBtn.classList.toggle('disabled', !hasNext);
        nextBtn.setAttribute('aria-disabled', (!hasNext).toString());
        nextBtn.title = hasNext ? 'Next Episode (N)' : 'Final Episode';
      }
    }

    function sanitizeIntroOutro(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const start = Number(raw.start ?? raw.startTime ?? raw.start_time ?? 0);
      const end = Number(raw.end ?? raw.endTime ?? raw.end_time ?? 0);
      if (isNaN(start) || isNaN(end) || end <= start || (end - start) < 15) {
        return null;
      }
      return { start: Math.max(0, start), end: end };
    }

    function isValidTimeWindow(w) {
      return !!(w && typeof w === 'object' && typeof w.start === 'number' && typeof w.end === 'number' && w.end > w.start && (w.end - w.start) >= 15);
    }

    function computeIntroOutroWindows() {
      if (!mainVideo || isNaN(mainVideo.duration) || mainVideo.duration < 60) {
        return { intro: null, outro: null };
      }
      const dur = mainVideo.duration;
      let intro = sanitizeIntroOutro(streamIntroOutro?.intro) || sanitizeIntroOutro(detectedIntroOutro?.intro) || null;
      let outro = sanitizeIntroOutro(streamIntroOutro?.outro) || sanitizeIntroOutro(detectedIntroOutro?.outro) || null;

      // 1. Metadata from episode
      if (currentEpisode) {
        const iStart = currentEpisode.introStart ?? currentEpisode.skipIntroStart;
        const iEnd = currentEpisode.introEnd ?? currentEpisode.skipIntroEnd;
        if (!intro && iStart !== undefined && iEnd !== undefined && Number(iEnd) > Number(iStart)) {
          intro = sanitizeIntroOutro({ start: Math.max(0, Number(iStart)), end: Math.min(dur, Number(iEnd)) });
        }

        const oStart = currentEpisode.outroStart ?? currentEpisode.skipOutroStart;
        const oEnd = currentEpisode.outroEnd ?? currentEpisode.skipOutroEnd;
        if (!outro && oStart !== undefined && oEnd !== undefined && Number(oEnd) > Number(oStart)) {
          outro = sanitizeIntroOutro({ start: Math.max(0, Number(oStart)), end: Math.min(dur, Number(oEnd)) });
        }
      }

      // 2. Embedded Video Chapters
      if (currentEpisode && Array.isArray(currentEpisode.chapters) && currentEpisode.chapters.length > 0) {
        if (!intro) {
          const opCh = currentEpisode.chapters.find(c => /\b(op|opening|intro|theme)\b/i.test(c.title || c.name || ''));
          if (opCh) {
            const s = Number(opCh.startTime ?? opCh.start ?? 0);
            const e = Number(opCh.endTime ?? opCh.end ?? (s + 90));
            intro = sanitizeIntroOutro({ start: s, end: Math.min(dur, e) });
          }
        }
        if (!outro) {
          const edCh = currentEpisode.chapters.find(c => /\b(ed|ending|outro|credits)\b/i.test(c.title || c.name || ''));
          if (edCh) {
            const s = Number(edCh.startTime ?? edCh.start ?? (dur - 90));
            const e = Number(edCh.endTime ?? edCh.end ?? dur);
            outro = sanitizeIntroOutro({ start: Math.max(0, s), end: Math.min(dur, e) });
          }
        }
      }

      // 3. Customizable skip duration (Auto, 60s, 75s, 85s, 90s)
      const durationPref = localStorage.getItem('@infinx_skip_intro_duration') || 'auto';
      let standardOpLengthSec = 89.5;
      if (durationPref === '60') standardOpLengthSec = 60;
      else if (durationPref === '75') standardOpLengthSec = 75;
      else if (durationPref === '85') standardOpLengthSec = 85;
      else if (durationPref === '90') standardOpLengthSec = 90;

      // 4. Subtitle Audio / Lyric Pattern Analysis (WebVTT)
      if (!intro && Array.isArray(activeSubCues) && activeSubCues.length > 0) {
        const isMusicCue = (text = '') => {
          return /([♪♫🎶🎵♩])|(\[(music|theme|song|intro|outro|ending|instrumental)\])|(\((music|theme|song|intro|outro|ending|instrumental)\))/i.test(text);
        };
        const opMusicCues = activeSubCues.filter(c => c.start <= 300 && isMusicCue(c.text));
        if (opMusicCues.length >= 1) {
          const clusterStart = opMusicCues[0].start;
          const lastMusicCue = opMusicCues[opMusicCues.length - 1];
          let clusterEnd = lastMusicCue.end;
          if (clusterEnd - clusterStart < 65) {
            clusterEnd = clusterStart + standardOpLengthSec;
          }
          intro = sanitizeIntroOutro({
            start: Math.max(0, clusterStart - 1),
            end: Math.min(dur, clusterEnd + 1)
          });
        } else {
          // Dialogue prologue gap analysis
          const earlyCues = activeSubCues
            .filter(c => c.start <= 260)
            .sort((a, b) => a.start - b.start);
          if (earlyCues.length >= 1) {
            let detectedGap = null;
            for (let i = 0; i < earlyCues.length - 1; i++) {
              const currentCue = earlyCues[i];
              const nextCue = earlyCues[i + 1];
              const gap = nextCue.start - currentCue.end;
              if (gap >= 65 && gap <= 105 && currentCue.end <= 180) {
                detectedGap = {
                  start: Math.max(0, currentCue.end + 0.3),
                  end: Math.min(dur, nextCue.start - 0.3)
                };
                break;
              }
            }
            if (detectedGap) {
              intro = sanitizeIntroOutro(detectedGap);
            } else if (earlyCues[0].start >= 65 && earlyCues[0].start <= 110) {
              intro = sanitizeIntroOutro({
                start: 0,
                end: Math.min(dur, earlyCues[0].start - 0.5)
              });
            }
          }
        }
      }

      // 5. Anime OP fallbacks
      if (!intro && dur >= 120) {
        intro = { start: 15, end: Math.min(dur - 60, 15 + standardOpLengthSec) };
      }

      // 6. Anime ED fallbacks
      if (!outro && dur >= 120) {
        outro = { start: Math.max(intro ? intro.end + 60 : 60, dur - standardOpLengthSec - 5), end: Math.max(0, dur - 5) };
      }

      return { intro, outro };
    }

    function updateTimelineMarkers() {
      const introMarker = document.getElementById('timeline-intro-marker');
      const outroMarker = document.getElementById('timeline-outro-marker');
      if (!introMarker && !outroMarker) return;

      if (!mainVideo || isNaN(mainVideo.duration) || mainVideo.duration < 60) {
        if (introMarker) introMarker.style.display = 'none';
        if (outroMarker) outroMarker.style.display = 'none';
        return;
      }

      if (!isValidTimeWindow(detectedIntroOutro.intro) && !isValidTimeWindow(detectedIntroOutro.outro)) {
        detectedIntroOutro = computeIntroOutroWindows();
      }

      const dur = mainVideo.duration;
      const { intro, outro } = detectedIntroOutro;

      if (intro && introMarker) {
        const leftPct = (intro.start / dur) * 100;
        const widthPct = Math.max(0.75, ((intro.end - intro.start) / dur) * 100);
        introMarker.style.left = `${leftPct}%`;
        introMarker.style.width = `${widthPct}%`;
        introMarker.style.display = 'block';
        introMarker.setAttribute('title', `Opening (Intro): ${formatTime(intro.start)} - ${formatTime(intro.end)}`);
      } else if (introMarker) {
        introMarker.style.display = 'none';
      }

      if (outro && outroMarker) {
        const leftPct = (outro.start / dur) * 100;
        const widthPct = Math.max(0.75, ((outro.end - outro.start) / dur) * 100);
        outroMarker.style.left = `${leftPct}%`;
        outroMarker.style.width = `${widthPct}%`;
        outroMarker.style.display = 'block';
        outroMarker.setAttribute('title', `Ending (Outro): ${formatTime(outro.start)} - ${formatTime(outro.end)}`);
      } else if (outroMarker) {
        outroMarker.style.display = 'none';
      }
    }

    function showUndoSkipToast() {
      const toast = document.getElementById('undo-skip-toast');
      if (!toast) return;
      if (undoToastTimeout) clearTimeout(undoToastTimeout);
      toast.classList.remove('hidden');
      undoToastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
      }, 6000);
    }

    function skipIntroAction() {
      if (!isValidTimeWindow(detectedIntroOutro.intro) || !mainVideo) return;
      preSkipTime = mainVideo.currentTime;
      mainVideo.currentTime = detectedIntroOutro.intro.end;
      const skipBtn = document.getElementById('skip-intro-btn');
      if (skipBtn) skipBtn.classList.add('hidden');
      showUndoSkipToast();
      showPlayerToast('Auto-Skipped Intro');
    }

    const undoSkipBtn = document.getElementById('undo-skip-btn');
    if (undoSkipBtn) {
      undoSkipBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (preSkipTime !== null && mainVideo) {
          mainVideo.currentTime = preSkipTime;
          preSkipTime = null;
        }
        const toast = document.getElementById('undo-skip-toast');
        if (toast) toast.classList.add('hidden');
        showPlayerToast('Skip Undone');
      });
    }

    const skipIntroBtn = document.getElementById('skip-intro-btn');
    if (skipIntroBtn) {
      skipIntroBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        skipIntroAction();
      });
    }

    function startOutroCountdown() {
      const card = document.getElementById('outro-countdown-card');
      const textEl = document.getElementById('outro-countdown-text');
      const fillEl = document.getElementById('outro-progress-fill');
      const thumbEl = document.getElementById('outro-next-thumbnail');
      const titleEl = document.getElementById('outro-next-title');

      let nextEp = null;
      if (lunarId) {
        const curEp = parseInt(currentEpisode?.episodeNumber || epNum, 10) || 1;
        nextEp = siblingEpisodes.find(e => parseInt(e.episodeNumber || e.number, 10) === curEp + 1);
      } else {
        const curIndex = siblingEpisodes.findIndex(e => e.id === episodeId);
        if (curIndex >= 0 && curIndex < siblingEpisodes.length - 1) {
          nextEp = siblingEpisodes[curIndex + 1];
        }
      }
      if (!nextEp) return;

      if (thumbEl) {
        const thumbUrl = nextEp.thumbnail || nextEp.img || resolveAssetUrl(currentEpisode?.show?.poster) || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500';
        thumbEl.src = thumbUrl;
      }
      if (titleEl) {
        titleEl.textContent = `Episode ${nextEp.episodeNumber || nextEp.number}: ${nextEp.title || ''}`;
      }

      outroCountdownActive = true;
      outroCountdownSeconds = 5;
      if (card) card.classList.remove('hidden');
      if (textEl) textEl.textContent = `in 5s`;
      if (fillEl) {
        fillEl.style.transition = 'none';
        fillEl.style.width = '100%';
        void fillEl.offsetWidth;
        fillEl.style.transition = 'width 5s linear';
        fillEl.style.width = '0%';
      }

      if (outroCountdownInterval) clearInterval(outroCountdownInterval);
      outroCountdownInterval = setInterval(() => {
        outroCountdownSeconds--;
        if (textEl) textEl.textContent = `in ${outroCountdownSeconds}s`;
        if (outroCountdownSeconds <= 0) {
          clearInterval(outroCountdownInterval);
          outroCountdownInterval = null;
          outroCountdownActive = false;
          playNextVideo();
        }
      }, 1000);
    }

    function cancelOutroCountdown() {
      outroDismissed = true;
      outroCountdownActive = false;
      if (outroCountdownInterval) {
        clearInterval(outroCountdownInterval);
        outroCountdownInterval = null;
      }
      const card = document.getElementById('outro-countdown-card');
      if (card) card.classList.add('hidden');
    }

    const outroPlayBtn = document.getElementById('outro-play-btn');
    if (outroPlayBtn) {
      outroPlayBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        cancelOutroCountdown();
        playNextVideo();
      });
    }

    const outroCancelBtn = document.getElementById('outro-cancel-btn');
    if (outroCancelBtn) {
      outroCancelBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        cancelOutroCountdown();
      });
    }

    function handleSmartIntroOutro(currentTime, duration) {
      if (!isValidTimeWindow(detectedIntroOutro.intro) && !isValidTimeWindow(detectedIntroOutro.outro)) {
        detectedIntroOutro = computeIntroOutroWindows();
      }
      const { intro, outro } = detectedIntroOutro;

      // 1. INTRO WINDOW
      const skipIntroFloatingBtn = document.getElementById('skip-intro-btn');
      if (intro && currentTime >= intro.start && currentTime < intro.end) {
        const autoSkipSetting = localStorage.getItem('@infinx_auto_skip_intro');
        const autoSkipEnabled = autoSkipSetting === null || autoSkipSetting === 'true';

        if (autoSkipEnabled && !introAutoSkipped) {
          introAutoSkipped = true;
          skipIntroAction();
        } else if (!autoSkipEnabled && skipIntroFloatingBtn) {
          skipIntroFloatingBtn.classList.remove('hidden');
        }
      } else {
        if (skipIntroFloatingBtn) skipIntroFloatingBtn.classList.add('hidden');
        if (intro && (currentTime < intro.start || currentTime <= 2)) {
          introAutoSkipped = false;
        }
      }

      // 2. OUTRO WINDOW
      if (outro && currentTime >= outro.start && currentTime <= outro.end) {
        const hasNext = hasNextEpisode();
        const autoSkipOutroSetting = localStorage.getItem('@infinx_auto_skip_outro');
        const autoSkipOutroEnabled = autoSkipOutroSetting === null || autoSkipOutroSetting === 'true';
        if (hasNext && autoSkipOutroEnabled && !outroCountdownActive && !outroDismissed) {
          startOutroCountdown();
        }
      } else if (outro && (currentTime < outro.start || currentTime <= 2)) {
        outroDismissed = false;
        if (outroCountdownActive) {
          cancelOutroCountdown();
        }
      }
    }

    // In-Player Episode Drawer Toggle
    const inPlayerEpisodeDrawer = document.getElementById('in-player-episode-drawer');
    const episodeDrawerBtn = document.getElementById('episode-drawer-btn');
    const inPlayerDrawerBackdrop = document.getElementById('in-player-drawer-backdrop');
    const drawerCloseBtn = document.getElementById('drawer-close-btn');

    function toggleEpisodeDrawer(open) {
      if (!inPlayerEpisodeDrawer) return;
      const isCurrentlyOpen = inPlayerEpisodeDrawer.classList.contains('active') || inPlayerEpisodeDrawer.classList.contains('open');
      const isOpen = typeof open === 'boolean' ? open : !isCurrentlyOpen;
      inPlayerEpisodeDrawer.classList.toggle('active', isOpen);
      inPlayerEpisodeDrawer.classList.toggle('open', isOpen);
      inPlayerEpisodeDrawer.setAttribute('aria-hidden', (!isOpen).toString());
      if (isOpen) {
        try {
          const rawProg = localStorage.getItem(`@infinx_episodes_progress_${showId}`);
          updateSeriesProgressUI(rawProg ? JSON.parse(rawProg) : null);
        } catch (e) { }
        setTimeout(() => {
          try {
            const activeEl = inPlayerEpisodeDrawer.querySelector('.drawer-item.active, .playlist-item.active, .drawer-episode-card.active');
            const drawerScroll = inPlayerEpisodeDrawer.querySelector('.drawer-body, .drawer-episodes-grid, .in-player-drawer-panel');
            if (activeEl && drawerScroll) {
              const scrollRect = drawerScroll.getBoundingClientRect();
              const elRect = activeEl.getBoundingClientRect();
              const offset = elRect.top - scrollRect.top + drawerScroll.scrollTop;
              drawerScroll.scrollTo({
                top: Math.max(0, offset - (drawerScroll.clientHeight / 2) + (activeEl.clientHeight / 2)),
                behavior: 'smooth'
              });
            }
          } catch (e) { }
          if (window.scrollX !== 0) window.scrollTo({ left: 0, top: window.scrollY });
        }, 120);
      }
    }

    if (episodeDrawerBtn) {
      episodeDrawerBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleEpisodeDrawer();
      });
    }
    if (inPlayerDrawerBackdrop) {
      inPlayerDrawerBackdrop.addEventListener('click', function () {
        toggleEpisodeDrawer(false);
      });
    }
    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', function () {
        toggleEpisodeDrawer(false);
      });
    }

    // Update video time & timeline bar
    function updateTime() {
      if (!isNaN(mainVideo.duration) && mainVideo.duration > 0) {
        currentTimeEl.textContent = formatTime(mainVideo.currentTime);
        durationEl.textContent = formatTime(mainVideo.duration);

        if (!isScrubbing && progressEl) {
          const progressPercent = (mainVideo.currentTime / mainVideo.duration) * 100;
          progressEl.style.width = `${progressPercent}%`;
        }

        recordActiveWatchTick();
        updateBufferBar();
        reportPlaybackProgress();
        checkAndAwardEpisodeXp();
        handleSmartIntroOutro(mainVideo.currentTime, mainVideo.duration);
        updateTimelineMarkers();
        updateActiveSubtitleDisplay();
      }
    }

    function handleScrubMove(e) {
      if (isNaN(mainVideo.duration) || mainVideo.duration <= 0) return;

      const fraction = getTimelineFraction(e);
      const targetTime = fraction * mainVideo.duration;

      if (progressHoverTime) {
        let hoverLabel = formatTime(targetTime);
        const { intro, outro } = detectedIntroOutro;
        if (intro && targetTime >= intro.start && targetTime <= intro.end) {
          hoverLabel += ' • Intro';
        } else if (outro && targetTime >= outro.start && targetTime <= outro.end) {
          hoverLabel += ' • Outro';
        }
        progressHoverTime.textContent = hoverLabel;
        const percent = fraction * 100;
        progressHoverTime.style.left = `clamp(35px, ${percent}%, calc(100% - 35px))`;
      }

      if (isScrubbing) {
        if (progressEl) progressEl.style.width = `${fraction * 100}%`;
        if (currentTimeEl) currentTimeEl.textContent = formatTime(targetTime);
        mainVideo.currentTime = targetTime;
      }
    }

    // Play/Pause functionality
    function togglePlayPause() {
      if (!checkIsLoggedIn()) {
        showPlayerAuthLock();
        return;
      }
      if (mainVideo.paused) {
        applyUserVolumePreference();
        mainVideo.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      } else {
        mainVideo.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
    }

    playPauseBtn.addEventListener('click', togglePlayPause);

    // Mobile & Desktop Double-Tap Seek and Touch Control listeners (Tap-to-Toggle)
    let lastLeftTapTime = 0;
    let lastRightTapTime = 0;
    let lastCenterTapTime = 0;
    let singleTapTimeout = null;
    let lastTouchInteractionTime = 0;

    const markTouch = () => { lastTouchInteractionTime = Date.now(); };
    window.addEventListener('touchstart', markTouch, { passive: true, capture: true });
    window.addEventListener('touchend', markTouch, { passive: true, capture: true });
    window.addEventListener('touchmove', markTouch, { passive: true, capture: true });
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') markTouch();
    }, { passive: true, capture: true });

    const touchLeft = document.querySelector('.touch-left');
    const touchCenter = document.querySelector('.touch-center');
    const touchRight = document.querySelector('.touch-right');

    function isMobileOrTouchDevice() {
      return (
        (window.matchMedia && (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches)) ||
        window.innerWidth <= 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
    }

    function handleZoneTap(zone, e) {
      if (e) {
        e.stopPropagation();
      }
      lastTouchInteractionTime = Date.now();
      const now = Date.now();
      const controlsVisible = areControlsVisible();

      if (zone === 'left') {
        lastRightTapTime = 0;
        lastCenterTapTime = 0;
        if (now - lastLeftTapTime < 340) {
          clearTimeout(singleTapTimeout);
          singleTapTimeout = null;
          lastLeftTapTime = 0;
          handleDoubleSeek('rewind');
        } else {
          lastLeftTapTime = now;
          clearTimeout(singleTapTimeout);
          if (!controlsVisible) {
            // When hidden: immediately show controls on single tap (never flicker/hide)
            showControls(3500);
          } else {
            // When visible: wait briefly to see if user wants to double-tap rewind before hiding
            singleTapTimeout = setTimeout(() => {
              hideControls();
              singleTapTimeout = null;
            }, 240);
          }
        }
      } else if (zone === 'right') {
        lastLeftTapTime = 0;
        lastCenterTapTime = 0;
        if (now - lastRightTapTime < 340) {
          clearTimeout(singleTapTimeout);
          singleTapTimeout = null;
          lastRightTapTime = 0;
          handleDoubleSeek('forward');
        } else {
          lastRightTapTime = now;
          clearTimeout(singleTapTimeout);
          if (!controlsVisible) {
            // When hidden: immediately show controls on single tap (never flicker/hide)
            showControls(3500);
          } else {
            // When visible: wait briefly to see if user wants to double-tap forward before hiding
            singleTapTimeout = setTimeout(() => {
              hideControls();
              singleTapTimeout = null;
            }, 240);
          }
        }
      } else if (zone === 'center') {
        lastLeftTapTime = 0;
        lastRightTapTime = 0;
        if (now - lastCenterTapTime < 340) {
          clearTimeout(singleTapTimeout);
          singleTapTimeout = null;
          lastCenterTapTime = 0;
          togglePlayPause();
        } else {
          lastCenterTapTime = now;
          clearTimeout(singleTapTimeout);
          if (isMobileOrTouchDevice()) {
            if (!controlsVisible) {
              showControls(3500);
            } else {
              hideControls();
            }
          } else {
            singleTapTimeout = setTimeout(() => {
              togglePlayPause();
              singleTapTimeout = null;
            }, 240);
          }
        }
      }
    }

    if (touchLeft) {
      touchLeft.addEventListener('click', (e) => handleZoneTap('left', e));
    }
    if (touchRight) {
      touchRight.addEventListener('click', (e) => handleZoneTap('right', e));
    }
    if (touchCenter) {
      touchCenter.addEventListener('click', (e) => handleZoneTap('center', e));
    }

    // Direct Tap-to-Toggle fallback on video player container for mobile and small screens
    if (videoPlayer) {
      videoPlayer.addEventListener('click', function (e) {
        if (
          e.target.closest('.custom-controls') ||
          e.target.closest('.settings-dropdown') ||
          e.target.closest('.in-player-drawer') ||
          e.target.closest('#in-player-episode-drawer') ||
          e.target.closest('#caption-settings-modal') ||
          e.target.closest('.skip-intro-btn') ||
          e.target.closest('.outro-countdown-card') ||
          e.target.closest('.undo-skip-toast') ||
          e.target.closest('.player-click-to-play-overlay') ||
          e.target.closest('.player-unmute-banner') ||
          e.target.closest('.mobile-touch-controls') ||
          e.target.closest('.player-xp-toast') ||
          e.target.closest('.seek-ripple-container')
        ) {
          return;
        }
        lastTouchInteractionTime = Date.now();
        if (areControlsVisible()) {
          hideControls();
        } else {
          showControls(3500);
        }
      });
    }

    // Desktop double-click seek on video player
    if (videoPlayer) {
      videoPlayer.addEventListener('dblclick', function (e) {
        if (e.target.closest('.custom-controls') || e.target.closest('.settings-dropdown') || e.target.closest('.in-player-drawer') || e.target.closest('.outro-countdown-card') || e.target.closest('.skip-intro-btn')) {
          return;
        }
        e.preventDefault();
        const rect = videoPlayer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;

        if (clickX < width * 0.42) {
          handleDoubleSeek('rewind');
        } else if (clickX > width * 0.58) {
          handleDoubleSeek('forward');
        } else {
          togglePlayPause();
        }
      });
    }

    // Video end handler for auto-next
    mainVideo.addEventListener('ended', function () {
      checkAndAwardEpisodeXp(true);
      if (autoNextCheckbox && autoNextCheckbox.checked) {
        playNextVideo();
      }
    });

    // Sibling-based Next/Prev Episode navigation
    function playPreviousVideo() {
      if (lunarId) {
        const curEp = parseInt(currentEpisode?.episodeNumber || epNum, 10) || 1;
        if (curEp > 1) {
          switchEpisode(curEp - 1);
        } else {
          showPlayerToast('This is the first episode!');
        }
        return;
      }
      const curIndex = siblingEpisodes.findIndex(e => e.id === episodeId);
      if (curIndex > 0) {
        const prevEp = siblingEpisodes[curIndex - 1];
        window.location.href = `/watch?id=${prevEp.id}`;
      } else {
        showPlayerToast('This is the first episode!');
      }
    }

    function playNextVideo() {
      checkAndAwardEpisodeXp(false);
      if (lunarId) {
        const curEp = parseInt(currentEpisode?.episodeNumber || epNum, 10) || 1;
        if (curEp < siblingEpisodes.length) {
          switchEpisode(curEp + 1);
        } else {
          showPlayerToast('This is the final episode!');
        }
        return;
      }
      const curIndex = siblingEpisodes.findIndex(e => e.id === episodeId);
      if (curIndex >= 0 && curIndex < siblingEpisodes.length - 1) {
        const nextEp = siblingEpisodes[curIndex + 1];
        window.location.href = `/watch?id=${nextEp.id}`;
      } else {
        showPlayerToast('This is the final episode!');
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', playPreviousVideo);
    if (nextBtn) nextBtn.addEventListener('click', playNextVideo);

    // Seek By
    function seekBy(seconds) {
      if (!mainVideo) return;
      const dur = mainVideo.duration || Infinity;
      let target = (mainVideo.currentTime || 0) + seconds;
      if (target < 0) target = 0;
      if (target > dur) target = dur;
      mainVideo.currentTime = target;
      try { updateTime(); } catch (e) { }
    }

    if (rewind10Btn) {
      rewind10Btn.addEventListener('click', function () { seekBy(-10); });
    }

    if (forward10Btn) {
      forward10Btn.addEventListener('click', function () { seekBy(10); });
    }

    mainVideo.addEventListener('play', function () {
      lastActivePlaybackTick = Date.now();
      if (!checkIsLoggedIn()) {
        mainVideo.pause();
        showPlayerAuthLock();
        return;
      }
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      showControls(3500);
    });

    mainVideo.addEventListener('pause', function () {
      lastActivePlaybackTick = null;
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      clearTimeout(hideControlsTimeout);
      showControls(0);
    });

    // Robust Volume Controls for PC and Mobile/Android
    const volumeContainer = document.querySelector('.volume-container');

    if (volumeBtn) {
      volumeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (mainVideo.muted || mainVideo.volume === 0) {
          mainVideo.muted = false;
          if (mainVideo.volume === 0) {
            const savedVol = parseFloat(localStorage.getItem('infinx_player_volume'));
            mainVideo.volume = (!isNaN(savedVol) && savedVol > 0) ? savedVol : 1;
          }
        } else {
          mainVideo.muted = true;
        }
        saveUserVolumePreference();
        updateVolumeUI();
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', function (e) {
        e.stopPropagation();
        const val = parseFloat(this.value) / 100;
        mainVideo.volume = val;
        mainVideo.muted = (val === 0);
        saveUserVolumePreference();
        updateVolumeUI();
      });

      volumeSlider.addEventListener('change', function (e) {
        e.stopPropagation();
        const val = parseFloat(this.value) / 100;
        mainVideo.volume = val;
        mainVideo.muted = (val === 0);
        saveUserVolumePreference();
        updateVolumeUI();
      });
    }

    if (volumeContainer && isMobile) {
      volumeContainer.addEventListener('click', function (e) {
        e.stopPropagation();
        this.classList.toggle('active');
      });
      document.addEventListener('click', function (e) {
        if (!volumeContainer.contains(e.target)) {
          volumeContainer.classList.remove('active');
        }
      });
    }

    mainVideo.addEventListener('volumechange', updateVolumeUI);

    // Ultra-Smooth Drag Scrubbing & Buffer Listeners
    function startScrubbing(e) {
      if (isNaN(mainVideo.duration) || mainVideo.duration <= 0) return;
      isScrubbing = true;

      if (progressBarContainer) progressBarContainer.classList.add('scrubbing');
      handleScrubMove(e);

      document.addEventListener('mousemove', handleScrubMove);
      document.addEventListener('mouseup', stopScrubbing);
      document.addEventListener('touchmove', handleScrubMove, { passive: false });
      document.addEventListener('touchend', stopScrubbing);
    }

    function stopScrubbing(e) {
      if (!isScrubbing) return;
      isScrubbing = false;

      if (progressBarContainer) progressBarContainer.classList.remove('scrubbing');

      document.removeEventListener('mousemove', handleScrubMove);
      document.removeEventListener('mouseup', stopScrubbing);
      document.removeEventListener('touchmove', handleScrubMove);
      document.removeEventListener('touchend', stopScrubbing);

      if (e) handleScrubMove(e);
      showControls(3500);
    }

    if (progressBarContainer) {
      progressBarContainer.addEventListener('mousedown', startScrubbing);
      progressBarContainer.addEventListener('mousemove', handleScrubMove);
      progressBarContainer.addEventListener('touchstart', startScrubbing, { passive: false });
    }

    mainVideo.addEventListener('progress', updateBufferBar);
    mainVideo.addEventListener('loadedmetadata', function () {
      updateBufferBar();
      detectedIntroOutro = computeIntroOutroWindows();
      updateTimelineMarkers();
      const isLunar = !!(currentEpisode?.isLunar || (lunarId && lunarId !== 'null'));
      const effectiveEpId = currentEpisode?.id || episodeId;
      const anilistIdVal = currentEpisode?.anilistId || lunarId;
      const epNumVal = currentEpisode?.episodeNumber || epNum || 1;
      const epKey = getEpisodeWatchKey(effectiveEpId, anilistIdVal, epNumVal, isLunar);
      loadEpisodeWatchMetrics(epKey);
    });
    mainVideo.addEventListener('durationchange', function () {
      detectedIntroOutro = computeIntroOutroWindows();
      updateTimelineMarkers();
    });

    // Toast Feedback function
    function showPlayerToast(message) {
      let toast = document.querySelector('.player-toast');
      if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
      toast = document.createElement('div');
      toast.className = 'player-toast';
      toast.textContent = message;
      if (videoPlayer) videoPlayer.appendChild(toast);
      setTimeout(() => {
        if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
      }, 1800);
    }

    // Unified Scaling, Aspect Ratio & Crop Manager
    const fitScreenBtn = document.querySelector('.fit-screen-btn');
    const fitModes = ['cover', 'contain', 'fill'];
    let currentFitMode = localStorage.getItem('infinx_video_fit_mode') || 'cover';
    let currentAspectRatio = localStorage.getItem('infinx_video_aspect_ratio') || 'default';
    let currentCropMode = localStorage.getItem('infinx_video_crop') || 'default';

    function parseRatioString(ratioStr) {
      if (!ratioStr || ratioStr === 'default') return '';
      if (ratioStr.includes(':')) {
        const parts = ratioStr.split(':');
        return `${parts[0]} / ${parts[1]}`;
      }
      return ratioStr.replace(':1', ' / 1');
    }

    function applyVideoTransform() {
      if (!mainVideo) return;

      // Clear previous inline styling overrides
      mainVideo.style.removeProperty('aspect-ratio');
      mainVideo.style.removeProperty('object-fit');
      mainVideo.style.removeProperty('width');
      mainVideo.style.removeProperty('height');

      // 1. If explicit Crop is active
      if (currentCropMode !== 'default') {
        const parsedRatio = parseRatioString(currentCropMode);
        if (parsedRatio) {
          mainVideo.style.setProperty('aspect-ratio', parsedRatio, 'important');
        }
        mainVideo.style.setProperty('object-fit', 'cover', 'important');
        mainVideo.style.setProperty('width', '100%', 'important');
        mainVideo.style.setProperty('height', '100%', 'important');
      }
      // 2. If explicit Aspect Ratio is active
      else if (currentAspectRatio !== 'default') {
        const parsedRatio = parseRatioString(currentAspectRatio);
        if (parsedRatio) {
          mainVideo.style.setProperty('aspect-ratio', parsedRatio, 'important');
          mainVideo.style.setProperty('width', 'auto', 'important');
          mainVideo.style.setProperty('height', 'auto', 'important');
          mainVideo.style.setProperty('max-width', '100%', 'important');
          mainVideo.style.setProperty('max-height', '100%', 'important');
        }
        mainVideo.style.setProperty('object-fit', 'contain', 'important');
      }
      // 3. Fallback to Screen Fit Mode (fit-screen-btn / notch fill mode)
      else {
        mainVideo.style.setProperty('object-fit', currentFitMode, 'important');
        mainVideo.style.setProperty('width', '100%', 'important');
        mainVideo.style.setProperty('height', '100%', 'important');
      }

      // Update Screen Fit Button icon & title
      if (fitScreenBtn) {
        if (currentFitMode === 'cover') {
          fitScreenBtn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i>';
          fitScreenBtn.title = 'Fill Notch Screen (Cover)';
        } else if (currentFitMode === 'fill') {
          fitScreenBtn.innerHTML = '<i class="fas fa-arrows-alt"></i>';
          fitScreenBtn.title = 'Stretch Video (Fill)';
        } else {
          fitScreenBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i>';
          fitScreenBtn.title = 'Fit to Screen (Contain)';
        }
      }

      // Update Settings UI active states
      document.querySelectorAll('.fit-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-fit') === currentFitMode);
      });
      document.querySelectorAll('.aspect-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-aspect') === currentAspectRatio);
      });
      document.querySelectorAll('.crop-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-crop') === currentCropMode);
      });

      const fitLabels = { contain: 'Fit', cover: 'Fill Notch', fill: 'Stretch' };
      const fitDisplay = document.getElementById('current-fit-display');
      if (fitDisplay) {
        fitDisplay.textContent = currentAspectRatio !== 'default' ? currentAspectRatio : (fitLabels[currentFitMode] || 'Fit');
      }
    }

    // Handler for Screen Fit Button (`.fit-screen-btn`)
    function cycleFitMode(showToast = true) {
      currentAspectRatio = 'default';
      currentCropMode = 'default';
      localStorage.setItem('infinx_video_aspect_ratio', 'default');
      localStorage.setItem('infinx_video_crop', 'default');

      const currentIndex = fitModes.indexOf(currentFitMode);
      currentFitMode = fitModes[(currentIndex + 1) % fitModes.length];
      localStorage.setItem('infinx_video_fit_mode', currentFitMode);

      applyVideoTransform();

      if (showToast) {
        let label = 'Fit to Screen (Contain)';
        if (currentFitMode === 'cover') label = 'Fill Notch Screen (Cover)';
        if (currentFitMode === 'fill') label = 'Stretch Video (Fill)';
        showPlayerToast(`Screen Fit: ${label}`);
      }
    }

    if (fitScreenBtn) {
      fitScreenBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        cycleFitMode(true);
      });
    }

    document.querySelectorAll('.fit-option').forEach(option => {
      option.addEventListener('click', function (e) {
        e.stopPropagation();
        currentAspectRatio = 'default';
        currentCropMode = 'default';
        localStorage.setItem('infinx_video_aspect_ratio', 'default');
        localStorage.setItem('infinx_video_crop', 'default');

        currentFitMode = this.getAttribute('data-fit');
        localStorage.setItem('infinx_video_fit_mode', currentFitMode);
        applyVideoTransform();
        showPlayerToast(`Screen Fit: ${currentFitMode}`);
        closeAllDropdowns();
        if (typeof window.switchSettingsView === 'function') {
          window.switchSettingsView('main', true);
        }
      });
    });

    document.querySelectorAll('.aspect-option').forEach(option => {
      option.addEventListener('click', function (e) {
        e.stopPropagation();
        currentCropMode = 'default';
        localStorage.setItem('infinx_video_crop', 'default');

        currentAspectRatio = this.getAttribute('data-aspect');
        localStorage.setItem('infinx_video_aspect_ratio', currentAspectRatio);
        applyVideoTransform();
        showPlayerToast(`Aspect Ratio: ${currentAspectRatio === 'default' ? 'Default' : currentAspectRatio}`);
        closeAllDropdowns();
        if (typeof window.switchSettingsView === 'function') {
          window.switchSettingsView('main', true);
        }
      });
    });

    document.querySelectorAll('.crop-option').forEach(option => {
      option.addEventListener('click', function (e) {
        e.stopPropagation();
        currentAspectRatio = 'default';
        localStorage.setItem('infinx_video_aspect_ratio', 'default');

        currentCropMode = this.getAttribute('data-crop');
        localStorage.setItem('infinx_video_crop', currentCropMode);
        applyVideoTransform();
        showPlayerToast(`Crop: ${currentCropMode === 'default' ? 'Default' : currentCropMode}`);
        closeAllDropdowns();
        if (typeof window.switchSettingsView === 'function') {
          window.switchSettingsView('main', true);
        }
      });
    });

    // Initial application of saved transform settings
    applyVideoTransform();

    // Screen Orientation API & Auto-Rotate logic for Mobile
    async function lockLandscapeOrientation() {
      try {
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape');
        } else if (screen.lockOrientation) {
          screen.lockOrientation('landscape');
        } else if (screen.mozLockOrientation) {
          screen.mozLockOrientation('landscape');
        } else if (screen.msLockOrientation) {
          screen.msLockOrientation('landscape');
        }
      } catch (err) {
        console.log('Screen orientation lock not supported or allowed:', err);
      }
    }

    function unlockOrientation() {
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        } else if (screen.unlockOrientation) {
          screen.unlockOrientation();
        } else if (screen.mozUnlockOrientation) {
          screen.mozUnlockOrientation();
        } else if (screen.msUnlockOrientation) {
          screen.msUnlockOrientation();
        }
      } catch (err) {
        console.log('Screen orientation unlock error:', err);
      }
    }

    function enterFullscreen() {
      if (!videoPlayer) return;
      if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        if (videoPlayer.requestFullscreen) videoPlayer.requestFullscreen();
        else if (videoPlayer.webkitRequestFullscreen) videoPlayer.webkitRequestFullscreen();
        else if (videoPlayer.msRequestFullscreen) videoPlayer.msRequestFullscreen();
        else if (mainVideo && mainVideo.webkitEnterFullscreen) mainVideo.webkitEnterFullscreen();
      }
    }

    function exitFullscreen() {
      if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
    }

    // Auto-Rotate on Mobile Device Orientation Change
    function handleDeviceOrientationChange() {
      if (!isMobile) return;

      const isLandscape = (screen.orientation && screen.orientation.type)
        ? screen.orientation.type.startsWith('landscape')
        : (Math.abs(window.orientation || 0) === 90);

      if (isLandscape && !isFullscreen) {
        enterFullscreen();
      } else if (!isLandscape && isFullscreen) {
        exitFullscreen();
      }
    }

    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleDeviceOrientationChange);
    } else {
      window.addEventListener('orientationchange', handleDeviceOrientationChange);
    }

    // Fullscreen toggles
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', function () {
      if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        enterFullscreen();
      } else {
        exitFullscreen();
      }
    });

    function areControlsVisible() {
      const controls = document.querySelector('.custom-controls');
      if (!controls) return false;
      if (controls.classList.contains('hidden')) return false;
      if (videoPlayer && videoPlayer.classList.contains('controls-hidden')) return false;
      try {
        const style = window.getComputedStyle(controls);
        if (style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none') {
          return false;
        }
      } catch (err) { }
      return true;
    }

    function hideControls() {
      if (typeof isScrubbing !== 'undefined' && isScrubbing) return;
      const modalActive = document.getElementById('caption-settings-modal')?.classList.contains('active');
      const drawerActive = document.getElementById('in-player-episode-drawer')?.classList.contains('active');
      if (modalActive || drawerActive) return;

      if (isSettingsMenuOpen && typeof closeSettingsDropdown === 'function') {
        closeSettingsDropdown();
      }

      clearTimeout(hideControlsTimeout);
      const controls = document.querySelector('.custom-controls');
      const overlay = document.querySelector('.video-overlay');
      if (controls) controls.classList.add('hidden');
      if (overlay) overlay.classList.add('hidden');
      if (videoPlayer) {
        videoPlayer.classList.add('controls-hidden');
        videoPlayer.classList.remove('controls-visible');
      }
    }

    function showControls(autoHideDelay = 3500) {
      clearTimeout(hideControlsTimeout);
      const controls = document.querySelector('.custom-controls');
      const overlay = document.querySelector('.video-overlay');
      if (controls) controls.classList.remove('hidden');
      if (overlay) overlay.classList.remove('hidden');
      if (videoPlayer) {
        videoPlayer.classList.remove('controls-hidden');
        videoPlayer.classList.add('controls-visible');
      }

      if (mainVideo && !mainVideo.paused && autoHideDelay > 0) {
        hideControlsTimeout = setTimeout(hideControls, autoHideDelay);
      }
    }

    function toggleControls() {
      if (areControlsVisible()) {
        hideControls();
      } else {
        showControls(3500);
      }
    }

    function handleFullscreenChange() {
      isFullscreen = !!(document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement);

      if (videoPlayer) {
        videoPlayer.classList.toggle('is-fullscreen', isFullscreen);
      }
      document.body.classList.toggle('is-player-fullscreen', isFullscreen);

      if (isFullscreen) {
        lockLandscapeOrientation();
        if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        showControls(3500);
      } else {
        unlockOrientation();
        if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        showControls(3500);
      }
    }

    let lastMouseMoveTime = 0;
    function handleMouseMove(e) {
      // Ignore simulated mouse events from touch / coarse pointers
      if (Date.now() - lastTouchInteractionTime < 1000) return;
      if (e && e.pointerType === 'touch') return;
      if (isMobileOrTouchDevice() && (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches)) {
        return;
      }
      const now = Date.now();
      if (now - lastMouseMoveTime < 120) return;
      lastMouseMoveTime = now;
      showControls(3500);
    }
    if (videoPlayer) {
      videoPlayer.addEventListener('mousemove', handleMouseMove);
      videoPlayer.addEventListener('mouseleave', function () {
        if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
          if (mainVideo && !mainVideo.paused && !isSettingsMenuOpen) {
            hideControls();
          }
        }
      });
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    mainVideo.addEventListener('timeupdate', updateTime);
    mainVideo.addEventListener('seeking', () => {
      lastActivePlaybackTick = null;
      updateActiveSubtitleDisplay();
    });
    mainVideo.addEventListener('seeked', () => {
      lastActivePlaybackTick = Date.now();
      updateActiveSubtitleDisplay();
    });

    function updateSpeedPillsActive() {
      const currentRate = (mainVideo && !isNaN(mainVideo.playbackRate)) ? mainVideo.playbackRate : 1;
      const speedBadge = document.getElementById('settings-speed-badge');
      if (speedBadge) speedBadge.textContent = `${currentRate}x`;
      document.querySelectorAll('#settings-speed-pills .settings-pill').forEach(pill => {
        const val = parseFloat(pill.getAttribute('data-speed'));
        pill.classList.toggle('active', Math.abs(val - currentRate) < 0.05);
      });
    }

    function setupSpeedPills() {
      document.querySelectorAll('#settings-speed-pills .settings-pill').forEach(pill => {
        pill.addEventListener('click', function (e) {
          e.stopPropagation();
          const speed = parseFloat(this.getAttribute('data-speed')) || 1;
          if (mainVideo) mainVideo.playbackRate = speed;
          updateSpeedPillsActive();
          document.querySelectorAll('.current-speed').forEach(el => { el.textContent = `${speed}x`; });
          showPlayerToast(`Speed: ${speed}x`);
        });
      });
    }

    // Settings dropdown clicks
    if (settingsBtn) settingsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      isSettingsMenuOpen = !isSettingsMenuOpen;

      const dropdown = document.getElementById('player-settings-dropdown');
      const backdrop = document.getElementById('settings-mobile-backdrop');

      if (settingsBtn) settingsBtn.classList.toggle('active', isSettingsMenuOpen);
      if (dropdown) dropdown.classList.toggle('active', isSettingsMenuOpen);
      if (backdrop) backdrop.classList.toggle('active', isSettingsMenuOpen);

      const controls = document.querySelector('.custom-controls');
      if (controls) {
        controls.classList.toggle('settings-open', isSettingsMenuOpen);
      }

      if (isSettingsMenuOpen) {
        showControls();
        updateSpeedPillsActive();
        updateQualityOptions();
        updateAudioOptions();
        updateSubtitleOptions();
        updateServerOptions();
      }

      closeAllDropdowns();
    });

    const mobileBackdrop = document.getElementById('settings-mobile-backdrop');
    if (mobileBackdrop) {
      mobileBackdrop.addEventListener('click', function (e) {
        e.stopPropagation();
        closeSettingsDropdown();
      });
    }

    const dragHandle = document.querySelector('.settings-drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('click', function (e) {
        e.stopPropagation();
        closeSettingsDropdown();
      });

      let startTouchY = 0;
      dragHandle.addEventListener('touchstart', function (e) {
        if (e.touches && e.touches[0]) startTouchY = e.touches[0].clientY;
      }, { passive: true });

      dragHandle.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) {
          const deltaY = e.touches[0].clientY - startTouchY;
          if (deltaY > 40) {
            closeSettingsDropdown();
          }
        }
      }, { passive: true });
    }

    document.addEventListener('click', function (event) {
      if (isSettingsMenuOpen && !settingsBtn?.contains(event.target) && !event.target.closest('.settings-dropdown')) {
        closeSettingsDropdown();
      }
      if (!event.target.closest('.server-selector') &&
        !event.target.closest('.quality-selector') &&
        !event.target.closest('.audio-selector') &&
        !event.target.closest('.subtitle-selector') &&
        !event.target.closest('.playback-speed-selector') &&
        !event.target.closest('.settings-menu') &&
        !event.target.closest('.settings-dropdown')) {
        closeAllDropdowns();
      }
    });

    document.querySelectorAll('.server-btn, .quality-btn, .audio-btn, .subtitle-selector .settings-btn, .speed-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const dropdown = this.nextElementSibling;
        if (!dropdown) return;
        const isVisible = dropdown.style.display === 'block';

        closeAllDropdowns();
        closeSettingsDropdown();

        if (!isVisible) {
          dropdown.style.display = 'block';
          const container = this.closest('.server-selector, .quality-selector, .audio-selector, .subtitle-selector, .playback-speed-selector');
          if (container) container.classList.add('active');
        }
      });
    });

    const playerSubtitleBtn = document.querySelector('.control-btn.subtitle-btn');
    if (playerSubtitleBtn) {
      playerSubtitleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!subtitleTracks || subtitleTracks.length === 0) {
          showPlayerToast('No Subtitles Available');
          return;
        }
        if (currentSubtitleTrack === -1) {
          const defaultIdx = subtitleTracks.findIndex(t => {
            const lang = (t.lang || t.language || '').toLowerCase();
            const label = (t.label || t.name || '').toLowerCase();
            return t.default || lang.startsWith('en') || label.includes('english');
          });
          setSubtitle(defaultIdx >= 0 ? defaultIdx : 0);
        } else {
          setSubtitle(-1);
        }
      });
    }

    document.querySelectorAll('.speed-option').forEach(option => {
      option.addEventListener('click', function (e) {
        e.stopPropagation();
        const speed = this.getAttribute('data-speed');
        mainVideo.playbackRate = parseFloat(speed);
        document.querySelectorAll('.current-speed').forEach(el => {
          el.textContent = speed === '1' ? '1x' : `${speed}x`;
        });
        document.querySelectorAll('.speed-option').forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        closeAllDropdowns();
        if (typeof window.switchSettingsView === 'function') {
          window.switchSettingsView('main', true);
        }
      });
    });

    // Setup Delegation listeners
    function setupQualityEventListeners() {
      const qualityDropdown = document.getElementById('quality-dropdown');
      if (qualityDropdown) {
        qualityDropdown.addEventListener('click', function (e) {
          const option = e.target.closest('.quality-option');
          if (!option) return;
          e.stopPropagation();
          const quality = option.getAttribute('data-quality');
          if (quality === 'auto') setQuality('auto');
          else setQuality(parseInt(quality));
        });
      }
      const settingsQualitySection = document.querySelector('.settings-dropdown .quality-options');
      if (settingsQualitySection) {
        settingsQualitySection.addEventListener('click', function (e) {
          const option = e.target.closest('.quality-option');
          if (!option) return;
          e.stopPropagation();
          const quality = option.getAttribute('data-quality');
          if (quality === 'auto') setQuality('auto');
          else setQuality(parseInt(quality));
        });
      }
    }

    function setupAudioEventListeners() {
      const handleAudioClick = function (e) {
        const option = e.target.closest('.audio-option');
        if (!option) return;
        e.stopPropagation();

        const audioType = option.getAttribute('data-audio-type');
        if (audioType) {
          switchAudioType(audioType);
          return;
        }

        const audioIdx = option.getAttribute('data-audio-index');
        if (audioIdx !== null && !isNaN(parseInt(audioIdx, 10))) {
          setAudioTrack(parseInt(audioIdx, 10));
        }
      };

      const audioContainer = document.getElementById('audio-track-list');
      if (audioContainer) {
        audioContainer.addEventListener('click', handleAudioClick);
      }
      const audioDropdown = document.getElementById('audio-dropdown');
      if (audioDropdown) {
        audioDropdown.addEventListener('click', handleAudioClick);
      }
    }

    function setupSubtitleEventListeners() {
      function handleSubtitleClick(e) {
        const styleTrigger = e.target.closest('.subtitle-style-trigger');
        if (styleTrigger) {
          e.stopPropagation();
          closeAllDropdowns();
          closeSettingsDropdown();
          if (typeof window.openCaptionSettingsModal === 'function') {
            window.openCaptionSettingsModal();
          }
          return;
        }
        const option = e.target.closest('.subtitle-option');
        if (!option) return;
        e.stopPropagation();
        const subtitleAttr = option.getAttribute('data-subtitle');
        const trackIdxAttr = option.getAttribute('data-track-index');

        if (subtitleAttr === 'off') {
          setSubtitle(-1);
        } else {
          const idx = trackIdxAttr !== null ? parseInt(trackIdxAttr) : parseInt(subtitleAttr);
          setSubtitle(isNaN(idx) ? -1 : idx);
        }
        if (typeof window.switchSettingsView === 'function') {
          window.switchSettingsView('main', true);
        }
        closeAllDropdowns();
      }

      const subtitleContainer = document.querySelector('.subtitle-options');
      if (subtitleContainer) {
        subtitleContainer.addEventListener('click', handleSubtitleClick);
      }
      const subtitleDropdown = document.getElementById('subtitle-dropdown');
      if (subtitleDropdown) {
        subtitleDropdown.addEventListener('click', handleSubtitleClick);
      }
    }

    function setupAutoSkipEventListeners() {
      const introCheckbox = document.getElementById('setting-auto-skip-intro');
      const outroCheckbox = document.getElementById('setting-auto-skip-outro');
      const durationChips = document.querySelectorAll('#skip-duration-options .duration-chip');

      function updateAutoskipBadge() {
        const introOn = introCheckbox ? introCheckbox.checked : true;
        const outroOn = outroCheckbox ? outroCheckbox.checked : true;
        const badge = document.getElementById('current-autoskip-display');
        if (!badge) return;
        if (introOn && outroOn) {
          badge.textContent = 'Smart Auto';
        } else if (introOn) {
          badge.textContent = 'Intro Only';
        } else if (outroOn) {
          badge.textContent = 'Outro Only';
        } else {
          badge.textContent = 'Off';
        }
      }

      // 1. Initial State from localStorage
      const introPref = localStorage.getItem('@infinx_auto_skip_intro');
      if (introCheckbox) {
        introCheckbox.checked = introPref === null || introPref === 'true';
        introCheckbox.addEventListener('change', function () {
          localStorage.setItem('@infinx_auto_skip_intro', introCheckbox.checked ? 'true' : 'false');
          showPlayerToast(introCheckbox.checked ? 'Auto-Skip Intro: Enabled' : 'Auto-Skip Intro: Disabled');
          updateAutoskipBadge();
          const skipBtn = document.getElementById('skip-intro-btn');
          if (detectedIntroOutro.intro && mainVideo) {
            const cur = mainVideo.currentTime;
            if (cur >= detectedIntroOutro.intro.start && cur < detectedIntroOutro.intro.end) {
              if (introCheckbox.checked && !introAutoSkipped) {
                introAutoSkipped = true;
                skipIntroAction();
              } else if (!introCheckbox.checked && skipBtn) {
                skipBtn.classList.remove('hidden');
              }
            }
          }
        });
      }

      const outroPref = localStorage.getItem('@infinx_auto_skip_outro');
      if (outroCheckbox) {
        outroCheckbox.checked = outroPref === null || outroPref === 'true';
        outroCheckbox.addEventListener('change', function () {
          localStorage.setItem('@infinx_auto_skip_outro', outroCheckbox.checked ? 'true' : 'false');
          showPlayerToast(outroCheckbox.checked ? 'Auto-Skip Outro: Enabled' : 'Auto-Skip Outro: Disabled');
          updateAutoskipBadge();
          if (!outroCheckbox.checked && outroCountdownActive) {
            cancelOutroCountdown();
          }
        });
      }

      updateAutoskipBadge();

      // 2. Skip Duration Chips
      const currentDuration = localStorage.getItem('@infinx_skip_intro_duration') || 'auto';
      durationChips.forEach(chip => {
        const val = chip.getAttribute('data-duration') || 'auto';
        if (val === currentDuration) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }

        chip.addEventListener('click', function (e) {
          e.stopPropagation();
          durationChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          localStorage.setItem('@infinx_skip_intro_duration', val);
          detectedIntroOutro = computeIntroOutroWindows();
          updateTimelineMarkers();
          const displayLabel = val === 'auto' ? 'Smart Auto' : `${val}s`;
          showPlayerToast(`Skip Duration: ${displayLabel}`);
        });
      });
    }

    function switchSettingsView() {
      // Unified all-in-one settings view
    }
    window.switchSettingsView = switchSettingsView;

    function setupAllInOneSettingsMenu() {
      const closeBtn = document.getElementById('settings-panel-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          closeSettingsDropdown();
        });
      }

      const openCaptionBtn = document.getElementById('open-caption-settings');
      if (openCaptionBtn) {
        openCaptionBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          closeSettingsDropdown();
          if (typeof window.openCaptionSettingsModal === 'function') {
            window.openCaptionSettingsModal();
          }
        });
      }

      setupSpeedPills();

      // Automation toggles
      const introToggle = document.getElementById('setting-auto-skip-intro');
      if (introToggle) {
        const introPref = localStorage.getItem('@infinx_auto_skip_intro');
        introToggle.checked = introPref === null || introPref === 'true';
        introToggle.addEventListener('change', function () {
          localStorage.setItem('@infinx_auto_skip_intro', introToggle.checked ? 'true' : 'false');
          showPlayerToast(introToggle.checked ? 'Auto-Skip Intro: Enabled' : 'Auto-Skip Intro: Disabled');
        });
      }

      const outroToggle = document.getElementById('setting-auto-skip-outro');
      if (outroToggle) {
        const outroPref = localStorage.getItem('@infinx_auto_skip_outro');
        outroToggle.checked = outroPref === null || outroPref === 'true';
        outroToggle.addEventListener('change', function () {
          localStorage.setItem('@infinx_auto_skip_outro', outroToggle.checked ? 'true' : 'false');
          showPlayerToast(outroToggle.checked ? 'Auto-Skip Outro: Enabled' : 'Auto-Skip Outro: Disabled');
        });
      }

      const autoNextToggle = document.getElementById('setting-auto-next-episode');
      const autoNextCheckbox = document.getElementById('auto-next');
      if (autoNextToggle) {
        const autoNextPref = localStorage.getItem('@infinx_auto_next');
        const isAutoNext = autoNextPref === null || autoNextPref === 'true';
        autoNextToggle.checked = isAutoNext;
        if (autoNextCheckbox) autoNextCheckbox.checked = isAutoNext;
        autoNextToggle.addEventListener('change', function () {
          localStorage.setItem('@infinx_auto_next', autoNextToggle.checked ? 'true' : 'false');
          if (autoNextCheckbox) autoNextCheckbox.checked = autoNextToggle.checked;
          showPlayerToast(autoNextToggle.checked ? 'Auto-Play Next: Enabled' : 'Auto-Play Next: Disabled');
        });
        if (autoNextCheckbox) {
          autoNextCheckbox.addEventListener('change', function () {
            autoNextToggle.checked = autoNextCheckbox.checked;
          });
        }
      }
    }

    // Call dropdown listeners setup
    setupQualityEventListeners();
    setupAudioEventListeners();
    setupSubtitleEventListeners();
    setupAutoSkipEventListeners();
    setupAllInOneSettingsMenu();

    // Mobile Navigation & Search Wireup
    if (mobileMenuBtn && mobileNav && mobileNavOverlay) {
      mobileMenuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        mobileNav.classList.add('active');
        mobileNavOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      });

      function closeMobileNav() {
        mobileNav.classList.remove('active');
        mobileNavOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }

      if (mobileNavClose) mobileNavClose.addEventListener('click', closeMobileNav);
      mobileNavOverlay.addEventListener('click', closeMobileNav);
    }

    // Header & Mobile Search Handlers
    function executeSearch(query) {
      if (!query || !query.trim()) return;
      window.location.href = `/index.html?search=${encodeURIComponent(query.trim())}`;
    }

    const searchInputEl = document.getElementById('searchInput');
    const searchIconEl = document.getElementById('searchIcon');
    const mobileSearchInputEl = document.getElementById('mobileSearchInput');
    const mobileSearchIconEl = document.getElementById('mobileSearchIcon');

    if (searchInputEl) {
      searchInputEl.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') executeSearch(this.value);
      });
    }
    if (searchIconEl) {
      searchIconEl.addEventListener('click', function () {
        if (searchInputEl) executeSearch(searchInputEl.value);
      });
    }
    if (mobileSearchInputEl) {
      mobileSearchInputEl.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') executeSearch(this.value);
      });
    }
    if (mobileSearchIconEl) {
      mobileSearchIconEl.addEventListener('click', function () {
        if (mobileSearchInputEl) executeSearch(mobileSearchInputEl.value);
      });
    }

    // Asset URL Resolver - ensures relative database paths (e.g. "Postes/frieren.jpg") resolve to root paths
    function resolveAssetUrl(url) {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return sanitizeStreamUrl(url);
      }
      if (url.startsWith('/')) {
        return url;
      }
      return '/' + url;
    }

    // Dynamic Video Thumbnail Extractor logic
    const thumbCachePrefix = 'infinx_thumb_v1_';
    const thumbQueue = [];
    let isExtracting = false;

    function getCachedThumbnail(id) {
      try {
        return localStorage.getItem(thumbCachePrefix + id);
      } catch (e) {
        return null;
      }
    }

    function setCachedThumbnail(id, dataUrl) {
      try {
        localStorage.setItem(thumbCachePrefix + id, dataUrl);
      } catch (e) {
        console.warn('LocalStorage full, clearing thumbnail cache');
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(thumbCachePrefix)) {
              localStorage.removeItem(key);
            }
          }
          localStorage.setItem(thumbCachePrefix + id, dataUrl);
        } catch (err) { }
      }
    }

    async function extractFrameFromVideo(videoUrl) {
      return new Promise((resolve, reject) => {
        if (!videoUrl) {
          reject(new Error('No video URL provided'));
          return;
        }

        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        video.webkitPlaysinline = true;
        video.style.position = 'fixed';
        video.style.top = '-1000px';
        video.style.left = '-1000px';
        video.style.width = '160px';
        video.style.height = '90px';
        document.body.appendChild(video);

        let tempHls = null;
        let cleanupCalled = false;

        const cleanup = () => {
          if (cleanupCalled) return;
          cleanupCalled = true;
          if (tempHls) {
            try { tempHls.destroy(); } catch (e) { }
          }
          if (video.parentNode) {
            try { video.parentNode.removeChild(video); } catch (e) { }
          }
        };

        const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('Thumbnail extraction timeout'));
        }, 12000);

        const captureFrame = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 90;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            clearTimeout(timeoutId);
            cleanup();
            resolve(dataUrl);
          } catch (err) {
            clearTimeout(timeoutId);
            cleanup();
            reject(err);
          }
        };

        const onMetadataLoaded = () => {
          const seekTime = Math.min(10, video.duration ? video.duration * 0.1 : 10);
          video.currentTime = seekTime;
        };

        video.addEventListener('loadedmetadata', onMetadataLoaded);
        video.addEventListener('seeked', captureFrame);
        video.addEventListener('error', (e) => {
          clearTimeout(timeoutId);
          cleanup();
          reject(new Error('Video loading error'));
        });

        if (videoUrl.endsWith('.m3u8') || videoUrl.includes('.m3u8')) {
          if (Hls.isSupported()) {
            tempHls = new Hls({
              autoStartLoad: true,
              maxBufferLength: 1,
              maxMaxBufferLength: 2,
            });
            tempHls.loadSource(videoUrl);
            tempHls.attachMedia(video);
            tempHls.on(Hls.Events.ERROR, function (event, data) {
              if (data.fatal) {
                clearTimeout(timeoutId);
                cleanup();
                reject(new Error('HLS error: ' + data.type));
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = videoUrl;
          } else {
            clearTimeout(timeoutId);
            cleanup();
            reject(new Error('HLS not supported'));
          }
        } else {
          video.src = videoUrl;
        }
      });
    }

    async function processThumbQueue() {
      if (isExtracting || thumbQueue.length === 0) return;
      isExtracting = true;

      const { ep, imgElement } = thumbQueue.shift();
      const cached = getCachedThumbnail(ep.id);
      if (cached) {
        imgElement.src = cached;
        isExtracting = false;
        processThumbQueue();
        return;
      }

      if (!ep.videoUrl) {
        isExtracting = false;
        processThumbQueue();
        return;
      }

      try {
        const dataUrl = await extractFrameFromVideo(ep.videoUrl);
        if (dataUrl) {
          setCachedThumbnail(ep.id, dataUrl);
          imgElement.src = dataUrl;
        }
      } catch (err) {
        console.warn(`Failed to extract thumbnail for episode ${ep.id}:`, err);
      }

      setTimeout(() => {
        isExtracting = false;
        processThumbQueue();
      }, 800);
    }

    function queueThumbnailExtraction(ep, imgElement) {
      const cached = getCachedThumbnail(ep.id);
      if (cached) {
        imgElement.src = cached;
        return;
      }
      thumbQueue.push({ ep, imgElement });
      processThumbQueue();
    }

    // Sibling-based Playlist generator
    function initializePlaylist() {
      // Set main video poster image dynamically
      if (mainVideo) {
        mainVideo.poster = resolveAssetUrl(currentEpisode.show?.poster || currentEpisode.show?.banner);
      }

      // Update browser document tab title
      if (currentEpisode) {
        const showTitle = currentEpisode.show?.title || '';
        document.title = `${showTitle ? showTitle + ' - ' : ''}Episode ${currentEpisode.episodeNumber}: ${currentEpisode.title}`;
      }

      // Render category tags dynamically
      const tagsContainer = document.querySelector('.video-tags');
      if (tagsContainer) {
        if (currentEpisode.show?.categories && currentEpisode.show.categories.length > 0) {
          tagsContainer.innerHTML = currentEpisode.show.categories
            .map(c => {
              const name = c?.category?.name || c?.name || (typeof c === 'string' ? c : '');
              const slug = c?.category?.slug || c?.slug || (name ? name.toLowerCase().replace(/\s+/g, '-') : '');
              return name ? `<span class="tag" onclick="window.location.href='/view.html#${encodeURIComponent(slug)}'">${name}</span>` : '';
            })
            .filter(Boolean)
            .join('');
        } else {
          tagsContainer.innerHTML = '';
        }
      }

    // Dynamic Views Tracking & Increment
    async function updateAndTrackEpisodeViews() {
      const viewsEl = document.querySelector('.views');
      const isLunar = !!(currentEpisode?.isLunar || (lunarId && lunarId !== 'null'));
      const effectiveEpId = currentEpisode?.id || (isLunar ? `lunar-${lunarId}-${epNum}` : episodeId);
      const anilistIdVal = currentEpisode?.anilistId || lunarId;
      const epNumVal = currentEpisode?.episodeNumber || epNum || 1;

      try {
        const res = await fetch(`${API_BASE}/shows/episode/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episodeId: effectiveEpId,
            lunarId: anilistIdVal,
            episodeNumber: epNumVal
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.views === 'number') {
            if (currentEpisode) currentEpisode.views = data.views;
            if (viewsEl) {
              viewsEl.innerHTML = `<i class="fas fa-eye"></i> ${data.views.toLocaleString()} views`;
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to track episode view:', err);
      }

      if (viewsEl) {
        const fallbackCount = currentEpisode?.views || 1240;
        viewsEl.innerHTML = `<i class="fas fa-eye"></i> ${fallbackCount.toLocaleString()} views`;
      }
    }

    // Update views count dynamically & increment view
    updateAndTrackEpisodeViews();

      if (currentEpisode.show?.type === 'movie') {
        const playlistEl = document.querySelector('.video-playlist');
        if (playlistEl) playlistEl.style.display = 'none';
        const containerEl = document.querySelector('.container');
        if (containerEl) containerEl.classList.add('no-playlist');
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        const autoNextCont = document.querySelector('.auto-next-container');
        if (autoNextCont) autoNextCont.style.display = 'none';
        if (videoTitle) videoTitle.textContent = currentEpisode.show.title || currentEpisode.title;
        if (episodeElement) episodeElement.textContent = 'Movie';
        const descriptionText = document.querySelector('.description-text');
        if (descriptionText) descriptionText.textContent = stripHtmlTags(currentEpisode.show?.description || currentEpisode.description || '');
        return;
      }

      playlistContainer.innerHTML = '';
      const drawerEpisodesList = document.getElementById('drawer-episodes-list');
      if (drawerEpisodesList) drawerEpisodesList.innerHTML = '';

      // Update UI title and description for current playing episode
      if (videoTitle) videoTitle.textContent = currentEpisode.title;
      if (episodeElement) episodeElement.textContent = `Episode ${currentEpisode.episodeNumber}`;
      const descriptionText = document.querySelector('.description-text');
      if (descriptionText) descriptionText.textContent = stripHtmlTags(currentEpisode.show?.description || currentEpisode.description || '');

      const totalEpisodes = (siblingEpisodes && Array.isArray(siblingEpisodes)) ? siblingEpisodes.length : 0;
      document.querySelector('.episode-count').textContent = `(${totalEpisodes} episodes)`;
      const drawerCountEl = document.getElementById('drawer-episode-count');
      if (drawerCountEl) drawerCountEl.textContent = `(${totalEpisodes})`;

      // Load progress data from local storage
      let showProgData = { episodes: {}, lastWatched: null };
      try {
        const rawProg = localStorage.getItem(`@infinx_episodes_progress_${showId}`);
        if (rawProg) showProgData = JSON.parse(rawProg);
      } catch (e) { }

      // Update series progress cards
      updateSeriesProgressUI(showProgData);

      // Populate Player & Drawer Season Selectors if multi-season anime
      const seasonsList = (currentEpisode.show && Array.isArray(currentEpisode.show.seasons)) ? currentEpisode.show.seasons : [];
      const playerSeasonWrapper = document.getElementById('playerSeasonSelectorWrapper');
      const playerSeasonSelect = document.getElementById('playerSeasonSelect');
      const drawerSeasonWrapper = document.getElementById('drawerSeasonSelectorWrapper');
      const drawerSeasonSelect = document.getElementById('drawerSeasonSelect');

      if (seasonsList.length > 1) {
        const populateSelect = (selectEl, wrapperEl) => {
          if (!selectEl || !wrapperEl) return;
          wrapperEl.style.display = 'block';
          selectEl.innerHTML = seasonsList.map((s, idx) => {
            const isCur = s.isCurrent || (s.anilistId && parseInt(s.anilistId) === parseInt(lunarId));
            const sTitle = s.titleEnglish || s.title || `Season ${idx + 1}`;
            return `<option value="${s.anilistId || s.id}" ${isCur ? 'selected' : ''}>${sTitle}</option>`;
          }).join('');

          selectEl.onchange = (e) => {
            const targetId = e.target.value;
            if (targetId) {
              const cleanId = typeof targetId === 'string' && targetId.startsWith('lunar-') ? targetId.replace('lunar-', '') : targetId;
              window.location.href = `/watch?id=${cleanId}&ep=1`;
            }
          };
        };

        populateSelect(playerSeasonSelect, playerSeasonWrapper);
        populateSelect(drawerSeasonSelect, drawerSeasonWrapper);
      } else {
        if (playerSeasonWrapper) playerSeasonWrapper.style.display = 'none';
        if (drawerSeasonWrapper) drawerSeasonWrapper.style.display = 'none';
      }

      // Load all sibling episodes
      (siblingEpisodes || []).forEach((ep) => {
        const epNumVal = ep.episodeNumber || ep.number;
        const epProg = (showProgData.episodes && (
          showProgData.episodes[ep.id] ||
          (epNumVal && showProgData.episodes[epNumVal]) ||
          (epNumVal && showProgData.episodes[String(epNumVal)]) ||
          (lunarId && epNumVal && showProgData.episodes[`lunar-${lunarId}-${epNumVal}`])
        )) || null;
        const isCurrentActive = ep.id === (currentEpisode?.id || episodeId) ||
          (lunarId && (ep.episodeNumber || ep.number) === (currentEpisode?.episodeNumber || epNum));
        const isCompleted = epProg?.completed || (epProg?.progressPercent && epProg.progressPercent >= 88);
        const isInProgress = epProg && epProg.positionSeconds > 5 && !isCompleted;

        const fallbackPoster = (ep.thumbnail || ep.img)
          ? (ep.thumbnail || ep.img)
          : (resolveAssetUrl(currentEpisode.show?.poster) || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500');

        let badgeHtml = '';
        let progressTrackHtml = '';

        if (isCurrentActive) {
          badgeHtml = '<div class="item-status"><span class="item-watched"><i class="fas fa-play-circle"></i> Watching</span></div>';
          if (epProg && epProg.progressPercent > 0) {
            const fillBg = isCompleted ? '#00ff88' : 'var(--primary)';
            progressTrackHtml = `<div class="item-progress-track"><div class="item-progress-fill" style="width: ${epProg.progressPercent}%; background: ${fillBg};"></div></div>`;
          }
        } else if (isCompleted) {
          badgeHtml = '<div class="item-status"><span class="badge-watched"><i class="fas fa-check-circle"></i> Watched</span></div>';
          progressTrackHtml = '<div class="item-progress-track"><div class="item-progress-fill" style="width: 100%; background: #00ff88;"></div></div>';
        } else if (isInProgress) {
          badgeHtml = `<div class="item-status"><span class="badge-in-progress">${epProg.progressPercent}% · Left at ${formatTime(epProg.positionSeconds)}</span></div>`;
          progressTrackHtml = `<div class="item-progress-track"><div class="item-progress-fill" style="width: ${epProg.progressPercent}%; background: var(--primary);"></div></div>`;
        }

        const buildItemHtml = () => `
          <div class="item-thumbnail" style="position: relative; overflow: hidden;">
            <img class="playlist-item-img" src="${fallbackPoster}" alt="${ep.title}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500';">
            <div class="item-overlay"><i class="fas fa-play"></i></div>
            <div class="item-duration">Ep ${ep.episodeNumber || ep.number}</div>
            ${progressTrackHtml}
          </div>
          <div class="item-info">
            <h4 class="item-title">Episode ${ep.episodeNumber || ep.number}: ${ep.title}</h4>
            <div class="item-meta">
              <span class="item-duration">${ep.duration || '24m'} • HD Streaming</span>
            </div>
            ${badgeHtml}
          </div>
        `;

        const playAction = function () {
          const seekPos = (epProg && epProg.positionSeconds > 10 && !epProg.completed) ? epProg.positionSeconds : null;
          if (lunarId) {
            const thisNum = parseInt(ep.episodeNumber || ep.number, 10);
            if (thisNum === epNum) {
              if (seekPos && mainVideo) mainVideo.currentTime = seekPos;
              return;
            }
            switchEpisode(thisNum, currentAudioType, seekPos);
          } else {
            const seekParam = seekPos ? `&t=${seekPos}` : '';
            window.location.href = `/watch?id=${ep.id}${seekParam}`;
          }
        };

        // 1. Sidebar Playlist item
        const playlistItem = document.createElement('div');
        playlistItem.className = `playlist-item ${isCurrentActive ? 'active' : ''}`;
        playlistItem.innerHTML = buildItemHtml();
        playlistItem.addEventListener('click', playAction);
        playlistContainer.appendChild(playlistItem);

        // 2. In-Player Drawer item
        if (drawerEpisodesList) {
          const drawerItem = document.createElement('div');
          drawerItem.className = `playlist-item drawer-item ${isCurrentActive ? 'active' : ''}`;
          drawerItem.innerHTML = buildItemHtml();
          drawerItem.addEventListener('click', function () {
            toggleEpisodeDrawer(false);
            playAction();
          });
          drawerEpisodesList.appendChild(drawerItem);
        }

        // Asynchronously request frame extraction from videoUrl, fallback to poster
        const imgEl = playlistItem.querySelector('.playlist-item-img');
        if (imgEl) {
          queueThumbnailExtraction(ep, imgEl);
        }
      });

      // Hide Load More if not enough siblings
      const loadMoreBtn = document.querySelector('.load-more-btn');
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      updateNavButtonsState();
    }

    // ====== COMMENTS SECTION LOGIC ======
    let commentsData = [];
    let currentSort = 'top';

    function timeAgo(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}d ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return `${months}mo ago`;
      const years = Math.floor(months / 12);
      return `${years}y ago`;
    }

    function getAvatarClass(email) {
      if (!email) return 'avatar-a';
      const initial = email[0].toLowerCase();
      if (initial >= 'a' && initial <= 'z') {
        return `avatar-${initial}`;
      }
      return 'avatar-a';
    }

    function getUsername(email) {
      if (!email) return 'Anonymous';
      return email.split('@')[0];
    }

    function escapeHtml(s) {
      if (!s) return '';
      return (s + '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function sortReplies(replies) {
      return replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    function buildCommentTree(comments) {
      const topLevels = [];
      const commentMap = {};

      comments.forEach(c => {
        c.replies = [];
        commentMap[c.id] = c;
      });

      function getRootCommentId(comment) {
        let curr = comment;
        while (curr.parentId) {
          const parent = commentMap[curr.parentId];
          if (!parent) break;
          curr = parent;
        }
        return curr.id;
      }

      comments.forEach(c => {
        if (!c.parentId) {
          topLevels.push(c);
        } else {
          const rootId = getRootCommentId(c);
          if (commentMap[rootId]) {
            const parentComment = commentMap[c.parentId];
            if (parentComment && parentComment.parentId) {
              c.replyToHandle = getUsername(parentComment.user?.email);
            }
            commentMap[rootId].replies.push(c);
          }
        }
      });

      topLevels.forEach(c => {
        sortReplies(c.replies);
      });

      return topLevels;
    }

    function sortRoots(roots, sortBy) {
      return roots.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        if (sortBy === 'top') {
          if (b.likesCount !== a.likesCount) {
            return b.likesCount - a.likesCount;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        } else {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
      });
    }

    function renderCommentCard(comment, isReply = false) {
      const authorName = escapeHtml(getUsername(comment.user?.email));
      const avatarChar = authorName[0].toUpperCase();
      const avatarClass = getAvatarClass(comment.user?.email);
      const timeAgoStr = timeAgo(comment.createdAt);
      const isAdmin = comment.user?.role === 'ADMIN';
      const isPinned = comment.isPinned;
      const isLiked = comment.isLiked;

      const currentUserEmail = localStorage.getItem('infinx_user_email');
      const currentUserRole = localStorage.getItem('infinx_user_role');
      const isOwner = currentUserEmail && currentUserEmail === comment.user?.email;
      const isUserAdmin = currentUserRole === 'ADMIN';

      const showDeleteBtn = isOwner || isUserAdmin;
      const showPinBtn = isUserAdmin && !isReply;

      let bodyContent = escapeHtml(comment.content);
      if (comment.replyToHandle) {
        bodyContent = `<span style="color: var(--primary); font-weight: 600; margin-right: 4px;">@${escapeHtml(comment.replyToHandle)}</span> ${bodyContent}`;
      }

      const likeBtnActive = isLiked ? 'liked' : '';
      const pinBtnActive = isPinned ? 'pinned' : '';

      return `
        <div class="comment-card ${isPinned ? 'pinned' : ''}" id="comment-${comment.id}">
          <div class="comment-avatar ${avatarClass}">
            ${avatarChar}
          </div>
          <div class="comment-main">
            <div class="comment-meta">
              <span class="comment-author">${authorName}</span>
              ${isAdmin ? `<span class="comment-role-badge">Admin</span>` : ''}
              <span class="comment-time">${timeAgoStr}</span>
              ${isPinned ? `<span class="comment-pin-badge"><i class="fas fa-thumbtack"></i> Pinned</span>` : ''}
            </div>
            <div class="comment-body">
              ${bodyContent}
            </div>
            <div class="comment-actions">
              <button class="comment-action-btn like-btn ${likeBtnActive}" onclick="handleLikeComment(${comment.id})">
                <i class="${isLiked ? 'fas' : 'far'} fa-thumbs-up"></i>
                <span class="likes-count">${comment.likesCount}</span>
              </button>
              
              <button class="comment-action-btn reply-btn" onclick="toggleReplyInput(${comment.id})">
                <i class="far fa-comment-alt"></i> Reply
              </button>
              
              ${showPinBtn ? `
                <button class="comment-action-btn pin-btn ${pinBtnActive}" onclick="handlePinComment(${comment.id})">
                  <i class="fas fa-thumbtack"></i> ${isPinned ? 'Unpin' : 'Pin'}
                </button>
              ` : ''}
              
              ${showDeleteBtn ? `
                <button class="comment-action-btn delete-btn" onclick="handleDeleteComment(${comment.id})">
                  <i class="far fa-trash-alt"></i> Delete
                </button>
              ` : ''}
            </div>
            
            <div class="reply-input-box" id="reply-box-${comment.id}">
              <div class="reply-form">
                <div class="reply-textarea-wrapper">
                  <textarea id="reply-text-${comment.id}" placeholder="Reply to ${authorName}..." maxlength="500"></textarea>
                </div>
                <button class="reply-cancel-btn" onclick="toggleReplyInput(${comment.id})">Cancel</button>
                <button class="reply-submit-btn" id="reply-submit-${comment.id}" onclick="submitReply(${comment.id})">
                  <i class="fas fa-paper-plane"></i> Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function renderCommentsList() {
      const listContainer = document.getElementById('comments-list');
      const countBadge = document.getElementById('comments-count-badge');

      if (!listContainer) return;

      if (commentsData.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; color: var(--light-gray); padding: 30px 10px; font-size: 0.95rem;">No comments yet. Be the first to share your thoughts!</div>';
        if (countBadge) countBadge.textContent = '(0)';
        return;
      }

      if (countBadge) countBadge.textContent = `(${commentsData.length})`;

      const tree = buildCommentTree(commentsData);
      sortRoots(tree, currentSort);

      let html = '';
      tree.forEach(comment => {
        html += '<div class="comment-thread-wrapper">';
        html += renderCommentCard(comment, false);

        if (comment.replies && comment.replies.length > 0) {
          html += '<div class="replies-container">';
          comment.replies.forEach(reply => {
            html += renderCommentCard(reply, true);
          });
          html += '</div>';
        }

        html += '</div>';
      });

      listContainer.innerHTML = html;
    }

    function getActiveEpisodeCommentKey() {
      if (currentEpisode && currentEpisode.id) {
        return String(currentEpisode.id);
      }
      if (lunarId) {
        const epNumVal = currentEpisode?.episodeNumber || epNum || 1;
        return `lunar-${lunarId}-${epNumVal}`;
      }
      return episodeId ? String(episodeId) : '1';
    }

    async function loadComments() {
      const epKey = getActiveEpisodeCommentKey();
      if (!epKey) return;
      try {
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/comments/episode/${encodeURIComponent(epKey)}`, { headers });
        if (res.status === 401) {
          localStorage.clear();
          window.location.reload();
          return;
        }
        if (res.ok) {
          commentsData = await res.json();
          renderCommentsList();
        } else {
          commentsData = [];
          renderCommentsList();
        }
      } catch (error) {
        console.error('Error loading comments:', error);
        commentsData = [];
        renderCommentsList();
      }
    }

    function initCommentsSection() {
      const addCommentBox = document.getElementById('addCommentBox');
      if (addCommentBox) {
        if (token) {
          addCommentBox.innerHTML = `
            <form class="comment-form" id="main-comment-form">
              <div class="comment-textarea-wrapper">
                <textarea id="main-comment-text" placeholder="Add a public comment..." maxlength="500" required></textarea>
                <span class="char-counter" id="main-comment-counter">500</span>
              </div>
              <div class="comment-submit-row">
                <button type="submit" class="comment-submit-btn" id="main-comment-submit">
                  <i class="fas fa-paper-plane"></i> Comment
                </button>
              </div>
            </form>
          `;

          const textInput = document.getElementById('main-comment-text');
          const counter = document.getElementById('main-comment-counter');
          if (textInput && counter) {
            textInput.addEventListener('input', function () {
              const remaining = 500 - this.value.length;
              counter.textContent = remaining;
            });
          }

          const mainForm = document.getElementById('main-comment-form');
          if (mainForm) {
            mainForm.addEventListener('submit', async function (e) {
              e.preventDefault();
              const content = textInput.value.trim();
              if (!content) return;

              const submitBtn = document.getElementById('main-comment-submit');
              submitBtn.disabled = true;

              try {
                const epKey = getActiveEpisodeCommentKey();
                const res = await fetch(`${API_BASE}/comments/episode/${encodeURIComponent(epKey)}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ content })
                });

                if (res.ok) {
                  textInput.value = '';
                  counter.textContent = '500';
                  await loadComments();
                } else {
                  const errData = await res.json();
                  alert(errData.error || 'Failed to post comment.');
                }
              } catch (error) {
                console.error('Error posting comment:', error);
                alert('Failed to post comment due to connection error.');
              } finally {
                submitBtn.disabled = false;
              }
            });
          }
        } else {
          addCommentBox.innerHTML = `
            <div class="comment-login-prompt">
              <p>Join the conversation! Please <a href="/index.html?login=true">Login</a> or <a href="/index.html?login=true">Register</a> to post a comment.</p>
            </div>
          `;
        }
      }

      const sortTopBtn = document.getElementById('sort-top');
      const sortNewestBtn = document.getElementById('sort-newest');

      if (sortTopBtn && sortNewestBtn) {
        sortTopBtn.addEventListener('click', () => {
          if (currentSort === 'top') return;
          currentSort = 'top';
          sortTopBtn.classList.add('active');
          sortNewestBtn.classList.remove('active');
          renderCommentsList();
        });

        sortNewestBtn.addEventListener('click', () => {
          if (currentSort === 'newest') return;
          currentSort = 'newest';
          sortNewestBtn.classList.add('active');
          sortTopBtn.classList.remove('active');
          renderCommentsList();
        });
      }

      loadComments();
    }

    // Attach actions to window for global access from template click triggers
    window.toggleReplyInput = function (commentId) {
      if (!token) {
        alert('Please login to reply.');
        window.location.href = '/index.html?login=true';
        return;
      }
      const replyBox = document.getElementById(`reply-box-${commentId}`);
      if (replyBox) {
        replyBox.classList.toggle('active');
        const textarea = document.getElementById(`reply-text-${commentId}`);
        if (textarea && replyBox.classList.contains('active')) {
          textarea.value = '';
          textarea.focus();
        }
      }
    };

    window.submitReply = async function (commentId) {
      if (!token) return;
      const textarea = document.getElementById(`reply-text-${commentId}`);
      if (!textarea) return;

      const content = textarea.value.trim();
      if (!content) return;

      const submitBtn = document.getElementById(`reply-submit-${commentId}`);
      if (submitBtn) submitBtn.disabled = true;

      try {
        const epKey = getActiveEpisodeCommentKey();
        const res = await fetch(`${API_BASE}/comments/episode/${encodeURIComponent(epKey)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content,
            parentId: commentId
          })
        });

        if (res.ok) {
          await loadComments();
        } else {
          const errData = await res.json();
          alert(errData.error || 'Failed to post reply.');
          if (submitBtn) submitBtn.disabled = false;
        }
      } catch (error) {
        console.error('Error posting reply:', error);
        alert('Failed to post reply due to connection error.');
        if (submitBtn) submitBtn.disabled = false;
      }
    };

    window.handleLikeComment = async function (commentId) {
      if (!token) {
        alert('Please login to like comments.');
        window.location.href = '/index.html?login=true';
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/comments/${commentId}/like`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          commentsData = commentsData.map(c => {
            if (c.id === commentId) {
              const liked = data.status === 'liked';
              return {
                ...c,
                isLiked: liked,
                likesCount: liked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1)
              };
            }
            return c;
          });
          renderCommentsList();
        } else {
          alert('Failed to like comment.');
        }
      } catch (error) {
        console.error('Error liking comment:', error);
      }
    };

    window.handlePinComment = async function (commentId) {
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/comments/${commentId}/pin`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const updatedComment = await res.json();
          commentsData = commentsData.map(c => {
            if (c.id === commentId) {
              return {
                ...c,
                isPinned: updatedComment.isPinned
              };
            } else if (updatedComment.isPinned && !c.parentId) {
              return {
                ...c,
                isPinned: false
              };
            }
            return c;
          });
          renderCommentsList();
        } else {
          alert('Failed to toggle pin status.');
        }
      } catch (error) {
        console.error('Error pinning comment:', error);
      }
    };

    window.handleDeleteComment = async function (commentId) {
      if (!token) return;
      if (!confirm('Are you sure you want to delete this comment?')) return;

      try {
        const res = await fetch(`${API_BASE}/comments/${commentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          commentsData = commentsData.filter(c => c.id !== commentId && c.parentId !== commentId);
          renderCommentsList();
        } else {
          alert('Failed to delete comment.');
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    };

    // Keyboard controls
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'f':
          e.preventDefault();
          if (fullscreenBtn) fullscreenBtn.click();
          break;
        case 'm':
          e.preventDefault();
          if (volumeBtn) volumeBtn.click();
          break;
        case 'j':
        case 'arrowleft':
          e.preventDefault();
          seekBy(-10);
          break;
        case 'l':
        case 'arrowright':
          e.preventDefault();
          seekBy(10);
          break;
        case 'arrowup':
          e.preventDefault();
          mainVideo.volume = Math.min(1, Math.round((mainVideo.volume + 0.05) * 100) / 100);
          mainVideo.muted = false;
          saveUserVolumePreference();
          updateVolumeUI();
          showPlayerToast(`Volume: ${Math.round(mainVideo.volume * 100)}%`);
          break;
        case 'arrowdown':
          e.preventDefault();
          mainVideo.volume = Math.max(0, Math.round((mainVideo.volume - 0.05) * 100) / 100);
          mainVideo.muted = (mainVideo.volume === 0);
          saveUserVolumePreference();
          updateVolumeUI();
          showPlayerToast(`Volume: ${Math.round(mainVideo.volume * 100)}%`);
          break;
        case 'n':
          e.preventDefault();
          playNextVideo();
          break;
        case 'p':
          e.preventDefault();
          playPreviousVideo();
          break;
        case 's':
          e.preventDefault();
          skipIntroAction();
          break;
        case 'c':
          e.preventDefault();
          if (playerSubtitleBtn) playerSubtitleBtn.click();
          break;
        case 'e':
          e.preventDefault();
          toggleEpisodeDrawer();
          break;
        case 'escape':
          e.preventDefault();
          if (inPlayerEpisodeDrawer && (inPlayerEpisodeDrawer.classList.contains('active') || inPlayerEpisodeDrawer.classList.contains('open'))) {
            toggleEpisodeDrawer(false);
          } else if (outroCountdownActive) {
            cancelOutroCountdown();
          } else {
            closeSettingsDropdown();
          }
          break;
      }
    });

    // Initialize
    function initializePlayer() {
      applyUserVolumePreference();
      setupServerEventListeners();
      setupQualityEventListeners();
      setupAudioEventListeners();
      setupSubtitleEventListeners();
      setupAutoSkipEventListeners();
      updateTimelineMarkers();

      if (mainVideo.textTracks) {
        mainVideo.textTracks.addEventListener('change', function () {
          let showingTrackIndex = -1;
          for (let i = 0; i < mainVideo.textTracks.length; i++) {
            if (mainVideo.textTracks[i].mode === 'showing') {
              showingTrackIndex = i;
              break;
            }
          }
          currentSubtitleTrack = showingTrackIndex;

          document.querySelectorAll('.subtitle-option').forEach(option => {
            option.classList.remove('active');
            const optionIndex = option.getAttribute('data-subtitle');
            if (showingTrackIndex === -1 && optionIndex === 'off') {
              option.classList.add('active');
            } else if (parseInt(optionIndex) === showingTrackIndex) {
              option.classList.add('active');
            }
          });
        });
      }

      initializePlaylist();
      updateServerOptions();

      // Search Box Handler
      const searchInput = document.getElementById('searchInput');
      const searchIcon = document.getElementById('searchIcon');
      if (searchInput) {
        searchInput.addEventListener('keyup', function (e) {
          if (e.key === 'Enter') {
            const term = this.value.trim();
            if (term) {
              window.location.href = `/view.html#search?q=${encodeURIComponent(term)}`;
            }
          }
        });
      }
      if (searchIcon && searchInput) {
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', function () {
          const term = searchInput.value.trim();
          if (term) {
            window.location.href = `/view.html#search?q=${encodeURIComponent(term)}`;
          }
        });
      }

      // Mobile Navigation Menu Toggle Listeners
      if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function () {
          if (mobileNav) mobileNav.classList.add('active');
          if (mobileNavOverlay) mobileNavOverlay.classList.add('active');
        });
      }
      if (mobileNavClose) {
        mobileNavClose.addEventListener('click', function () {
          if (mobileNav) mobileNav.classList.remove('active');
          if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
        });
      }
      if (mobileNavOverlay) {
        mobileNavOverlay.addEventListener('click', function () {
          if (mobileNav) mobileNav.classList.remove('active');
          if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
        });
      }

      // Mobile Drawer Search Box Handler
      const mobileSearchInput = document.getElementById('mobileSearchInput');
      const mobileSearchIcon = document.getElementById('mobileSearchIcon');
      if (mobileSearchInput) {
        mobileSearchInput.addEventListener('keyup', function (e) {
          if (e.key === 'Enter') {
            const term = this.value.trim();
            if (term) {
              if (mobileNav) mobileNav.classList.remove('active');
              if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
              window.location.href = `/view.html#search?q=${encodeURIComponent(term)}`;
            }
          }
        });
      }
      if (mobileSearchIcon && mobileSearchInput) {
        mobileSearchIcon.style.cursor = 'pointer';
        mobileSearchIcon.addEventListener('click', function () {
          const term = mobileSearchInput.value.trim();
          if (term) {
            if (mobileNav) mobileNav.classList.remove('active');
            if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
            window.location.href = `/view.html#search?q=${encodeURIComponent(term)}`;
          }
        });
      }

      initCommentsSection();

      // STRICT AUTHENTICATION WALL:
      // Users must be registered or logged in to stream any content!
      if (!checkIsLoggedIn()) {
        console.warn('Playback blocked: Sign in or sign up required to watch.');
        showPlayerAuthLock();
        return;
      }

      startAuthenticatedPlayback();
    }

    async function startAuthenticatedPlayback() {
      updateServerOptions();
      updateAudioOptions();
      const initialServer = (availableServers && availableServers.find(s => s.id === activeServerId)) || (availableServers && availableServers[0]) || null;
      let initialVideoUrl = initialServer ? initialServer.url : (currentEpisode.videoUrl || null);

      if (currentEpisode && currentEpisode.isLunar) {
        try {
          if (currentAudioType === 'dub') {
            activeServerId = 'server-2';
            const curDisplay = document.getElementById('current-server-display');
            if (curDisplay) curDisplay.textContent = 'Server 2';
            const miniServerDisp = document.getElementById('current-server-mini-display');
            if (miniServerDisp) miniServerDisp.textContent = 'Server 2';
            document.querySelectorAll('.server-option').forEach(opt => {
              opt.classList.toggle('active', opt.getAttribute('data-server-id') === 'server-2');
            });
          }
          const host = (currentAudioType === 'dub') ? 'yuki' : (initialServer?.host || 'zuna');
          const epNumVal = currentEpisode.episodeNumber || epNum || 1;
          const sRes = await fetch(`${API_BASE}/stream/watch/${currentEpisode.anilistId}/${epNumVal}?host=${host}&type=${currentAudioType}`);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.streamUrl) {
              initialVideoUrl = sData.streamUrl;
              if (initialServer) initialServer.url = sData.streamUrl;
              const validIntro = sanitizeIntroOutro(sData.intro);
              const validOutro = sanitizeIntroOutro(sData.outro);
              if (validIntro || validOutro) {
                streamIntroOutro = { intro: validIntro, outro: validOutro };
                detectedIntroOutro = { intro: validIntro, outro: validOutro };
                updateTimelineMarkers();
              }
              if (sData.subtitles && sData.subtitles.length > 0) {
                subtitleTracks = sData.subtitles;
                updateSubtitleOptions();
                if (currentAudioType === 'sub') {
                  const defaultIdx = subtitleTracks.findIndex(t => {
                    const lang = (t.lang || t.language || '').toLowerCase();
                    const label = (t.label || t.name || '').toLowerCase();
                    return t.default || lang.startsWith('en') || label.includes('english');
                  });
                  setSubtitle(defaultIdx >= 0 ? defaultIdx : 0);
                }
              }
              if (sData.isFallbackSub && currentAudioType === 'dub') {
                showPlayerToast('English Dub not available for this episode. Playing Japanese Sub.');
              }
            }
          }
          // If dub was requested but failed or returned empty streamUrl, auto fallback to sub
          if (!initialVideoUrl && currentAudioType === 'dub') {
            console.log('[Player] Dub stream unavailable on initial load, attempting fallback to Japanese Sub...');
            try {
              const fbRes = await fetch(`${API_BASE}/stream/watch/${currentEpisode.anilistId}/${epNumVal}?host=zuna&type=sub`);
              if (fbRes.ok) {
                const fbData = await fbRes.json();
                if (fbData.streamUrl) {
                  initialVideoUrl = fbData.streamUrl;
                  currentAudioType = 'sub';
                  activeServerId = 'server-1';
                  localStorage.setItem('infinx_preferred_audio_type', 'sub');
                  const curDisplay = document.getElementById('current-server-display');
                  if (curDisplay) curDisplay.textContent = 'Server 1';
                  const miniServerDisp = document.getElementById('current-server-mini-display');
                  if (miniServerDisp) miniServerDisp.textContent = 'Server 1';
                  document.querySelectorAll('.server-option').forEach(opt => {
                    opt.classList.toggle('active', opt.getAttribute('data-server-id') === 'server-1');
                  });
                  updateAudioOptions();
                  if (initialServer) initialServer.url = fbData.streamUrl;
                  const validIntro = sanitizeIntroOutro(fbData.intro);
                  const validOutro = sanitizeIntroOutro(fbData.outro);
                  if (validIntro || validOutro) {
                    streamIntroOutro = { intro: validIntro, outro: validOutro };
                    detectedIntroOutro = { intro: validIntro, outro: validOutro };
                    updateTimelineMarkers();
                  }
                  if (fbData.subtitles && fbData.subtitles.length > 0) {
                    subtitleTracks = fbData.subtitles;
                    updateSubtitleOptions();
                  }
                  showPlayerToast('English Dub not available. Playing Japanese Sub.');
                }
              }
            } catch (fbErr) {
              console.warn('[Player] Fallback to sub failed:', fbErr);
            }
          }
          // If still no streamUrl, try alternative hosts (sora, 3rdprovider)
          if (!initialVideoUrl) {
            for (const altHost of ['sora', '3rdprovider']) {
              try {
                const altRes = await fetch(`${API_BASE}/stream/watch/${currentEpisode.anilistId}/${epNumVal}?host=${altHost}&type=sub`);
                if (altRes.ok) {
                  const altData = await altRes.json();
                  if (altData.streamUrl) {
                    initialVideoUrl = altData.streamUrl;
                    currentAudioType = 'sub';
                    activeServerId = 'server-1';
                    if (initialServer) initialServer.url = altData.streamUrl;
                    break;
                  }
                }
              } catch (altErr) { }
            }
          }
        } catch (streamErr) {
          console.warn('Initial Lunar stream fetch error:', streamErr);
        }
      }

      initHLS(initialVideoUrl);

      if (autoNextCheckbox && autoNextCheckbox.checked) {
        if (autoNextLabel) {
          autoNextLabel.style.color = '#00a8ff';
        }
      }
    }

    initializePlayer();

  } catch (err) {
    console.error('Player initialization error:', err);
  }
});

// Customizable WebVTT Subtitle Engine Preset Handlers
(function () {
  function initCaptionSettingsEngine() {
    const openBtn = document.getElementById('open-caption-settings');
    const modal = document.getElementById('caption-settings-modal');
    const doneBtn = document.getElementById('caption-done');
    const resetBtn = document.getElementById('caption-reset');
    const closeX = document.getElementById('caption-close-x');

    if (!modal) return;

    const fontSizePreset = document.getElementById('caption-font-size-preset');
    const textColorPreset = document.getElementById('caption-text-color-preset');
    const backdropPreset = document.getElementById('caption-backdrop-style-preset');
    const positionPreset = document.getElementById('caption-position-preset');

    const STORAGE_KEY = '@infinx_subtitle_presets';
    const defaults = {
      fontSize: 'medium',
      textColor: '#ffffff',
      backdropStyle: 'shadow',
      position: 'bottom'
    };

    function loadSettings() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return Object.assign({}, defaults, JSON.parse(raw));
      } catch (e) { }
      return Object.assign({}, defaults);
    }

    function saveSettings(s) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { }
    }

    function applyCaptionSettings(s) {
      const overlay = document.getElementById('caption-overlay');
      const sizeMap = { small: '16px', medium: '20px', large: '25px', huge: '30px' };
      const fs = sizeMap[s.fontSize] || '20px';

      document.documentElement.style.setProperty('--caption-font-size', fs);
      document.documentElement.style.setProperty('--caption-text-color', s.textColor || '#ffffff');

      if (overlay) {
        overlay.classList.remove('pos-raised', 'pos-bottom');
        if (s.position === 'raised') overlay.classList.add('pos-raised');

        const captionTexts = overlay.querySelectorAll('.caption-text');
        captionTexts.forEach(el => {
          el.classList.remove('style-shadow', 'style-box', 'style-solid');
          el.classList.add(`style-${s.backdropStyle || 'shadow'}`);
          el.style.fontSize = fs;
          el.style.color = s.textColor || '#ffffff';
        });
      }

      // Update Live Preview Sample in Modal
      const previewSample = document.getElementById('caption-preview-sample');
      if (previewSample) {
        previewSample.classList.remove('style-shadow', 'style-box', 'style-solid');
        previewSample.classList.add(`style-${s.backdropStyle || 'shadow'}`);
        previewSample.style.fontSize = fs;
        previewSample.style.color = s.textColor || '#ffffff';
      }

      currentRenderedCaptionText = '';
      if (typeof updateActiveSubtitleDisplay === 'function') {
        updateActiveSubtitleDisplay();
      }
    }

    function populateControls(s) {
      if (fontSizePreset) fontSizePreset.value = s.fontSize || defaults.fontSize;
      if (textColorPreset) textColorPreset.value = s.textColor || defaults.textColor;
      if (backdropPreset) backdropPreset.value = s.backdropStyle || defaults.backdropStyle;
      if (positionPreset) positionPreset.value = s.position || defaults.position;
    }

    function closeModal() {
      modal.style.display = 'none';
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }

    const initial = loadSettings();
    applyCaptionSettings(initial);
    populateControls(initial);

    window.openCaptionSettingsModal = function () {
      if (!modal) return;

      // Close settings dropdown if open
      const settingsMenu = document.querySelector('.settings-menu');
      if (settingsMenu) settingsMenu.classList.remove('active');
      const settingsDropdown = document.querySelector('.settings-dropdown');
      if (settingsDropdown) {
        settingsDropdown.style.right = '';
        settingsDropdown.style.maxHeight = '';
      }
      const controls = document.querySelector('.custom-controls');
      if (controls) {
        controls.classList.remove('settings-open');
        controls.classList.remove('hidden');
      }

      // Close other dropdowns
      document.querySelectorAll('.server-dropdown, .quality-dropdown, .audio-dropdown, .subtitle-dropdown, .speed-dropdown').forEach(d => {
        d.style.display = 'none';
      });
      document.querySelectorAll('.server-selector, .quality-selector, .audio-selector, .subtitle-selector, .playback-speed-selector').forEach(s => {
        s.classList.remove('active');
      });

      // Target parent: In fullscreen, must be inside fullscreenElement; in normal mode, must be document.body so it isn't clipped by video-player-wrapper overflow: hidden
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      const targetParent = fsEl ? fsEl : document.body;
      if (modal.parentElement !== targetParent) {
        targetParent.appendChild(modal);
      }

      const cur = loadSettings();
      populateControls(cur);
      applyCaptionSettings(cur);

      modal.style.display = 'flex';
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    };

    if (openBtn) {
      openBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.openCaptionSettingsModal();
      });
    }

    // Global delegation for any open-caption-settings triggers
    document.addEventListener('click', function (e) {
      const trigger = e.target.closest('#open-caption-settings, .caption-settings-launch-card, .subtitle-style-trigger, [data-action="open-caption-settings"]');
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        window.openCaptionSettingsModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('#open-caption-settings, .caption-settings-launch-card, .subtitle-style-trigger')) {
        e.preventDefault();
        e.stopPropagation();
        window.openCaptionSettingsModal();
      }
    });

    // Re-attach modal to appropriate container when fullscreen state changes
    function syncModalContainer() {
      if (!modal) return;
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      const targetParent = fsEl ? fsEl : document.body;
      if (modal.parentElement !== targetParent) {
        targetParent.appendChild(modal);
      }
    }
    document.addEventListener('fullscreenchange', syncModalContainer);
    document.addEventListener('webkitfullscreenchange', syncModalContainer);

    if (closeX) {
      closeX.addEventListener('click', function (e) {
        e.stopPropagation();
        closeModal();
      });
    }

    if (doneBtn) {
      doneBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const newS = {
          fontSize: fontSizePreset ? fontSizePreset.value : defaults.fontSize,
          textColor: textColorPreset ? textColorPreset.value : defaults.textColor,
          backdropStyle: backdropPreset ? backdropPreset.value : defaults.backdropStyle,
          position: positionPreset ? positionPreset.value : defaults.position
        };
        applyCaptionSettings(newS);
        saveSettings(newS);
        closeModal();
        if (typeof showPlayerToast === 'function') {
          showPlayerToast('Subtitle Appearance Saved');
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        populateControls(defaults);
        applyCaptionSettings(defaults);
        saveSettings(defaults);
      });
    }

    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });

    [fontSizePreset, textColorPreset, backdropPreset, positionPreset].forEach(el => {
      if (!el) return;
      el.addEventListener('change', function () {
        const tmp = {
          fontSize: fontSizePreset ? fontSizePreset.value : defaults.fontSize,
          textColor: textColorPreset ? textColorPreset.value : defaults.textColor,
          backdropStyle: backdropPreset ? backdropPreset.value : defaults.backdropStyle,
          position: positionPreset ? positionPreset.value : defaults.position
        };
        applyCaptionSettings(tmp);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCaptionSettingsEngine);
  } else {
    initCaptionSettingsEngine();
  }
})();
