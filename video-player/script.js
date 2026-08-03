// Android-fix removed; using standard player logic below
// script.js - Dynamic HLS Video Player with Multiple Audio Tracks and API Sync
window.addEventListener('error', function(e) {
  try { console.error('Unhandled error:', e.message, e.error || e); } catch (err) {}
});
window.addEventListener('unhandledrejection', function(e) {
  try { console.error('Unhandled promise rejection:', e.reason); } catch (err) {}
});

document.addEventListener('DOMContentLoaded', async function() {
  try {
    const API_BASE = '/api';
    
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
    const progressBar = document.querySelector('.progress');
    const progressBarContainer = document.querySelector('.progress-bar');
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
    
    // Auth helpers
    const token = localStorage.getItem('infinx_token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    // Load dynamic episode data
    let currentEpisode = null;
    let siblingEpisodes = [];
    let showId = null;

    try {
      // 1. Fetch current episode info
      const epRes = await fetch(`${API_BASE}/shows/episodes/${episodeId}`);
      if (!epRes.ok) throw new Error('Episode not found');
      currentEpisode = await epRes.json();
      showId = currentEpisode.showId;
      
      // 2. Fetch parent show details to get siblings list
      const showRes = await fetch(`${API_BASE}/shows/${showId}`);
      if (showRes.ok) {
        const showData = await showRes.json();
        siblingEpisodes = showData.episodes || [];
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load anime metadata from server.');
      window.location.href = '/index.html';
      return;
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
    
    // Initialize HLS
    function initHLS(videoSrc) {
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
            <div style="font-size: 5rem; margin-bottom: 20px; color: var(--primary); animation: fa-spin 4s linear infinite;"><i class="fas fa-cog"></i></div>
            <h2 style="font-size: 2.2rem; font-family: 'Outfit'; color: white; margin-bottom: 10px;">HLS Transcoding in Progress...</h2>
            <p style="font-size: 1.4rem; color: var(--gray-text); max-width: 400px; line-height: 1.6;">Our background workers are currently parsing audio tracks and rendering HLS master playlists. Please check back in a moment!</p>
          `;
          container.appendChild(overlay);
        }
        return;
      }

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
      parseMasterPlaylist(videoSrc);

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
          lowLatencyMode: true,
          backBufferLength: 90,
          startLevel: -1, // Auto
          capLevelToPlayerSize: true,
        });
        
        hls.loadSource(videoSrc);
        hls.attachMedia(mainVideo);
        
        hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
          videoPlayer.classList.remove('loading');
          qualities = data.levels || [];
          updateQualityOptions();
          
          if (hls.audioTracks && hls.audioTracks.length > 0) {
            audioTracks = hls.audioTracks;
            updateAudioOptions();
            hls.audioTrack = 0;
            currentAudioTrack = 0;
            updateAudioDisplay(0);
          } else {
            updateAudioOptions();
          }
          
          if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
            subtitleTracks = hls.subtitleTracks;
            updateSubtitleOptions();
          } else {
            updateSubtitleOptions();
          }
          
          // Resume saved progress if any
          resumeSavedProgress();

          mainVideo.play().catch(e => {
            console.log("Autoplay prevented:", e);
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
          });
        });
        
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, function(event, data) {
          if (data.audioTracks && data.audioTracks.length > 0) {
            audioTracks = data.audioTracks;
            updateAudioOptions();
            
            // Sync active selection state
            const activeIndex = hls.audioTrack;
            if (activeIndex >= 0 && activeIndex < audioTracks.length) {
              currentAudioTrack = activeIndex;
              updateAudioDisplay(activeIndex);
              document.querySelectorAll('.audio-option').forEach(option => {
                option.classList.remove('active');
                const optionIndex = parseInt(option.getAttribute('data-audio-index'));
                if (optionIndex === activeIndex) {
                  option.classList.add('active');
                }
              });
            }
          }
        });

        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, function(event, data) {
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
        
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, function(event, data) {
          if (data.subtitleTracks && data.subtitleTracks.length > 0) {
            subtitleTracks = data.subtitleTracks || hls.subtitleTracks || [];
            updateSubtitleOptions();
          }
        });
        
        hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, function(event, data) {
          currentSubtitleTrack = data.id;
          document.querySelectorAll('.subtitle-option').forEach(option => {
            option.classList.remove('active');
            const optionIndex = option.getAttribute('data-subtitle');
            if (parseInt(optionIndex) === data.id) {
              option.classList.add('active');
            }
          });
        });
        
        hls.on(Hls.Events.ERROR, function(event, data) {
          console.error('HLS error:', data);
          videoPlayer.classList.remove('loading');
          
          if (data.fatal) {
            switch(data.type) {
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
        mainVideo.src = videoSrc;
        mainVideo.addEventListener('loadedmetadata', function() {
          videoPlayer.classList.remove('loading');
          resumeSavedProgress();
          
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
    async function resumeSavedProgress() {
      if (!token) return;
      try {
        const historyRes = await fetch(`${API_BASE}/user/history`, { headers: authHeaders });
        if (historyRes.ok) {
          const historyList = await historyRes.json();
          const savedProgress = historyList.find(h => h.episodeId === episodeId);
          if (savedProgress && savedProgress.progress > 5) {
            console.log(`Resuming playback from: ${savedProgress.progress}s`);
            mainVideo.currentTime = savedProgress.progress;
          }
        }
      } catch (err) {
        console.warn('Could not restore saved progress:', err);
      }
    }

    // Periodically post progress updates to API
    async function reportPlaybackProgress() {
      if (!token || isNaN(mainVideo.duration) || mainVideo.duration <= 0) return;
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
        const autoOption = settingsQualitySection.querySelector('.quality-option[data-quality="auto"]');
        if (autoOption) {
          settingsQualitySection.innerHTML = '';
          settingsQualitySection.appendChild(autoOption.cloneNode(true));
        }
      }
      
      const autoOption = document.createElement('div');
      autoOption.className = 'quality-option active';
      autoOption.setAttribute('data-quality', 'auto');
      autoOption.textContent = 'Auto';
      qualityDropdown.appendChild(autoOption);
      
      qualities.forEach((level, index) => {
        const option = document.createElement('div');
        option.className = 'quality-option';
        option.setAttribute('data-quality', index);
        option.textContent = level.height + 'p';
        qualityDropdown.appendChild(option);
        
        if (settingsQualitySection) {
          const settingsOption = document.createElement('div');
          settingsOption.className = 'quality-option';
          settingsOption.setAttribute('data-quality', index);
          settingsOption.textContent = level.height + 'p';
          settingsQualitySection.appendChild(settingsOption);
        }
      });
    }
    
    function getFriendlyLanguageName(langCode) {
      if (!langCode) return null;
      const cleanCode = langCode.toLowerCase().trim();
      const languageMap = {
        'hin': 'Hindi',
        'hi': 'Hindi',
        'eng': 'English',
        'en': 'English',
        'jpn': 'Japanese',
        'ja': 'Japanese',
        'jp': 'Japanese',
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
        if (track.name && !track.name.toLowerCase().includes('vegamovies') && track.name !== langCode) {
          return `${friendlyLang} (${track.name})`;
        }
        return friendlyLang;
      }
      return track.name || (isSub ? `Subtitle ${fallbackIndex + 1}` : `Track ${fallbackIndex + 1}`);
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
          const audioOption = document.createElement('div');
          audioOption.className = `audio-option ${index === 0 ? 'active' : ''}`;
          audioOption.setAttribute('data-audio-index', index);
          audioOption.innerHTML = `<i class="fas fa-volume-up"></i> ${getTrackDisplayName(track, index, false)}`;
          audioDropdown.appendChild(audioOption);
          
          const settingsAudioOption = document.createElement('div');
          settingsAudioOption.className = `audio-option ${index === 0 ? 'active' : ''}`;
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
      
      const firstLabel = audioTracks[0] ? getTrackDisplayName(audioTracks[0], 0, false) : 'Default Stream';
      document.querySelector('.current-audio').textContent = firstLabel;
      document.querySelector('.current-audio-display').innerHTML = `<i class="fas fa-volume-up"></i> ${firstLabel}`;
    }
    
    // Close all dropdowns
    function closeAllDropdowns() {
      document.querySelectorAll('.quality-dropdown, .audio-dropdown, .subtitle-dropdown, .speed-dropdown').forEach(dropdown => {
        dropdown.style.display = 'none';
      });
      document.querySelectorAll('.quality-selector, .audio-selector, .subtitle-selector, .playback-speed-selector').forEach(selector => {
        selector.classList.remove('active');
      });
    }
    
    // Close settings dropdown
    function closeSettingsDropdown() {
      isSettingsMenuOpen = false;
      if (settingsMenu) settingsMenu.classList.remove('active');
      const controls = document.querySelector('.custom-controls');
      if (controls) {
        controls.classList.remove('settings-open');
      }
    }
    
    // Set video quality
    function setQuality(qualityLevel) {
      if (hls) {
        if (qualityLevel === 'auto') {
          hls.currentLevel = -1;
          document.querySelectorAll('.current-quality').forEach(el => { el.textContent = 'Auto'; });
        } else {
          hls.currentLevel = qualityLevel;
          const quality = qualities[qualityLevel];
          document.querySelectorAll('.current-quality').forEach(el => { el.textContent = quality.height + 'p'; });
        }
        
        document.querySelectorAll('.quality-option').forEach(option => {
          option.classList.remove('active');
          const optionQuality = option.getAttribute('data-quality');
          if ((qualityLevel === 'auto' && optionQuality === 'auto') || 
              (qualityLevel !== 'auto' && parseInt(optionQuality) === qualityLevel)) {
            option.classList.add('active');
          }
        });
        
        closeAllDropdowns();
        closeSettingsDropdown();
      }
    }
    
    // Update audio display
    function updateAudioDisplay(trackIndex) {
      const trackName = audioTracks[trackIndex] ? getTrackDisplayName(audioTracks[trackIndex], trackIndex, false) : 'Default Stream';
      document.querySelector('.current-audio').textContent = trackName;
      document.querySelector('.current-audio-display').innerHTML = `<i class="fas fa-volume-up"></i> ${trackName}`;
    }
    
    // Set audio track
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
      const captionOverlay = document.getElementById('caption-overlay') || createCaptionOverlay();

      function createCaptionOverlay() {
        const el = document.createElement('div');
        el.id = 'caption-overlay';
        el.className = 'caption-overlay hidden';
        const vp = document.querySelector('.video-player');
        if (vp) vp.appendChild(el);
        return el;
      }

      function showCaption(text) {
        if (!captionOverlay) return;
        captionOverlay.classList.remove('hidden');
        captionOverlay.innerHTML = `<div class="caption-text">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
      }

      function hideCaption() {
        if (!captionOverlay) return;
        captionOverlay.classList.add('hidden');
        captionOverlay.innerHTML = '';
      }

      function escapeHtml(s) {
        return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      }

      function detachAllTextTrackListeners() {
        if (!mainVideo.textTracks) return;
        for (let i = 0; i < mainVideo.textTracks.length; i++) {
          try { mainVideo.textTracks[i].oncuechange = null; } catch(e) {}
        }
      }

      function attachTextTrackForOverlay(track) {
        if (!track) return;
        try { track.mode = 'hidden'; } catch(e) {}
        track.oncuechange = function() {
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

      if (trackIndex === -1 || trackIndex === 'off') {
        if (hls && typeof hls.subtitleTrack !== 'undefined') {
          try { hls.subtitleTrack = -1; } catch(e) {}
        }
        if (mainVideo.textTracks) {
          for (let i = 0; i < mainVideo.textTracks.length; i++) {
            try { mainVideo.textTracks[i].mode = 'hidden'; } catch(e) {}
            try { mainVideo.textTracks[i].oncuechange = null; } catch(e) {}
          }
        }
        removeCustomTrackElement();
        hideCaption();
        currentSubtitleTrack = -1;
        document.querySelectorAll('.current-subtitle').forEach(el => { el.textContent = 'Off'; });
      } else if (subtitleTracks && subtitleTracks[trackIndex]) {
        const trackInfo = subtitleTracks[trackIndex];

        if (hls && trackInfo && trackInfo.url) {
          removeCustomTrackElement();
          const tEl = document.createElement('track');
          tEl.kind = 'subtitles';
          tEl.src = trackInfo.url;
          tEl.srclang = trackInfo.lang || trackInfo.srclang || 'en';
          tEl.label = trackInfo.name || `Subtitle ${trackIndex + 1}`;
          tEl.id = 'custom-subtitle-track';
          tEl.default = false;
          mainVideo.appendChild(tEl);

          setTimeout(function() {
            const tracks = mainVideo.textTracks;
            if (tracks && tracks.length > 0) {
              let tt = null;
              for (let i = 0; i < tracks.length; i++) {
                if (tracks[i].label === tEl.label) { tt = tracks[i]; break; }
              }
              if (!tt) tt = tracks[tracks.length - 1];
              detachAllTextTrackListeners();
              attachTextTrackForOverlay(tt);
            }
          }, 500);
        } else if (mainVideo.textTracks && mainVideo.textTracks[trackIndex]) {
          detachAllTextTrackListeners();
          attachTextTrackForOverlay(mainVideo.textTracks[trackIndex]);
        } else if (hls && typeof hls.subtitleTrack !== 'undefined') {
          try { hls.subtitleTrack = trackIndex; } catch(e) {}
          setTimeout(function() {
            if (mainVideo.textTracks && mainVideo.textTracks.length > 0) {
              detachAllTextTrackListeners();
              attachTextTrackForOverlay(mainVideo.textTracks[mainVideo.textTracks.length - 1]);
            }
          }, 500);
        }

        currentSubtitleTrack = trackIndex;
        const trackName = getTrackDisplayName(subtitleTracks[trackIndex], trackIndex, true);
        document.querySelectorAll('.current-subtitle').forEach(el => { el.textContent = trackName; });
      }

      document.querySelectorAll('.subtitle-option').forEach(option => {
        option.classList.remove('active');
        const optionIndex = option.getAttribute('data-subtitle');
        if ((trackIndex === -1 || trackIndex === 'off') && optionIndex === 'off') {
          option.classList.add('active');
        } else if (parseInt(optionIndex) === trackIndex) {
          option.classList.add('active');
        }
      });

      closeAllDropdowns();
      closeSettingsDropdown();
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
    
    // Update video time
    function updateTime() {
      if (!isNaN(mainVideo.duration) && mainVideo.duration > 0) {
        currentTimeEl.textContent = formatTime(mainVideo.currentTime);
        durationEl.textContent = formatTime(mainVideo.duration);
        
        const progressPercent = (mainVideo.currentTime / mainVideo.duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
        
        // Report progress to DB
        reportPlaybackProgress();
      }
    }
    
    // Update hover time on progress bar
    function updateHoverTime(e) {
      if (isNaN(mainVideo.duration) || mainVideo.duration <= 0) return;
      
      const progressBarWidth = progressBarContainer.clientWidth;
      const rect = progressBarContainer.getBoundingClientRect();
      const clickPosition = e.clientX - rect.left;
      const hoverTime = (clickPosition / progressBarWidth) * mainVideo.duration;
      
      progressHoverTime.textContent = formatTime(hoverTime);
      const percent = Math.min(Math.max((clickPosition / progressBarWidth) * 100, 0), 100);
      progressHoverTime.style.left = `${percent}%`;
    }
    
    // Play/Pause functionality
    function togglePlayPause() {
      if (mainVideo.paused) {
        mainVideo.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      } else {
        mainVideo.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
    }
    
    playPauseBtn.addEventListener('click', togglePlayPause);
    
    // Mobile touch controls
    mobileTouchControls.forEach(control => {
      control.addEventListener('click', function(e) {
        e.stopPropagation();
        const action = this.getAttribute('data-action');
        
        switch(action) {
          case 'play-pause':
            togglePlayPause();
            break;
          case 'rewind':
            mainVideo.currentTime = Math.max(0, mainVideo.currentTime - 10);
            break;
          case 'forward':
            mainVideo.currentTime = Math.min(mainVideo.duration, mainVideo.currentTime + 10);
            break;
        }
        
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        setTimeout(() => {
          this.style.backgroundColor = '';
        }, 200);
      });
    });
    
    // Video end handler for auto-next
    mainVideo.addEventListener('ended', function() {
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
      try { updateTime(); } catch (e) {}
    }
  
    if (rewind10Btn) {
      rewind10Btn.addEventListener('click', function() { seekBy(-10); });
    }
  
    if (forward10Btn) {
      forward10Btn.addEventListener('click', function() { seekBy(10); });
    }
    
    mainVideo.addEventListener('play', function() {
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });
    
    mainVideo.addEventListener('pause', function() {
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
    
    // Volume controls
    if (volumeBtn) volumeBtn.addEventListener('click', function() {
      if (mainVideo.volume > 0) {
        mainVideo.volume = 0;
        volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        if (volumeSlider) volumeSlider.value = 0;
      } else {
        mainVideo.volume = 1;
        volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        if (volumeSlider) volumeSlider.value = 100;
      }
    });
    
    if (volumeSlider) volumeSlider.addEventListener('input', function() {
      const volume = volumeSlider.value / 100;
      mainVideo.volume = volume;
      
      if (volume === 0) {
        if (volumeBtn) volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
      } else if (volume < 0.5) {
        if (volumeBtn) volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
      } else {
        if (volumeBtn) volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      }
    });
    
    if (!isMobile) {
      if (volumeBtn) volumeBtn.addEventListener('mouseenter', function() {
        if (volumeSlider) volumeSlider.style.display = 'block';
      });
      if (volumeBtn) volumeBtn.addEventListener('mouseleave', function(e) {
        if (!volumeBtn.matches(':hover') && !volumeSlider.matches(':hover')) {
          if (volumeSlider) volumeSlider.style.display = 'none';
        }
      });
      if (volumeSlider) volumeSlider.addEventListener('mouseleave', function() {
        if (!volumeBtn.matches(':hover')) {
          volumeSlider.style.display = 'none';
        }
      });
    } else {
      if (volumeBtn) volumeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (volumeSlider) volumeSlider.style.display = volumeSlider.style.display === 'block' ? 'none' : 'block';
      });
      document.addEventListener('click', function(e) {
        if (!volumeBtn.contains(e.target) && !volumeSlider.contains(e.target)) {
          if (volumeSlider) volumeSlider.style.display = 'none';
        }
      });
    }
    
    // Progress bar events
    if (progressBarContainer) {
      progressBarContainer.addEventListener('mousemove', updateHoverTime);
      progressBarContainer.addEventListener('touchmove', function(e) {
        if (isMobile) {
          const touch = e.touches[0];
          const fakeMouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
          });
          updateHoverTime(fakeMouseEvent);
        }
      });
      progressBarContainer.addEventListener('click', function(e) {
        if (isNaN(mainVideo.duration) || mainVideo.duration <= 0) return;
        const progressBarWidth = this.clientWidth;
        const rect = this.getBoundingClientRect();
        const clickPosition = (e.clientX || (e.touches && e.touches[0].clientX) || 0) - rect.left;
        const seekTime = (clickPosition / progressBarWidth) * mainVideo.duration;
        mainVideo.currentTime = seekTime;
      });
      progressBarContainer.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const fakeMouseEvent = new MouseEvent('click', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        this.dispatchEvent(fakeMouseEvent);
      });
    }
    
    // Screen Fit / Notch Fill Mode logic
    const fitScreenBtn = document.querySelector('.fit-screen-btn');
    const fitModes = ['cover', 'contain', 'fill'];
    let currentFitMode = localStorage.getItem('infinx_video_fit_mode') || 'cover';

    function setFitMode(mode) {
      if (!fitModes.includes(mode)) mode = 'cover';
      currentFitMode = mode;
      localStorage.setItem('infinx_video_fit_mode', mode);

      if (videoPlayer) {
        videoPlayer.classList.remove('fit-contain', 'fit-cover', 'fit-fill');
        videoPlayer.classList.add(`fit-${mode}`);
      }

      if (fitScreenBtn) {
        if (mode === 'cover') {
          fitScreenBtn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i>';
          fitScreenBtn.title = 'Fill Notch Screen (Cover)';
        } else if (mode === 'fill') {
          fitScreenBtn.innerHTML = '<i class="fas fa-arrows-alt"></i>';
          fitScreenBtn.title = 'Stretch Video';
        } else {
          fitScreenBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i>';
          fitScreenBtn.title = 'Fit to Screen (Contain)';
        }
      }

      document.querySelectorAll('.fit-option').forEach(option => {
        option.classList.toggle('active', option.getAttribute('data-fit') === mode);
      });
    }

    setFitMode(currentFitMode);

    if (fitScreenBtn) {
      fitScreenBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const currentIndex = fitModes.indexOf(currentFitMode);
        const nextIndex = (currentIndex + 1) % fitModes.length;
        setFitMode(fitModes[nextIndex]);
      });
    }

    document.querySelectorAll('.fit-option').forEach(option => {
      option.addEventListener('click', function(e) {
        e.stopPropagation();
        const mode = this.getAttribute('data-fit');
        setFitMode(mode);
        closeAllDropdowns();
        closeSettingsDropdown();
      });
    });

    // Fullscreen toggles
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', function() {
      if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        if (videoPlayer.requestFullscreen) videoPlayer.requestFullscreen();
        else if (videoPlayer.webkitRequestFullscreen) videoPlayer.webkitRequestFullscreen();
        else if (videoPlayer.msRequestFullscreen) videoPlayer.msRequestFullscreen();
        if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
        if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
      }
    });
    
    function hideControls() {
      if (isFullscreen) {
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
        showControls();
        videoPlayer.addEventListener('mousemove', handleMouseMove);
        videoPlayer.addEventListener('touchstart', handleMouseMove);
      } else {
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
    
    // Settings dropdown clicks
    if (settingsBtn) settingsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      isSettingsMenuOpen = !isSettingsMenuOpen;
      if (settingsMenu) settingsMenu.classList.toggle('active', isSettingsMenuOpen);
      
      const controls = document.querySelector('.custom-controls');
      if (controls) {
        controls.classList.toggle('settings-open', isSettingsMenuOpen);
      }
      
      closeAllDropdowns();
    });
    
    document.addEventListener('click', function(event) {
      if (isSettingsMenuOpen && !settingsMenu.contains(event.target) && !settingsBtn.contains(event.target)) {
        closeSettingsDropdown();
      }
      if (!event.target.closest('.quality-selector') && 
          !event.target.closest('.audio-selector') && 
          !event.target.closest('.subtitle-selector') &&
          !event.target.closest('.playback-speed-selector') &&
          !event.target.closest('.settings-menu')) {
        closeAllDropdowns();
      }
    });
    
    document.querySelectorAll('.quality-btn, .audio-btn, .subtitle-btn, .speed-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const dropdown = this.nextElementSibling;
        const isVisible = dropdown.style.display === 'block';
        
        closeAllDropdowns();
        closeSettingsDropdown();
        
        if (!isVisible) {
          dropdown.style.display = 'block';
          this.closest('.quality-selector, .audio-selector, .subtitle-selector, .playback-speed-selector').classList.add('active');
        }
      });
    });
    
    document.querySelectorAll('.speed-option').forEach(option => {
      option.addEventListener('click', function(e) {
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
        qualityDropdown.addEventListener('click', function(e) {
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
        settingsQualitySection.addEventListener('click', function(e) {
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
        audioContainer.addEventListener('click', function(e) {
          const option = e.target.closest('.audio-option');
          if (!option) return;
          e.stopPropagation();
          setAudioTrack(parseInt(option.getAttribute('data-audio-index')));
        });
      }
      const audioDropdown = document.getElementById('audio-dropdown');
      if (audioDropdown) {
        audioDropdown.addEventListener('click', function(e) {
          const option = e.target.closest('.audio-option');
          if (!option) return;
          e.stopPropagation();
          setAudioTrack(parseInt(option.getAttribute('data-audio-index')));
        });
      }
    }
    
    function setupSubtitleEventListeners() {
      const subtitleContainer = document.querySelector('.subtitle-options');
      if (subtitleContainer) {
        subtitleContainer.addEventListener('click', function(e) {
          const option = e.target.closest('.subtitle-option');
          if (!option) return;
          e.stopPropagation();
          const subtitle = option.getAttribute('data-subtitle');
          if (subtitle === 'off') setSubtitle(-1);
          else setSubtitle(parseInt(option.getAttribute('data-track-index')));
        });
      }
      const subtitleDropdown = document.getElementById('subtitle-dropdown');
      if (subtitleDropdown) {
        subtitleDropdown.addEventListener('click', function(e) {
          const option = e.target.closest('.subtitle-option');
          if (!option) return;
          e.stopPropagation();
          const subtitle = option.getAttribute('data-subtitle');
          if (subtitle === 'off') setSubtitle(-1);
          else setSubtitle(parseInt(option.getAttribute('data-track-index')));
        });
      }
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
        } catch (err) {}
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
            try { tempHls.destroy(); } catch (e) {}
          }
          if (video.parentNode) {
            try { video.parentNode.removeChild(video); } catch (e) {}
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
            tempHls.on(Hls.Events.ERROR, function(event, data) {
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
      
      // Update UI title and description for current playing episode
      if (videoTitle) videoTitle.textContent = currentEpisode.title;
      if (episodeElement) episodeElement.textContent = `Episode ${currentEpisode.episodeNumber}`;
      const descriptionText = document.querySelector('.description-text');
      if (descriptionText) descriptionText.textContent = currentEpisode.show?.description || '';
      
      const totalEpisodes = siblingEpisodes.length;
      document.querySelector('.episode-count').textContent = `(${totalEpisodes} episodes)`;
      
      // Load all sibling episodes (no slice limitation)
      siblingEpisodes.forEach((ep) => {
        const playlistItem = document.createElement('div');
        playlistItem.className = `playlist-item ${ep.id === episodeId ? 'active' : ''}`;
        
        const fallbackPoster = resolveAssetUrl(currentEpisode.show?.poster) || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500';
        
        playlistItem.innerHTML = `
          <div class="item-thumbnail">
            <img class="playlist-item-img" src="${fallbackPoster}" alt="${ep.title}" style="width:100%;height:100%;object-fit:cover;">
            <div class="item-overlay"><i class="fas fa-play"></i></div>
            <div class="item-duration">Ep ${ep.episodeNumber}</div>
          </div>
          <div class="item-info">
            <h4 class="item-title">Episode ${ep.episodeNumber}: ${ep.title}</h4>
            <div class="item-meta">
              <span class="item-duration">HD Streaming</span>
            </div>
            ${ep.id === episodeId ? '<div class="item-status"><span class="item-watched"><i class="fas fa-check-circle"></i> Watching</span></div>' : ''}
          </div>
        `;
        
        playlistItem.addEventListener('click', function() {
          window.location.href = `/video-player/index.html?episodeId=${ep.id}`;
        });
        
        playlistContainer.appendChild(playlistItem);
        
        // Asynchronously request frame extraction from its videoUrl, fallback to poster
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
      return (s+'')
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
            textInput.addEventListener('input', function() {
              const remaining = 500 - this.value.length;
              counter.textContent = remaining;
            });
          }
          
          const mainForm = document.getElementById('main-comment-form');
          if (mainForm) {
            mainForm.addEventListener('submit', async function(e) {
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
    window.toggleReplyInput = function(commentId) {
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

    window.submitReply = async function(commentId) {
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

    window.handleLikeComment = async function(commentId) {
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

    window.handlePinComment = async function(commentId) {
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

    window.handleDeleteComment = async function(commentId) {
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
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key.toLowerCase()) {
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
      setupQualityEventListeners();
      setupAudioEventListeners();
      setupSubtitleEventListeners();
      
      if (mainVideo.textTracks) {
        mainVideo.textTracks.addEventListener('change', function() {
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
      initHLS(currentEpisode.videoUrl);
      
      if (autoNextCheckbox && autoNextCheckbox.checked) {
        if (autoNextLabel) {
          autoNextLabel.style.color = '#00a8ff';
        }
      }

      // Search Box Handler
      const searchInput = document.getElementById('searchInput');
      const searchIcon = document.getElementById('searchIcon');
      if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
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
        searchIcon.addEventListener('click', function() {
          const term = searchInput.value.trim();
          if (term) {
            window.location.href = `/view.html#search?q=${encodeURIComponent(term)}`;
          }
        });
      }

      // Mobile Navigation Menu Toggle Listeners
      if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
          if (mobileNav) mobileNav.classList.add('active');
          if (mobileNavOverlay) mobileNavOverlay.classList.add('active');
        });
      }
      if (mobileNavClose) {
        mobileNavClose.addEventListener('click', function() {
          if (mobileNav) mobileNav.classList.remove('active');
          if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
        });
      }
      if (mobileNavOverlay) {
        mobileNavOverlay.addEventListener('click', function() {
          if (mobileNav) mobileNav.classList.remove('active');
          if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
        });
      }

      // Mobile Drawer Search Box Handler
      const mobileSearchInput = document.getElementById('mobileSearchInput');
      const mobileSearchIcon = document.getElementById('mobileSearchIcon');
      if (mobileSearchInput) {
        mobileSearchInput.addEventListener('keyup', function(e) {
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
        mobileSearchIcon.addEventListener('click', function() {
          const term = mobileSearchInput.value.trim();
          if (term) {
            if (mobileNav) mobileNav.classList.remove('active');
            if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
            window.location.href = `/view.html#search?q=${encodeURIComponent(term)}`;
          }
        });
      }

      initCommentsSection();
    }
    
    initializePlayer();
    
  } catch (err) {
    console.error('Player initialization error:', err);
  }
});

// Caption settings handlers (standalone init) - applies CSS variables and persists settings
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const openBtn = document.getElementById('open-caption-settings');
    const modal = document.getElementById('caption-settings-modal');
    const doneBtn = document.getElementById('caption-done');
    const resetBtn = document.getElementById('caption-reset');

    if (!modal) return; 

    const textColorSel = document.getElementById('caption-text-color');
    const textBgColorInput = document.getElementById('caption-text-bg-color');
    const textBgOpacitySel = document.getElementById('caption-text-bg-opacity');
    const areaBgColorInput = document.getElementById('caption-area-bg-color');
    const areaBgOpacitySel = document.getElementById('caption-area-bg-opacity');
    const fontSizeSel = document.getElementById('caption-font-size');
    const textEdgeSel = document.getElementById('caption-text-edge');
    const fontFamilySel = document.getElementById('caption-font-family');

    const STORAGE_KEY = 'captionSettings_v1';

    const defaults = {
      textColor: '#ffffff',
      textBgColor: '#000000',
      textBgOpacity: 0.6,
      areaBgColor: '#000000',
      areaBgOpacity: 0,
      fontSize: '16px',
      textEdge: 'none',
      fontFamily: "'Proportional Sans-Serif', Poppins, Roboto, sans-serif"
    };

    function hexToRgb(hex) {
      if (!hex) return [0,0,0];
      const h = hex.replace('#','');
      const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    }

    function applyCaptionSettings(s) {
      document.documentElement.style.setProperty('--caption-text-color', s.textColor);
      const tRgb = hexToRgb(s.textBgColor || defaults.textBgColor);
      const aRgb = hexToRgb(s.areaBgColor || defaults.areaBgColor);
      document.documentElement.style.setProperty('--caption-bg', `rgba(${tRgb[0]},${tRgb[1]},${tRgb[2]},${s.textBgOpacity})`);
      document.documentElement.style.setProperty('--caption-area-bg', `rgba(${aRgb[0]},${aRgb[1]},${aRgb[2]},${s.areaBgOpacity})`);
      document.documentElement.style.setProperty('--caption-font-size', s.fontSize);
      document.documentElement.style.setProperty('--caption-font-family', s.fontFamily);
      document.documentElement.style.setProperty('--caption-text-edge', s.textEdge);
    }

    function loadSettings() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { console.warn('caption load error', e); }
      return Object.assign({}, defaults);
    }

    function saveSettings(s) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { console.warn('caption save error', e); }
    }

    function populateControls(s) {
      if (!textColorSel) return;
      textColorSel.value = s.textColor || defaults.textColor;
      textBgColorInput.value = s.textBgColor || defaults.textBgColor;
      textBgOpacitySel.value = (s.textBgOpacity !== undefined) ? s.textBgOpacity : defaults.textBgOpacity;
      areaBgColorInput.value = s.areaBgColor || defaults.areaBgColor;
      areaBgOpacitySel.value = (s.areaBgOpacity !== undefined) ? s.areaBgOpacity : defaults.areaBgOpacity;
      fontSizeSel.value = s.fontSize || defaults.fontSize;
      textEdgeSel.value = s.textEdge || defaults.textEdge;
      fontFamilySel.value = s.fontFamily || defaults.fontFamily;
    }

    const initial = loadSettings();
    applyCaptionSettings(initial);
    populateControls(initial);

    if (openBtn) {
      openBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
      });
    }

    if (doneBtn) {
      doneBtn.addEventListener('click', function() {
        const newS = {
          textColor: textColorSel.value,
          textBgColor: textBgColorInput.value,
          textBgOpacity: parseFloat(textBgOpacitySel.value),
          areaBgColor: areaBgColorInput.value,
          areaBgOpacity: parseFloat(areaBgOpacitySel.value),
          fontSize: fontSizeSel.value,
          textEdge: textEdgeSel.value,
          fontFamily: fontFamilySel.value
        };
        applyCaptionSettings(newS);
        saveSettings(newS);
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        populateControls(defaults);
        applyCaptionSettings(defaults);
        saveSettings(defaults);
      });
    }

    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      }
    });

    [textColorSel, textBgColorInput, textBgOpacitySel, areaBgColorInput, areaBgOpacitySel, fontSizeSel, textEdgeSel, fontFamilySel].forEach(el => {
      if (!el) return;
      el.addEventListener('input', function() {
        const tmp = {
          textColor: textColorSel.value,
          textBgColor: textBgColorInput.value,
          textBgOpacity: parseFloat(textBgOpacitySel.value),
          areaBgColor: areaBgColorInput.value,
          areaBgOpacity: parseFloat(areaBgOpacitySel.value),
          fontSize: fontSizeSel.value,
          textEdge: textEdgeSel.value,
          fontFamily: fontFamilySel.value
        };
        applyCaptionSettings(tmp);
      });
    });
  });
})();
