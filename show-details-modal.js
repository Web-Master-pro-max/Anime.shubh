/**
 * Infinx Anime - Show Details Modal & Series Progress Engine
 * Parity with mobile ShowDetailScreen.js
 */

(function () {
  // Ensure styles are injected
  function injectShowDetailsStyles() {
    if (document.getElementById('infinx-show-details-styles')) return;
    const style = document.createElement('style');
    style.id = 'infinx-show-details-styles';
    style.textContent = `
      .show-details-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 4, 8, 0.85);
        backdrop-filter: blur(18px) saturate(160%);
        -webkit-backdrop-filter: blur(18px) saturate(160%);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .show-details-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .show-details-dialog {
        background: linear-gradient(180deg, #14142b 0%, #080812 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 22px;
        width: 100%;
        max-width: 860px;
        max-height: 92vh;
        overflow-y: auto;
        overflow-x: hidden;
        position: relative;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.85), 0 0 45px rgba(255, 0, 85, 0.15);
        transform: scale(0.93) translateY(20px);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .show-details-overlay.active .show-details-dialog {
        transform: scale(1) translateY(0);
      }
      .show-details-dialog::-webkit-scrollbar {
        width: 6px;
      }
      .show-details-dialog::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.18);
        border-radius: 3px;
      }
      .show-details-dialog::-webkit-scrollbar-thumb:hover {
        background: var(--primary, #ff0055);
      }
      .show-backdrop-hero {
        position: relative;
        width: 100%;
        height: 320px;
        overflow: hidden;
      }
      @media (max-width: 600px) {
        .show-backdrop-hero {
          height: 220px;
        }
      }
      .show-backdrop-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .show-backdrop-gradient {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(4, 4, 8, 0.2) 0%, rgba(8, 8, 18, 0.7) 65%, #14142b 100%);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 20px;
      }
      .show-action-btn-circle {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: rgba(10, 10, 20, 0.65);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        cursor: pointer;
        transition: all 0.25s ease;
      }
      .show-action-btn-circle:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.08);
      }
      .show-action-btn-circle.bookmarked {
        color: var(--primary, #ff0055);
        border-color: rgba(255, 0, 85, 0.4);
        box-shadow: 0 0 15px rgba(255, 0, 85, 0.35);
      }
      .show-details-body {
        padding: 24px 30px 40px;
      }
      @media (max-width: 600px) {
        .show-details-body {
          padding: 16px 18px 30px;
        }
      }
      .show-title-main {
        font-family: 'Outfit', sans-serif;
        font-size: 2.8rem;
        font-weight: 900;
        color: #fff;
        line-height: 1.2;
        margin-bottom: 12px;
        letter-spacing: -0.5px;
      }
      @media (max-width: 600px) {
        .show-title-main {
          font-size: 2.1rem;
        }
      }
      .show-meta-row {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .show-rating-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: rgba(255, 170, 0, 0.18);
        border: 1px solid rgba(255, 170, 0, 0.35);
        color: #ffaa00;
        font-size: 1.25rem;
        font-weight: 800;
        padding: 4px 9px;
        border-radius: 6px;
      }
      .show-meta-sub {
        font-size: 1.3rem;
        color: #a0a5b9;
        font-weight: 500;
      }
      .show-hd-chip {
        display: inline-flex;
        background: rgba(0, 240, 255, 0.15);
        border: 1px solid rgba(0, 240, 255, 0.3);
        color: #00f0ff;
        font-size: 1.1rem;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 4px;
      }
      .show-genre-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 22px;
      }
      .show-genre-tag {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #d1d5e5;
        font-size: 1.2rem;
        font-weight: 600;
        padding: 5px 12px;
        border-radius: 20px;
        transition: all 0.2s;
      }
      .show-genre-tag:hover {
        border-color: var(--primary, #ff0055);
        color: #fff;
      }
      .show-primary-play-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        background: linear-gradient(135deg, #ff0055 0%, #b800ff 100%);
        border: none;
        border-radius: 12px;
        color: #fff;
        font-size: 1.5rem;
        font-weight: 800;
        padding: 16px 24px;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(255, 0, 85, 0.4);
        transition: all 0.3s ease;
        margin-bottom: 24px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .show-primary-play-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 14px 40px rgba(255, 0, 85, 0.55);
      }
      .show-synopsis-title {
        font-family: 'Outfit', sans-serif;
        font-size: 1.7rem;
        font-weight: 800;
        color: #fff;
        margin-bottom: 8px;
      }
      .show-synopsis-p {
        font-size: 1.4rem;
        color: #b3b8ca;
        line-height: 1.7;
        margin-bottom: 28px;
      }
      .episodes-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .episodes-section-title {
        font-family: 'Outfit', sans-serif;
        font-size: 1.9rem;
        font-weight: 800;
        color: #fff;
      }
      .episodes-section-stats {
        font-size: 1.25rem;
        color: #a0a5b9;
        font-weight: 600;
      }
      .episodes-card-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ep-row-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 14px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: all 0.25s ease;
      }
      .ep-row-card:hover {
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(255, 0, 85, 0.35);
        transform: translateX(4px);
      }
      .ep-row-card.completed {
        border-left: 3px solid #00ff88;
      }
      .ep-row-card.current {
        border-left: 3px solid var(--primary, #ff0055);
        background: rgba(255, 0, 85, 0.08);
      }
      .ep-row-num-badge {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        font-weight: 800;
        color: #a0a5b9;
        flex-shrink: 0;
      }
      .ep-row-card.current .ep-row-num-badge {
        background: rgba(255, 0, 85, 0.2);
        color: var(--primary, #ff0055);
      }
      .ep-row-card.completed .ep-row-num-badge {
        background: rgba(0, 255, 136, 0.15);
        color: #00ff88;
      }
      .ep-row-info {
        flex: 1;
        min-width: 0;
      }
      .ep-row-title-line {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
        flex-wrap: wrap;
      }
      .ep-row-title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ep-row-meta {
        font-size: 1.2rem;
        color: #8c92a5;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ep-row-progress-track {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: rgba(0, 0, 0, 0.5);
      }
      .ep-row-progress-fill {
        height: 100%;
        background: var(--primary, #ff0055);
        transition: width 0.3s;
      }
      .ep-row-play-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        flex-shrink: 0;
        transition: all 0.2s;
      }
      .ep-row-card:hover .ep-row-play-btn {
        background: var(--primary, #ff0055);
        transform: scale(1.1);
      }
    `;
    document.head.appendChild(style);
  }

  function formatDuration(sec) {
    if (!sec || sec <= 0) return '0:00';
    const totalSec = Math.floor(sec);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  }

  // Create Modal Element
  function createModalDOM() {
    let overlay = document.getElementById('infinxShowDetailsModal');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'infinxShowDetailsModal';
    overlay.className = 'show-details-overlay';
    overlay.innerHTML = `
      <div class="show-details-dialog" id="infinxShowDetailsDialog">
        <div class="show-backdrop-hero">
          <img id="showModalBackdropImg" src="" alt="Show Backdrop" class="show-backdrop-img">
          <div class="show-backdrop-gradient">
            <button class="show-action-btn-circle" id="showModalBackBtn" aria-label="Close modal">
              <i class="fas fa-arrow-left"></i>
            </button>
            <div style="display: flex; gap: 8px;">
              <button class="show-action-btn-circle" id="showModalBookmarkBtn" aria-label="Toggle Watchlist">
                <i class="far fa-bookmark" id="showModalBookmarkIcon"></i>
              </button>
              <button class="show-action-btn-circle" id="showModalCloseBtn" aria-label="Close">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="show-details-body">
          <h2 class="show-title-main" id="showModalTitle">Loading...</h2>

          <div class="show-meta-row">
            <div class="show-rating-chip" id="showModalRating"><i class="fas fa-star"></i> 4.9</div>
            <span class="show-meta-sub" id="showModalYear">2024</span>
            <span class="show-meta-sub">•</span>
            <span class="show-meta-sub" id="showModalEpCount">0 Episodes</span>
            <span class="show-meta-sub">•</span>
            <span class="show-hd-chip">HD</span>
          </div>

          <div class="show-genre-chips" id="showModalGenres"></div>

          <!-- Main Play Action Button -->
          <button class="show-primary-play-btn" id="showModalPrimaryPlayBtn">
            <i class="fas fa-play"></i> <span id="showModalPrimaryPlayText">START WATCHING</span>
          </button>

          <!-- Series Progress Card (Mobile Parity) -->
          <div class="series-progress-card" id="showModalProgressCard" style="margin-bottom: 24px;">
            <div class="series-progress-header">
              <div class="series-progress-title">
                <i class="fas fa-chart-line" style="color: var(--primary, #ff0055);"></i>
                <span>Series Watch Progress</span>
              </div>
              <span class="series-progress-percent" id="showModalProgressPercent">0%</span>
            </div>
            <div class="series-progress-track">
              <div class="series-progress-fill" id="showModalProgressFill" style="width: 0%;"></div>
            </div>
            <div class="series-progress-stats">
              <div class="stat-chip"><i class="fas fa-film"></i><span>Total: <strong id="showModalTotalEpisodes">0</strong></span></div>
              <div class="stat-chip"><i class="fas fa-check-circle" style="color:#00ff88;"></i><span>Watched: <strong id="showModalWatchedEpisodes">0</strong></span></div>
              <div class="stat-chip"><i class="fas fa-clock" style="color:var(--secondary, #00f0ff);"></i><span>Left: <strong id="showModalRemainingEpisodes">0</strong></span></div>
            </div>
          </div>

          <!-- Synopsis Section -->
          <h3 class="show-synopsis-title">Synopsis</h3>
          <p class="show-synopsis-p" id="showModalSynopsis">...</p>

          <!-- Episodes Section -->
          <div class="episodes-section-header">
            <h3 class="episodes-section-title">Episodes</h3>
            <span class="episodes-section-stats" id="showModalEpisodesStats">0 Watched • 0 Left</span>
          </div>
          <div class="episodes-card-list" id="showModalEpisodesList"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners for close
    const closeBtn = overlay.querySelector('#showModalCloseBtn');
    const backBtn = overlay.querySelector('#showModalBackBtn');
    const dialog = overlay.querySelector('#infinxShowDetailsDialog');

    const closeModal = () => {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backBtn) backBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
      if (!dialog.contains(e.target)) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeModal();
      }
    });

    return overlay;
  }

  // Open Show Details
  window.openShowDetails = async function (showInput) {
    injectShowDetailsStyles();
    const overlay = createModalDOM();

    let show = null;
    let showId = null;

    if (typeof showInput === 'object' && showInput !== null) {
      show = showInput;
      showId = show.id;
    } else {
      showId = showInput;
    }

    if (!showId) return;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Fetch full details if needed
    const apiBase = window.API_BASE || '/api';
    try {
      const res = await fetch(`${apiBase}/shows/${showId}`);
      if (res.ok) {
        show = await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch full show details:', e);
    }

    if (!show) return;

    // Render Basic Details
    const titleEl = document.getElementById('showModalTitle');
    const backdropEl = document.getElementById('showModalBackdropImg');
    const ratingEl = document.getElementById('showModalRating');
    const yearEl = document.getElementById('showModalYear');
    const epCountEl = document.getElementById('showModalEpCount');
    const genresEl = document.getElementById('showModalGenres');
    const synopsisEl = document.getElementById('showModalSynopsis');
    const bookmarkIcon = document.getElementById('showModalBookmarkIcon');
    const bookmarkBtn = document.getElementById('showModalBookmarkBtn');

    if (titleEl) titleEl.textContent = show.title;
    if (ratingEl) ratingEl.innerHTML = `<i class="fas fa-star"></i> ${show.rating ? parseFloat(show.rating).toFixed(1) : '4.9'}`;
    if (yearEl) yearEl.textContent = show.year || '2024';
    if (synopsisEl) synopsisEl.textContent = show.description || 'No synopsis available for this show.';

    const rawBanner = show.banner || show.poster;
    const bannerUrl = (typeof window.formatMediaUrl === 'function')
      ? window.formatMediaUrl(rawBanner)
      : (rawBanner || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800');
    if (backdropEl) backdropEl.src = bannerUrl;

    // Genres
    if (genresEl) {
      if (show.categories && show.categories.length > 0) {
        genresEl.innerHTML = show.categories.map(c => `
          <span class="show-genre-tag">${c.category?.name || c.name || 'Anime'}</span>
        `).join('');
      } else {
        genresEl.innerHTML = '<span class="show-genre-tag">Anime</span><span class="show-genre-tag">Action</span>';
      }
    }

    // Watchlist Bookmark status
    let userWatchlist = [];
    try {
      userWatchlist = JSON.parse(localStorage.getItem('infinx_watchlist') || '[]');
    } catch (e) { }
    const isBookmarked = userWatchlist.includes(show.id);
    if (bookmarkIcon && bookmarkBtn) {
      bookmarkIcon.className = isBookmarked ? 'fas fa-bookmark' : 'far fa-bookmark';
      bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
      bookmarkBtn.onclick = async (e) => {
        e.stopPropagation();
        if (typeof window.toggleWatchlist === 'function') {
          await window.toggleWatchlist(bookmarkBtn, show.id);
        } else if (typeof window.toggleWatchlistItem === 'function') {
          await window.toggleWatchlistItem(bookmarkBtn, show.id);
        }
        let updatedList = [];
        try { updatedList = JSON.parse(localStorage.getItem('infinx_watchlist') || '[]'); } catch (err) { }
        const nowBookmarked = updatedList.includes(show.id);
        bookmarkIcon.className = nowBookmarked ? 'fas fa-bookmark' : 'far fa-bookmark';
        bookmarkBtn.classList.toggle('bookmarked', nowBookmarked);
      };
    }

    // Episodes & Progress calculations
    const episodes = (show.episodes && show.episodes.length > 0) ? show.episodes : [];
    if (epCountEl) epCountEl.textContent = `${episodes.length} Episodes`;

    let progressData = { episodes: {}, lastWatched: null };
    try {
      const rawProg = localStorage.getItem(`@infinx_episodes_progress_${show.id}`);
      if (rawProg) progressData = JSON.parse(rawProg);
    } catch (e) { }

    const episodesMap = progressData.episodes || {};
    const completedEpisodesCount = episodes.filter(ep => {
      const p = episodesMap[ep.id];
      return p && p.completed;
    }).length;

    const totalEpisodesCount = episodes.length;
    const remainingEpisodesCount = Math.max(0, totalEpisodesCount - completedEpisodesCount);
    const overallCompletionPercent = totalEpisodesCount > 0
      ? Math.round((completedEpisodesCount / totalEpisodesCount) * 100)
      : 0;

    // Series Progress UI
    const progressPercentEl = document.getElementById('showModalProgressPercent');
    const progressFillEl = document.getElementById('showModalProgressFill');
    const totalEl = document.getElementById('showModalTotalEpisodes');
    const watchedEl = document.getElementById('showModalWatchedEpisodes');
    const remainingEl = document.getElementById('showModalRemainingEpisodes');
    const epStatsEl = document.getElementById('showModalEpisodesStats');

    if (progressPercentEl) progressPercentEl.textContent = `${overallCompletionPercent}%`;
    if (progressFillEl) progressFillEl.style.width = `${overallCompletionPercent}%`;
    if (totalEl) totalEl.textContent = totalEpisodesCount;
    if (watchedEl) watchedEl.textContent = completedEpisodesCount;
    if (remainingEl) remainingEl.textContent = remainingEpisodesCount;
    if (epStatsEl) epStatsEl.textContent = `${completedEpisodesCount} Watched • ${remainingEpisodesCount} Left`;

    // Resume Episode logic
    let resumeEpisode = episodes[0] || null;
    let resumePosition = 0;

    if (progressData.lastWatched) {
      const matched = episodes.find(e => e.id === progressData.lastWatched.episodeId || e.episodeNumber === progressData.lastWatched.episodeNumber);
      if (matched) {
        resumeEpisode = matched;
        resumePosition = progressData.lastWatched.positionSeconds || 0;
      }
    }

    const hasResumeProgress = resumePosition > 10 && !progressData.lastWatched?.completed;
    const primaryPlayBtn = document.getElementById('showModalPrimaryPlayBtn');
    const primaryPlayText = document.getElementById('showModalPrimaryPlayText');

    if (primaryPlayText && resumeEpisode) {
      if (hasResumeProgress) {
        primaryPlayText.textContent = `RESUME EPISODE ${resumeEpisode.episodeNumber} (${formatDuration(resumePosition)})`;
      } else {
        primaryPlayText.textContent = `PLAY EPISODE ${resumeEpisode.episodeNumber || 1}`;
      }
    }

    if (primaryPlayBtn && resumeEpisode) {
      primaryPlayBtn.onclick = (e) => {
        const seekParam = (hasResumeProgress && resumePosition > 0) ? `&t=${resumePosition}` : '';
        const playUrl = `/video-player/index.html?episodeId=${resumeEpisode.id}${seekParam}`;
        if (typeof window.requireAuthPlay === 'function') {
          if (!window.requireAuthPlay(e, playUrl)) return;
        }
        window.location.href = playUrl;
      };
    }

    // Render Episodes List
    const episodesListEl = document.getElementById('showModalEpisodesList');
    if (episodesListEl) {
      if (episodes.length === 0) {
        episodesListEl.innerHTML = `<div style="color: #a0a5b9; padding: 20px; text-align: center;">No episodes currently uploaded.</div>`;
      } else {
        episodesListEl.innerHTML = episodes.map(ep => {
          const epProg = episodesMap[ep.id] || null;
          const isCompleted = epProg?.completed;
          const isInProgress = epProg && epProg.positionSeconds > 10 && !isCompleted;
          const isCurrentResume = resumeEpisode && resumeEpisode.id === ep.id;

          let badgeHtml = '';
          let progressTrackHtml = '';

          if (isCompleted) {
            badgeHtml = `<span class="badge-watched"><i class="fas fa-check-circle"></i> Watched</span>`;
            progressTrackHtml = `<div class="ep-row-progress-track"><div class="ep-row-progress-fill" style="width: 100%; background: #00ff88;"></div></div>`;
          } else if (isInProgress) {
            badgeHtml = `<span class="badge-in-progress">${epProg.progressPercent}%</span>`;
            progressTrackHtml = `<div class="ep-row-progress-track"><div class="ep-row-progress-fill" style="width: ${epProg.progressPercent}%;"></div></div>`;
          }

          const seekParam = (isInProgress && epProg.positionSeconds > 0) ? `&t=${epProg.positionSeconds}` : '';
          const epPlayUrl = `/video-player/index.html?episodeId=${ep.id}${seekParam}`;

          return `
            <div class="ep-row-card ${isCompleted ? 'completed' : ''} ${isCurrentResume ? 'current' : ''}" 
                 onclick="window.playModalEpisode(event, '${epPlayUrl}')">
              <div class="ep-row-num-badge">
                <span>EP</span>
                <span>${ep.episodeNumber}</span>
              </div>
              <div class="ep-row-info">
                <div class="ep-row-title-line">
                  <span class="ep-row-title">${ep.title}</span>
                  ${badgeHtml}
                </div>
                <div class="ep-row-meta">
                  <span>${ep.duration || '24m'} • HD</span>
                  ${isInProgress ? `<span>• Left at ${formatDuration(epProg.positionSeconds)}</span>` : ''}
                </div>
              </div>
              <div class="ep-row-play-btn"><i class="fas fa-play"></i></div>
              ${progressTrackHtml}
            </div>
          `;
        }).join('');
      }
    }
  };

  window.playModalEpisode = function (event, playUrl) {
    if (typeof window.requireAuthPlay === 'function') {
      if (!window.requireAuthPlay(event, playUrl)) return;
    }
    window.location.href = playUrl;
  };
})();
