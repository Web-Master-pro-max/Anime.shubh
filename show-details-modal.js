/**
 * Infinx Anime - Show Details Modal & Cinema Hub
 * Cyberpunk Cinema Glass Edition - 100% Theme Parity with DESIGN.md
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
      /* =========================================================================
         CYBERPUNK CINEMA GLASS MODAL THEME SPECIFICATION
         ========================================================================= */
      .show-details-overlay {
        position: fixed;
        inset: 0;
        background: rgba(2, 3, 8, 0.88);
        backdrop-filter: blur(24px) saturate(190%);
        -webkit-backdrop-filter: blur(24px) saturate(190%);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .show-details-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .show-details-dialog {
        background: linear-gradient(180deg, #0e101c 0%, #06070e 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        width: 100%;
        max-width: 860px;
        max-height: 90vh;
        overflow-y: auto;
        overflow-x: hidden;
        position: relative;
        box-shadow: 0 30px 90px rgba(0, 0, 0, 0.95), 0 0 45px rgba(0, 238, 252, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        transform: scale(0.96) translateY(14px);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .show-details-overlay.active .show-details-dialog {
        transform: scale(1) translateY(0);
      }
      @media (max-width: 640px) {
        .show-details-overlay {
          padding: 0;
          align-items: flex-end;
        }
        .show-details-dialog {
          max-height: 93vh;
          border-radius: 20px 20px 0 0;
          border-bottom: none;
          transform: translateY(100%);
        }
        .show-details-overlay.active .show-details-dialog {
          transform: translateY(0);
        }
      }
      .show-details-dialog::-webkit-scrollbar {
        width: 5px;
      }
      .show-details-dialog::-webkit-scrollbar-track {
        background: transparent;
      }
      .show-details-dialog::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.16);
        border-radius: 3px;
      }
      .show-details-dialog::-webkit-scrollbar-thumb:hover {
        background: #00eefc;
      }

      /* Hero Backdrop Banner */
      .show-backdrop-hero {
        position: relative;
        width: 100%;
        height: 250px;
        overflow: hidden;
        background: #070810;
      }
      @media (max-width: 640px) {
        .show-backdrop-hero {
          height: 180px;
        }
      }
      .show-backdrop-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        filter: brightness(0.85);
        transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .show-backdrop-hero:hover .show-backdrop-img {
        transform: scale(1.03);
      }
      .show-backdrop-gradient {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(3, 4, 10, 0.45) 0%, rgba(7, 8, 16, 0.45) 35%, rgba(14, 16, 28, 0.92) 80%, #0e101c 100%);
        pointer-events: none;
      }
      .show-top-bar {
        position: absolute;
        top: 14px;
        left: 14px;
        right: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 20;
      }
      .show-action-btn-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(12, 14, 26, 0.75);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
      }
      .show-action-btn-circle:hover {
        background: rgba(0, 238, 252, 0.2);
        border-color: #00eefc;
        color: #00eefc;
        transform: scale(1.08);
        box-shadow: 0 0 16px rgba(0, 238, 252, 0.35);
      }
      .show-action-btn-circle:active {
        transform: scale(0.94);
      }
      .show-action-btn-circle.bookmarked {
        color: #ff506e;
        border-color: rgba(255, 80, 110, 0.6);
        background: rgba(255, 80, 110, 0.2);
        box-shadow: 0 0 18px rgba(255, 80, 110, 0.45);
      }

      /* Header Wrap & Overlapping Poster Card */
      .show-details-header-wrap {
        position: relative;
        padding: 0 24px 18px;
        margin-top: -85px;
        z-index: 15;
      }
      @media (max-width: 640px) {
        .show-details-header-wrap {
          padding: 0 16px 14px;
          margin-top: -65px;
        }
      }
      .show-header-row {
        display: flex;
        gap: 20px;
        align-items: flex-end;
      }
      @media (max-width: 640px) {
        .show-header-row {
          gap: 14px;
          align-items: flex-end;
        }
      }
      .show-poster-card {
        position: relative;
        width: 135px;
        height: 202px;
        border-radius: 14px;
        overflow: hidden;
        background: #141729;
        border: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85), 0 0 24px rgba(0, 238, 252, 0.18);
        flex-shrink: 0;
      }
      @media (max-width: 640px) {
        .show-poster-card {
          width: 96px;
          height: 144px;
          border-radius: 10px;
        }
      }
      .show-poster-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .show-header-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .show-eyebrow-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 5px;
      }
      .show-eyebrow-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-family: 'Outfit', sans-serif;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #00eefc;
        background: rgba(0, 238, 252, 0.1);
        border: 1px solid rgba(0, 238, 252, 0.25);
        padding: 2px 8px;
        border-radius: 9999px;
      }
      .show-eyebrow-badge .pulse-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #00eefc;
        box-shadow: 0 0 6px #00eefc;
      }
      .show-title-main {
        font-family: 'Outfit', sans-serif;
        font-size: 26px;
        font-weight: 800;
        color: #fff;
        line-height: 1.2;
        letter-spacing: -0.02em;
        margin: 0 0 4px;
      }
      @media (max-width: 640px) {
        .show-title-main {
          font-size: 18px;
        }
      }
      .show-title-sub {
        font-size: 12px;
        color: #9499ad;
        font-weight: 500;
        margin-bottom: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .show-meta-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }
      .show-rating-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: rgba(255, 180, 0, 0.15);
        border: 1px solid rgba(255, 180, 0, 0.4);
        color: #ffb400;
        font-family: 'Outfit', sans-serif;
        font-size: 11px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 6px;
      }
      .show-meta-sub {
        font-size: 12px;
        color: #9499ad;
        font-weight: 600;
      }
      .show-meta-dot {
        color: rgba(255, 255, 255, 0.25);
        font-size: 10px;
      }
      .show-hd-chip {
        display: inline-flex;
        background: rgba(0, 238, 252, 0.12);
        border: 1px solid rgba(0, 238, 252, 0.35);
        color: #00eefc;
        font-family: 'Outfit', sans-serif;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
        letter-spacing: 0.05em;
      }
      .show-oled-chip {
        display: inline-flex;
        background: rgba(160, 120, 255, 0.12);
        border: 1px solid rgba(160, 120, 255, 0.35);
        color: #d0bcff;
        font-family: 'Outfit', sans-serif;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .show-genre-chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .show-genre-tag {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #b8bdd2;
        font-family: 'Outfit', sans-serif;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 9999px;
        transition: all 0.2s ease;
      }
      .show-genre-tag:hover {
        border-color: #00eefc;
        color: #00eefc;
        background: rgba(0, 238, 252, 0.1);
      }

      /* Action Buttons Cluster */
      .show-actions-cluster {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 2px;
      }
      .show-primary-play-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #ff0055 0%, #ff506e 60%, #b800ff 100%);
        border: none;
        border-radius: 9999px;
        color: #fff;
        font-family: 'Outfit', sans-serif;
        font-size: 13px;
        font-weight: 800;
        padding: 10px 22px;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(255, 0, 85, 0.45), 0 0 16px rgba(0, 238, 252, 0.2);
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .show-primary-play-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 30px rgba(255, 0, 85, 0.65), 0 0 22px rgba(0, 238, 252, 0.3);
      }
      .show-primary-play-btn:active {
        transform: scale(0.97);
      }
      .show-secondary-glass-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 9999px;
        color: #e2e2e2;
        font-family: 'Outfit', sans-serif;
        font-size: 12px;
        font-weight: 700;
        padding: 9px 18px;
        cursor: pointer;
        backdrop-filter: blur(12px);
        transition: all 0.22s ease;
      }
      .show-secondary-glass-btn:hover {
        background: rgba(0, 238, 252, 0.12);
        border-color: #00eefc;
        color: #00eefc;
        transform: translateY(-2px);
      }
      .show-secondary-glass-btn:active {
        transform: scale(0.97);
      }
      .show-secondary-glass-btn.bookmarked {
        background: rgba(255, 80, 110, 0.2);
        border-color: #ff506e;
        color: #ff506e;
      }
      .show-audio-toggle-row {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .show-audio-label {
        font-family: 'Outfit', sans-serif;
        font-size: 10px;
        font-weight: 800;
        color: #8c92a5;
        letter-spacing: 0.06em;
      }
      .show-audio-pill-group {
        display: inline-flex;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 9999px;
        padding: 2px;
      }
      .show-audio-pill {
        padding: 4px 12px;
        border-radius: 9999px;
        font-family: 'Outfit', sans-serif;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
        border: 1px solid transparent;
        background: transparent;
        color: #8c92a5;
        transition: all 0.2s ease;
      }
      .show-audio-pill.active-sub {
        background: rgba(0, 238, 252, 0.2) !important;
        border-color: #00eefc !important;
        color: #00eefc !important;
        box-shadow: 0 0 12px rgba(0, 238, 252, 0.35) !important;
      }
      .show-audio-pill.active-dub {
        background: rgba(255, 80, 110, 0.2) !important;
        border-color: #ff506e !important;
        color: #ff506e !important;
        box-shadow: 0 0 12px rgba(255, 80, 110, 0.35) !important;
      }

      /* Modal Navigation Tabs */
      .show-modal-nav-tabs {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 24px;
        margin-bottom: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        overflow-x: auto;
        scrollbar-width: none;
      }
      .show-modal-nav-tabs::-webkit-scrollbar {
        display: none;
      }
      @media (max-width: 640px) {
        .show-modal-nav-tabs {
          padding: 0 16px;
        }
      }
      .modal-nav-tab {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 14px;
        border: none;
        background: transparent;
        color: #8c92a5;
        font-family: 'Outfit', sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .modal-nav-tab:hover {
        color: #fff;
      }
      .modal-nav-tab.active {
        color: #00eefc;
        border-bottom-color: #00eefc;
      }
      .modal-tab-badge {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.08);
        color: #b8bdd2;
      }
      .modal-nav-tab.active .modal-tab-badge {
        background: rgba(0, 238, 252, 0.2);
        color: #00eefc;
      }

      /* Tab Panels */
      .show-tab-panels {
        padding: 0 24px 28px;
      }
      @media (max-width: 640px) {
        .show-tab-panels {
          padding: 0 16px 24px;
        }
      }
      .show-tab-panel {
        display: none;
      }
      .show-tab-panel.active {
        display: block;
      }

      /* Series Progress Card */
      .series-progress-card {
        background: rgba(18, 20, 36, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 14px;
        padding: 14px 16px;
        margin-bottom: 18px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      }
      .series-progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        gap: 10px;
      }
      .series-progress-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'Outfit', sans-serif;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        letter-spacing: 0.02em;
      }
      .series-progress-title span.material-symbols-outlined {
        color: #00eefc;
        font-size: 18px;
      }
      .series-progress-percent {
        font-family: 'Outfit', sans-serif;
        font-size: 12px;
        font-weight: 800;
        color: #00eefc;
        background: rgba(0, 238, 252, 0.12);
        border: 1px solid rgba(0, 238, 252, 0.3);
        padding: 2px 7px;
        border-radius: 6px;
      }
      .series-progress-track {
        height: 5px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 9999px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      .series-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff506e 0%, #00eefc 100%);
        border-radius: 9999px;
        transition: width 0.4s ease;
      }
      .series-progress-stats {
        display: flex;
        gap: 6px;
      }
      .stat-chip {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        padding: 7px 10px;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.2s ease;
      }
      .stat-chip:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .stat-chip .stat-icon {
        font-size: 16px;
        flex-shrink: 0;
      }
      .stat-chip .stat-icon.stat-total { color: #00eefc; }
      .stat-chip .stat-icon.stat-watched { color: #00ff88; }
      .stat-chip .stat-icon.stat-left { color: #ff506e; }
      .stat-chip .stat-content {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .stat-chip .stat-label {
        font-size: 10px;
        font-weight: 700;
        color: #8c92a5;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .stat-chip .stat-value {
        font-family: 'Outfit', sans-serif;
        font-size: 13px;
        font-weight: 800;
        color: #fff;
      }

      /* Episodes Header & Season Selector */
      .episodes-filter-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        gap: 10px;
        flex-wrap: wrap;
      }
      .episodes-season-select {
        background: rgba(22, 25, 44, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #fff;
        font-family: 'Outfit', sans-serif;
        font-size: 12px;
        font-weight: 700;
        padding: 6px 14px;
        border-radius: 9999px;
        outline: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .episodes-season-select:hover, .episodes-season-select:focus {
        border-color: #00eefc;
        box-shadow: 0 0 12px rgba(0, 238, 252, 0.25);
      }
      .episodes-season-select option {
        background: #0e101c;
        color: #fff;
      }

      /* Episode Cards List */
      .episodes-card-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ep-row-card {
        background: rgba(16, 18, 32, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 12px;
        padding: 9px 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .ep-row-card:hover {
        background: rgba(24, 27, 48, 0.9);
        border-color: rgba(0, 238, 252, 0.4);
        transform: translateX(4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(0, 238, 252, 0.15);
      }
      .ep-row-card.completed {
        border-left: 3px solid #00ff88;
      }
      .ep-row-card.current {
        border-left: 3px solid #00eefc;
        background: rgba(0, 238, 252, 0.07);
      }
      .ep-thumbnail-box {
        width: 100px;
        height: 58px;
        border-radius: 8px;
        overflow: hidden;
        flex-shrink: 0;
        position: relative;
        background: #070810;
      }
      @media (max-width: 640px) {
        .ep-thumbnail-box {
          width: 80px;
          height: 48px;
        }
      }
      .ep-thumbnail-box img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }
      .ep-row-card:hover .ep-thumbnail-box img {
        transform: scale(1.08);
      }
      .ep-duration-pill {
        position: absolute;
        bottom: 3px;
        right: 3px;
        font-size: 9px;
        font-weight: 700;
        color: #fff;
        background: rgba(0, 0, 0, 0.85);
        padding: 1px 4px;
        border-radius: 4px;
        backdrop-filter: blur(4px);
      }
      .ep-row-num-badge {
        font-family: 'Outfit', sans-serif;
        font-size: 14px;
        font-weight: 800;
        color: #6d738a;
        width: 28px;
        text-align: center;
        flex-shrink: 0;
      }
      .ep-row-card.current .ep-row-num-badge {
        color: #00eefc;
      }
      .ep-row-card.completed .ep-row-num-badge {
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
        margin-bottom: 3px;
        flex-wrap: wrap;
      }
      .ep-row-title {
        font-family: 'Outfit', sans-serif;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ep-row-meta {
        font-size: 11px;
        color: #8c92a5;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .badge-watched {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: rgba(0, 255, 136, 0.15);
        border: 1px solid rgba(0, 255, 136, 0.35);
        color: #00ff88;
        font-family: 'Outfit', sans-serif;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 4px;
      }
      .badge-in-progress {
        display: inline-flex;
        align-items: center;
        background: rgba(0, 238, 252, 0.15);
        border: 1px solid rgba(0, 238, 252, 0.35);
        color: #00eefc;
        font-family: 'Outfit', sans-serif;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 4px;
      }
      .ep-row-progress-track {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: rgba(0, 0, 0, 0.6);
      }
      .ep-row-progress-fill {
        height: 100%;
        background: #00eefc;
        transition: width 0.3s;
      }
      .ep-row-play-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
        transition: all 0.2s ease;
      }
      .ep-row-card:hover .ep-row-play-btn {
        background: #00eefc;
        border-color: #00eefc;
        color: #000;
        box-shadow: 0 0 14px rgba(0, 238, 252, 0.6);
        transform: scale(1.1);
      }

      /* Seasons Grid Panel */
      .seasons-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 14px;
      }
      @media (max-width: 640px) {
        .seasons-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
      }
      .season-card {
        background: rgba(16, 18, 32, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
        position: relative;
        text-align: left;
      }
      .season-card:hover {
        background: rgba(24, 27, 48, 0.85);
        border-color: #00eefc;
        transform: translateY(-3px);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 238, 252, 0.25);
      }
      .season-card.current {
        border: 2px solid #00eefc;
        background: rgba(0, 238, 252, 0.08);
        box-shadow: 0 0 18px rgba(0, 238, 252, 0.35);
      }
      .season-poster-wrapper {
        position: relative;
        width: 100%;
        height: 100px;
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
        transform: scale(1.06);
      }
      .season-badge-pill {
        position: absolute;
        top: 5px;
        left: 5px;
        font-family: 'Outfit', sans-serif;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(8, 8, 16, 0.85);
        color: #fff;
        backdrop-filter: blur(6px);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
      .season-card.current .season-badge-pill {
        background: #00eefc;
        color: #000;
        border-color: transparent;
      }
      .season-rating-pill {
        position: absolute;
        bottom: 5px;
        right: 5px;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 5px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.75);
        color: #ffd700;
        display: flex;
        align-items: center;
        gap: 3px;
        backdrop-filter: blur(4px);
      }
      .season-card-content {
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }
      .season-card-title {
        font-size: 12px;
        font-weight: 700;
        color: #fff;
        line-height: 1.25;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .season-card-meta {
        font-size: 10px;
        color: #8c92a5;
        margin-top: auto;
      }

      /* Artworks Panel */
      .artworks-filter-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        gap: 10px;
        flex-wrap: wrap;
      }
      .artworks-tabs {
        display: flex;
        gap: 6px;
      }
      .artwork-tab-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #9499ad;
        font-family: 'Outfit', sans-serif;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .artwork-tab-btn.active, .artwork-tab-btn:hover {
        background: #00eefc;
        color: #000;
        border-color: transparent;
        font-weight: 800;
        box-shadow: 0 0 10px rgba(0, 238, 252, 0.35);
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
        background: rgba(255, 255, 255, 0.15);
        border-radius: 2px;
      }
      .artwork-card {
        flex-shrink: 0;
        border-radius: 10px;
        overflow: hidden;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.22s ease;
        position: relative;
        background: #0a0a16;
      }
      .artwork-card:hover {
        border-color: #00eefc;
        transform: translateY(-2px);
      }
      .artwork-card.banner-type {
        width: 220px;
        height: 68px;
      }
      .artwork-card.poster-type {
        width: 85px;
        height: 125px;
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

      /* Overview Panel */
      .overview-box {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .overview-synopsis-title {
        font-family: 'Outfit', sans-serif;
        font-size: 14px;
        font-weight: 800;
        color: #fff;
        margin-bottom: 6px;
      }
      .overview-synopsis-p {
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: #9da3ba;
        line-height: 1.7;
        margin: 0;
      }
      .overview-specs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px;
        margin-top: 8px;
      }
      .overview-spec-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .overview-spec-label {
        font-size: 10px;
        font-weight: 700;
        color: #8c92a5;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .overview-spec-val {
        font-family: 'Outfit', sans-serif;
        font-size: 12px;
        font-weight: 700;
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
        <!-- Hero Billboard Backdrop -->
        <div class="show-backdrop-hero">
          <img id="showModalBackdropImg" src="" alt="Show Backdrop" class="show-backdrop-img">
          <div class="show-backdrop-gradient"></div>

          <!-- Top Floating Controls -->
          <div class="show-top-bar">
            <button class="show-action-btn-circle" id="showModalBackBtn" aria-label="Close modal" title="Back">
              <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <div style="display: flex; gap: 8px;">
              <button class="show-action-btn-circle" id="showModalBookmarkBtn" aria-label="Toggle Watchlist" title="Add to Watchlist">
                <span class="material-symbols-outlined text-[18px]" id="showModalBookmarkIcon">bookmark_border</span>
              </button>
              <button class="show-action-btn-circle" id="showModalCloseBtn" aria-label="Close" title="Close">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Overlapping Header Content -->
        <div class="show-details-header-wrap">
          <div class="show-header-row">
            <!-- 2:3 Vertical Portrait Poster Card -->
            <div class="show-poster-card">
              <img id="showModalPosterImg" src="" alt="Show Poster" class="show-poster-img" onerror="this.src='Postes/spyfamS3p.jpg'">
            </div>

            <!-- Title & Key Metadata -->
            <div class="show-header-info">
              <div class="show-eyebrow-row">
                <span class="show-eyebrow-badge">
                  <span class="pulse-dot"></span>
                  <span id="showModalFormatBadge">TOKYO MASTER • OLED CUT</span>
                </span>
              </div>

              <h2 class="show-title-main" id="showModalTitle">Loading...</h2>
              <div class="show-title-sub" id="showModalSubTitle" style="display: none;"></div>

              <div class="show-meta-row">
                <div class="show-rating-chip" id="showModalRating">
                  <span class="material-symbols-outlined text-[13px]">star</span>
                  <span id="showModalRatingVal">4.9</span>
                </div>
                <span class="show-meta-sub" id="showModalYear">2024</span>
                <span class="show-meta-dot">•</span>
                <span class="show-meta-sub" id="showModalEpCount">0 Episodes</span>
                <span class="show-meta-dot">•</span>
                <span class="show-hd-chip">4K UHD</span>
                <span class="show-oled-chip">HDR10+</span>
              </div>

              <div class="show-genre-chips" id="showModalGenres"></div>

              <!-- High-Contrast Action Cluster -->
              <div class="show-actions-cluster">
                <button class="show-primary-play-btn" id="showModalPrimaryPlayBtn">
                  <span class="material-symbols-outlined text-[18px]">play_arrow</span>
                  <span id="showModalPrimaryPlayText">START WATCHING</span>
                </button>

                <button class="show-secondary-glass-btn" id="showModalWatchlistBtn">
                  <span class="material-symbols-outlined text-[16px]" id="showModalWatchlistBtnIcon">bookmark_border</span>
                  <span id="showModalWatchlistBtnText">Watchlist</span>
                </button>

                <!-- Audio Toggle (Sub / Dub) -->
                <div class="show-audio-toggle-row" id="showModalAudioToggleRow" style="display: none;">
                  <span class="show-audio-label">AUDIO:</span>
                  <div class="show-audio-pill-group">
                    <button type="button" class="show-audio-pill active-sub" id="modalAudioPillSub" data-type="sub">
                      <span>SUB</span>
                    </button>
                    <button type="button" class="show-audio-pill" id="modalAudioPillDub" data-type="dub">
                      <span>DUB</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs Bar -->
        <div class="show-modal-nav-tabs">
          <button class="modal-nav-tab active" data-tab="episodes" id="modalTabEpBtn">
            <span class="material-symbols-outlined text-[16px]">video_library</span>
            <span>Episodes</span>
            <span class="modal-tab-badge" id="modalTabEpCount">0</span>
          </button>
          <button class="modal-nav-tab" data-tab="seasons" id="modalTabSeasonsBtn" style="display: none;">
            <span class="material-symbols-outlined text-[16px]">layers</span>
            <span>All Seasons</span>
            <span class="modal-tab-badge" id="modalTabSeasonsCount">0</span>
          </button>
          <button class="modal-nav-tab" data-tab="artworks" id="modalTabArtworksBtn" style="display: none;">
            <span class="material-symbols-outlined text-[16px]">photo_library</span>
            <span>Artworks</span>
          </button>
          <button class="modal-nav-tab" data-tab="overview" id="modalTabOverviewBtn">
            <span class="material-symbols-outlined text-[16px]">info</span>
            <span>Overview</span>
          </button>
        </div>

        <!-- Tab Content Panels -->
        <div class="show-tab-panels">
          <!-- 1. Episodes Panel -->
          <div class="show-tab-panel active" id="modalTabPanel_episodes">
            <!-- Series Progress Card -->
            <div class="series-progress-card" id="showModalProgressCard">
              <div class="series-progress-header">
                <div class="series-progress-title">
                  <span class="material-symbols-outlined">equalizer</span>
                  <span>Series Watch Progress</span>
                </div>
                <span class="series-progress-percent" id="showModalProgressPercent">0%</span>
              </div>
              <div class="series-progress-track">
                <div class="series-progress-fill" id="showModalProgressFill" style="width: 0%;"></div>
              </div>
              <div class="series-progress-stats">
                <div class="stat-chip">
                  <span class="material-symbols-outlined stat-icon stat-total">layers</span>
                  <div class="stat-content">
                    <span class="stat-label">Total</span>
                    <span class="stat-value" id="showModalTotalEpisodes">0</span>
                  </div>
                </div>
                <div class="stat-chip">
                  <span class="material-symbols-outlined stat-icon stat-watched">check_circle</span>
                  <div class="stat-content">
                    <span class="stat-label">Watched</span>
                    <span class="stat-value" id="showModalWatchedEpisodes">0</span>
                  </div>
                </div>
                <div class="stat-chip">
                  <span class="material-symbols-outlined stat-icon stat-left">schedule</span>
                  <div class="stat-content">
                    <span class="stat-label">Remaining</span>
                    <span class="stat-value" id="showModalRemainingEpisodes">0</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Episodes Section Filter Header -->
            <div class="episodes-filter-row">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 800; color: #fff;">Episodes</span>
                <span style="font-size: 11px; color: #8c92a5; font-weight: 600;" id="showModalEpisodesStats">0 Watched • 0 Left</span>
              </div>
              <div id="episodesSeasonDropdownWrapper" style="display: none;">
                <select id="episodesSeasonSelect" class="episodes-season-select" aria-label="Select season"></select>
              </div>
            </div>
            <div class="episodes-card-list" id="showModalEpisodesList"></div>
          </div>

          <!-- 2. Seasons & Sequels Panel -->
          <div class="show-tab-panel" id="modalTabPanel_seasons">
            <div style="margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 800; color: #fff;">Franchise &amp; Connected Seasons</span>
              <span style="font-size: 11px; color: #8c92a5;">Tap any season to view details</span>
            </div>
            <div class="seasons-grid" id="showModalSeasonsGrid"></div>
          </div>

          <!-- 3. Artworks Gallery Panel -->
          <div class="show-tab-panel" id="modalTabPanel_artworks">
            <div class="artworks-filter-row">
              <span style="font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 800; color: #fff;">Official Artworks &amp; Banners</span>
              <div class="artworks-tabs" id="showModalArtworkTabs">
                <button class="artwork-tab-btn active" data-tab="all">All</button>
                <button class="artwork-tab-btn" data-tab="banners">Banners</button>
                <button class="artwork-tab-btn" data-tab="posters">Posters</button>
                <button class="artwork-tab-btn" data-tab="fanarts">Fanarts</button>
              </div>
            </div>
            <div class="artworks-carousel" id="showModalArtworksCarousel"></div>
          </div>

          <!-- 4. Overview Panel -->
          <div class="show-tab-panel" id="modalTabPanel_overview">
            <div class="overview-box">
              <div>
                <h3 class="overview-synopsis-title">Synopsis</h3>
                <p class="overview-synopsis-p" id="showModalSynopsis">...</p>
              </div>
              <div class="overview-specs-grid" id="showModalOverviewSpecs">
                <div class="overview-spec-card">
                  <span class="overview-spec-label">Format</span>
                  <span class="overview-spec-val" id="specFormat">TV Series</span>
                </div>
                <div class="overview-spec-card">
                  <span class="overview-spec-label">Broadcast</span>
                  <span class="overview-spec-val" id="specSeason">Winter 2026</span>
                </div>
                <div class="overview-spec-card">
                  <span class="overview-spec-label">Video Stream</span>
                  <span class="overview-spec-val">1080p Ultra HLS • OLED</span>
                </div>
                <div class="overview-spec-card">
                  <span class="overview-spec-label">Audio Tracks</span>
                  <span class="overview-spec-val">Original JP (Sub) &amp; EN (Dub)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners for close
    const closeBtn = overlay.querySelector('#showModalCloseBtn');
    const backBtn = overlay.querySelector('#showModalBackBtn');
    const dialog = overlay.querySelector('#infinxShowDetailsDialog');

    const closeModal = () => {
      window.closeShowDetails();
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

    // Tab switcher listeners
    const tabBtns = overlay.querySelectorAll('.modal-nav-tab');
    const tabPanels = overlay.querySelectorAll('.show-tab-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const activePanel = overlay.querySelector(`#modalTabPanel_${tabKey}`);
        if (activePanel) activePanel.classList.add('active');
      });
    });

    return overlay;
  }

  // Close Show Details
  window.closeShowDetails = function () {
    const overlay = document.getElementById('infinxShowDetailsModal');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

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

    // Reset tabs to Episodes default
    const tabBtns = overlay.querySelectorAll('.modal-nav-tab');
    const tabPanels = overlay.querySelectorAll('.show-tab-panel');
    tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'episodes'));
    tabPanels.forEach(p => p.classList.toggle('active', p.id === 'modalTabPanel_episodes'));

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
            englishTitle: lData.titleEnglish || lData.englishTitle,
            romajiTitle: lData.titleRomaji || lData.romajiTitle,
            format: lData.format || 'TV',
            seasonYear: lData.seasonYear || lData.year || '2026',
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
    const subTitleEl = document.getElementById('showModalSubTitle');
    const backdropEl = document.getElementById('showModalBackdropImg');
    const posterEl = document.getElementById('showModalPosterImg');
    const ratingValEl = document.getElementById('showModalRatingVal');
    const yearEl = document.getElementById('showModalYear');
    const epCountEl = document.getElementById('showModalEpCount');
    const genresEl = document.getElementById('showModalGenres');
    const synopsisEl = document.getElementById('showModalSynopsis');
    const bookmarkIcon = document.getElementById('showModalBookmarkIcon');
    const bookmarkBtn = document.getElementById('showModalBookmarkBtn');
    const watchlistBtn = document.getElementById('showModalWatchlistBtn');
    const watchlistBtnIcon = document.getElementById('showModalWatchlistBtnIcon');
    const watchlistBtnText = document.getElementById('showModalWatchlistBtnText');
    const formatBadgeEl = document.getElementById('showModalFormatBadge');
    const specFormat = document.getElementById('specFormat');
    const specSeason = document.getElementById('specSeason');

    if (titleEl) titleEl.textContent = show.title;

    // Subtitle (English or Romaji title if different)
    if (subTitleEl) {
      const altTitle = show.englishTitle || show.romajiTitle;
      if (altTitle && altTitle.toLowerCase() !== (show.title || '').toLowerCase()) {
        subTitleEl.textContent = altTitle;
        subTitleEl.style.display = 'block';
      } else {
        subTitleEl.style.display = 'none';
      }
    }

    if (ratingValEl) ratingValEl.textContent = show.rating ? parseFloat(show.rating).toFixed(1) : '4.9';
    if (yearEl) yearEl.textContent = show.year || '2024';
    if (synopsisEl) synopsisEl.textContent = cleanHtmlText(show.description) || 'No synopsis available for this show.';
    if (formatBadgeEl) formatBadgeEl.textContent = (show.format ? `${show.format.toUpperCase()} • OLED CUT` : 'TOKYO MASTER • OLED CUT');
    if (specFormat) specFormat.textContent = show.format ? `${show.format} Series` : 'Anime Series';
    if (specSeason) specSeason.textContent = `${show.year || '2026'} Release`;

    // Banner and Poster Media URLs
    const rawBanner = show.banner || show.poster;
    const bannerUrl = (typeof window.formatMediaUrl === 'function')
      ? window.formatMediaUrl(rawBanner)
      : (rawBanner || 'Postes/spyfamS3p.jpg');
    if (backdropEl) backdropEl.src = bannerUrl;

    const rawPoster = show.poster || show.banner;
    const posterUrl = (typeof window.formatMediaUrl === 'function')
      ? window.formatMediaUrl(rawPoster)
      : (rawPoster || 'Postes/spyfamS3p.jpg');
    if (posterEl) posterEl.src = posterUrl;

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
    const artworksTabBtn = document.getElementById('modalTabArtworksBtn');
    const artworksCarousel = document.getElementById('showModalArtworksCarousel');
    const artworkTabs = document.getElementById('showModalArtworkTabs');
    if (show.artworks && artworksCarousel) {
      const { banners = [], posters = [], fanarts = [] } = show.artworks;
      const allArts = [
        ...banners.map(u => ({ url: u, type: 'banner' })),
        ...posters.map(u => ({ url: u, type: 'poster' })),
        ...fanarts.map(u => ({ url: u, type: 'fanart' }))
      ];

      if (allArts.length > 0) {
        if (artworksTabBtn) artworksTabBtn.style.display = 'inline-flex';

        const renderArtworks = (filterType = 'all') => {
          const list = filterType === 'all'
            ? allArts
            : (filterType === 'banners' ? banners.map(u => ({ url: u, type: 'banner' }))
              : (filterType === 'posters' ? posters.map(u => ({ url: u, type: 'poster' }))
                : fanarts.map(u => ({ url: u, type: 'fanart' }))));

          artworksCarousel.innerHTML = list.map(art => `
            <div class="artwork-card ${art.type}-type" onclick="document.getElementById('showModalBackdropImg').src='${art.url}'" title="Tap to preview backdrop">
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
        if (artworksTabBtn) artworksTabBtn.style.display = 'none';
      }
    } else {
      if (artworksTabBtn) artworksTabBtn.style.display = 'none';
    }

    // Render Seasons & Sequels Section (Multi-Season Anime Switcher)
    const seasonsTabBtn = document.getElementById('modalTabSeasonsBtn');
    const seasonsTabCount = document.getElementById('modalTabSeasonsCount');
    const seasonsGrid = document.getElementById('showModalSeasonsGrid');
    const seasonSelectWrapper = document.getElementById('episodesSeasonDropdownWrapper');
    const seasonSelect = document.getElementById('episodesSeasonSelect');

    const seasonsList = (show.seasons && show.seasons.length > 0) ? show.seasons : [];
    if (seasonsList.length > 1) {
      if (seasonsTabBtn) seasonsTabBtn.style.display = 'inline-flex';
      if (seasonsTabCount) seasonsTabCount.textContent = seasonsList.length;

      if (seasonsGrid) {
        seasonsGrid.innerHTML = seasonsList.map((s, idx) => {
          const isCurrent = s.isCurrent || (s.anilistId && parseInt(s.anilistId) === parseInt(show.anilistId));
          const seasonNum = s.seasonNumber || idx + 1;
          const posterImg = s.poster || s.banner || show.poster || 'Postes/spyfamS3p.jpg';
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
                <img src="${posterImg}" alt="${displayTitle}" class="season-poster-img" loading="lazy" onerror="this.src='Postes/spyfamS3p.jpg'">
                <span class="season-badge-pill">${badgeText}</span>
                ${s.rating ? `<span class="season-rating-pill"><span class="material-symbols-outlined text-[11px]">star</span> ${s.rating}</span>` : ''}
              </div>
              <div class="season-card-content">
                <span class="season-card-title">${displayTitle}</span>
                <span class="season-card-meta">${typeLabel}${yearLabel}${epLabel}</span>
              </div>
            </div>
          `;
        }).join('');
      }

      // Inline quick season selector dropdown in episodes header
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
      if (seasonsTabBtn) seasonsTabBtn.style.display = 'none';
      if (seasonSelectWrapper) seasonSelectWrapper.style.display = 'none';
    }

    // Watchlist Bookmark status
    let userWatchlist = [];
    try {
      userWatchlist = JSON.parse(localStorage.getItem('infinx_watchlist') || '[]');
    } catch (e) { }
    const isBookmarked = userWatchlist.includes(show.id);

    function updateBookmarkUi(bookmarked) {
      if (bookmarkIcon) {
        bookmarkIcon.textContent = bookmarked ? 'bookmark' : 'bookmark_border';
      }
      if (bookmarkBtn) {
        bookmarkBtn.classList.toggle('bookmarked', bookmarked);
      }
      if (watchlistBtn) {
        watchlistBtn.classList.toggle('bookmarked', bookmarked);
      }
      if (watchlistBtnIcon) {
        watchlistBtnIcon.textContent = bookmarked ? 'bookmark' : 'bookmark_border';
      }
      if (watchlistBtnText) {
        watchlistBtnText.textContent = bookmarked ? 'In Watchlist' : 'Watchlist';
      }
    }

    updateBookmarkUi(isBookmarked);

    const handleBookmarkToggle = async (e) => {
      e.stopPropagation();
      const triggerEl = bookmarkBtn || watchlistBtn;
      if (typeof window.toggleWatchlist === 'function') {
        await window.toggleWatchlist(triggerEl, show.id);
      } else if (typeof window.toggleWatchlistItem === 'function') {
        await window.toggleWatchlistItem(triggerEl, show.id);
      }
      let updatedList = [];
      try { updatedList = JSON.parse(localStorage.getItem('infinx_watchlist') || '[]'); } catch (err) { }
      const nowBookmarked = updatedList.includes(show.id);
      updateBookmarkUi(nowBookmarked);
    };

    if (bookmarkBtn) bookmarkBtn.onclick = handleBookmarkToggle;
    if (watchlistBtn) watchlistBtn.onclick = handleBookmarkToggle;

    // Episodes & Progress calculations
    const episodes = (show.episodes && show.episodes.length > 0) ? show.episodes : [];
    if (epCountEl) epCountEl.textContent = `${episodes.length} Episodes`;
    const tabEpCount = document.getElementById('modalTabEpCount');
    if (tabEpCount) tabEpCount.textContent = episodes.length;

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
    const audioToggleRow = document.getElementById('showModalAudioToggleRow');
    const pillSub = document.getElementById('modalAudioPillSub');
    const pillDub = document.getElementById('modalAudioPillDub');

    let currentAudioType = localStorage.getItem('infinx_preferred_audio_type') || 'sub';

    function setModalAudioPills(activeType) {
      currentAudioType = activeType;
      localStorage.setItem('infinx_preferred_audio_type', activeType);

      if (pillSub) {
        pillSub.classList.toggle('active-sub', activeType === 'sub');
      }
      if (pillDub) {
        pillDub.classList.toggle('active-dub', activeType === 'dub');
      }

      // Re-bind primary play button and episode card click handlers
      if (primaryPlayBtn && resumeEpisode) {
        const seekParam = (hasResumeProgress && resumePosition > 0) ? `&t=${resumePosition}` : '';
        const epNum = resumeEpisode.episodeNumber || resumeEpisode.number || 1;
        const audioParam = (show.isLunar && currentAudioType === 'dub') ? '&type=dub' : '';
        const playUrl = show.isLunar
          ? `/watch?id=${show.anilistId || anilistId}&ep=${epNum}${seekParam}${audioParam}`
          : `/watch?id=${resumeEpisode.id}${seekParam}`;

        primaryPlayBtn.onclick = (e) => {
          if (typeof window.requireAuthPlay === 'function') {
            if (!window.requireAuthPlay(e, playUrl)) return;
          }
          window.location.href = playUrl;
        };
      }

      document.querySelectorAll('.ep-row-card[data-ep-num]').forEach(card => {
        const epNum = card.getAttribute('data-ep-num');
        const seekParam = card.getAttribute('data-seek') || '';
        const audioParam = (show.isLunar && currentAudioType === 'dub') ? '&type=dub' : '';
        const epPlayUrl = show.isLunar
          ? `/watch?id=${show.anilistId || anilistId}&ep=${epNum}${seekParam}${audioParam}`
          : `/watch?id=${card.getAttribute('data-ep-id')}${seekParam}`;
        card.onclick = (e) => window.playModalEpisode(e, epPlayUrl);
      });
    }

    if (show.isLunar) {
      if (audioToggleRow) {
        audioToggleRow.style.display = 'inline-flex';
        if (pillSub) pillSub.onclick = (e) => { e.stopPropagation(); setModalAudioPills('sub'); };
        if (pillDub) pillDub.onclick = (e) => { e.stopPropagation(); setModalAudioPills('dub'); };
      }
      setModalAudioPills(currentAudioType);
    } else {
      if (audioToggleRow) audioToggleRow.style.display = 'none';
    }

    if (primaryPlayText && resumeEpisode) {
      const epNumDisplay = resumeEpisode.episodeNumber || resumeEpisode.number || 1;
      if (hasResumeProgress) {
        primaryPlayText.textContent = `RESUME EP ${epNumDisplay} (${formatDuration(resumePosition)})`;
      } else {
        primaryPlayText.textContent = `PLAY EPISODE ${epNumDisplay}`;
      }
    }

    if (primaryPlayBtn && resumeEpisode) {
      const seekParam = (hasResumeProgress && resumePosition > 0) ? `&t=${resumePosition}` : '';
      const epNum = resumeEpisode.episodeNumber || resumeEpisode.number || 1;
      const audioParam = (show.isLunar && currentAudioType === 'dub') ? '&type=dub' : '';
      const playUrl = show.isLunar
        ? `/watch?id=${show.anilistId || anilistId}&ep=${epNum}${seekParam}${audioParam}`
        : `/watch?id=${resumeEpisode.id}${seekParam}`;

      primaryPlayBtn.onclick = (e) => {
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
        episodesListEl.innerHTML = `<div style="color: #8c92a5; padding: 30px; text-align: center; font-size: 13px;">No episodes currently uploaded for this season.</div>`;
      } else {
        episodesListEl.innerHTML = episodes.map(ep => {
          const epProg = episodesMap[ep.id] || null;
          const isCompleted = epProg?.completed;
          const isInProgress = epProg && epProg.positionSeconds > 10 && !isCompleted;
          const isCurrentResume = resumeEpisode && resumeEpisode.id === ep.id;

          let badgeHtml = '';
          let progressTrackHtml = '';

          if (isCompleted) {
            badgeHtml = `<span class="badge-watched"><span class="material-symbols-outlined text-[12px]">check_circle</span> Watched</span>`;
            progressTrackHtml = `<div class="ep-row-progress-track"><div class="ep-row-progress-fill" style="width: 100%; background: #00ff88;"></div></div>`;
          } else if (isInProgress) {
            badgeHtml = `<span class="badge-in-progress">${epProg.progressPercent}%</span>`;
            progressTrackHtml = `<div class="ep-row-progress-track"><div class="ep-row-progress-fill" style="width: ${epProg.progressPercent}%;"></div></div>`;
          }

          const seekParam = (isInProgress && epProg.positionSeconds > 0) ? `&t=${epProg.positionSeconds}` : '';
          const epNum = ep.episodeNumber || ep.number;
          const audioParam = (show.isLunar && currentAudioType === 'dub') ? '&type=dub' : '';
          const epPlayUrl = show.isLunar
            ? `/watch?id=${show.anilistId || anilistId}&ep=${epNum}${seekParam}${audioParam}`
            : `/watch?id=${ep.id}${seekParam}`;

          const thumbImg = ep.thumbnail || show.banner || show.poster || 'Postes/spyfamS3p.jpg';
          const thumbHtml = `
            <div class="ep-thumbnail-box">
              <img src="${thumbImg}" alt="Ep ${epNum}" loading="lazy" onerror="this.src='Postes/spyfamS3p.jpg'">
              <span class="ep-duration-pill">${ep.duration || '24m'}</span>
            </div>
          `;

          return `
            <div class="ep-row-card ${isCompleted ? 'completed' : ''} ${isCurrentResume ? 'current' : ''}" 
                 data-ep-num="${epNum}" data-ep-id="${ep.id}" data-seek="${seekParam}"
                 onclick="window.playModalEpisode(event, '${epPlayUrl}')">
              <div class="ep-row-num-badge">${epNum < 10 ? '0' + epNum : epNum}</div>
              ${thumbHtml}
              <div class="ep-row-info">
                <div class="ep-row-title-line">
                  <span class="ep-row-title">${ep.title || `Episode ${epNum}`}</span>
                  ${badgeHtml}
                </div>
                <div class="ep-row-meta">
                  <span>HD • 1080p</span>
                  ${ep.airDate ? `<span>• ${ep.airDate}</span>` : ''}
                  ${isInProgress ? `<span>• Left at ${formatDuration(epProg.positionSeconds)}</span>` : ''}
                </div>
              </div>
              <div class="ep-row-play-btn">
                <span class="material-symbols-outlined text-[16px]">play_arrow</span>
              </div>
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
          <span class="material-symbols-outlined text-[28px] text-[#00eefc] animate-spin">progress_activity</span>
          <span style="font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600;">Loading season...</span>
        </div>
      `;
    }
    const cleanId = typeof targetId === 'string' && targetId.startsWith('lunar-') ? targetId.replace('lunar-', '') : targetId;
    await window.openShowDetails({ anilistId: cleanId, isLunar: true });
  };
})();
