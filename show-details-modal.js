/**
 * Infinx Anime - Show Details Modal & Series Progress Engine
 * Parity with mobile ShowDetailScreen.js
 */

(function () {
  // Sanitize raw HTML tags like <br> and <i> from descriptions
  function cleanHtmlText(str) {
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
      .ep-thumbnail-box {
        width: 80px;
        height: 48px;
        border-radius: 6px;
        overflow: hidden;
        flex-shrink: 0;
        position: relative;
        background: rgba(255, 255, 255, 0.05);
      }
      .ep-thumbnail-box img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .show-artworks-section {
        margin: 20px 0;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 14px;
        padding: 16px;
      }
      .artworks-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .artworks-title {
        font-size: 1.35rem;
        font-weight: 700;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .artworks-tabs {
        display: flex;
        gap: 6px;
      }
      .artwork-tab-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #a0a5b9;
        font-size: 1.1rem;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .artwork-tab-btn.active, .artwork-tab-btn:hover {
        background: var(--primary, #ff0055);
        color: #fff;
        border-color: transparent;
      }
      .artworks-carousel {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 8px;
        scroll-behavior: smooth;
      }
      .artworks-carousel::-webkit-scrollbar {
        height: 4px;
      }
      .artworks-carousel::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }
      .artwork-card {
        flex-shrink: 0;
        border-radius: 8px;
        overflow: hidden;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.25s ease;
        position: relative;
      }
      .artwork-card:hover {
        border-color: var(--primary, #ff0055);
        transform: translateY(-2px);
      }
      .artwork-card.banner-type {
        width: 220px;
        height: 65px;
      }
      .artwork-card.poster-type {
        width: 80px;
        height: 115px;
      }
      .artwork-card.fanart-type {
        width: 180px;
        height: 100px;
      }
      .artwork-card img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* Seasons & Franchise Section */
      .show-seasons-section {
        margin-bottom: 26px;
      }
      .seasons-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .seasons-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.15rem;
        font-weight: 700;
        color: #fff;
      }
      .seasons-badge {
        background: rgba(255, 0, 85, 0.18);
        border: 1px solid rgba(255, 0, 85, 0.4);
        color: #ff3377;
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 700;
      }
      .seasons-subtitle {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.5);
      }
      .seasons-carousel {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding: 4px 2px 14px 2px;
        scroll-behavior: smooth;
      }
      .seasons-carousel::-webkit-scrollbar {
        height: 6px;
      }
      .seasons-carousel::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }
      .seasons-carousel::-webkit-scrollbar-thumb:hover {
        background: var(--primary, #ff0055);
      }
      .season-card {
        flex: 0 0 165px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
        position: relative;
        text-align: left;
      }
      .season-card:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 0, 85, 0.5);
        transform: translateY(-4px);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55), 0 0 20px rgba(255, 0, 85, 0.3);
      }
      .season-card.current {
        border: 2px solid var(--primary, #ff0055);
        background: rgba(255, 0, 85, 0.12);
        box-shadow: 0 0 22px rgba(255, 0, 85, 0.45);
      }
      .season-poster-wrapper {
        position: relative;
        width: 100%;
        height: 105px;
        overflow: hidden;
        background: #0a0a16;
      }
      .season-poster-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }
      .season-card:hover .season-poster-img {
        transform: scale(1.08);
      }
      .season-badge-pill {
        position: absolute;
        top: 6px;
        left: 6px;
        font-size: 0.68rem;
        font-weight: 800;
        padding: 3px 7px;
        border-radius: 6px;
        background: rgba(8, 8, 16, 0.8);
        color: #fff;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        letter-spacing: 0.3px;
      }
      .season-card.current .season-badge-pill {
        background: var(--primary, #ff0055);
        color: #fff;
        border-color: transparent;
        box-shadow: 0 2px 8px rgba(255, 0, 85, 0.5);
      }
      .season-rating-pill {
        position: absolute;
        bottom: 6px;
        right: 6px;
        font-size: 0.68rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.75);
        color: #ffd700;
        display: flex;
        align-items: center;
        gap: 3px;
        backdrop-filter: blur(4px);
      }
      .season-card-content {
        padding: 10px 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;
      }
      .season-card-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: #fff;
        line-height: 1.25;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .season-card-meta {
        font-size: 0.75rem;
        color: #8c92a5;
        margin-top: auto;
      }
      .episodes-season-select {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        font-size: 0.85rem;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 12px;
        outline: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .episodes-season-select:hover, .episodes-season-select:focus {
        background: rgba(255, 255, 255, 0.15);
        border-color: var(--primary, #ff0055);
      }
      .episodes-season-select option {
        background: #14142b;
        color: #fff;
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
                <i class="fas fa-chart-line"></i>
                <span>Watch Progress</span>
              </div>
              <span class="series-progress-percent" id="showModalProgressPercent">0%</span>
            </div>
            <div class="series-progress-track">
              <div class="series-progress-fill" id="showModalProgressFill" style="width: 0%;"></div>
            </div>
            <div class="series-progress-stats">
              <div class="stat-chip">
                <i class="fas fa-layer-group stat-icon stat-total"></i>
                <div class="stat-content">
                  <span class="stat-label">Total</span>
                  <span class="stat-value" id="showModalTotalEpisodes">0</span>
                </div>
              </div>
              <div class="stat-chip">
                <i class="fas fa-check-circle stat-icon stat-watched"></i>
                <div class="stat-content">
                  <span class="stat-label">Watched</span>
                  <span class="stat-value" id="showModalWatchedEpisodes">0</span>
                </div>
              </div>
              <div class="stat-chip">
                <i class="fas fa-clock stat-icon stat-left"></i>
                <div class="stat-content">
                  <span class="stat-label">Left</span>
                  <span class="stat-value" id="showModalRemainingEpisodes">0</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Synopsis Section -->
          <h3 class="show-synopsis-title">Synopsis</h3>
          <p class="show-synopsis-p" id="showModalSynopsis">...</p>

          <!-- Artworks Gallery Section (Posters, Banners, Fanarts) -->
          <div class="show-artworks-section" id="showModalArtworksSection" style="display: none;">
            <div class="artworks-header">
              <div class="artworks-title">
                <i class="fas fa-images" style="color: var(--primary, #ff0055);"></i>
                <span>Artworks & Media</span>
              </div>
              <div class="artworks-tabs" id="showModalArtworkTabs">
                <button class="artwork-tab-btn active" data-tab="all">All</button>
                <button class="artwork-tab-btn" data-tab="banners">Banners</button>
                <button class="artwork-tab-btn" data-tab="posters">Posters</button>
                <button class="artwork-tab-btn" data-tab="fanarts">Fanarts</button>
              </div>
            </div>
            <div class="artworks-carousel" id="showModalArtworksCarousel"></div>
          </div>

          <!-- Seasons & Sequels Section (Multi-Season Anime Switcher) -->
          <div class="show-seasons-section" id="showModalSeasonsSection" style="display: none;">
            <div class="seasons-header">
              <div class="seasons-title">
                <i class="fas fa-layer-group" style="color: var(--primary, #ff0055);"></i>
                <span>All Seasons & Sequels</span>
                <span class="seasons-badge" id="showModalSeasonsBadge">0</span>
              </div>
              <span class="seasons-subtitle">Switch to watch any season</span>
            </div>
            <div class="seasons-carousel" id="showModalSeasonsCarousel"></div>
          </div>

          <!-- Episodes Section -->
          <div class="episodes-section-header">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <h3 class="episodes-section-title">Episodes</h3>
              <div class="episodes-season-selector-wrapper" id="episodesSeasonDropdownWrapper" style="display: none;">
                <select id="episodesSeasonSelect" class="episodes-season-select" aria-label="Select season"></select>
              </div>
            </div>
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

    if (!showId && !showInput?.anilistId) return;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const apiBase = window.API_BASE || '/api';
    const isLunarShow = (typeof showInput === 'object' && (showInput.isLunar || showInput.anilistId)) ||
      (typeof showId === 'string' && showId.startsWith('lunar-'));
    const anilistId = (typeof showInput === 'object' && showInput.anilistId) ||
      (typeof showId === 'string' && showId.startsWith('lunar-') ? showId.replace('lunar-', '') : null);

    if (isLunarShow && anilistId) {
      try {
        const res = await fetch(`${apiBase}/lunarx/all/${anilistId}`);
        if (res.ok) {
          const lData = await res.json();
          show = {
            id: `lunar-${anilistId}`,
            anilistId: anilistId,
            isLunar: true,
            title: lData.title || (show && show.title),
            description: cleanHtmlText(lData.description || (show && show.description)),
            rating: lData.rating || (show && show.rating) || '8.8',
            year: lData.year || (show && show.year) || '2024',
            poster: lData.poster || (show && show.poster),
            banner: lData.banner || (show && show.banner),
            artworks: lData.artworks || (show && show.artworks),
            seasons: lData.seasons || [],
            relations: lData.relations || [],
            categories: (lData.genres || []).map(g => ({ name: g })),
            episodes: (lData.episodes || []).map(e => ({
              id: e.id,
              number: e.number,
              episodeNumber: e.number,
              title: e.title,
              description: cleanHtmlText(e.description),
              thumbnail: e.thumbnail,
              duration: `${e.runtime || 24}m`,
              isLunar: true,
              anilistId: anilistId
            }))
          };
        }
      } catch (err) {
        console.warn('Failed to load anime details:', err);
      }
    } else {
      try {
        const res = await fetch(`${apiBase}/shows/${showId}`);
        if (res.ok) {
          show = await res.json();
        }
      } catch (e) {
        console.warn('Could not fetch full show details:', e);
      }
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
    if (synopsisEl) synopsisEl.textContent = cleanHtmlText(show.description) || 'No synopsis available for this show.';

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

    // Artworks Gallery
    const artworksSec = document.getElementById('showModalArtworksSection');
    const artworksCarousel = document.getElementById('showModalArtworksCarousel');
    const artworkTabs = document.getElementById('showModalArtworkTabs');
    if (artworksSec && artworksCarousel && show.artworks) {
      const { banners = [], posters = [], fanarts = [] } = show.artworks;
      const allArts = [
        ...banners.map(u => ({ url: u, type: 'banner' })),
        ...posters.map(u => ({ url: u, type: 'poster' })),
        ...fanarts.map(u => ({ url: u, type: 'fanart' }))
      ];

      if (allArts.length > 0) {
        artworksSec.style.display = 'block';

        const renderArtworks = (filterType = 'all') => {
          const list = filterType === 'all'
            ? allArts
            : (filterType === 'banners' ? banners.map(u => ({ url: u, type: 'banner' }))
              : (filterType === 'posters' ? posters.map(u => ({ url: u, type: 'poster' }))
                : fanarts.map(u => ({ url: u, type: 'fanart' }))));

          artworksCarousel.innerHTML = list.map(art => `
            <div class="artwork-card ${art.type}-type" onclick="document.getElementById('showModalBackdropImg').src='${art.url}'" title="Click to preview backdrop">
              <img src="${art.url}" alt="Artwork" loading="lazy">
            </div>
          `).join('');
        };

        renderArtworks('all');

        if (artworkTabs) {
          artworkTabs.onclick = (e) => {
            const btn = e.target.closest('.artwork-tab-btn');
            if (!btn) return;
            artworkTabs.querySelectorAll('.artwork-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderArtworks(btn.getAttribute('data-tab'));
          };
        }
      } else {
        artworksSec.style.display = 'none';
      }
    }

    // Render Seasons & Sequels Section (Multi-Season Anime Switcher)
    const seasonsSec = document.getElementById('showModalSeasonsSection');
    const seasonsCarousel = document.getElementById('showModalSeasonsCarousel');
    const seasonsBadge = document.getElementById('showModalSeasonsBadge');
    const seasonSelectWrapper = document.getElementById('episodesSeasonDropdownWrapper');
    const seasonSelect = document.getElementById('episodesSeasonSelect');

    const seasonsList = (show.seasons && show.seasons.length > 0) ? show.seasons : [];
    if (seasonsSec && seasonsCarousel) {
      if (seasonsList.length > 1) {
        seasonsSec.style.display = 'block';
        if (seasonsBadge) seasonsBadge.textContent = `${seasonsList.length} Seasons`;

        seasonsCarousel.innerHTML = seasonsList.map((s, idx) => {
          const isCurrent = s.isCurrent || (s.anilistId && parseInt(s.anilistId) === parseInt(show.anilistId));
          const seasonNum = s.seasonNumber || idx + 1;
          const posterImg = s.poster || s.banner || show.poster || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400';
          const typeLabel = s.type || 'TV';
          const yearLabel = s.year ? ` • ${s.year}` : '';
          const epLabel = s.episodes ? ` • ${s.episodes} Ep` : '';
          const displayTitle = s.titleEnglish || s.title || `Season ${seasonNum}`;
          const badgeText = isCurrent ? 'CURRENT' : (s.relation || `S${seasonNum}`);

          return `
            <div class="season-card ${isCurrent ? 'current' : ''}" 
                 role="button" 
                 tabindex="0" 
                 title="${displayTitle}"
                 onclick="window.switchShowSeason('${s.anilistId || s.id}')">
              <div class="season-poster-wrapper">
                <img src="${posterImg}" alt="${displayTitle}" class="season-poster-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400'">
                <span class="season-badge-pill">${badgeText}</span>
                ${s.rating ? `<span class="season-rating-pill"><i class="fas fa-star"></i> ${s.rating}</span>` : ''}
              </div>
              <div class="season-card-content">
                <span class="season-card-title">${displayTitle}</span>
                <span class="season-card-meta">${typeLabel}${yearLabel}${epLabel}</span>
              </div>
            </div>
          `;
        }).join('');

        // Populate inline quick season selector dropdown in episodes header
        if (seasonSelectWrapper && seasonSelect) {
          seasonSelectWrapper.style.display = 'block';
          seasonSelect.innerHTML = seasonsList.map((s, idx) => {
            const isCurrent = s.isCurrent || (s.anilistId && parseInt(s.anilistId) === parseInt(show.anilistId));
            const displayTitle = s.titleEnglish || s.title || `Season ${idx + 1}`;
            return `<option value="${s.anilistId || s.id}" ${isCurrent ? 'selected' : ''}>${displayTitle}</option>`;
          }).join('');

          seasonSelect.onchange = (e) => {
            const targetId = e.target.value;
            if (targetId) window.switchShowSeason(targetId);
          };
        }
      } else {
        seasonsSec.style.display = 'none';
        if (seasonSelectWrapper) seasonSelectWrapper.style.display = 'none';
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
      const epNumDisplay = resumeEpisode.episodeNumber || resumeEpisode.number || 1;
      if (hasResumeProgress) {
        primaryPlayText.textContent = `RESUME EPISODE ${epNumDisplay} (${formatDuration(resumePosition)})`;
      } else {
        primaryPlayText.textContent = `PLAY EPISODE ${epNumDisplay}`;
      }
    }

    if (primaryPlayBtn && resumeEpisode) {
      primaryPlayBtn.onclick = (e) => {
        const seekParam = (hasResumeProgress && resumePosition > 0) ? `&t=${resumePosition}` : '';
        const epNum = resumeEpisode.episodeNumber || resumeEpisode.number || 1;
        const playUrl = show.isLunar
          ? `/video-player/index.html?lunarId=${show.anilistId || anilistId}&ep=${epNum}${seekParam}`
          : `/video-player/index.html?episodeId=${resumeEpisode.id}${seekParam}`;

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
          const epNum = ep.episodeNumber || ep.number;
          const epPlayUrl = show.isLunar
            ? `/video-player/index.html?lunarId=${show.anilistId || anilistId}&ep=${epNum}${seekParam}`
            : `/video-player/index.html?episodeId=${ep.id}${seekParam}`;

          const thumbHtml = ep.thumbnail ? `
            <div class="ep-thumbnail-box">
              <img src="${ep.thumbnail}" alt="Ep ${epNum}" loading="lazy" onerror="this.style.display='none'">
            </div>
          ` : '';

          return `
            <div class="ep-row-card ${isCompleted ? 'completed' : ''} ${isCurrentResume ? 'current' : ''}" 
                 onclick="window.playModalEpisode(event, '${epPlayUrl}')">
              ${thumbHtml}
              <div class="ep-row-num-badge">
                <span>EP</span>
                <span>${epNum}</span>
              </div>
              <div class="ep-row-info">
                <div class="ep-row-title-line">
                  <span class="ep-row-title">${ep.title}</span>
                  ${badgeHtml}
                </div>
                <div class="ep-row-meta">
                  <span>${ep.duration || '24m'} • HD</span>
                  ${ep.airDate ? `<span>• ${ep.airDate}</span>` : ''}
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

  window.switchShowSeason = async function (targetId) {
    if (!targetId) return;
    const epList = document.getElementById('showModalEpisodesList');
    if (epList) {
      epList.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #a0a5b9; gap: 12px;">
          <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary, #ff0055);"></i>
          <span>Loading season...</span>
        </div>
      `;
    }
    const cleanId = typeof targetId === 'string' && targetId.startsWith('lunar-') ? targetId.replace('lunar-', '') : targetId;
    await window.openShowDetails({ anilistId: cleanId, isLunar: true });
  };
})();
