/**
 * =========================================================================
 * INFINX ADVANCED WATCH PARTY & LIVE REACTIONS CONTROLLER (AAA SUITE)
 * =========================================================================
 * Features:
 *  - 100% Genuine Peer-to-Peer Playback Synchronization via Socket.io
 *  - Host DJ Control Mode (Host Lock vs Open Collaborative) & Hand Raise
 *  - Synchronized Auto-Binge Next Episode Countdown
 *  - Timeline Hype Moments & Glowing Seekbar Pins
 *  - Synthesized Anime Soundboard (Zero-latency Web Audio API) with Mute toggle
 *  - Flying Live Reactions with Physics Particle Bursts
 *  - Ultra-responsive Desktop Drawer & Mobile Bottom Sheet
 * =========================================================================
 */

(function () {
  'use strict';

  // Web Audio Synthesizer for Anime Soundboard (Bug 6 Fix: Autoplay unlocking)
  let audioCtx = null;
  let soundboardMuted = localStorage.getItem('infinx_soundboard_muted') === 'true';

  function unlockAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        try {
          audioCtx = new AudioContextClass();
        } catch (e) {}
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  ['click', 'keydown', 'touchstart', 'pointerdown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true });
  });

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        try {
          audioCtx = new AudioContextClass();
        } catch (e) {}
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playSynthesizedSound(soundId) {
    if (soundboardMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (soundId === 'level-up') {
      // Ascending chime arpeggio: C5, E5, G5, C6
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.36);
      });
    } else if (soundId === 'nani') {
      // Dramatic descending synth impact
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.46);
    } else if (soundId === 'wow') {
      // High sparkle resonance
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(1760, now + 0.3);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.41);
    } else if (soundId === 'gong') {
      // Deep temple bronze gong
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, now);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.25);
    } else if (soundId === 'horn') {
      // Hype airhorn twin tone
      [466.16, 466.16, 466.16].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(466.16, now + i * 0.12);

        gain.gain.setValueAtTime(0.2, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.11);
      });
    } else if (soundId === 'cheers') {
      // Noise burst for applause
      const bufferSize = ctx.sampleRate * 0.6;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    }
  }

  function initWatchParty() {
    const video = document.getElementById('main-video');
    const playerWrapper = document.querySelector('.video-player');
    const controlsButtons = document.querySelector('.control-buttons');
    if (!video || !playerWrapper || !controlsButtons) return;

    let socket = null;
    let currentPartyId = null;
    let isHost = false;
    let hostUserName = 'Host';
    let currentControlMode = 'open'; // 'open' | 'host_only'
    let isRemoteSync = false;
    let isRevertingAction = false;
    let lastSyncedTime = 0;
    let lastSyncedAction = 'pause';
    let remoteSeekTarget = null;
    let remoteSeekTimestamp = 0;
    let currentUser = 'AnimeFan';
    let currentMarkers = [];
    let autoBingeTimer = null;
    let hasGrantedTemporaryControl = false;

    // Resolve URL params
    const urlParams = new URLSearchParams(window.location.search);
    const initialPartyParam = urlParams.get('party');
    const currentShowId = urlParams.get('id') || urlParams.get('lunarId') || '1735';
    let currentEpNum = parseInt(urlParams.get('ep') || '1', 10);

    try {
      const email = localStorage.getItem('infinx_user_email');
      const userRaw = localStorage.getItem('infinx_user') || localStorage.getItem('user');
      if (email) {
        currentUser = email.split('@')[0];
        currentUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
      } else if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (parsed.username || parsed.name || parsed.email) {
          const rawName = parsed.username || parsed.name || parsed.email.split('@')[0];
          currentUser = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        }
      }
    } catch (e) {}

    // 1. Inject Watch Party Button in Control Bar
    const fullscreenBtn = controlsButtons.querySelector('.fullscreen-btn');
    const partyBtn = document.createElement('button');
    partyBtn.className = 'control-btn party-btn';
    partyBtn.id = 'watch-party-btn';
    partyBtn.setAttribute('aria-label', 'Watch Party');
    partyBtn.setAttribute('title', 'Watch Party (Watch with Friends)');
    partyBtn.innerHTML = '<i class="fas fa-users"></i>';

    if (fullscreenBtn) {
      controlsButtons.insertBefore(partyBtn, fullscreenBtn);
    } else {
      controlsButtons.appendChild(partyBtn);
    }

    // 2. Inject Floating Reactions Bar & Hype Pin Button into Player
    const reactionsLayer = document.createElement('div');
    reactionsLayer.className = 'party-reactions-layer';
    reactionsLayer.id = 'partyReactionsLayer';
    playerWrapper.appendChild(reactionsLayer);

    const reactionsBar = document.createElement('div');
    reactionsBar.className = 'party-reactions-bar';
    reactionsBar.id = 'partyReactionsBar';
    reactionsBar.style.display = 'none';
    reactionsBar.innerHTML = `
      <button class="party-reaction-btn" data-emoji="❤️" title="Love">❤️</button>
      <button class="party-reaction-btn" data-emoji="🔥" title="Hype">🔥</button>
      <button class="party-reaction-btn" data-emoji="🤣" title="Laugh">🤣</button>
      <button class="party-reaction-btn" data-emoji="😱" title="Shock">😱</button>
      <button class="party-reaction-btn" data-emoji="👏" title="Clap">👏</button>
      <button class="party-pin-btn" id="partyPinMomentBtn" title="Bookmark Hype Moment"><i class="fas fa-bookmark"></i></button>
      <div class="party-reactions-divider"></div>
      <button class="party-bar-hide-btn" id="partyBarHideBtn" title="Hide Reaction Bar" aria-label="Hide Reaction Bar"><i class="fas fa-eye-slash"></i></button>
    `;
    playerWrapper.appendChild(reactionsBar);

    // Compact floating unhide pill button (visible only to party host when reactions bar is hidden)
    const reactionsUnhideBtn = document.createElement('button');
    reactionsUnhideBtn.type = 'button';
    reactionsUnhideBtn.className = 'party-reactions-unhide-btn';
    reactionsUnhideBtn.id = 'partyReactionsUnhideBtn';
    reactionsUnhideBtn.title = 'Unhide Live Reactions & Pin Bar';
    reactionsUnhideBtn.style.display = 'none';
    reactionsUnhideBtn.innerHTML = '<i class="fas fa-icons"></i> <span>Reactions</span>';
    playerWrapper.appendChild(reactionsUnhideBtn);

    // 3. Inject Sync Toast Notification
    const syncToast = document.createElement('div');
    syncToast.className = 'party-sync-toast';
    syncToast.id = 'partySyncToast';
    syncToast.innerHTML = '<i class="fas fa-sync-alt"></i> <span id="partyToastMsg">Synced</span>';
    playerWrapper.appendChild(syncToast);

    function showToast(msg) {
      const msgEl = document.getElementById('partyToastMsg');
      if (msgEl) msgEl.innerText = msg;
      syncToast.classList.add('active');
      clearTimeout(syncToast._timer);
      syncToast._timer = setTimeout(() => {
        syncToast.classList.remove('active');
      }, 2600);
    }

    // 4. Inject Auto-Binge Next Episode Modal
    const autoBingeModal = document.createElement('div');
    autoBingeModal.className = 'party-autobinge-modal';
    autoBingeModal.id = 'partyAutoBingeModal';
    autoBingeModal.innerHTML = `
      <div class="party-autobinge-title">
        <i class="fas fa-forward"></i>
        <span>Next Episode: Episode ${currentEpNum + 1}</span>
      </div>
      <div style="font-size: 1.15rem; color: #a0aec0;" id="autoBingeCountdownLabel">Auto-advancing with party in 8s...</div>
      <div class="party-autobinge-progress">
        <div class="party-autobinge-bar" id="autoBingeBar"></div>
      </div>
      <div class="party-autobinge-actions">
        <button type="button" class="party-autobinge-btn-play" id="autoBingePlayBtn">Watch Now ▶</button>
        <button type="button" class="party-autobinge-btn-cancel" id="autoBingeCancelBtn">Stay in Ep</button>
      </div>
    `;
    playerWrapper.appendChild(autoBingeModal);

    // 4b. Inject Non-blocking Host Control Request Banner (Bug 5 Fix)
    const ctrlReqBanner = document.createElement('div');
    ctrlReqBanner.className = 'party-control-req-banner';
    ctrlReqBanner.id = 'partyControlReqBanner';
    ctrlReqBanner.innerHTML = `
      <div class="party-req-header">
        <i class="fas fa-hand-paper" style="color: #00f0ff;"></i>
        <span id="partyControlReqText">User requested playback control</span>
      </div>
      <div class="party-req-buttons">
        <button type="button" class="party-req-btn party-req-grant" id="partyReqGrantBtn">Grant Control (Open)</button>
        <button type="button" class="party-req-btn party-req-deny" id="partyReqDenyBtn">Keep Locked</button>
      </div>
    `;
    playerWrapper.appendChild(ctrlReqBanner);

    let ctrlReqTimer = null;
    function showControlRequestBanner(user) {
      const textEl = document.getElementById('partyControlReqText');
      if (textEl) textEl.innerText = `${user} requested playback control!`;
      ctrlReqBanner.classList.add('active');
      clearTimeout(ctrlReqTimer);
      ctrlReqTimer = setTimeout(() => {
        ctrlReqBanner.classList.remove('active');
      }, 14000);
    }

    document.getElementById('partyReqGrantBtn').addEventListener('click', () => {
      ctrlReqBanner.classList.remove('active');
      clearTimeout(ctrlReqTimer);
      if (socket && isHost) {
        socket.emit('party:set_control_mode', { mode: 'open' });
        showToast('Granted collaborative control 👥');
      }
    });

    document.getElementById('partyReqDenyBtn').addEventListener('click', () => {
      ctrlReqBanner.classList.remove('active');
      clearTimeout(ctrlReqTimer);
      showToast('Kept controls locked 🔒');
    });

    // 5. Inject Advanced Watch Party Drawer
    const drawer = document.createElement('div');
    drawer.className = 'watch-party-drawer';
    drawer.id = 'watchPartyDrawer';
    drawer.innerHTML = `
      <div class="party-drawer-header">
        <div class="party-drawer-title">
          <i class="fas fa-users"></i>
          <span>Watch Party</span>
        </div>
        <button class="party-close-btn" id="partyCloseDrawer">&times;</button>
      </div>

      <!-- Navigation Tabs -->
      <div class="party-drawer-tabs">
        <button type="button" class="party-tab-nav-btn active" data-view="chat">
          <i class="fas fa-comments"></i> Chat
        </button>
        <button type="button" class="party-tab-nav-btn" data-view="markers">
          <i class="fas fa-bookmark"></i> Moments
        </button>
        <button type="button" class="party-tab-nav-btn" data-view="soundboard">
          <i class="fas fa-volume-up"></i> SFX
        </button>
      </div>

      <div class="party-drawer-body">
        <!-- View 1: In-Party Live Chat -->
        <div class="party-drawer-view active" id="viewPartyChat">
          <!-- Room Info Panel -->
          <div id="partyRoomPanel" class="party-panel-box" style="display: none;">
            <div class="party-room-code-tag">ACTIVE ROOM CODE</div>
            <div class="party-room-code-val" id="partyDisplayCode">INF-000</div>
            
            <div style="font-size: 1.15rem; color: #00f0ff; margin-top: 4px;" id="partyStatusText">
              🟢 Synced with Room
            </div>

            <!-- DJ Control Mode Container -->
            <div class="party-dj-control-box" id="partyDjControlBox">
              <div class="party-dj-status-row">
                <span id="partyHostLabel">👑 Host: Host</span>
                <button type="button" class="party-dj-toggle-btn" id="partyDjToggleBtn">🔒 Host Only</button>
              </div>
              <div style="font-size: 1.05rem; color: #a0aec0;" id="partyDjModeDesc">
                Only the host can pause, play, and seek.
              </div>
              <button type="button" class="party-request-ctrl-btn" id="partyRequestCtrlBtn" style="display: none;">
                ✋ Request Playback Control
              </button>
            </div>

            <!-- Host Live Reactions & Pins Bar Visibility Setting -->
            <div class="party-bar-setting-row" id="partyBarSettingRow" style="display: none;">
              <span style="font-size: 1.1rem; color: #e2e8f0; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-icons" style="color: #00f0ff;"></i> Reactions Bar
              </span>
              <button type="button" class="party-bar-visibility-toggle" id="partyBarVisibilityToggle" title="Toggle Reactions Bar Visibility">
                <i class="fas fa-eye-slash"></i> <span>Hide</span>
              </button>
            </div>

            <button class="party-btn-primary" id="partyCopyInviteBtn">
              <i class="fas fa-link"></i> Copy Invite Link
            </button>
            <button class="party-btn-secondary party-leave-btn" id="partyLeaveBtn">
              <i class="fas fa-sign-out-alt"></i> Leave Party
            </button>
          </div>

          <!-- Join / Create Setup Panel -->
          <div id="partySetupPanel" class="party-panel-box">
            <h4 style="color: #fff; font-size: 1.35rem; margin-bottom: 6px;">Watch Together</h4>
            <p style="color: #a0aec0; font-size: 1.15rem; margin-bottom: 12px; line-height: 1.4;">
              Synchronize play, pause, and episode seeks with your friends in real-time.
            </p>
            <button class="party-btn-primary" id="partyCreateBtn">
              <i class="fas fa-plus-circle"></i> Create Party Room
            </button>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <input type="text" id="partyJoinInput" placeholder="Room Code (e.g. INF-782)" style="flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 12px; color: #fff; text-transform: uppercase;" />
              <button class="party-btn-secondary" id="partyJoinBtn" style="margin-top: 0; width: auto;">Join</button>
            </div>
          </div>

          <div class="party-chat-container">
            <div class="party-chat-messages" id="partyChatMessages">
              <div style="color: #718096; font-size: 1.15rem; text-align: center; margin-top: 10px;">
                Join or create a room to chat with your friends!
              </div>
            </div>
            <form class="party-chat-input-bar" id="partyChatForm">
              <input type="text" class="party-chat-input" id="partyChatInput" placeholder="Message friends..." autocomplete="off" />
              <button type="submit" class="party-chat-send"><i class="fas fa-paper-plane"></i></button>
            </form>
          </div>
        </div>

        <!-- View 2: Hype Moments List -->
        <div class="party-drawer-view" id="viewPartyMarkers">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 1.2rem; font-weight: 700; color: #fff;">Pinned Scenes</span>
            <button type="button" class="party-btn-secondary" id="partyAddMomentDrawerBtn" style="margin: 0; padding: 4px 10px; font-size: 1.05rem; width: auto;">
              + Pin Now
            </button>
          </div>
          <div class="party-markers-container" id="partyMarkersList">
            <div style="color: #718096; font-size: 1.15rem; text-align: center; margin-top: 20px;">
              No hype moments pinned yet. Click 📌 to bookmark a scene!
            </div>
          </div>
        </div>

        <!-- View 3: Anime Soundboard -->
        <div class="party-drawer-view" id="viewPartySoundboard">
          <div class="party-soundboard-container">
            <div class="party-soundboard-meta">
              <span style="font-size: 1.15rem; color: #a0aec0;">Trigger hype sounds for everyone</span>
              <button type="button" id="soundboardMuteToggleBtn" style="background: transparent; border: none; color: #00f0ff; cursor: pointer; font-size: 1.2rem;">
                <i class="fas fa-volume-up"></i>
              </button>
            </div>
            <div class="party-soundboard-grid">
              <button type="button" class="party-sfx-btn" data-sfx="level-up">
                <span class="party-sfx-icon">⚡</span>
                <span class="party-sfx-name">Level Up</span>
              </button>
              <button type="button" class="party-sfx-btn" data-sfx="nani">
                <span class="party-sfx-icon">🚨</span>
                <span class="party-sfx-name">Nani?!</span>
              </button>
              <button type="button" class="party-sfx-btn" data-sfx="wow">
                <span class="party-sfx-icon">✨</span>
                <span class="party-sfx-name">Anime Wow</span>
              </button>
              <button type="button" class="party-sfx-btn" data-sfx="gong">
                <span class="party-sfx-icon">🥋</span>
                <span class="party-sfx-name">Gong Hit</span>
              </button>
              <button type="button" class="party-sfx-btn" data-sfx="horn">
                <span class="party-sfx-icon">📢</span>
                <span class="party-sfx-name">Hype Horn</span>
              </button>
              <button type="button" class="party-sfx-btn" data-sfx="cheers">
                <span class="party-sfx-icon">👏</span>
                <span class="party-sfx-name">Applause</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Mobile Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'party-drawer-backdrop';
    backdrop.id = 'partyDrawerBackdrop';
    document.body.appendChild(backdrop);

    // Dynamic mounting logic (body for mobile unclipped bottom-sheet, playerWrapper for desktop, preserving overlays in fullscreen)
    function mountDrawerCorrectly() {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl) {
        if (fsEl !== video && drawer.parentNode !== fsEl) {
          fsEl.appendChild(drawer);
        } else if (drawer.parentNode !== playerWrapper) {
          playerWrapper.appendChild(drawer);
        }
      } else if (window.innerWidth <= 768 && window.innerHeight > 600 && window.innerHeight > window.innerWidth) {
        if (drawer.parentNode !== document.body) {
          document.body.appendChild(drawer);
        }
      } else {
        if (drawer.parentNode !== playerWrapper) {
          playerWrapper.appendChild(drawer);
        }
      }
    }

    mountDrawerCorrectly();
    window.addEventListener('resize', mountDrawerCorrectly);
    document.addEventListener('fullscreenchange', mountDrawerCorrectly);
    document.addEventListener('webkitfullscreenchange', mountDrawerCorrectly);

    function closePartyDrawer() {
      drawer.classList.remove('open');
      backdrop.classList.remove('active');
      document.body.classList.remove('party-drawer-active');
    }

    function openPartyDrawer() {
      mountDrawerCorrectly();
      drawer.classList.add('open');
      backdrop.classList.add('active');
      document.body.classList.add('party-drawer-active');
    }

    partyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (drawer.classList.contains('open')) {
        closePartyDrawer();
      } else {
        openPartyDrawer();
      }
    });

    document.getElementById('partyCloseDrawer').addEventListener('click', closePartyDrawer);
    backdrop.addEventListener('click', closePartyDrawer);

    // 6. Drawer Tab Switching
    drawer.querySelectorAll('.party-tab-nav-btn').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const targetView = tabBtn.getAttribute('data-view');
        drawer.querySelectorAll('.party-tab-nav-btn').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');

        drawer.querySelectorAll('.party-drawer-view').forEach(view => view.classList.remove('active'));
        if (targetView === 'chat') document.getElementById('viewPartyChat').classList.add('active');
        else if (targetView === 'markers') document.getElementById('viewPartyMarkers').classList.add('active');
        else if (targetView === 'soundboard') document.getElementById('viewPartySoundboard').classList.add('active');

        const drawerBody = drawer.querySelector('.party-drawer-body');
        if (drawerBody) drawerBody.scrollTop = 0;
      });
    });

    // 7. Flying Emoji Reaction Engine
    function spawnFlyingReaction(emoji) {
      const reactionEl = document.createElement('div');
      reactionEl.className = 'flying-reaction';
      reactionEl.innerText = emoji;

      const rightOffset = Math.random() * 90 + 20;
      const rot = (Math.random() - 0.5) * 45;
      reactionEl.style.right = `${rightOffset}px`;
      reactionEl.style.setProperty('--rot', `${rot}deg`);

      reactionsLayer.appendChild(reactionEl);

      setTimeout(() => {
        reactionEl.remove();
      }, 2500);
    }

    reactionsBar.querySelectorAll('.party-reaction-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const emoji = btn.getAttribute('data-emoji');
        if (!emoji) return;

        spawnFlyingReaction(emoji);

        if (socket && currentPartyId) {
          socket.emit('party:reaction', { emoji, user: currentUser });
        }
      });
    });

    // 8. Hype Moment Pinning
    function addHypeMarker(time, label = 'Hype Moment', emoji = '🔥') {
      if (!video) return;
      const targetTime = time !== undefined ? time : (video.currentTime || 0);

      // Check if scene at this time is already pinned to prevent duplicate pin on click
      const alreadyPinned = currentMarkers.some(m =>
        Math.abs(m.time - targetTime) < 1.0 && (m.user === currentUser || m.user === 'You' || m.user === 'Admin')
      );
      if (alreadyPinned) {
        showToast('Scene already pinned at this timestamp! 📌');
        return;
      }

      const markerId = 'mk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

      const marker = {
        id: markerId,
        time: targetTime,
        label,
        emoji,
        user: currentUser
      };

      // 1. Optimistic instant local render
      renderLocalMarker(marker);

      // 2. Broadcast to room if active
      if (socket && currentPartyId) {
        socket.emit('party:add_marker', marker);
      }
      showToast(`Pinned Hype Moment at ${formatTime(targetTime)}! 📌`);
    }

    document.getElementById('partyPinMomentBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      addHypeMarker();
    });

    document.getElementById('partyAddMomentDrawerBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      addHypeMarker();
    });

    function renderLocalMarker(marker) {
      if (!marker) return;

      // Robust deduplication: check matching ID OR matching timestamp + user + label
      const isDuplicate = currentMarkers.some(m =>
        m.id === marker.id ||
        (Math.abs(m.time - marker.time) < 1.0 && m.user === marker.user && m.label === marker.label)
      );
      if (isDuplicate) return;

      currentMarkers.push(marker);

      // 1. Add glowing pip on timeline
      const progressBar = document.querySelector('.progress-bar');
      const duration = (video && Number.isFinite(video.duration) && video.duration > 0) ? video.duration : (window.playerDuration || 1440);
      if (progressBar) {
        if (!progressBar.querySelector(`.timeline-hype-marker[data-marker-id="${marker.id}"]`)) {
          const pct = Math.max(0, Math.min(100, (marker.time / duration) * 100));
          const pip = document.createElement('div');
          pip.className = 'timeline-hype-marker';
          pip.dataset.markerId = marker.id;
          pip.dataset.time = marker.time;
          pip.style.left = `${pct}%`;
          pip.title = `${marker.emoji} ${marker.label} (${formatTime(marker.time)})`;
          pip.addEventListener('click', (e) => {
            e.stopPropagation();
            video.currentTime = marker.time;
            showToast(`Jumped to ${marker.label}`);
          });
          progressBar.appendChild(pip);
        }
      }

      // 2. Add to Moments List in Drawer
      const list = document.getElementById('partyMarkersList');
      if (list) {
        if (currentMarkers.length === 1) list.innerHTML = '';

        if (!list.querySelector(`[data-marker-id="${marker.id}"]`)) {
          const item = document.createElement('div');
          item.className = 'party-marker-card';
          item.dataset.markerId = marker.id;
          item.dataset.time = marker.time;
          item.innerHTML = `
            <div>
              <span class="party-marker-time">${marker.emoji} ${formatTime(marker.time)}</span>
              <div class="party-marker-desc">${marker.label} <span style="color:#718096; font-size:1.0rem;">by ${marker.user}</span></div>
            </div>
            <i class="fas fa-play" style="color: #00f0ff; font-size: 1.1rem;"></i>
          `;
          item.addEventListener('click', () => {
            video.currentTime = marker.time;
            showToast(`Jumped to ${marker.label}`);
          });
          list.appendChild(item);
        }
      }
    }

    function updateMarkerPipPositions() {
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      document.querySelectorAll('.timeline-hype-marker').forEach(pip => {
        const time = parseFloat(pip.dataset.time || 0);
        const pct = Math.max(0, Math.min(100, (time / video.duration) * 100));
        pip.style.left = `${pct}%`;
      });
    }

    video.addEventListener('loadedmetadata', updateMarkerPipPositions);
    video.addEventListener('durationchange', updateMarkerPipPositions);

    function formatTime(sec) {
      const s = Math.floor(sec || 0);
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return `${m}:${rem < 10 ? '0' : ''}${rem}`;
    }

    // 9. Soundboard Engine
    const muteBtn = document.getElementById('soundboardMuteToggleBtn');
    function updateMuteBtn() {
      if (muteBtn) {
        muteBtn.innerHTML = soundboardMuted ? '<i class="fas fa-volume-mute" style="color:#ff0055;"></i>' : '<i class="fas fa-volume-up"></i>';
      }
    }
    updateMuteBtn();

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        soundboardMuted = !soundboardMuted;
        localStorage.setItem('infinx_soundboard_muted', soundboardMuted);
        updateMuteBtn();
        showToast(soundboardMuted ? 'Soundboard Muted 🔇' : 'Soundboard Unmuted 🔊');
      });
    }

    drawer.querySelectorAll('.party-sfx-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const soundId = btn.getAttribute('data-sfx');
        const soundName = btn.querySelector('.party-sfx-name').innerText;
        playSynthesizedSound(soundId);

        if (socket && currentPartyId) {
          socket.emit('party:sound', { soundId, soundName });
        }
      });
    });

    // 10. Auto-Binge Episode Transition Logic (Bug 3 Fix: Host control & debounce)
    function startAutoBingeCountdown() {
      if (autoBingeTimer || !currentPartyId) return;

      const modal = document.getElementById('partyAutoBingeModal');
      const bar = document.getElementById('autoBingeBar');
      const label = document.getElementById('autoBingeCountdownLabel');
      modal.classList.add('active');

      let remaining = 8;
      bar.style.width = '100%';

      autoBingeTimer = setInterval(() => {
        remaining -= 1;
        label.innerText = `Auto-advancing with party in ${remaining}s...`;
        bar.style.width = `${(remaining / 8) * 100}%`;

        if (remaining <= 0) {
          clearInterval(autoBingeTimer);
          autoBingeTimer = null;
          triggerNextEpisode();
        }
      }, 1000);
    }

    function cancelAutoBinge() {
      if (autoBingeTimer) {
        clearInterval(autoBingeTimer);
        autoBingeTimer = null;
      }
      document.getElementById('partyAutoBingeModal').classList.remove('active');
    }

    function triggerNextEpisode() {
      cancelAutoBinge();
      const nextEp = currentEpNum + 1;
      if (socket && currentPartyId) {
        if (currentControlMode === 'host_only' && !isHost) {
          showToast(`Waiting for Host (${hostUserName}) to transition episode...`);
          return;
        }
        socket.emit('party:next_episode', { showId: currentShowId, ep: nextEp });
      } else {
        navigateToNextEpisode(currentShowId, nextEp, currentPartyId);
      }
    }

    document.getElementById('autoBingePlayBtn').addEventListener('click', triggerNextEpisode);
    document.getElementById('autoBingeCancelBtn').addEventListener('click', cancelAutoBinge);

    function navigateToNextEpisode(showId, ep, partyId) {
      showToast(`Traveling to Episode ${ep}... 🚀`);
      if (typeof window.switchPlayerEpisode === 'function') {
        currentEpNum = parseInt(ep, 10);
        window.switchPlayerEpisode(ep);
        return;
      }
      setTimeout(() => {
        const dest = `/watch?id=${showId}&ep=${ep}${partyId ? '&party=' + partyId : ''}`;
        window.location.href = dest;
      }, 1000);
    }

    // Monitor playback for auto-binge near ending (Host initiates to prevent multi-peer storms)
    video.addEventListener('timeupdate', () => {
      if (!video.paused) {
        lastSyncedTime = video.currentTime;
      }
      if (video.duration && video.duration > 30) {
        if (video.duration - video.currentTime <= 12 && !autoBingeTimer && currentPartyId) {
          if (currentControlMode === 'host_only' && !isHost) {
            return; // Guest awaits host transition
          }
          startAutoBingeCountdown();
        }
      }
    });

    video.addEventListener('ended', () => {
      if (currentPartyId) {
        if (currentControlMode === 'host_only' && !isHost) {
          return;
        }
        startAutoBingeCountdown();
      }
    });

    // 11. DJ Mode Controls
    const djToggleBtn = document.getElementById('partyDjToggleBtn');
    const djModeDesc = document.getElementById('partyDjModeDesc');
    const reqCtrlBtn = document.getElementById('partyRequestCtrlBtn');
    const hostLabel = document.getElementById('partyHostLabel');

    function updateDjControlsUI() {
      if (hostLabel) hostLabel.innerText = `👑 Host: ${hostUserName}`;

      if (isHost) {
        djToggleBtn.style.display = 'inline-block';
        reqCtrlBtn.style.display = 'none';
        if (currentControlMode === 'host_only') {
          djToggleBtn.innerText = '🔒 Host Only';
          djToggleBtn.style.borderColor = '#ff0055';
          djToggleBtn.style.color = '#ff0055';
          djModeDesc.innerText = 'Only you (Host) can pause, play, and seek.';
        } else {
          djToggleBtn.innerText = '👥 Collaborative';
          djToggleBtn.style.borderColor = '#00f0ff';
          djToggleBtn.style.color = '#00f0ff';
          djModeDesc.innerText = 'Everyone in the party can control playback.';
        }
      } else {
        djToggleBtn.style.display = 'none';
        if (currentControlMode === 'host_only') {
          djModeDesc.innerText = `🔒 Playback locked by Host (${hostUserName}).`;
          reqCtrlBtn.style.display = hasGrantedTemporaryControl ? 'none' : 'block';
        } else {
          djModeDesc.innerText = '👥 Open playback: Anyone can play or pause.';
          reqCtrlBtn.style.display = 'none';
        }
      }
    }

    djToggleBtn.addEventListener('click', () => {
      if (!isHost || !socket) return;
      const nextMode = currentControlMode === 'host_only' ? 'open' : 'host_only';
      socket.emit('party:set_control_mode', { mode: nextMode });
    });

    reqCtrlBtn.addEventListener('click', () => {
      if (!socket || !currentPartyId) return;
      socket.emit('party:request_control');
      reqCtrlBtn.innerText = '✋ Requested...';
      reqCtrlBtn.disabled = true;
      showToast('Control request sent to Host!');
    });

    // 11b. Host Floating Reactions & Pin Bar Visibility Controller
    let isReactionsBarHiddenByUser = localStorage.getItem('infinx_party_reactions_hidden') === 'true';

    function updateReactionsBarVisibility() {
      const isHostInParty = !!(currentPartyId && isHost);
      const settingRow = document.getElementById('partyBarSettingRow');
      const settingToggleBtn = document.getElementById('partyBarVisibilityToggle');

      if (!isHostInParty) {
        reactionsBar.style.display = 'none';
        reactionsUnhideBtn.style.display = 'none';
        if (settingRow) settingRow.style.display = 'none';
        return;
      }

      // User is in watch party AND is the host
      if (settingRow) settingRow.style.display = 'flex';

      if (isReactionsBarHiddenByUser) {
        reactionsBar.style.display = 'none';
        reactionsUnhideBtn.style.display = 'inline-flex';
        if (settingToggleBtn) {
          settingToggleBtn.innerHTML = '<i class="fas fa-eye"></i> <span>Unhide</span>';
        }
      } else {
        reactionsBar.style.display = 'flex';
        reactionsUnhideBtn.style.display = 'none';
        if (settingToggleBtn) {
          settingToggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> <span>Hide</span>';
        }
      }
    }

    function toggleReactionsBarVisibility(forceState) {
      if (typeof forceState === 'boolean') {
        isReactionsBarHiddenByUser = forceState;
      } else {
        isReactionsBarHiddenByUser = !isReactionsBarHiddenByUser;
      }

      localStorage.setItem('infinx_party_reactions_hidden', isReactionsBarHiddenByUser ? 'true' : 'false');
      updateReactionsBarVisibility();

      if (isReactionsBarHiddenByUser) {
        showToast('Reactions Bar Hidden (Click 👁️ to unhide)');
      } else {
        showToast('Reactions & Pin Bar Restored ✨');
      }
    }

    const barHideBtn = document.getElementById('partyBarHideBtn');
    if (barHideBtn) {
      barHideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleReactionsBarVisibility(true);
      });
    }

    reactionsUnhideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleReactionsBarVisibility(false);
    });

    const partyBarVisibilityToggle = document.getElementById('partyBarVisibilityToggle');
    if (partyBarVisibilityToggle) {
      partyBarVisibilityToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleReactionsBarVisibility();
      });
    }

    // 12. Connect Socket.io
    function ensureSocket() {
      if (!socket && typeof io === 'function') {
        const isVercel = window.location.hostname.includes('vercel.app') || window.location.protocol === 'https:';
        socket = io(window.location.origin, {
          transports: isVercel ? ['polling'] : ['websocket', 'polling'],
          upgrade: !isVercel
        });

        // Remote playback sync event (Bug 2 Fix: Programmatic seek tracking)
        socket.on('party:sync', ({ action, time, sender }) => {
          isRemoteSync = true;
          lastSyncedAction = action;

          if (typeof time === 'number') {
            lastSyncedTime = time;
            if (Math.abs(video.currentTime - time) > 1.2) {
              remoteSeekTarget = time;
              remoteSeekTimestamp = Date.now();
              video.currentTime = time;
            }
          }

          if (action === 'play') {
            video.play().catch(() => {});
            showToast(`${sender} played ▶`);
          } else if (action === 'pause') {
            video.pause();
            showToast(`${sender} paused ⏸`);
          } else if (action === 'seek') {
            showToast(`${sender} synced time ⏱`);
          }

          setTimeout(() => {
            isRemoteSync = false;
          }, 400);
        });

        // Revert local playback if unauthorized guest attempted to control in host-only mode (Bug 1 Fix)
        socket.on('party:sync_revert', ({ action, time, hostUser, message }) => {
          isRevertingAction = true;
          if (typeof time === 'number') {
            lastSyncedTime = time;
            remoteSeekTarget = time;
            remoteSeekTimestamp = Date.now();
            video.currentTime = time;
          }
          if (action === 'play') {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
          showToast(message || `Playback locked by Host (${hostUser}) 🔒`);
          setTimeout(() => {
            isRevertingAction = false;
          }, 300);
        });

        // Host handles state inquiry from joining guest (Bug 4 Fix)
        socket.on('party:request_state_for_guest', ({ guestSocketId }) => {
          if (isHost && socket && currentPartyId) {
            socket.emit('party:respond_state_for_guest', {
              guestSocketId: guestSocketId,
              currentTime: video.currentTime,
              isPlaying: !video.paused,
              showId: currentShowId,
              ep: currentEpNum
            });
          }
        });

        // Guest receives authoritative playback & episode sync from host (Bug 4 Fix)
        socket.on('party:live_state_sync', ({ currentTime, isPlaying, showId, ep }) => {
          if (showId && (String(showId) !== String(currentShowId) || (ep && Number(ep) !== Number(currentEpNum)))) {
            showToast(`Moving to Host's Episode: Ep ${ep}... 🚀`);
            setTimeout(() => {
              window.location.href = `/watch?id=${showId}&ep=${ep}&party=${currentPartyId}`;
            }, 800);
            return;
          }

          if (typeof currentTime === 'number' && Math.abs(video.currentTime - currentTime) > 1.2) {
            remoteSeekTarget = currentTime;
            remoteSeekTimestamp = Date.now();
            video.currentTime = currentTime;
            lastSyncedTime = currentTime;
          }

          if (isPlaying && video.paused) {
            video.play().catch(() => {});
          } else if (!isPlaying && !video.paused) {
            video.pause();
          }
        });

        // Remote flying reaction
        socket.on('party:reaction', ({ emoji }) => {
          spawnFlyingReaction(emoji);
        });

        // Remote in-party chat
        socket.on('party:chat', ({ text, user, time }) => {
          appendPartyChat(user, text, time);
        });

        // Remote soundboard event
        socket.on('party:sound', ({ soundId, soundName, user }) => {
          playSynthesizedSound(soundId);
          showToast(`${user} triggered ${soundName}! 🔊`);
        });

        // Remote marker added
        socket.on('party:marker_added', (marker) => {
          renderLocalMarker(marker);
        });

        // Remote control mode changed
        socket.on('party:control_mode_changed', ({ controlMode, hostUser }) => {
          currentControlMode = controlMode;
          hostUserName = hostUser || hostUserName;
          updateDjControlsUI();
          showToast(controlMode === 'host_only' ? 'Host locked controls 🔒' : 'Controls set to collaborative 👥');
        });

        // Host received control request from guest (Bug 5 Fix: Non-blocking in-player banner)
        socket.on('party:control_requested', ({ user, socketId }) => {
          if (isHost) {
            showControlRequestBanner(user);
            showToast(`✋ ${user} requested playback control!`);
          }
        });

        // Remote auto-binge navigation
        socket.on('party:navigate_episode', ({ showId, ep, partyId }) => {
          navigateToNextEpisode(showId, ep, partyId);
        });

        // Party state sync on joining (Bug 4 Fix: Episode check and playhead sync)
        socket.on('party:joined', (info) => {
          isHost = info.isHost;
          hostUserName = info.hostUser || (isHost ? currentUser : 'Host');
          currentControlMode = info.controlMode || 'open';

          updatePartyStatusUI(info.peerCount || 1);
          updateDjControlsUI();
          updateReactionsBarVisibility();

          if (Array.isArray(info.markers)) {
            currentMarkers = [];
            const list = document.getElementById('partyMarkersList');
            if (list) list.innerHTML = '';
            info.markers.forEach(renderLocalMarker);
          }

          // If joining an existing room on a different episode, redirect immediately
          if (!isHost && info.showId && (String(info.showId) !== String(currentShowId) || (info.ep && Number(info.ep) !== Number(currentEpNum)))) {
            showToast(`Syncing to Host Episode ${info.ep}... 🚀`);
            setTimeout(() => {
              window.location.href = `/watch?id=${info.showId}&ep=${info.ep}&party=${info.partyId}`;
            }, 900);
            return;
          }

          // Apply estimated initial playhead
          if (!isHost && typeof info.currentTime === 'number' && info.currentTime > 0) {
            remoteSeekTarget = info.currentTime;
            remoteSeekTimestamp = Date.now();
            video.currentTime = info.currentTime;
            lastSyncedTime = info.currentTime;
            if (info.isPlaying) {
              video.play().catch(() => {});
            }
          }
        });

        socket.on('party:peer_joined', ({ user, peerCount, memberCount }) => {
          showToast(`${user} joined the party!`);
          updatePartyStatusUI(peerCount || memberCount);
        });

        socket.on('party:member_joined', ({ user, memberCount }) => {
          updatePartyStatusUI(memberCount);
        });

        socket.on('party:peer_left', ({ user, peerCount, memberCount }) => {
          showToast(`${user} left the party.`);
          updatePartyStatusUI(peerCount || memberCount);
        });

        socket.on('party:member_left', ({ memberCount }) => {
          updatePartyStatusUI(memberCount);
        });

        socket.on('party:host_changed', ({ newHost }) => {
          hostUserName = newHost;
          isHost = newHost === currentUser;
          updateDjControlsUI();
          updateReactionsBarVisibility();
          showToast(`${newHost} is now the Party Host! 👑`);
        });
      }
      return socket;
    }

    function appendPartyChat(user, text, time) {
      const chatFeed = document.getElementById('partyChatMessages');
      if (!chatFeed) return;

      const isMe = String(user).toLowerCase() === currentUser.toLowerCase();
      const item = document.createElement('div');
      item.className = 'party-chat-msg';
      item.innerHTML = `
        <div class="party-chat-user">${user} <span style="color: #718096; font-size: 1.0rem; font-weight: normal; margin-left: 4px;">${time || ''}</span></div>
        <div class="party-chat-text">${text}</div>
      `;
      chatFeed.appendChild(item);
      chatFeed.scrollTop = chatFeed.scrollHeight;
    }

    function updatePartyStatusUI(memberCount = 1) {
      const roomPanel = document.getElementById('partyRoomPanel');
      const setupPanel = document.getElementById('partySetupPanel');
      const displayCode = document.getElementById('partyDisplayCode');
      const statusText = document.getElementById('partyStatusText');

      if (currentPartyId) {
        roomPanel.style.display = 'block';
        setupPanel.style.display = 'none';
        displayCode.innerText = currentPartyId;
        statusText.innerHTML = `🟢 ${memberCount} Friend${memberCount === 1 ? '' : 's'} Watching • Synced`;
        partyBtn.classList.add('in-party');
      } else {
        roomPanel.style.display = 'none';
        setupPanel.style.display = 'block';
        partyBtn.classList.remove('in-party');
      }
    }

    // Bug 7 Fix: Secure Alphanumeric Room Code Generator (Over 33.5M Combinations)
    function generatePartyCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'INF-';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    }

    // Join / Create Room functions
    function joinPartyRoom(roomId, asHost = false) {
      ensureSocket();
      currentPartyId = roomId.toUpperCase().trim();
      isHost = asHost;
      if (isHost) hostUserName = currentUser;

      socket.emit('party:join', {
        partyId: currentPartyId,
        user: currentUser,
        isHost: isHost,
        showId: currentShowId,
        ep: currentEpNum,
        currentTime: video.currentTime
      });

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('party', currentPartyId);
      window.history.replaceState({}, '', newUrl.toString());

      updatePartyStatusUI(1);
      updateDjControlsUI();
      updateReactionsBarVisibility();
    }

    document.getElementById('partyCreateBtn').addEventListener('click', () => {
      const randomCode = generatePartyCode();
      joinPartyRoom(randomCode, true);
    });

    document.getElementById('partyJoinBtn').addEventListener('click', () => {
      const inputVal = document.getElementById('partyJoinInput').value.trim();
      if (inputVal) {
        joinPartyRoom(inputVal, false);
      }
    });

    document.getElementById('partyCopyInviteBtn').addEventListener('click', () => {
      const link = window.location.href;
      navigator.clipboard.writeText(link).then(() => {
        showToast('Invite link copied to clipboard! 📋');
      }).catch(() => {
        prompt('Copy your watch party link:', link);
      });
    });

    // Bug 8 Fix: Graceful Leave (Emits party:leave without severing socket)
    document.getElementById('partyLeaveBtn').addEventListener('click', () => {
      if (socket && currentPartyId) {
        socket.emit('party:leave');
      }
      currentPartyId = null;
      isHost = false;
      hasGrantedTemporaryControl = false;
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('party');
      window.history.replaceState({}, '', newUrl.toString());

      updatePartyStatusUI(0);
      updateReactionsBarVisibility();
      closePartyDrawer();
      showToast('Left the watch party.');
    });

    document.getElementById('partyChatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const chatInput = document.getElementById('partyChatInput');
      const text = chatInput.value.trim();
      if (!text || !currentPartyId) return;

      chatInput.value = '';

      if (socket) {
        socket.emit('party:chat', { text, user: currentUser });
      }
    });

    // 13. Video Sync Event Listeners with DJ Mode Enforcement & Revert (Bug 1 & Bug 2 Fix)
    video.addEventListener('play', () => {
      if (isRevertingAction) return;
      if (!isRemoteSync && socket && currentPartyId) {
        if (currentControlMode === 'host_only' && !isHost && !hasGrantedTemporaryControl) {
          isRevertingAction = true;
          video.pause(); // Revert local unauthorized play
          showToast(`Controls locked by Host (${hostUserName}) 🔒`);
          setTimeout(() => { isRevertingAction = false; }, 200);
          return;
        }
        lastSyncedAction = 'play';
        lastSyncedTime = video.currentTime;
        socket.emit('party:sync', { action: 'play', time: video.currentTime, sender: currentUser });
      }
    });

    video.addEventListener('pause', () => {
      if (isRevertingAction) return;
      if (!isRemoteSync && socket && currentPartyId) {
        if (currentControlMode === 'host_only' && !isHost && !hasGrantedTemporaryControl) {
          isRevertingAction = true;
          video.play().catch(() => {}); // Revert local unauthorized pause
          showToast(`Controls locked by Host (${hostUserName}) 🔒`);
          setTimeout(() => { isRevertingAction = false; }, 200);
          return;
        }
        lastSyncedAction = 'pause';
        lastSyncedTime = video.currentTime;
        socket.emit('party:sync', { action: 'pause', time: video.currentTime, sender: currentUser });
      }
    });

    video.addEventListener('seeked', () => {
      if (isRevertingAction) return;

      // Check if this seek was triggered by remote sync
      if (remoteSeekTarget !== null) {
        const isMatchingTarget = Math.abs(video.currentTime - remoteSeekTarget) < 1.5 || (Date.now() - remoteSeekTimestamp < 3500);
        if (isMatchingTarget) {
          remoteSeekTarget = null;
          lastSyncedTime = video.currentTime;
          return; // Programmatic seek consumed - do not re-emit!
        }
      }

      if (!isRemoteSync && socket && currentPartyId) {
        if (currentControlMode === 'host_only' && !isHost && !hasGrantedTemporaryControl) {
          isRevertingAction = true;
          video.currentTime = lastSyncedTime; // Revert to last synced time
          showToast(`Controls locked by Host (${hostUserName}) 🔒`);
          setTimeout(() => { isRevertingAction = false; }, 200);
          return;
        }
        lastSyncedTime = video.currentTime;
        socket.emit('party:sync', { action: 'seek', time: video.currentTime, sender: currentUser });
      }
    });

    // Auto join if query param was present
    if (initialPartyParam) {
      setTimeout(() => {
        joinPartyRoom(initialPartyParam, false);
      }, 500);
    }

    // Initial visibility check (ensures reactions bar is hidden when not in hosted watch party)
    updateReactionsBarVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWatchParty);
  } else {
    initWatchParty();
  }
})();
