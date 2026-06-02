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
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
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
    
    // Sibling-based Playlist generator
    function initializePlaylist() {
      playlistContainer.innerHTML = '';
      
      // Update UI title and description for current playing episode
      if (videoTitle) videoTitle.textContent = currentEpisode.title;
      if (episodeElement) episodeElement.textContent = `Episode ${currentEpisode.episodeNumber}`;
      const descriptionText = document.querySelector('.description-text');
      if (descriptionText) descriptionText.textContent = currentEpisode.show?.description || '';
      
      const totalEpisodes = siblingEpisodes.length;
      document.querySelector('.episode-count').textContent = `(${totalEpisodes} episodes)`;
      
      // Load first page of episodes
      siblingEpisodes.slice(0, 12).forEach((ep) => {
        const playlistItem = document.createElement('div');
        playlistItem.className = `playlist-item ${ep.id === episodeId ? 'active' : ''}`;
        
        playlistItem.innerHTML = `
          <div class="item-thumbnail">
            <img src="${currentEpisode.show?.poster || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500'}" alt="${ep.title}" style="width:100%;height:100%;object-fit:cover;">
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
      });
      
      // Hide Load More if not enough siblings
      const loadMoreBtn = document.querySelector('.load-more-btn');
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }

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
