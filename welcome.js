/**
 * =========================================================================
 * INFINX PRO MAX — FLAGSHIP CINEMATIC WELCOME EXPERIENCE (ULTRA EDITION)
 * =========================================================================
 * Features:
 *  - 3D Hyperspace Warp-Speed Canvas (Stars stretch into radial lightspeed lasers)
 *  - 3D Interactive Parallax & Tilt Physics (Stage responds to mouse & gyro)
 *  - Precision IMAX / Dolby Soundscape with Strict Lifecycle & Zero Post-Intro Leakage
 *  - Mobile Tactile Haptic Feedback (Vibration API synchronization)
 *  - Real-Time Hardware & Network Telemetry (Live ping & real resolution detection)
 *  - "Continue Watching" Quick-Resume Teaser with one-click direct episode launch
 *  - 2.39:1 Cinema Letterbox Curtains & Anamorphic Laser Lens Flare
 *  - Sound Mute/Unmute toggle & Session Intelligence
 * =========================================================================
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'infinx_welcome_shown';
  const SOUND_KEY = 'infinx_welcome_muted';
  const FORCE_PARAM = ['intro', 'welcome', 'splash'];

  // Check if force query param is active
  const urlParams = new URLSearchParams(window.location.search);
  const isForced = FORCE_PARAM.some(param => urlParams.get(param) === 'true' || urlParams.get(param) === '1');

  // If already shown in this session and not forced, exit immediately
  if (sessionStorage.getItem(STORAGE_KEY) && !isForced) {
    return;
  }

  // Inject overlay HTML if not already in DOM
  function ensureWelcomeDOM() {
    let overlay = document.getElementById('premiumWelcomeOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'premiumWelcomeOverlay';
      overlay.className = 'premium-welcome-overlay';
      overlay.innerHTML = `
        <!-- Widescreen 2.39:1 Cinema Letterbox Curtains -->
        <div id="welcomeCurtainTop" class="welcome-curtain welcome-curtain-top"></div>
        <div id="welcomeCurtainBottom" class="welcome-curtain welcome-curtain-bottom"></div>

        <!-- Anamorphic Blue Laser Lens Flare -->
        <div id="welcomeLensFlare" class="welcome-lens-flare"></div>

        <!-- Floating Ambient Nebulae -->
        <div class="welcome-nebula welcome-nebula-1"></div>
        <div class="welcome-nebula welcome-nebula-2"></div>
        <div class="welcome-nebula welcome-nebula-3"></div>

        <!-- 3D Hyperspace Warp Starfield Canvas -->
        <canvas id="welcomeParticleCanvas" class="welcome-canvas"></canvas>

        <!-- Top Bar Action Controls -->
        <div class="welcome-top-controls">
          <button id="welcomeSoundToggle" class="welcome-sound-toggle" title="Toggle Cinematic Audio">
            <i class="fas fa-volume-up"></i>
            <span id="welcomeSoundLabel">AUDIO ON</span>
          </button>
          <button id="welcomeSkipBtn" class="welcome-skip-btn" title="Skip Intro (Esc)">
            <span>Skip</span>
            <kbd>ESC</kbd>
          </button>
        </div>

        <!-- 3D Perspective Wrap for Tilt Physics -->
        <div class="welcome-perspective-wrap">
          <div id="welcomeStage" class="welcome-stage">
            <!-- Hologram Orb with Infinity Symbol -->
            <div id="welcomeRingContainer" class="welcome-ring-container">
              <div class="welcome-ring-glow"></div>
              <div class="welcome-ring-outer"></div>
              <div class="welcome-emblem-orb">
                <i class="fas fa-infinity"></i>
              </div>
            </div>

            <!-- Brand Title Block -->
            <div class="welcome-brand-block">
              <h1 class="welcome-title-main welcome-chromatic">INFINX <span class="welcome-title-pro">PRO</span></h1>
              <div class="welcome-features-bar">
                <span class="welcome-feat-tag" id="welcomeResolutionBadge">4K ULTRA HDR</span>
                <span class="welcome-feat-dot">•</span>
                <span class="welcome-feat-tag">DOLBY ATMOS</span>
                <span class="welcome-feat-dot">•</span>
                <span class="welcome-feat-tag" id="welcomePingBadge">ZERO ADS</span>
              </div>
            </div>

            <!-- Continue Watching Quick-Resume OR Personalized Greeting -->
            <div id="welcomeResumeMount" class="welcome-resume-container">
              <!-- Dynamically populated -->
            </div>

            <!-- Laser Progress Bar -->
            <div class="welcome-progress-block">
              <div class="welcome-laser-track">
                <div id="welcomeLaserFill" class="welcome-laser-fill"></div>
              </div>
              <div class="welcome-status-line">
                <span id="welcomeStatusMsg" class="welcome-status-msg">CALIBRATING SYSTEM...</span>
                <span id="welcomePercentNum" class="welcome-percent-num">0%</span>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.prepend(overlay);
    }
    return overlay;
  }

  // Precision Cinematic Soundscape Synthesizer (Zero-Leakage Lifecycle)
  class WelcomeSoundEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.isMuted = localStorage.getItem(SOUND_KEY) === 'true';
      this.hasStarted = false;
      this.isDestroyed = false;
      this.activeOscillators = [];
    }

    init() {
      if (this.isDestroyed) return;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    toggleMute() {
      if (this.isDestroyed) return true;
      this.isMuted = !this.isMuted;
      localStorage.setItem(SOUND_KEY, this.isMuted ? 'true' : 'false');
      if (this.masterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, now);
      }
      return this.isMuted;
    }

    // Start silky ambient sub-drone and gentle riser
    startCinematicAmbience() {
      if (this.isMuted || this.hasStarted || this.isDestroyed) return;
      try {
        this.init();
        if (!this.ctx || !this.masterGain) return;
        this.hasStarted = true;

        const now = this.ctx.currentTime;

        // 1. Warm Sub-Bass Resonance (48Hz gentle dive, automatically stops at 2.0s)
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        const subFilter = this.ctx.createBiquadFilter();

        subFilter.type = 'lowpass';
        subFilter.frequency.setValueAtTime(110, now);

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(48, now);
        subOsc.frequency.exponentialRampToValueAtTime(36, now + 1.8);

        subGain.gain.setValueAtTime(0.0001, now);
        subGain.gain.exponentialRampToValueAtTime(0.2, now + 0.3);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

        subOsc.connect(subFilter);
        subFilter.connect(subGain);
        subGain.connect(this.masterGain);

        subOsc.start(now);
        subOsc.stop(now + 2.05);
        this.activeOscillators.push(subOsc);

        // 2. Silky Harmonic Riser (Warm triangle with soft lowpass, no harsh buzzing)
        const riserOsc = this.ctx.createOscillator();
        const riserGain = this.ctx.createGain();
        const riserFilter = this.ctx.createBiquadFilter();

        riserFilter.type = 'lowpass';
        riserFilter.frequency.setValueAtTime(260, now);
        riserFilter.frequency.exponentialRampToValueAtTime(950, now + 1.95);

        riserOsc.type = 'triangle';
        riserOsc.frequency.setValueAtTime(130.81, now); // C3
        riserOsc.frequency.exponentialRampToValueAtTime(261.63, now + 1.95); // C4

        riserGain.gain.setValueAtTime(0.0001, now);
        riserGain.gain.exponentialRampToValueAtTime(0.065, now + 1.4);
        riserGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

        riserOsc.connect(riserFilter);
        riserFilter.connect(riserGain);
        riserGain.connect(this.masterGain);

        riserOsc.start(now);
        riserOsc.stop(now + 2.05);
        this.activeOscillators.push(riserOsc);

      } catch (e) {}
    }

    // Play Hyperspace Warp Boom & Crisp Crystal Chime
    playWarpIgnition() {
      if (this.isMuted || this.isDestroyed) return;
      try {
        this.init();
        if (!this.ctx || !this.masterGain) return;

        const now = this.ctx.currentTime;

        // Immediately fade & stop prior ambient oscillators
        this.activeOscillators.forEach(osc => {
          try { osc.stop(now + 0.02); } catch (e) {}
        });

        // Sub Kick Impact (85Hz -> 24Hz in 260ms)
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(85, now);
        kickOsc.frequency.exponentialRampToValueAtTime(24, now + 0.26);

        kickGain.gain.setValueAtTime(0.28, now);
        kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        kickOsc.connect(kickGain);
        kickGain.connect(this.masterGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.38);
        this.activeOscillators.push(kickOsc);

        // Concise Glass Triad (E5, B5, E6 — finishes strictly within 420ms)
        const notes = [659.25, 987.77, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.025);

          const startT = now + idx * 0.025;
          gain.gain.setValueAtTime(0.0001, startT);
          gain.gain.exponentialRampToValueAtTime(0.08 / (idx + 1), startT + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, startT + 0.42);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(startT);
          osc.stop(startT + 0.45);
          this.activeOscillators.push(osc);
        });

      } catch (e) {}
    }

    // Complete, hard termination of all audio nodes and audio context
    stopAndDestroy() {
      this.isDestroyed = true;
      try {
        if (this.masterGain && this.ctx) {
          const now = this.ctx.currentTime;
          this.masterGain.gain.cancelScheduledValues(now);
          this.masterGain.gain.setValueAtTime(0, now);
        }
        // Force stop and disconnect every active oscillator
        this.activeOscillators.forEach(osc => {
          try {
            osc.stop();
            osc.disconnect();
          } catch (e) {}
        });
        this.activeOscillators = [];

        // Close and discard AudioContext completely
        if (this.ctx) {
          if (typeof this.ctx.close === 'function') {
            this.ctx.close().catch(() => {});
          }
          this.ctx = null;
        }
      } catch (e) {}
    }
  }

  // 3D Hyperspace Warp-Speed Canvas Engine
  class WelcomeWarpCanvas {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.stars = [];
      this.starCount = 140;
      this.fov = 320;
      this.width = 0;
      this.height = 0;
      this.cx = 0;
      this.cy = 0;
      this.speed = 1.4; // normal cruise
      this.targetSpeed = 1.4;
      this.isWarping = false;
      this.animationId = null;
      this.colors = ['#ffffff', '#00f0ff', '#ff0055', '#c084fc'];

      this.resize = this.resize.bind(this);
      this.animate = this.animate.bind(this);
    }

    start() {
      this.resize();
      window.addEventListener('resize', this.resize);

      this.stars = [];
      for (let i = 0; i < this.starCount; i++) {
        this.stars.push(this.createStar());
      }

      this.animate();
    }

    resize() {
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
      this.cx = this.width / 2;
      this.cy = this.height / 2;
    }

    createStar() {
      return {
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        z: Math.random() * 1000 + 1,
        prevZ: 0,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        size: Math.random() * 1.5 + 0.6
      };
    }

    setSpeed(spd, smooth = false) {
      this.targetSpeed = spd;
      if (!smooth) this.speed = spd;
    }

    triggerHyperspace() {
      this.isWarping = true;
      this.targetSpeed = 68; // Hyperdrive speed
    }

    animate() {
      // Smooth speed interpolation
      this.speed += (this.targetSpeed - this.speed) * 0.15;

      // In warp mode, leave light motion trails
      if (this.isWarping) {
        this.ctx.fillStyle = 'rgba(5, 5, 13, 0.35)';
        this.ctx.fillRect(0, 0, this.width, this.height);
      } else {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }

      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i];
        star.prevZ = star.z;
        star.z -= this.speed;

        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * 2000;
          star.y = (Math.random() - 0.5) * 2000;
          star.z = 1000;
          star.prevZ = 1000;
        }

        const sx = this.cx + (star.x / star.z) * this.fov;
        const sy = this.cy + (star.y / star.z) * this.fov;

        // Skip off-screen
        if (sx < 0 || sx > this.width || sy < 0 || sy > this.height) {
          star.z = 1000;
          continue;
        }

        const depthRatio = 1 - star.z / 1000;

        if (this.isWarping) {
          // Render stretched light laser streak
          const prevSx = this.cx + (star.x / star.prevZ) * this.fov;
          const prevSy = this.cy + (star.y / star.prevZ) * this.fov;

          this.ctx.beginPath();
          this.ctx.moveTo(prevSx, prevSy);
          this.ctx.lineTo(sx, sy);
          this.ctx.strokeStyle = star.color;
          this.ctx.lineWidth = Math.min(4, (1 + depthRatio * 2.5));
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = star.color;
          this.ctx.stroke();
        } else {
          // Render glowing star orb
          const r = star.size * (1 + depthRatio * 1.5);
          this.ctx.beginPath();
          this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
          this.ctx.fillStyle = star.color;
          this.ctx.globalAlpha = Math.max(0.15, depthRatio);
          this.ctx.shadowBlur = 6;
          this.ctx.shadowColor = star.color;
          this.ctx.fill();

          // Connect faint constellation threads
          if (depthRatio > 0.4) {
            for (let j = i + 1; j < Math.min(i + 8, this.stars.length); j++) {
              const other = this.stars[j];
              const ox = this.cx + (other.x / other.z) * this.fov;
              const oy = this.cy + (other.y / other.z) * this.fov;
              const dist = Math.hypot(sx - ox, sy - oy);
              if (dist < 75) {
                this.ctx.beginPath();
                this.ctx.moveTo(sx, sy);
                this.ctx.lineTo(ox, oy);
                this.ctx.strokeStyle = star.color;
                this.ctx.globalAlpha = (1 - dist / 75) * 0.12;
                this.ctx.stroke();
              }
            }
          }
        }
      }

      this.ctx.globalAlpha = 1;
      this.ctx.shadowBlur = 0;

      this.animationId = requestAnimationFrame(this.animate);
    }

    stop() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      window.removeEventListener('resize', this.resize);
    }
  }

  // Master Welcome Coordinator
  async function launchWelcomeController() {
    const overlay = ensureWelcomeDOM();
    const canvas = document.getElementById('welcomeParticleCanvas');
    const stage = document.getElementById('welcomeStage');
    const ringContainer = document.getElementById('welcomeRingContainer');
    const soundToggle = document.getElementById('welcomeSoundToggle');
    const soundLabel = document.getElementById('welcomeSoundLabel');
    const skipBtn = document.getElementById('welcomeSkipBtn');
    const fillBar = document.getElementById('welcomeLaserFill');
    const statusMsg = document.getElementById('welcomeStatusMsg');
    const percentNum = document.getElementById('welcomePercentNum');
    const resumeMount = document.getElementById('welcomeResumeMount');
    const lensFlare = document.getElementById('welcomeLensFlare');
    const curtainTop = document.getElementById('welcomeCurtainTop');
    const curtainBottom = document.getElementById('welcomeCurtainBottom');
    const resBadge = document.getElementById('welcomeResolutionBadge');
    const pingBadge = document.getElementById('welcomePingBadge');

    let isDismissed = false;
    const soundEngine = new WelcomeSoundEngine();
    const warpCanvas = new WelcomeWarpCanvas(canvas);

    // Initialize sound button state
    if (soundEngine.isMuted) {
      soundToggle.classList.add('is-muted');
      soundToggle.querySelector('i').className = 'fas fa-volume-mute';
      soundLabel.innerText = 'AUDIO OFF';
    }

    // Toggle Sound Button
    soundToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const muted = soundEngine.toggleMute();
      if (muted) {
        soundToggle.classList.add('is-muted');
        soundToggle.querySelector('i').className = 'fas fa-volume-mute';
        soundLabel.innerText = 'AUDIO OFF';
      } else {
        soundToggle.classList.remove('is-muted');
        soundToggle.querySelector('i').className = 'fas fa-volume-up';
        soundLabel.innerText = 'AUDIO ON';
        if (!isDismissed) {
          soundEngine.startCinematicAmbience();
        }
      }
    });

    // Start 3D Warp Canvas
    warpCanvas.start();

    // 3D Mouse Parallax & Gyroscope Physics
    const onMouseMove = (e) => {
      if (isDismissed || !stage) return;
      const hw = window.innerWidth / 2;
      const hh = window.innerHeight / 2;
      const dx = (e.clientX - hw) / hw;
      const dy = (e.clientY - hh) / hh;

      const rotY = dx * 14;
      const rotX = -dy * 12;

      stage.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(10px)`;
      if (ringContainer) {
        ringContainer.style.transform = `rotateX(${rotX * 1.4}deg) rotateY(${rotY * 1.4}deg) translateZ(25px)`;
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    // Device orientation for mobile phones
    const onOrientation = (e) => {
      if (isDismissed || !stage || !e.beta) return;
      const rotX = Math.min(12, Math.max(-12, (e.beta - 45) * 0.4));
      const rotY = Math.min(14, Math.max(-14, e.gamma * 0.5));
      stage.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(10px)`;
    };
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', onOrientation);
    }

    // Measure Real Screen & Hardware Diagnostics
    const dpr = window.devicePixelRatio || 1;
    const realW = Math.round(window.screen.width * dpr);
    const realH = Math.round(window.screen.height * dpr);
    const isHDR = window.matchMedia && window.matchMedia('(dynamic-range: high)').matches;
    if (resBadge) {
      resBadge.innerText = isHDR ? '4K HDR 10-BIT' : (realW >= 1920 ? '1080P PRO' : 'HD PRO');
    }

    // Ping Latency Measurement
    let edgePing = 18;
    try {
      const t0 = performance.now();
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
      edgePing = Math.max(4, Math.round(performance.now() - t0));
      if (pingBadge) {
        pingBadge.innerText = `${edgePing}ms EDGE`;
      }
    } catch (e) {
      if (pingBadge) pingBadge.innerText = 'ONLINE';
    }

    // Continue Watching Quick-Resume Detection
    let hasContinueWatching = false;
    try {
      const rawCW = localStorage.getItem('@infinx_continue_watching');
      if (rawCW) {
        const cwList = JSON.parse(rawCW);
        if (Array.isArray(cwList) && cwList.length > 0) {
          const item = cwList[0];
          const isLunar = !!(item.isLunar || (item.episode?.show?.isLunar) || item.lunarId);
          const anilistId = item.lunarId || item.anilistId || item.episode?.show?.anilistId;
          const showId = item.showId || item.id || item.episode?.show?.id || item.episodeId;
          const epNum = item.episodeNumber || item.episode?.episodeNumber || 1;
          const showTitle = item.title || item.showTitle || item.episode?.show?.title || 'Anime Series';
          const posterUrl = item.poster || item.episode?.show?.poster || 'Postes/spyfamS3p.jpg';
          const progress = item.progress || 0;
          const seekParam = progress > 5 ? `&t=${Math.floor(progress)}` : '';

          const targetUrl = isLunar
            ? `/watch?id=${anilistId}&ep=${epNum}${seekParam}`
            : `/watch?id=${showId || item.episodeId}${seekParam}`;

          resumeMount.innerHTML = `
            <div class="welcome-resume-card">
              <img class="welcome-resume-thumb" src="${posterUrl}" onerror="this.onerror=null; this.src='Postes/spyfamS3p.jpg';" alt="${showTitle}">
              <div class="welcome-resume-info">
                <span class="welcome-resume-label">RESUME STREAMING</span>
                <span class="welcome-resume-title">${showTitle} • Ep ${epNum}</span>
              </div>
              <a href="${targetUrl}" class="welcome-resume-btn" id="welcomeResumeAction">
                <i class="fas fa-play"></i> RESUME
              </a>
            </div>
          `;
          hasContinueWatching = true;

          const resumeAction = document.getElementById('welcomeResumeAction');
          if (resumeAction) {
            resumeAction.addEventListener('click', () => {
              sessionStorage.setItem(STORAGE_KEY, 'true');
            });
          }
        }
      }
    } catch (e) {}

    // Fallback to Personalized Member/Guest Greeting
    if (!hasContinueWatching) {
      try {
        const userEmail = localStorage.getItem('infinx_user_email');
        const token = localStorage.getItem('infinx_token');
        if (token && userEmail) {
          const cleanName = userEmail.split('@')[0];
          const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
          resumeMount.innerHTML = `
            <div class="welcome-greeting-pill">
              <i class="fas fa-crown" style="color: #ffd700;"></i>
              <span>Welcome back, <span class="welcome-user-name">${formattedName}</span></span>
            </div>
          `;
        } else {
          resumeMount.innerHTML = `
            <div class="welcome-greeting-pill">
              <i class="fas fa-sparkles"></i>
              <span>Welcome to <span class="welcome-user-name">Infinx Pro Max</span></span>
            </div>
          `;
        }
      } catch (e) {
        resumeMount.innerHTML = `
          <div class="welcome-greeting-pill">
            <i class="fas fa-sparkles"></i>
            <span>Welcome to <span class="welcome-user-name">Infinx Pro</span></span>
          </div>
        `;
      }
    }

    // Audio Autoplay & Gestures with Strict Removal on Exit
    const triggerAudio = () => {
      if (!isDismissed) {
        soundEngine.startCinematicAmbience();
      }
      document.removeEventListener('pointerdown', triggerAudio);
    };
    document.addEventListener('pointerdown', triggerAudio, { once: true });

    // Try starting ambience if browser policy permits
    setTimeout(() => {
      if (!isDismissed) {
        soundEngine.startCinematicAmbience();
      }
    }, 180);

    // Mobile Haptics Helper
    const haptic = (pattern) => {
      if (navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch (e) {}
      }
    };

    // Dismissal & Hyperspace Jump Sequence
    const dismissIntro = (fast = false) => {
      if (isDismissed) return;
      isDismissed = true;

      // CRITICAL: Immediately remove pointerdown listener so clicking anywhere on the page NEVER plays intro audio!
      document.removeEventListener('pointerdown', triggerAudio);

      sessionStorage.setItem(STORAGE_KEY, 'true');

      // Warp speed ignition & audio climax
      warpCanvas.triggerHyperspace();

      if (!fast) {
        soundEngine.playWarpIgnition();
      } else {
        // If skipped fast, hard cut all audio immediately
        soundEngine.stopAndDestroy();
      }
      haptic([40, 30, 80, 50, 120]);

      // Anamorphic laser lens flare
      if (lensFlare) lensFlare.classList.add('flare-ignite');

      // Part cinematic letterbox curtains
      overlay.classList.add('welcome-curtains-open');

      // Zoom dissolve overlay
      setTimeout(() => {
        overlay.classList.add('welcome-leaving');
      }, fast ? 100 : 200);

      const totalDelay = fast ? 350 : 650;
      setTimeout(() => {
        overlay.classList.add('welcome-hidden');
        warpCanvas.stop();

        // GUARANTEED HARD TERMINATION: kills all audio nodes, closes context, sets volume to 0
        soundEngine.stopAndDestroy();

        window.removeEventListener('mousemove', onMouseMove);
        if (window.DeviceOrientationEvent) {
          window.removeEventListener('deviceorientation', onOrientation);
        }
        overlay.remove();
      }, totalDelay);
    };

    // Skip Button Event
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissIntro(true);
      });
    }

    // Keyboard Shortcuts
    const onKeydown = (e) => {
      if (e.key === 'Escape' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        window.removeEventListener('keydown', onKeydown);
        dismissIntro(true);
      }
    };
    window.addEventListener('keydown', onKeydown);

    // Real Hardware & Diagnostic Milestones Telemetry
    const telemetrySteps = [
      { at: 180, pct: 15, msg: `DISPLAY: ${realW}×${realH} ${isHDR ? '• 10-BIT HDR' : 'CALIBRATED'}` },
      { at: 600, pct: 40, msg: `EDGE LATENCY: ${edgePing}ms • LUNARX READY` },
      { at: 1100, pct: 70, msg: `AUDIO CORE: DOLBY ATMOS 3D SPATIAL` },
      { at: 1650, pct: 90, msg: `WARP DRIVE CHARGED • SYSTEM OPTIMAL` },
      { at: 2100, pct: 100, msg: `ENGAGING HYPERSPACE JUMP...` },
    ];

    telemetrySteps.forEach((step) => {
      setTimeout(() => {
        if (isDismissed) return;
        if (fillBar) fillBar.style.width = `${step.pct}%`;
        if (percentNum) percentNum.innerText = `${step.pct}%`;
        if (statusMsg) statusMsg.innerText = step.msg;
        haptic(15);
      }, step.at);
    });

    // Auto-engage warp jump when progress finishes
    setTimeout(() => {
      if (!isDismissed) {
        dismissIntro(false);
      }
    }, 2450);
  }

  // Public replay API: window.replayWelcomeIntro()
  window.replayWelcomeIntro = function () {
    sessionStorage.removeItem(STORAGE_KEY);
    const old = document.getElementById('premiumWelcomeOverlay');
    if (old) old.remove();
    launchWelcomeController();
  };

  // Launch on ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launchWelcomeController);
  } else {
    launchWelcomeController();
  }
})();
