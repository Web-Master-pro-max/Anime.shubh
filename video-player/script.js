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
    const SERVER_ORIGIN = (isHttps && !savedServer)
      ? ''
      : ((window.location.protocol === 'file:' || window.location.origin === 'null' || !window.location.origin.includes(':'))
        ? (savedServer || 'http://13.202.95.5:8000')
        : '');
    const API_BASE = `${SERVER_ORIGIN}/api`;

    // Get episode ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const episodeId = parseInt(urlParams.get('episodeId'));

    if (!episodeId) {
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
    } catch (err) {
      console.error('Failed to load episode metadata:', err);
      // Attempt recovery: fallback to dummy object so player doesn't hard-crash if partial data exists
      currentEpisode = currentEpisode || {
        id: episodeId,
        title: `Episode ${episodeId}`,
        episodeNumber: 1,
        videoUrl: '',
        servers: []
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
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `${SERVER_ORIGIN}${url}`;
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

      document.querySelectorAll('.server-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-server-id') === target.id);
      });

      closeAllDropdowns();
      closeSettingsDropdown();

      const savedTime = (preserveTime && !isNaN(mainVideo.currentTime)) ? mainVideo.currentTime : null;
      const wasPlaying = !mainVideo.paused;

      showPlayerToast(`Switched to ${target.name}`);
      initHLS(target.url, savedTime, wasPlaying);
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
            <div style="font-size: 5rem; margin-bottom: 20px; color: var(--primary); animation: fa-spin 4s linear infinite;"><i class="fas fa-server"></i></div>
            <h2 style="font-size: 2.2rem; font-family: 'Outfit'; color: white; margin-bottom: 10px;">Stream Not Available on This Server</h2>
            <p style="font-size: 1.4rem; color: var(--gray-text); max-width: 420px; line-height: 1.6;">This episode is not hosted on the selected server. Please switch to the other server using the Server selector button below!</p>
          `;
          container.appendChild(overlay);
        }
        return;
      }

      const resolvedVideoSrc = resolveMediaUrl(videoSrc);

      // Manually parse master playlist for subtitles as a robust fallback for raw VTTs
      async function parseMasterPlaylist(videoSrc) {
        try {
          console.log("Manually fetching and parsing HLS manifest for subtitles:", videoSrc);
          const response = await fetch(videoSrc);
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
                // Resolve relative URI to absolute URL
                const absoluteUrl = new URL(uri, videoSrc).href;

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
            subtitleTracks = parsedSubtitles;
            updateSubtitleOptions();
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
        });

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

          if (autoPlay) {
            mainVideo.play().catch(e => {
              console.log("Autoplay prevented:", e);
              playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            });
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
          updateAudioDisplay(data.id);
          document.querySelectorAll('.audio-option').forEach(option => {
            option.classList.remove('active');
            const optionIndex = parseInt(option.getAttribute('data-audio-index'));
            if (optionIndex === data.id) {
              option.classList.add('active');
            }
          });
        });

        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, function (event, data) {
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

        hls.on(Hls.Events.ERROR, function (event, data) {
          console.error('HLS error:', data);
          videoPlayer.classList.remove('loading');

          if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
            console.warn('HLS buffer stalled, nudging playhead forward...');
            if (!mainVideo.paused && mainVideo.readyState >= 2) {
              mainVideo.currentTime = Math.min(mainVideo.duration || Infinity, mainVideo.currentTime + 0.1);
            }
          }

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });

      } else if (mainVideo.canPlayType('application/vnd.apple.mpegurl')) {
        videoPlayer.classList.remove('loading');
        mainVideo.src = resolvedVideoSrc;
        mainVideo.addEventListener('loadedmetadata', function () {
          videoPlayer.classList.remove('loading');
          if (seekTime !== null && !isNaN(seekTime) && seekTime > 0) {
            mainVideo.currentTime = seekTime;
          } else {
            resumeSavedProgress();
          }
          if (autoPlay) {
            mainVideo.play().catch(e => { });
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
          const epProg = localData.episodes && localData.episodes[episodeId];
          if (epProg && epProg.positionSeconds > 5 && !epProg.completed) {
            console.log(`Resuming playback from local progress: ${epProg.positionSeconds}s`);
            mainVideo.currentTime = epProg.positionSeconds;
            showPlayerToast(`Resuming at ${formatTime(epProg.positionSeconds)}`);
            return;
          }
        }
      } catch (e) { }

      if (!token) return;
      try {
        const historyRes = await fetch(`${API_BASE}/user/history`, { headers: authHeaders });
        if (historyRes.ok) {
          const historyList = await historyRes.json();
          const savedProgress = historyList.find(h => h.episodeId === episodeId);
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
      } catch (e) { }
    }

    // Update series watch progress card & In-Player drawer tracker
    function updateSeriesProgressUI(progressData) {
      if (!siblingEpisodes || siblingEpisodes.length === 0) return;
      const totalEpisodes = siblingEpisodes.length;
      const episodesMap = (progressData && progressData.episodes) ? progressData.episodes : {};

      const completedCount = siblingEpisodes.filter(ep => {
        const p = episodesMap[ep.id];
        return p && p.completed;
      }).length;

      const remainingCount = Math.max(0, totalEpisodes - completedCount);
      const overallPercent = totalEpisodes > 0 ? Math.round((completedCount / totalEpisodes) * 100) : 0;

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
    }

    // Periodically post progress updates to API & local storage
    async function reportPlaybackProgress() {
      if (isNaN(mainVideo.duration) || mainVideo.duration <= 0) return;
      saveEpisodeWatchProgress(episodeId, mainVideo.currentTime, mainVideo.duration);

      if (!token) return;
      const now = Date.now();
      // Report every 8 seconds
      if (now - lastProgressReportTime < 8000) return;

      lastProgressReportTime = now;
      try {
        await fetch(`${API_BASE}/user/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            episodeId: episodeId,
            progress: Math.floor(mainVideo.currentTime),
            duration: Math.floor(mainVideo.duration)
          })
        });
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
      const langCode = track.lang || track.language;
      const friendlyLang = getFriendlyLanguageName(langCode);
      if (friendlyLang) {
        if (track.name && !track.name.toLowerCase().includes('vegamovies') && track.name.toLowerCase() !== (langCode || '').toLowerCase() && track.name.toLowerCase() !== friendlyLang.toLowerCase()) {
          return `${friendlyLang} (${track.name})`;
        }
        return friendlyLang;
      }
      return track.name || (isSub ? `Subtitle ${fallbackIndex + 1}` : `Track ${fallbackIndex + 1}`);
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

      if (!audioDropdown || !audioList) return;

      audioDropdown.innerHTML = '';
      audioList.innerHTML = '';

      if (audioTracks && audioTracks.length > 0) {
        audioTracks.forEach((track, index) => {
          const isCurrentActive = index === currentAudioTrack;
          const audioOption = document.createElement('div');
          audioOption.className = `audio-option ${isCurrentActive ? 'active' : ''}`;
          audioOption.setAttribute('data-audio-index', index);
          audioOption.innerHTML = `<i class="fas fa-volume-up"></i> ${getTrackDisplayName(track, index, false)}`;
          audioDropdown.appendChild(audioOption);

          const settingsAudioOption = document.createElement('div');
          settingsAudioOption.className = `audio-option ${isCurrentActive ? 'active' : ''}`;
          settingsAudioOption.setAttribute('data-audio-index', index);
          settingsAudioOption.innerHTML = `${getTrackDisplayName(track, index, false)}`;
          audioList.appendChild(settingsAudioOption);
        });
      } else {
        const defaultAudioTracks = [{ name: 'Default Stream' }];
        defaultAudioTracks.forEach((track, index) => {
          const audioOption = document.createElement('div');
          audioOption.className = `audio-option active`;
          audioOption.setAttribute('data-audio-index', index);
          audioOption.innerHTML = `<i class="fas fa-volume-up"></i> ${track.name}`;
          audioDropdown.appendChild(audioOption);

          const settingsAudioOption = document.createElement('div');
          settingsAudioOption.className = `audio-option active`;
          settingsAudioOption.setAttribute('data-audio-index', index);
          settingsAudioOption.innerHTML = `${track.name}`;
          audioList.appendChild(settingsAudioOption);
        });
      }

      const activeTrackObj = (audioTracks && audioTracks[currentAudioTrack]) || (audioTracks && audioTracks[0]);
      const activeLabel = activeTrackObj ? getTrackDisplayName(activeTrackObj, currentAudioTrack, false) : 'Default Stream';
      document.querySelectorAll('.current-audio').forEach(el => { el.textContent = activeLabel; });
      const currentAudioDisp = document.querySelector('.current-audio-display');
      if (currentAudioDisp) {
        currentAudioDisp.innerHTML = `<i class="fas fa-volume-up"></i> ${activeLabel}`;
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
      if (settingsDropdown) settingsDropdown.style.right = '';
      const controls = document.querySelector('.custom-controls');
      if (controls) {
        controls.classList.remove('settings-open');
      }
      if (isFullscreen) {
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
          closeSettingsDropdown();
        }
      }
    }

    // Update audio display
    function updateAudioDisplay(trackIndex) {
      const trackName = audioTracks[trackIndex] ? getTrackDisplayName(audioTracks[trackIndex], trackIndex, false) : 'Default Stream';
      document.querySelectorAll('.current-audio').forEach(el => { el.textContent = trackName; });
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
      closeSettingsDropdown();
    }

    // Update subtitle options
    function updateSubtitleOptions() {
      const subtitleDropdown = document.getElementById('subtitle-dropdown');
      const subtitleList = document.getElementById('subtitle-track-list');

      if (!subtitleDropdown || !subtitleList) return;

      subtitleDropdown.innerHTML = '';
      subtitleList.innerHTML = '';

      const offOptionDropdown = document.createElement('div');
      offOptionDropdown.className = 'subtitle-option active';
      offOptionDropdown.setAttribute('data-subtitle', 'off');
      offOptionDropdown.innerHTML = '<i class="fas fa-ban"></i> Off';
      subtitleDropdown.appendChild(offOptionDropdown);

      const offOptionList = document.createElement('div');
      offOptionList.className = 'subtitle-option active';
      offOptionList.setAttribute('data-subtitle', 'off');
      offOptionList.innerHTML = 'Off';
      subtitleList.appendChild(offOptionList);

      if (subtitleTracks && subtitleTracks.length > 0) {
        subtitleTracks.forEach((track, index) => {
          const dropdownOption = document.createElement('div');
          dropdownOption.className = 'subtitle-option';
          dropdownOption.setAttribute('data-subtitle', index);
          dropdownOption.setAttribute('data-track-index', index);
          dropdownOption.innerHTML = `<i class="fas fa-closed-captioning"></i> ${getTrackDisplayName(track, index, true)}`;
          subtitleDropdown.appendChild(dropdownOption);

          const listOption = document.createElement('div');
          listOption.className = 'subtitle-option';
          listOption.setAttribute('data-subtitle', index);
          listOption.setAttribute('data-track-index', index);
          listOption.innerHTML = getTrackDisplayName(track, index, true);
          subtitleList.appendChild(listOption);
        });
      }
    }

    // Set subtitle track and render via custom styles
    function setSubtitle(trackIndex) {
      if (typeof trackIndex === 'string') {
        if (trackIndex === 'off') trackIndex = -1;
        else trackIndex = parseInt(trackIndex);
      }
      if (isNaN(trackIndex)) trackIndex = -1;

      const subtitleBtn = document.querySelector('.subtitle-btn');
      const captionOverlay = document.getElementById('caption-overlay') || createCaptionOverlay();

      function createCaptionOverlay() {
        const el = document.createElement('div');
        el.id = 'caption-overlay';
        el.className = 'caption-overlay hidden';
        const vp = document.querySelector('.video-player');
        if (vp) vp.appendChild(el);
        return el;
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
        // Italics: <i>, </i>, <em>, </em>
        s = s.replace(/&lt;(\/?)i(?:\s+[^&>]*)?&gt;/gi, '<$1i>');
        s = s.replace(/&lt;(\/?)em(?:\s+[^&>]*)?&gt;/gi, '<$1em>');
        // Bold: <b>, </b>, <strong>, </strong>
        s = s.replace(/&lt;(\/?)b(?:\s+[^&>]*)?&gt;/gi, '<$1b>');
        s = s.replace(/&lt;(\/?)strong(?:\s+[^&>]*)?&gt;/gi, '<$1strong>');
        // Underline: <u>, </u>
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

      function showCaption(text) {
        if (!captionOverlay) return;
        captionOverlay.classList.remove('hidden');

        let presetCfg = { fontSize: 'medium', textColor: '#ffffff', backdropStyle: 'shadow', position: 'bottom' };
        try {
          const raw = localStorage.getItem('@infinx_subtitle_presets');
          if (raw) presetCfg = Object.assign(presetCfg, JSON.parse(raw));
        } catch (e) { }

        const sizeMap = { small: '16px', medium: '20px', large: '25px', huge: '30px' };
        const fs = sizeMap[presetCfg.fontSize] || '20px';

        captionOverlay.classList.remove('pos-raised', 'pos-bottom');
        if (presetCfg.position === 'raised') captionOverlay.classList.add('pos-raised');

        captionOverlay.innerHTML = `<div class="caption-text style-${presetCfg.backdropStyle || 'shadow'}" style="font-size: ${fs}; color: ${presetCfg.textColor || '#ffffff'};">${formatSubtitleHtml(text)}</div>`;
      }

      function hideCaption() {
        if (!captionOverlay) return;
        captionOverlay.classList.add('hidden');
        captionOverlay.innerHTML = '';
      }

      function escapeHtml(s) {
        return (s + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      function detachAllTextTrackListeners() {
        if (!mainVideo.textTracks) return;
        for (let i = 0; i < mainVideo.textTracks.length; i++) {
          try { mainVideo.textTracks[i].oncuechange = null; } catch (e) { }
        }
      }

      function attachTextTrackForOverlay(track) {
        if (!track) return;
        try { track.mode = 'hidden'; } catch (e) { }
        track.oncuechange = function () {
          const cues = track.activeCues;
          if (cues && cues.length > 0) {
            let text = '';
            for (let i = 0; i < cues.length; i++) {
              text += (i ? '\n' : '') + cues[i].text;
            }
            showCaption(text);
          } else {
            hideCaption();
          }
        };

        if (track.activeCues && track.activeCues.length > 0) {
          let t = '';
          for (let i = 0; i < track.activeCues.length; i++) t += (i ? '\n' : '') + track.activeCues[i].text;
          showCaption(t);
        } else {
          hideCaption();
        }
      }

      function removeCustomTrackElement() {
        const existing = document.getElementById('custom-subtitle-track');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      }

      if (trackIndex === -1) {
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

        if (hls && trackInfo && trackInfo.url) {
          removeCustomTrackElement();
          const tEl = document.createElement('track');
          tEl.kind = 'subtitles';
          tEl.src = trackInfo.url;
          tEl.srclang = trackInfo.lang || trackInfo.srclang || 'en';
          tEl.label = trackName;
          tEl.id = 'custom-subtitle-track';
          tEl.default = false;
          mainVideo.appendChild(tEl);

          setTimeout(function () {
            const tracks = mainVideo.textTracks;
            if (tracks && tracks.length > 0) {
              let tt = null;
              for (let i = 0; i < tracks.length; i++) {
                if (tracks[i].label === trackName) { tt = tracks[i]; break; }
              }
              if (!tt) tt = tracks[tracks.length - 1];
              detachAllTextTrackListeners();
              attachTextTrackForOverlay(tt);
            }
          }, 400);
        } else if (mainVideo.textTracks && mainVideo.textTracks[trackIndex]) {
          detachAllTextTrackListeners();
          attachTextTrackForOverlay(mainVideo.textTracks[trackIndex]);
        } else if (hls && typeof hls.subtitleTrack !== 'undefined') {
          try { hls.subtitleTrack = trackIndex; } catch (e) { }
          setTimeout(function () {
            if (mainVideo.textTracks && mainVideo.textTracks.length > 0) {
              detachAllTextTrackListeners();
              attachTextTrackForOverlay(mainVideo.textTracks[mainVideo.textTracks.length - 1]);
            }
          }, 400);
        }

        currentSubtitleTrack = trackIndex;
        document.querySelectorAll('.current-subtitle').forEach(el => { el.textContent = trackName; });
        if (subtitleBtn) {
          subtitleBtn.classList.add('active');
          subtitleBtn.innerHTML = '<i class="fas fa-closed-captioning"></i>';
        }
        showPlayerToast(`Subtitles: ${trackName}`);
      }

      document.querySelectorAll('.subtitle-option').forEach(option => {
        option.classList.remove('active');
        const optionIndex = option.getAttribute('data-subtitle');
        const trackIndexAttr = option.getAttribute('data-track-index');
        if (trackIndex === -1 && optionIndex === 'off') {
          option.classList.add('active');
        } else if (parseInt(optionIndex) === trackIndex || parseInt(trackIndexAttr) === trackIndex) {
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
    let detectedIntroOutro = { intro: null, outro: null };
    let introAutoSkipped = false;
    let outroCountdownActive = false;
    let outroCountdownInterval = null;
    let outroCountdownSeconds = 5;
    let outroDismissed = false;
    let preSkipTime = null;
    let undoToastTimeout = null;

    function computeIntroOutroWindows() {
      if (!mainVideo || isNaN(mainVideo.duration) || mainVideo.duration < 120) {
        return { intro: null, outro: null };
      }
      const dur = mainVideo.duration;
      let intro = null;
      let outro = null;

      // 1. Metadata from episode
      if (currentEpisode) {
        const iStart = currentEpisode.introStart ?? currentEpisode.skipIntroStart;
        const iEnd = currentEpisode.introEnd ?? currentEpisode.skipIntroEnd;
        if (iStart !== undefined && iEnd !== undefined && Number(iEnd) > Number(iStart)) {
          intro = { start: Math.max(0, Number(iStart)), end: Math.min(dur, Number(iEnd)) };
        }

        const oStart = currentEpisode.outroStart ?? currentEpisode.skipOutroStart;
        const oEnd = currentEpisode.outroEnd ?? currentEpisode.skipOutroEnd;
        if (oStart !== undefined && oEnd !== undefined && Number(oEnd) > Number(oStart)) {
          outro = { start: Math.max(0, Number(oStart)), end: Math.min(dur, Number(oEnd)) };
        }
      }

      // 2. Customizable skip duration (Auto, 60s, 75s, 85s, 90s)
      const durationPref = localStorage.getItem('@infinx_skip_intro_duration') || 'auto';
      let standardOpLengthSec = 89.5;
      if (durationPref === '60') standardOpLengthSec = 60;
      else if (durationPref === '75') standardOpLengthSec = 75;
      else if (durationPref === '85') standardOpLengthSec = 85;
      else if (durationPref === '90') standardOpLengthSec = 90;

      // Anime OP fallbacks
      if (!intro) {
        intro = { start: 15, end: Math.min(dur - 60, 15 + standardOpLengthSec) };
      }

      // Anime ED fallbacks
      if (!outro) {
        outro = { start: Math.max(intro ? intro.end + 60 : 60, dur - standardOpLengthSec - 5), end: Math.max(0, dur - 5) };
      }

      return { intro, outro };
    }

    function updateTimelineMarkers() {
      const introMarker = document.getElementById('timeline-intro-marker');
      const outroMarker = document.getElementById('timeline-outro-marker');
      if (!introMarker && !outroMarker) return;

      if (!mainVideo || isNaN(mainVideo.duration) || mainVideo.duration < 120) {
        if (introMarker) introMarker.style.display = 'none';
        if (outroMarker) outroMarker.style.display = 'none';
        return;
      }

      if (!detectedIntroOutro.intro && !detectedIntroOutro.outro) {
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
      if (!detectedIntroOutro.intro || !mainVideo) return;
      preSkipTime = mainVideo.currentTime;
      mainVideo.currentTime = detectedIntroOutro.intro.end;
      const skipBtn = document.getElementById('skip-intro-btn');
      if (skipBtn) skipBtn.classList.add('hidden');
      showUndoSkipToast();
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

      const curIndex = siblingEpisodes.findIndex(e => e.id === episodeId);
      if (curIndex < 0 || curIndex >= siblingEpisodes.length - 1) return;
      const nextEp = siblingEpisodes[curIndex + 1];

      if (thumbEl) {
        thumbEl.src = resolveAssetUrl(currentEpisode?.show?.poster) || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500';
      }
      if (titleEl) {
        titleEl.textContent = `Episode ${nextEp.episodeNumber}: ${nextEp.title}`;
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
      if (!detectedIntroOutro.intro || !detectedIntroOutro.outro) {
        detectedIntroOutro = computeIntroOutroWindows();
      }
      const { intro, outro } = detectedIntroOutro;
      if (!intro || !outro) return;

      // 1. INTRO WINDOW
      const skipIntroFloatingBtn = document.getElementById('skip-intro-btn');
      if (currentTime >= intro.start && currentTime < intro.end) {
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
      }

      // 2. OUTRO WINDOW
      if (currentTime >= outro.start && currentTime <= outro.end) {
        const curIndex = siblingEpisodes.findIndex(e => e.id === episodeId);
        const hasNext = curIndex >= 0 && curIndex < siblingEpisodes.length - 1;
        const autoSkipOutroSetting = localStorage.getItem('@infinx_auto_skip_outro');
        const autoSkipOutroEnabled = autoSkipOutroSetting === null || autoSkipOutroSetting === 'true';
        if (hasNext && autoSkipOutroEnabled && !outroCountdownActive && !outroDismissed) {
          startOutroCountdown();
        }
      } else if (currentTime < outro.start) {
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
      const isOpen = typeof open === 'boolean' ? open : !inPlayerEpisodeDrawer.classList.contains('active');
      inPlayerEpisodeDrawer.classList.toggle('active', isOpen);
      inPlayerEpisodeDrawer.setAttribute('aria-hidden', (!isOpen).toString());
      if (isOpen) {
        try {
          const rawProg = localStorage.getItem(`@infinx_episodes_progress_${showId}`);
          updateSeriesProgressUI(rawProg ? JSON.parse(rawProg) : null);
        } catch (e) { }
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

        updateBufferBar();
        reportPlaybackProgress();
        handleSmartIntroOutro(mainVideo.currentTime, mainVideo.duration);
        updateTimelineMarkers();
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
        mainVideo.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      } else {
        mainVideo.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
    }

    playPauseBtn.addEventListener('click', togglePlayPause);

    // Mobile & Desktop Double-Tap Seek and Touch Control listeners
    let lastLeftTapTime = 0;
    let lastRightTapTime = 0;
    let singleTapTimeout = null;

    const touchLeft = document.querySelector('.touch-left');
    const touchCenter = document.querySelector('.touch-center');
    const touchRight = document.querySelector('.touch-right');

    if (touchLeft) {
      touchLeft.addEventListener('click', function (e) {
        e.stopPropagation();
        const now = Date.now();
        if (now - lastLeftTapTime < 380) {
          clearTimeout(singleTapTimeout);
          lastLeftTapTime = 0;
          handleDoubleSeek('rewind');
        } else {
          lastLeftTapTime = now;
          singleTapTimeout = setTimeout(() => {
            showControls();
          }, 320);
        }
      });
    }

    if (touchRight) {
      touchRight.addEventListener('click', function (e) {
        e.stopPropagation();
        const now = Date.now();
        if (now - lastRightTapTime < 380) {
          clearTimeout(singleTapTimeout);
          lastRightTapTime = 0;
          handleDoubleSeek('forward');
        } else {
          lastRightTapTime = now;
          singleTapTimeout = setTimeout(() => {
            showControls();
          }, 320);
        }
      });
    }

    if (touchCenter) {
      touchCenter.addEventListener('click', function (e) {
        e.stopPropagation();
        togglePlayPause();
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
      if (autoNextCheckbox && autoNextCheckbox.checked) {
        playNextVideo();
      }
    });

    // Sibling-based Next/Prev Episode navigation
    function playPreviousVideo() {
      const curIndex = siblingEpisodes.findIndex(e => e.id === episodeId);
      if (curIndex > 0) {
        const prevEp = siblingEpisodes[curIndex - 1];
        window.location.href = `/video-player/index.html?episodeId=${prevEp.id}`;
      } else {
        alert('This is the first episode!');
      }
    }

    function playNextVideo() {
      const curIndex = siblingEpisodes.findIndex(e => e.id === episodeId);
      if (curIndex >= 0 && curIndex < siblingEpisodes.length - 1) {
        const nextEp = siblingEpisodes[curIndex + 1];
        window.location.href = `/video-player/index.html?episodeId=${nextEp.id}`;
      } else {
        alert('This is the final episode!');
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
      if (!checkIsLoggedIn()) {
        mainVideo.pause();
        showPlayerAuthLock();
        return;
      }
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });

    mainVideo.addEventListener('pause', function () {
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });

    // Robust Volume Controls for PC and Mobile/Android
    const volumeContainer = document.querySelector('.volume-container');

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

    if (volumeBtn) {
      volumeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (mainVideo.muted || mainVideo.volume === 0) {
          mainVideo.muted = false;
          if (mainVideo.volume === 0) mainVideo.volume = 1;
        } else {
          mainVideo.muted = true;
        }
        updateVolumeUI();
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', function (e) {
        e.stopPropagation();
        const val = parseFloat(this.value) / 100;
        mainVideo.volume = val;
        mainVideo.muted = (val === 0);
        updateVolumeUI();
      });

      volumeSlider.addEventListener('change', function (e) {
        e.stopPropagation();
        const val = parseFloat(this.value) / 100;
        mainVideo.volume = val;
        mainVideo.muted = (val === 0);
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
        closeSettingsDropdown();
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
        closeSettingsDropdown();
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
        closeSettingsDropdown();
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

    function hideControls() {
      const modalActive = document.getElementById('caption-settings-modal')?.classList.contains('active');
      const drawerActive = document.getElementById('in-player-episode-drawer')?.classList.contains('active');
      if (isFullscreen && !isSettingsMenuOpen && !modalActive && !drawerActive) {
        document.querySelector('.custom-controls').classList.add('hidden');
        document.querySelector('.video-overlay').classList.add('hidden');
      }
    }

    function showControls() {
      clearTimeout(hideControlsTimeout);
      document.querySelector('.custom-controls').classList.remove('hidden');
      document.querySelector('.video-overlay').classList.remove('hidden');
      if (isFullscreen) {
        hideControlsTimeout = setTimeout(hideControls, 5000);
      }
    }

    function handleFullscreenChange() {
      isFullscreen = !!(document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement);

      if (isFullscreen) {
        lockLandscapeOrientation();
        if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        showControls();
        videoPlayer.addEventListener('mousemove', handleMouseMove);
        videoPlayer.addEventListener('touchstart', handleMouseMove);
      } else {
        unlockOrientation();
        if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        clearTimeout(hideControlsTimeout);
        videoPlayer.removeEventListener('mousemove', handleMouseMove);
        videoPlayer.removeEventListener('touchstart', handleMouseMove);
        document.querySelector('.custom-controls').classList.remove('hidden');
        document.querySelector('.video-overlay').classList.remove('hidden');
      }
    }

    function handleMouseMove() {
      showControls();
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    mainVideo.addEventListener('timeupdate', updateTime);

    function positionSettingsDropdown() {
      if (!settingsDropdown || !videoPlayer) return;
      settingsDropdown.style.right = '';
      const playerRect = videoPlayer.getBoundingClientRect();
      const menuRect = settingsDropdown.getBoundingClientRect();
      if (menuRect.left < playerRect.left + 8) {
        const overflow = (playerRect.left + 8) - menuRect.left;
        settingsDropdown.style.right = `-${overflow}px`;
      } else if (menuRect.right > playerRect.right - 8) {
        const overflow = menuRect.right - (playerRect.right - 8);
        settingsDropdown.style.right = `${overflow}px`;
      }
    }

    // Settings dropdown clicks
    if (settingsBtn) settingsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      isSettingsMenuOpen = !isSettingsMenuOpen;
      if (settingsMenu) settingsMenu.classList.toggle('active', isSettingsMenuOpen);

      const controls = document.querySelector('.custom-controls');
      if (controls) {
        controls.classList.toggle('settings-open', isSettingsMenuOpen);
      }

      if (isSettingsMenuOpen) {
        showControls();
        positionSettingsDropdown();
      }

      closeAllDropdowns();
    });

    document.addEventListener('click', function (event) {
      if (isSettingsMenuOpen && !settingsMenu.contains(event.target) && !settingsBtn.contains(event.target)) {
        closeSettingsDropdown();
      }
      if (!event.target.closest('.server-selector') &&
        !event.target.closest('.quality-selector') &&
        !event.target.closest('.audio-selector') &&
        !event.target.closest('.subtitle-selector') &&
        !event.target.closest('.playback-speed-selector') &&
        !event.target.closest('.settings-menu')) {
        closeAllDropdowns();
      }
    });

    document.querySelectorAll('.server-btn, .quality-btn, .audio-btn, .speed-btn').forEach(btn => {
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

    const subtitleBtn = document.querySelector('.subtitle-btn');
    if (subtitleBtn) {
      subtitleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!subtitleTracks || subtitleTracks.length === 0) {
          showPlayerToast('No Subtitles Available');
          return;
        }
        if (currentSubtitleTrack === -1) {
          setSubtitle(0);
        } else if (currentSubtitleTrack < subtitleTracks.length - 1) {
          setSubtitle(currentSubtitleTrack + 1);
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
        closeSettingsDropdown();
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
      const audioContainer = document.getElementById('audio-track-list');
      if (audioContainer) {
        audioContainer.addEventListener('click', function (e) {
          const option = e.target.closest('.audio-option');
          if (!option) return;
          e.stopPropagation();
          setAudioTrack(parseInt(option.getAttribute('data-audio-index')));
        });
      }
      const audioDropdown = document.getElementById('audio-dropdown');
      if (audioDropdown) {
        audioDropdown.addEventListener('click', function (e) {
          const option = e.target.closest('.audio-option');
          if (!option) return;
          e.stopPropagation();
          setAudioTrack(parseInt(option.getAttribute('data-audio-index')));
        });
      }
    }

    function setupSubtitleEventListeners() {
      const subtitleBtn = document.querySelector('.subtitle-btn');
      if (subtitleBtn) {
        subtitleBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (currentSubtitleTrack >= 0) {
            setSubtitle(-1);
          } else {
            if (subtitleTracks && subtitleTracks.length > 0) {
              setSubtitle(0);
            } else {
              showPlayerToast('No Subtitles Available');
            }
          }
        });
      }

      function handleSubtitleClick(e) {
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
        closeSettingsDropdown();
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

      // 1. Initial State from localStorage
      const introPref = localStorage.getItem('@infinx_auto_skip_intro');
      if (introCheckbox) {
        introCheckbox.checked = introPref === null || introPref === 'true';
        introCheckbox.addEventListener('change', function () {
          localStorage.setItem('@infinx_auto_skip_intro', introCheckbox.checked ? 'true' : 'false');
          showPlayerToast(introCheckbox.checked ? 'Auto-Skip Intro: Enabled' : 'Auto-Skip Intro: Disabled');
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
          if (!outroCheckbox.checked && outroCountdownActive) {
            cancelOutroCountdown();
          }
        });
      }

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

    function setupSettingsPanelTabs() {
      const tabs = document.querySelectorAll('.settings-tab-btn');
      const contents = document.querySelectorAll('.settings-tab-content');
      const closeBtn = document.getElementById('settings-panel-close-btn');

      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          closeSettingsDropdown();
        });
      }

      tabs.forEach(tab => {
        tab.addEventListener('click', function (e) {
          e.stopPropagation();
          const targetTab = this.getAttribute('data-tab');
          tabs.forEach(t => t.classList.remove('active'));
          contents.forEach(c => c.classList.remove('active'));
          this.classList.add('active');
          const targetContent = document.getElementById(`tab-content-${targetTab}`);
          if (targetContent) {
            targetContent.classList.add('active');
          }
        });
      });
    }

    // Call dropdown listeners setup
    setupQualityEventListeners();
    setupAudioEventListeners();
    setupSubtitleEventListeners();
    setupAutoSkipEventListeners();
    setupSettingsPanelTabs();

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
        return url;
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
            .map(c => `<span class="tag" onclick="window.location.href='/view.html#${c.category.slug}'">${c.category.name}</span>`)
            .join('');
        } else {
          tagsContainer.innerHTML = '';
        }
      }

      // Update views count dynamically
      const viewsEl = document.querySelector('.views');
      if (viewsEl) {
        viewsEl.innerHTML = `<i class="fas fa-eye"></i> ${currentEpisode.views?.toLocaleString() || '0'} views`;
      }

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
        if (descriptionText) descriptionText.textContent = currentEpisode.show?.description || '';
        return;
      }

      playlistContainer.innerHTML = '';
      const drawerEpisodesList = document.getElementById('drawer-episodes-list');
      if (drawerEpisodesList) drawerEpisodesList.innerHTML = '';

      // Update UI title and description for current playing episode
      if (videoTitle) videoTitle.textContent = currentEpisode.title;
      if (episodeElement) episodeElement.textContent = `Episode ${currentEpisode.episodeNumber}`;
      const descriptionText = document.querySelector('.description-text');
      if (descriptionText) descriptionText.textContent = currentEpisode.show?.description || '';

      const totalEpisodes = siblingEpisodes.length;
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

      // Load all sibling episodes
      siblingEpisodes.forEach((ep) => {
        const epProg = (showProgData.episodes && showProgData.episodes[ep.id]) || null;
        const isCurrentActive = ep.id === episodeId;
        const isCompleted = epProg?.completed;
        const isInProgress = epProg && epProg.positionSeconds > 10 && !isCompleted;

        const fallbackPoster = resolveAssetUrl(currentEpisode.show?.poster) || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500';

        let badgeHtml = '';
        let progressTrackHtml = '';

        if (isCurrentActive) {
          badgeHtml = '<div class="item-status"><span class="item-watched"><i class="fas fa-play-circle"></i> Watching</span></div>';
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
            <div class="item-duration">Ep ${ep.episodeNumber}</div>
            ${progressTrackHtml}
          </div>
          <div class="item-info">
            <h4 class="item-title">Episode ${ep.episodeNumber}: ${ep.title}</h4>
            <div class="item-meta">
              <span class="item-duration">${ep.duration || '24m'} • HD Streaming</span>
            </div>
            ${badgeHtml}
          </div>
        `;

        const playAction = function () {
          const seekParam = (epProg && epProg.positionSeconds > 10 && !epProg.completed) ? `&t=${epProg.positionSeconds}` : '';
          window.location.href = `/video-player/index.html?episodeId=${ep.id}${seekParam}`;
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

    async function loadComments() {
      try {
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/comments/episode/${episodeId}`, { headers });
        if (res.status === 401) {
          localStorage.clear();
          window.location.reload();
          return;
        }
        if (res.ok) {
          commentsData = await res.json();
          renderCommentsList();
        } else {
          console.error('Failed to load comments');
        }
      } catch (error) {
        console.error('Error loading comments:', error);
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
                const res = await fetch(`${API_BASE}/comments/episode/${episodeId}`, {
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
        const res = await fetch(`${API_BASE}/comments/episode/${episodeId}`, {
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
        case 'arrowleft':
          e.preventDefault();
          mainVideo.currentTime = Math.max(0, mainVideo.currentTime - 10);
          break;
        case 'arrowright':
          e.preventDefault();
          if (mainVideo.duration && !isNaN(mainVideo.duration)) {
            mainVideo.currentTime = Math.min(mainVideo.duration, mainVideo.currentTime + 10);
          }
          break;
        case 'arrowup':
          e.preventDefault();
          mainVideo.volume = Math.min(1, mainVideo.volume + 0.1);
          if (volumeSlider) volumeSlider.value = mainVideo.volume * 100;
          break;
        case 'arrowdown':
          e.preventDefault();
          mainVideo.volume = Math.max(0, mainVideo.volume - 0.1);
          if (volumeSlider) volumeSlider.value = mainVideo.volume * 100;
          break;
        case 'n':
          e.preventDefault();
          playNextVideo();
          break;
        case 'p':
          e.preventDefault();
          playPreviousVideo();
          break;
        case 'escape':
          e.preventDefault();
          closeSettingsDropdown();
          break;
      }
    });

    // Initialize
    function initializePlayer() {
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

    function startAuthenticatedPlayback() {
      updateServerOptions();
      const initialServer = (availableServers && availableServers.find(s => s.id === activeServerId)) || (availableServers && availableServers[0]) || null;
      const initialVideoUrl = initialServer ? initialServer.url : (currentEpisode.videoUrl || null);
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
    }

    function populateControls(s) {
      if (fontSizePreset) fontSizePreset.value = s.fontSize || defaults.fontSize;
      if (textColorPreset) textColorPreset.value = s.textColor || defaults.textColor;
      if (backdropPreset) backdropPreset.value = s.backdropStyle || defaults.backdropStyle;
      if (positionPreset) positionPreset.value = s.position || defaults.position;
    }

    function closeModal() {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }

    const initial = loadSettings();
    applyCaptionSettings(initial);
    populateControls(initial);

    if (openBtn) {
      openBtn.addEventListener('click', function (e) {
        e.stopPropagation();

        // Close settings dropdown if open
        const settingsMenu = document.querySelector('.settings-menu');
        if (settingsMenu) settingsMenu.classList.remove('active');
        const controls = document.querySelector('.custom-controls');
        if (controls) {
          controls.classList.remove('settings-open');
          controls.classList.remove('hidden');
        }

        // In fullscreen mode, ensure modal is inside the active fullscreen element
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
        const targetParent = fsEl || document.querySelector('.video-player') || document.body;
        if (modal.parentElement !== targetParent) {
          targetParent.appendChild(modal);
        }

        const cur = loadSettings();
        populateControls(cur);
        applyCaptionSettings(cur);

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
      });
    }

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
