/**
 * =========================================================================
 * INFINX ADVANCED PUBLIC LIVE COMMUNITY CHAT (CLIENT CONTROLLER)
 * =========================================================================
 * Features:
 *  - Real-time zero-refresh messaging powered by Socket.io (REST fallback)
 *  - Live Interactive Community Poll with animated vote percentages
 *  - Chibi Anime Stickers Drawer (Anya, Gojo, Luffy, Naruto, Zenitsu, etc.)
 *  - Automatic `#` Show / Episode Mention parsing with interactive badges
 *  - Progression Ranks (Genin, Chunin, Jounin, Hokage VIP, Mod)
 *  - Slow Mode 3-second radial cooldown
 * =========================================================================
 */

(function () {
  'use strict';

  const STICKERS = [
    { id: 'stk-anya', icon: '😼', name: 'Anya Smirk', quote: 'Waku Waku!' },
    { id: 'stk-gojo', icon: '🟣', name: 'Hollow Purple', quote: 'Throughout heaven and earth...' },
    { id: 'stk-luffy', icon: '🍖', name: 'Luffy Meat', quote: 'Meat!!' },
    { id: 'stk-naruto', icon: '🍜', name: 'Naruto Ramen', quote: 'Believe it! Dattebayo!' },
    { id: 'stk-zenitsu', icon: '⚡', name: 'Zenitsu Thunder', quote: 'Thunder Breathing!' },
    { id: 'stk-zoro', icon: '🧭', name: 'Zoro Lost', quote: 'Where did the path go?!' },
    { id: 'stk-nezuko', icon: '🎋', name: 'Nezuko Box', quote: 'Mmh mmh!' },
    { id: 'stk-deku', icon: '💥', name: 'Deku Smash', quote: 'Detroit Smash 100%!' }
  ];

  const ANIME_GIFS = [
    { id: 'gif-gojo-purple', title: 'Gojo Hollow Purple', tag: 'fight', url: 'https://i.giphy.com/DGsDLr9nyz2LkVgKFs.gif' },
    { id: 'gif-luffy-gear5', title: 'Luffy Gear 5 Laugh', tag: 'hype', url: 'https://i.giphy.com/12mRllHWXpt4M8.gif' },
    { id: 'gif-sukuna-shrine', title: 'Sukuna Domain Expansion', tag: 'fight', url: 'https://i.giphy.com/4lu5FuhtrbaOQgKN57.gif' },
    { id: 'gif-zenitsu-thunder', title: 'Zenitsu Thunderclap', tag: 'fight', url: 'https://i.giphy.com/dyjrpqaUVqCELGuQVr.gif' },
    { id: 'gif-tanjiro-kamado', title: 'Tanjiro Water Breathing', tag: 'fight', url: 'https://i.giphy.com/12p5byldHRgyu4.gif' },
    { id: 'gif-goku-saiyan', title: 'Goku Super Saiyan Aura', tag: 'hype', url: 'https://i.giphy.com/3oKIPnAiaMCws8nOsE.gif' },
    { id: 'gif-killua-lightning', title: 'Killua Godspeed', tag: 'hype', url: 'https://i.giphy.com/QvBoMEcQ7DQXK.gif' },
    { id: 'gif-naruto-ramen', title: 'Naruto Ramen Feast', tag: 'funny', url: 'https://i.giphy.com/2y98KScHKeaQM.gif' },
    { id: 'gif-levi-attack', title: 'Levi Ackerman Slash', tag: 'fight', url: 'https://i.giphy.com/10i8xVp7WmJrri.gif' },
    { id: 'gif-chika-dance', title: 'Chika Fujiwara Dance', tag: 'dance', url: 'https://i.giphy.com/du1LfdlnhdTwn8OQHu.gif' },
    { id: 'gif-itachi-rain', title: 'Itachi Uchiha Rain', tag: 'sad', url: 'https://i.giphy.com/bDWdJRY2IZCX6.gif' },
    { id: 'gif-eren-titan', title: 'Eren Yeager Roar', tag: 'hype', url: 'https://i.giphy.com/oF5oUYTOhvFnO.gif' },
    { id: 'gif-aot-blitz', title: 'Attack on Titan Strike', tag: 'fight', url: 'https://i.giphy.com/krewXUB6LBja.gif' },
    { id: 'gif-hxh-nen', title: 'Hunter x Hunter Aura', tag: 'hype', url: 'https://i.giphy.com/B7o99rIuystY4.gif' },
    { id: 'gif-sasuke-chidori', title: 'Sasuke Chidori Spark', tag: 'fight', url: 'https://i.giphy.com/yA1EPzJbpmCCPsZOWg.gif' },
    { id: 'gif-zoro-asura', title: 'Zoro Asura Stance', tag: 'hype', url: 'https://i.giphy.com/OdSZCPaQZWlWw.gif' }
  ];

  function initPublicCommunityChat() {
    let mount = document.getElementById('publicLiveChatMount');
    if (!mount) {
      const footer = document.querySelector('footer');
      mount = document.createElement('div');
      mount.id = 'publicLiveChatMount';
      if (footer && footer.parentNode) {
        footer.parentNode.insertBefore(mount, footer);
      } else {
        document.body.appendChild(mount);
      }
    }

    mount.innerHTML = `
      <section class="public-chat-section" id="publicLiveChatSection">
        <div class="public-chat-container">
          <div class="public-chat-card">
            <!-- Header -->
            <div class="public-chat-header">
              <div class="public-chat-title-group">
                <i class="fas fa-comments"></i>
                <div>
                  <h3 class="public-chat-title">Infinx Community Live Chat</h3>
                  <p class="public-chat-subtitle">Live anime discussions, episode theories & predictions</p>
                </div>
              </div>
              <!-- Header Actions (Poll hidden for now) -->
              <div class="public-chat-header-actions" style="display: none;">
                <button type="button" class="chat-poll-toggle-btn" id="chatPollToggleBtn">
                  <i class="fas fa-poll"></i> <span>Community Poll</span>
                </button>
              </div>
            </div>

            <!-- Live Community Poll Widget (Hidden for now) -->
            <div class="chat-poll-container" id="chatPollContainer" style="display: none;">
              <div class="chat-poll-meta">
                <span class="chat-poll-title">
                  <i class="fas fa-bolt"></i>
                  <span id="pollQuestionText">Loading live community battle poll...</span>
                </span>
                <span class="chat-poll-votes-badge" id="pollTotalVotesBadge">0 Total Votes</span>
              </div>
              <div class="chat-poll-options" id="chatPollOptionsList">
                <!-- Dynamically rendered -->
              </div>
            </div>

            <!-- Messages Stream -->
            <div class="public-chat-messages" id="publicChatFeed">
              <!-- Dynamically populated -->
            </div>

            <!-- Input & Media Picker Area -->
            <div class="public-chat-input-area">
              <!-- Media Tab Switcher -->
              <div class="chat-media-tabs">
                <button type="button" class="chat-tab-btn active" id="tabEmojiBtn">
                  <i class="far fa-smile"></i> Emojis
                </button>
                <button type="button" class="chat-tab-btn" id="tabStickerBtn">
                  <i class="fas fa-icons"></i> Anime Stickers
                </button>
                <button type="button" class="chat-tab-btn" id="tabGifBtn">
                  <i class="fas fa-film"></i> GIF
                </button>
              </div>

              <!-- Quick Emojis Panel -->
              <div class="chat-media-panel active" id="panelEmojis">
                <div class="chat-quick-emojis">
                  <span class="emoji-btn" data-emoji="🔥">🔥</span>
                  <span class="emoji-btn" data-emoji="❤️">❤️</span>
                  <span class="emoji-btn" data-emoji="🤣">🤣</span>
                  <span class="emoji-btn" data-emoji="😱">😱</span>
                  <span class="emoji-btn" data-emoji="🍿">🍿</span>
                  <span class="emoji-btn" data-emoji="✨">✨</span>
                  <span class="emoji-btn" data-emoji="⚡">⚡</span>
                  <span class="emoji-btn" data-emoji="👏">👏</span>
                </div>
              </div>

              <!-- Chibi Stickers Panel -->
              <div class="chat-media-panel" id="panelStickers">
                <div class="chat-stickers-grid" id="chatStickersGrid">
                  <!-- Dynamically rendered -->
                </div>
              </div>

              <!-- Anime GIFs Panel -->
              <div class="chat-media-panel" id="panelGifs">
                <div class="chat-gif-search-row">
                  <i class="fas fa-search"></i>
                  <input type="text" id="chatGifSearchInput" class="chat-gif-search-input" placeholder="Search anime GIFs (e.g. Gojo, Luffy, Fight)..." />
                </div>
                <div class="chat-gif-tags" id="chatGifTags">
                  <button type="button" class="chat-gif-tag active" data-tag="all">All</button>
                  <button type="button" class="chat-gif-tag" data-tag="hype">🔥 Hype</button>
                  <button type="button" class="chat-gif-tag" data-tag="fight">⚔️ Fight</button>
                  <button type="button" class="chat-gif-tag" data-tag="funny">🤣 Funny</button>
                  <button type="button" class="chat-gif-tag" data-tag="dance">💃 Dance</button>
                  <button type="button" class="chat-gif-tag" data-tag="sad">🌧️ Sad</button>
                </div>
                <div class="chat-gifs-grid" id="chatGifsGrid">
                  <!-- Dynamically rendered -->
                </div>
              </div>

              <!-- Form Input -->
              <form class="chat-form" id="publicChatForm">
                <input 
                  type="text" 
                  id="publicChatInput" 
                  class="chat-input" 
                  placeholder="Join the discussion... (Try #naruto or #solo-leveling)" 
                  maxlength="450" 
                  autocomplete="off"
                />
                <button type="submit" class="chat-send-btn" id="publicChatSendBtn">
                  <i class="fas fa-paper-plane"></i>
                  <span class="chat-btn-text">Send</span>
                  <span class="chat-cooldown-timer" id="chatCooldownTimer">3s</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Public Chat User Profile Popover / Modal -->
        <div class="chat-user-modal-overlay" id="chatUserModalOverlay">
          <div class="chat-user-modal-card">
            <button type="button" class="chat-user-modal-close" id="chatUserModalClose" aria-label="Close Profile Card">&times;</button>
            <div class="chat-user-modal-banner" id="chatUserModalBanner"></div>
            <div class="chat-user-modal-header">
              <div class="chat-user-modal-avatar-wrap aura-default" id="chatUserModalAvatarWrap">
                <img class="chat-user-modal-avatar" id="chatUserModalAvatar" src="https://api.dicebear.com/7.x/bottts/svg?seed=Shinobi" alt="Avatar" />
              </div>
              <div class="chat-user-modal-info">
                <div class="chat-user-modal-name" id="chatUserModalName">Shinobi</div>
                <div class="chat-user-modal-rank" id="chatUserModalRank"></div>
              </div>
            </div>
            <div class="chat-user-modal-body">
              <p class="chat-user-modal-bio" id="chatUserModalBio">Loading shinobi profile...</p>
              <div class="chat-user-modal-stats">
                <div class="chat-user-stat">
                  <span class="stat-num" id="chatModalHours">--</span>
                  <span class="stat-lbl">Watch Time</span>
                </div>
                <div class="chat-user-stat">
                  <span class="stat-num" id="chatModalEpisodes">--</span>
                  <span class="stat-lbl">Episodes</span>
                </div>
                <div class="chat-user-stat">
                  <span class="stat-num" id="chatModalLevel">--</span>
                  <span class="stat-lbl">Level</span>
                </div>
              </div>
              <div class="chat-user-modal-showcase" id="chatUserModalShowcase" style="display:none;">
                <div class="chat-user-showcase-title"><i class="fas fa-crown" style="color:#ffd700;"></i> Favorite Anime Showcase</div>
                <div class="chat-user-showcase-list" id="chatUserModalShowcaseList"></div>
              </div>
            </div>
            <div class="chat-user-modal-actions">
              <a href="#" class="chat-user-btn-profile" id="chatUserModalViewProfileBtn">
                <i class="fas fa-id-card"></i> View Profile
              </a>
              <button type="button" class="chat-user-btn-mention" id="chatUserModalMentionBtn">
                <i class="fas fa-at"></i> Mention in Chat
              </button>
            </div>
          </div>
        </div>
      </section>
    `;

    const feed = document.getElementById('publicChatFeed');
    const form = document.getElementById('publicChatForm');
    const input = document.getElementById('publicChatInput');
    const sendBtn = document.getElementById('publicChatSendBtn');
    const cooldownTimer = document.getElementById('chatCooldownTimer');
    const pollContainer = document.getElementById('chatPollContainer');
    const pollToggleBtn = document.getElementById('chatPollToggleBtn');

    // Resolve User Profile & Rank Progression
    // Resolve User Profile, Avatar Frame, and Rank Progression
    let currentUser = 'AnimeFan';
    let currentRole = 'MEMBER';
    let userRank = 'GENIN';
    let userLevel = 1;
    let userAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=AnimeFan';
    let userAvatarFrame = 'aura-default';

    function updateAdminState() {
      const storedRole = (localStorage.getItem('infinx_user_role') || '').toUpperCase();
      const currentR = (currentRole || '').toUpperCase();
      const uName = (currentUser || '').toLowerCase();
      const isAdmin = (
        currentR === 'ADMIN' ||
        storedRole === 'ADMIN' ||
        uName === 'admin' ||
        uName === 'supremehokage'
      );

      if (isAdmin) {
        document.body.classList.add('is-admin-user');
        const card = document.querySelector('.public-chat-card');
        if (card) card.classList.add('is-admin-user');
      } else {
        document.body.classList.remove('is-admin-user');
        const card = document.querySelector('.public-chat-card');
        if (card) card.classList.remove('is-admin-user');
      }
    }

    function syncUserOtakuState(userData) {
      if (!userData) return;
      const targetUser = userData.user || userData.profile || userData;
      if (targetUser.username) currentUser = targetUser.username;
      else if (targetUser.name) currentUser = targetUser.name;
      else if (targetUser.email) currentUser = targetUser.email.split('@')[0];

      if (targetUser.role) currentRole = targetUser.role;
      if (targetUser.vipRank) userRank = targetUser.vipRank;
      if (targetUser.level) userLevel = targetUser.level;
      if (targetUser.avatarUrl) {
        userAvatar = (targetUser.avatarUrl.startsWith('assets/') || targetUser.avatarUrl.startsWith('uploads/') || targetUser.avatarUrl.startsWith('Postes/')) ? '/' + targetUser.avatarUrl : targetUser.avatarUrl;
      }
      if (targetUser.avatarFrame) userAvatarFrame = targetUser.avatarFrame;

      updateAdminState();
    }

    try {
      const email = localStorage.getItem('infinx_user_email');
      const role = localStorage.getItem('infinx_user_role');
      const savedUsername = localStorage.getItem('infinx_username');
      const savedAvatar = localStorage.getItem('infinx_avatar');
      const savedFrame = localStorage.getItem('infinx_avatar_frame');
      const savedRank = localStorage.getItem('infinx_vip_rank');
      const savedLevel = localStorage.getItem('infinx_level');
      const userRaw = localStorage.getItem('infinx_user') || localStorage.getItem('user');

      if (savedUsername) currentUser = savedUsername;
      else if (email) {
        currentUser = email.split('@')[0];
        currentUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
      }
      if (role) currentRole = role;
      if (savedAvatar) userAvatar = savedAvatar;
      if (savedFrame) userAvatarFrame = savedFrame;
      if (savedRank) userRank = savedRank;
      if (savedLevel) userLevel = parseInt(savedLevel, 10);

      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw);
          syncUserOtakuState(parsed);
        } catch (e) {}
      }

      updateAdminState();

      // Fetch fresh profile state if token is present
      const token = localStorage.getItem('infinx_token');
      if (token) {
        fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) {
              const profile = data.user || data.profile || data;
              syncUserOtakuState(profile);
              try {
                localStorage.setItem('infinx_user', JSON.stringify(profile));
                if (profile.username) localStorage.setItem('infinx_username', profile.username);
                if (profile.avatarUrl) localStorage.setItem('infinx_avatar', profile.avatarUrl);
                if (profile.avatarFrame) localStorage.setItem('infinx_avatar_frame', profile.avatarFrame);
                if (profile.vipRank) localStorage.setItem('infinx_vip_rank', profile.vipRank);
                if (profile.level) localStorage.setItem('infinx_level', String(profile.level));
              } catch(e) {}
            }
          })
          .catch(() => {});
      }
    } catch (e) {}

    window.addEventListener('infinx:profile_updated', (e) => {
      if (e.detail) syncUserOtakuState(e.detail);
      updateAdminState();
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'infinx_user_role' || e.key === 'infinx_token' || e.key === 'infinx_user') {
        const r = localStorage.getItem('infinx_user_role');
        if (r) currentRole = r;
        updateAdminState();
      }
    });

    // 1. Populate Anime Stickers Grid
    const stickersGrid = document.getElementById('chatStickersGrid');
    if (stickersGrid) {
      stickersGrid.innerHTML = STICKERS.map(s => `
        <button type="button" class="chat-sticker-pick-btn" data-sticker-id="${s.id}">
          <span class="chat-sticker-pick-icon">${s.icon}</span>
          <span class="chat-sticker-pick-name">${s.name}</span>
        </button>
      `).join('');

      stickersGrid.querySelectorAll('.chat-sticker-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sId = btn.getAttribute('data-sticker-id');
          const sticker = STICKERS.find(s => s.id === sId);
          if (sticker) {
            sendStickerMessage(sticker);
          }
        });
      });
    }

    // 2. Tab Switcher
    const tabEmojiBtn = document.getElementById('tabEmojiBtn');
    const tabStickerBtn = document.getElementById('tabStickerBtn');
    const tabGifBtn = document.getElementById('tabGifBtn');
    const panelEmojis = document.getElementById('panelEmojis');
    const panelStickers = document.getElementById('panelStickers');
    const panelGifs = document.getElementById('panelGifs');

    function setActiveTab(activeBtn, activePanel) {
      [tabEmojiBtn, tabStickerBtn, tabGifBtn].forEach(b => { if (b) b.classList.remove('active'); });
      [panelEmojis, panelStickers, panelGifs].forEach(p => { if (p) p.classList.remove('active'); });
      if (activeBtn) activeBtn.classList.add('active');
      if (activePanel) activePanel.classList.add('active');
    }

    if (tabEmojiBtn) tabEmojiBtn.addEventListener('click', () => setActiveTab(tabEmojiBtn, panelEmojis));
    if (tabStickerBtn) tabStickerBtn.addEventListener('click', () => setActiveTab(tabStickerBtn, panelStickers));
    if (tabGifBtn) tabGifBtn.addEventListener('click', () => {
      setActiveTab(tabGifBtn, panelGifs);
      renderGifsGrid();
    });

    // 2b. Anime GIFs Grid & Search Controller
    const gifsGrid = document.getElementById('chatGifsGrid');
    const gifSearchInput = document.getElementById('chatGifSearchInput');
    const gifTagsContainer = document.getElementById('chatGifTags');
    let currentGifTag = 'all';

    function renderGifsGrid(filterTag, searchKeyword) {
      if (!gifsGrid) return;
      const tag = filterTag !== undefined ? filterTag : currentGifTag;
      const q = (searchKeyword !== undefined ? searchKeyword : (gifSearchInput ? gifSearchInput.value : '')).toLowerCase().trim();

      const filtered = ANIME_GIFS.filter(g => {
        const matchesTag = tag === 'all' || g.tag === tag;
        const matchesQuery = !q || g.title.toLowerCase().includes(q) || g.tag.toLowerCase().includes(q);
        return matchesTag && matchesQuery;
      });

      if (filtered.length === 0) {
        gifsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; color: #a0aec0; padding: 18px 0; font-size: 1.2rem;">
            No GIFs found for "${q}". Try another keyword or category!
          </div>
        `;
        return;
      }

      gifsGrid.innerHTML = filtered.map(g => `
        <div class="chat-gif-card" data-gif-id="${g.id}" title="${g.title}">
          <img src="${g.url}" alt="${g.title}" loading="lazy" />
          <div class="chat-gif-card-title">${g.title}</div>
        </div>
      `).join('');

      gifsGrid.querySelectorAll('.chat-gif-card').forEach(card => {
        card.addEventListener('click', () => {
          const gId = card.getAttribute('data-gif-id');
          const found = ANIME_GIFS.find(g => g.id === gId);
          if (found) {
            sendGifMessage(found);
          }
        });
      });
    }

    if (gifTagsContainer) {
      gifTagsContainer.querySelectorAll('.chat-gif-tag').forEach(tagBtn => {
        tagBtn.addEventListener('click', () => {
          gifTagsContainer.querySelectorAll('.chat-gif-tag').forEach(b => b.classList.remove('active'));
          tagBtn.classList.add('active');
          currentGifTag = tagBtn.getAttribute('data-tag') || 'all';
          renderGifsGrid(currentGifTag);
        });
      });
    }

    if (gifSearchInput) {
      gifSearchInput.addEventListener('input', (e) => {
        renderGifsGrid(currentGifTag, e.target.value);
      });
    }

    // Initial render of GIFs
    renderGifsGrid('all', '');

    // 3. Quick Emoji Insertion
    panelEmojis.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        if (input && emoji) {
          input.value += emoji + ' ';
          input.focus();
        }
      });
    });

    // 4. Poll Toggle
    if (pollToggleBtn && pollContainer) {
      pollToggleBtn.addEventListener('click', () => {
        pollContainer.classList.toggle('collapsed');
        const isCol = pollContainer.classList.contains('collapsed');
        pollToggleBtn.innerHTML = `<i class="fas fa-poll"></i> <span>${isCol ? 'Show Poll' : 'Hide Poll'}</span>`;
      });
    }

    // 5. Render Message with Rank Badge, Mentions, and Stickers
    function formatMessageText(text) {
      if (!text) return '';
      // Escape HTML
      let clean = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Auto-parse #show or #ep mentions (e.g. #naruto, #solo-leveling, #ep1)
      clean = clean.replace(/#([\w-]+)/gi, (match, tag) => {
        const lower = tag.toLowerCase();
        let targetUrl = '/index.html';
        if (lower.includes('naruto')) targetUrl = '/watch?id=1735&ep=1';
        else if (lower.includes('solo')) targetUrl = '/watch?id=16498&ep=1';
        else if (lower.startsWith('ep')) targetUrl = '/watch?id=1735&ep=' + lower.replace('ep', '');
        return `<a href="${targetUrl}" class="chat-mention-badge"><i class="fas fa-play-circle"></i> #${tag}</a>`;
      });

      return clean;
    }

    function renderRankBadge(rank, level) {
      const r = (rank || 'GENIN').toUpperCase().replace('-', '_');
      let label = r;
      let cls = r.toLowerCase();

      if (r === 'HOKAGE_VIP' || r === 'HOKAGE') {
        label = `👑 Hokage VIP • Lv.${level || 50}`;
        cls = 'hokage';
      } else if (r === 'HASHIRA') {
        label = `⚔️ Hashira • Lv.${level || 40}`;
        cls = 'hashira';
      } else if (r === 'JOUNIN') {
        label = `🔥 Jounin • Lv.${level || 25}`;
        cls = 'jounin';
      } else if (r === 'CHUNIN') {
        label = `⚡ Chunin • Lv.${level || 10}`;
        cls = 'chunin';
      } else if (r === 'MOD' || r === 'MODERATOR') {
        label = `🛡️ Mod`;
        cls = 'mod';
      } else if (r === 'ADMIN') {
        label = `⚡ Admin • Lv.${level || 50}`;
        cls = 'admin';
      } else {
        label = `🌱 Genin • Lv.${level || 1}`;
        cls = 'genin';
      }

      return `<span class="chat-rank-badge ${cls}">${label}</span>`;
    }

    function appendMessage(msg) {
      if (!feed || !msg) return;

      const isMe = String(msg.user || '').toLowerCase() === currentUser.toLowerCase();
      const row = document.createElement('div');
      row.className = `chat-msg-row ${isMe ? 'is-me' : ''}`;
      if (msg.id) {
        row.id = `chat-msg-${msg.id}`;
        row.setAttribute('data-msg-id', msg.id);
      }

      const rawAv = msg.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user || 'Anime')}`;
      const avatarUrl = (rawAv.startsWith('assets/') || rawAv.startsWith('uploads/') || rawAv.startsWith('Postes/')) ? '/' + rawAv : rawAv;
      const rankBadge = renderRankBadge(msg.rank, msg.level);
      const rawFrame = (msg.avatarFrame || 'default')
        .toLowerCase()
        .replace(/^aura-/, '')
        .replace(/^frame-/, '');
      const frameClass = `aura-${rawFrame} frame-${rawFrame} ${rawFrame}`;

      let contentHtml = '';
      if (msg.sticker) {
        contentHtml = `
          <div class="chat-sticker-wrap">
            <div class="chat-sticker-badge">
              <span class="chat-sticker-icon">${msg.sticker.icon}</span>
              <div>
                <div class="chat-sticker-label">${msg.sticker.name}</div>
                <div style="font-size: 1.1rem; color: #a0aec0;">"${msg.sticker.quote}"</div>
              </div>
            </div>
          </div>
        `;
      } else if (msg.gif) {
        const gifUrl = typeof msg.gif === 'string' ? msg.gif : (msg.gif.url || '');
        const gifTitle = (typeof msg.gif === 'object' && msg.gif.title) ? msg.gif.title : 'Anime GIF';
        const captionHtml = msg.text ? `<div class="chat-msg-bubble" style="margin-bottom: 6px;">${formatMessageText(msg.text)}</div>` : '';
        contentHtml = `
          ${captionHtml}
          <div class="chat-gif-wrap" title="${gifTitle}">
            <img class="chat-msg-gif" src="${gifUrl}" alt="${gifTitle}" loading="lazy" />
          </div>
        `;
      } else {
        const trimmed = (msg.text || '').trim();
        const isDirectGif = /^https?:\/\/.+\.(gif|webp)(\?.*)?$/i.test(trimmed);
        if (isDirectGif) {
          contentHtml = `
            <div class="chat-gif-wrap">
              <img class="chat-msg-gif" src="${trimmed}" alt="Anime GIF" loading="lazy" />
            </div>
          `;
        } else {
          contentHtml = `<div class="chat-msg-bubble">${formatMessageText(msg.text)}</div>`;
        }
      }

      const deleteBtnHtml = msg.id 
        ? `<button type="button" class="chat-msg-delete-btn" data-msg-id="${msg.id}" title="Delete Message (Admin)" aria-label="Delete Message"><i class="fas fa-trash-alt"></i></button>`
        : '';

      row.innerHTML = `
        <div class="chat-msg-avatar-wrap ${frameClass}" data-chat-user="${encodeURIComponent(msg.user)}" title="Click to view @${msg.user}'s profile">
          <img class="chat-msg-avatar" src="${avatarUrl}" alt="${msg.user}" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Anime';">
        </div>
        <div class="chat-msg-content">
          <div class="chat-msg-header">
            <span class="chat-msg-user" data-chat-user="${encodeURIComponent(msg.user)}" title="Click to view @${msg.user}'s profile">${msg.user}</span>
            ${rankBadge}
            <span class="chat-msg-time">${msg.time || 'Now'}</span>
            ${deleteBtnHtml}
          </div>
          ${contentHtml}
        </div>
      `;

      feed.appendChild(row);
      feed.scrollTop = feed.scrollHeight;
    }

    // 5b. User Profile Quick-Card Modal Controller
    const userModalOverlay = document.getElementById('chatUserModalOverlay');
    const userModalClose = document.getElementById('chatUserModalClose');
    const userModalBanner = document.getElementById('chatUserModalBanner');
    const userModalAvatarWrap = document.getElementById('chatUserModalAvatarWrap');
    const userModalAvatar = document.getElementById('chatUserModalAvatar');
    const userModalName = document.getElementById('chatUserModalName');
    const userModalRank = document.getElementById('chatUserModalRank');
    const userModalBio = document.getElementById('chatUserModalBio');
    const chatModalHours = document.getElementById('chatModalHours');
    const chatModalEpisodes = document.getElementById('chatModalEpisodes');
    const chatModalLevel = document.getElementById('chatModalLevel');
    const userModalShowcase = document.getElementById('chatUserModalShowcase');
    const userModalShowcaseList = document.getElementById('chatUserModalShowcaseList');
    const userModalViewProfileBtn = document.getElementById('chatUserModalViewProfileBtn');
    const userModalMentionBtn = document.getElementById('chatUserModalMentionBtn');

    function closeUserProfileCard() {
      if (userModalOverlay) userModalOverlay.classList.remove('active');
    }

    if (userModalClose) userModalClose.addEventListener('click', closeUserProfileCard);
    if (userModalOverlay) {
      userModalOverlay.addEventListener('click', (e) => {
        if (e.target === userModalOverlay) closeUserProfileCard();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeUserProfileCard();
    });

    async function openUserProfileCard(username, sourceElement) {
      if (!userModalOverlay || !username) return;

      const row = sourceElement.closest('.chat-msg-row');
      const avatarImg = row ? row.querySelector('.chat-msg-avatar') : null;
      const avatarWrap = row ? row.querySelector('.chat-msg-avatar-wrap') : null;
      const rankBadge = row ? row.querySelector('.chat-rank-badge') : null;

      const fallbackAvatar = avatarImg ? avatarImg.src : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
      const fallbackFrame = avatarWrap ? avatarWrap.className.replace('chat-msg-avatar-wrap', '').trim() : 'aura-default';

      userModalName.innerText = username;
      userModalAvatar.src = fallbackAvatar;
      userModalAvatarWrap.className = `chat-user-modal-avatar-wrap ${fallbackFrame}`;
      userModalRank.innerHTML = rankBadge ? rankBadge.outerHTML : `<span class="chat-rank-badge genin">🌱 Shinobi</span>`;
      userModalBio.innerText = 'Exploring infinite anime worlds on Infinx Anime.';
      userModalBanner.style.backgroundImage = 'linear-gradient(135deg, #1f233e 0%, #0e101f 100%)';
      chatModalHours.innerText = '--';
      chatModalEpisodes.innerText = '--';
      chatModalLevel.innerText = 'Lv.1';
      if (userModalShowcase) userModalShowcase.style.display = 'none';

      userModalViewProfileBtn.href = `/profile.html?user=${encodeURIComponent(username)}`;
      userModalViewProfileBtn.innerHTML = `<i class="fas fa-id-card"></i> View Profile`;

      userModalMentionBtn.onclick = () => {
        if (input) {
          input.value = `@${username} ` + input.value;
          input.focus();
        }
        closeUserProfileCard();
      };

      userModalOverlay.classList.add('active');

      // Fetch detailed public profile stats
      try {
        const res = await fetch(`/api/user/profile/${encodeURIComponent(username)}`);
        if (res.ok) {
          const profile = await res.json();
          if (profile.bannerUrl) {
            userModalBanner.style.backgroundImage = `url('${profile.bannerUrl}')`;
          }
          if (profile.avatarUrl) {
            userModalAvatar.src = profile.avatarUrl;
          }
          if (profile.avatarFrame) {
            const raw = profile.avatarFrame.toLowerCase().replace(/^aura-/, '').replace(/^frame-/, '');
            userModalAvatarWrap.className = `chat-user-modal-avatar-wrap aura-${raw} frame-${raw} ${raw}`;
          }
          if (profile.bio) {
            userModalBio.innerText = profile.bio;
          }
          if (profile.vipRank) {
            userModalRank.innerHTML = renderRankBadge(profile.vipRank, profile.level);
          }
          chatModalHours.innerText = `${(profile.stats && profile.stats.totalHoursWatched) || 0}h`;
          chatModalEpisodes.innerText = `${(profile.stats && profile.stats.totalEpisodesWatched) || 0}`;
          chatModalLevel.innerText = `Lv.${profile.level || 1}`;

          // Top Anime Showcase
          if (Array.isArray(profile.topAnime) && profile.topAnime.length > 0 && userModalShowcaseList) {
            userModalShowcaseList.innerHTML = profile.topAnime.slice(0, 3).map(a => `
              <div class="chat-user-showcase-item">
                <img src="${a.poster || a.banner || 'assets/avatars/av-jin-u-seong.png'}" class="chat-user-showcase-poster" alt="${a.title}" />
                <div class="chat-user-showcase-name">${a.title}</div>
              </div>
            `).join('');
            if (userModalShowcase) userModalShowcase.style.display = 'block';
          }
        }
      } catch (e) {
        console.warn('Error fetching detailed profile card:', e);
      }
    }

    // Chat Toast Notifications
    let chatToastTimer = null;
    function showChatToast(message, type = 'info') {
      let toast = document.getElementById('chatToastNotification');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'chatToastNotification';
        toast.className = 'chat-toast-notification';
        document.body.appendChild(toast);
      }

      let icon = '<i class="fas fa-info-circle"></i>';
      if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
      if (type === 'error') icon = '<i class="fas fa-exclamation-triangle"></i>';

      toast.className = `chat-toast-notification active ${type}`;
      toast.innerHTML = `${icon} <span>${message}</span>`;

      if (chatToastTimer) clearTimeout(chatToastTimer);
      chatToastTimer = setTimeout(() => {
        toast.classList.remove('active');
      }, 3000);
    }

    // Zero-refresh smooth removal
    function removeMessageFromFeed(msgId) {
      if (!msgId || !feed) return;
      const row = document.getElementById(`chat-msg-${msgId}`) || feed.querySelector(`[data-msg-id="${msgId}"]`);
      if (row) {
        row.classList.add('deleting');
        setTimeout(() => {
          if (row && row.parentNode) {
            row.parentNode.removeChild(row);
          }
        }, 360);
      }
    }

    // Admin Deletion Action
    function deleteChatMessage(msgId) {
      if (!msgId) return;
      const confirmed = window.confirm('Are you sure you want to delete this message? (Admin Action)');
      if (!confirmed) return;

      const token = localStorage.getItem('infinx_token');

      // 1. Socket real-time broadcast
      if (socket && socket.connected) {
        socket.emit('chat:delete', { messageId: msgId, token });
      }

      // 2. REST API deletion with authorization token
      fetch(`/api/public-chat/messages/${encodeURIComponent(msgId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      .then(async (res) => {
        if (res.ok) {
          removeMessageFromFeed(msgId);
          showChatToast('Message deleted successfully', 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showChatToast(errData.error || 'Failed to delete message. Admin privileges required.', 'error');
        }
      })
      .catch((err) => {
        console.error('Error deleting chat message:', err);
        showChatToast('Network error while deleting message', 'error');
      });
    }

    if (feed) {
      feed.addEventListener('click', (e) => {
        // Handle admin delete button click
        const delBtn = e.target.closest('.chat-msg-delete-btn');
        if (delBtn) {
          e.preventDefault();
          e.stopPropagation();
          const msgId = delBtn.getAttribute('data-msg-id');
          if (msgId) {
            deleteChatMessage(msgId);
          }
          return;
        }

        // Handle user profile popup click
        const target = e.target.closest('[data-chat-user]');
        if (target) {
          const username = decodeURIComponent(target.getAttribute('data-chat-user') || '');
          if (username) {
            openUserProfileCard(username, target);
          }
        }
      });
    }

    // 6. Live Poll Engine
    let currentVotedOption = localStorage.getItem('infinx_voted_poll_option');

    function renderPoll(poll) {
      if (!poll) return;
      document.getElementById('pollQuestionText').innerText = poll.question || 'Battle Poll';
      document.getElementById('pollTotalVotesBadge').innerText = `${poll.totalVotes || 0} Total Votes`;

      const list = document.getElementById('chatPollOptionsList');
      if (!list) return;

      list.innerHTML = poll.options.map(opt => {
        const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
        const isSelected = currentVotedOption === opt.id;
        return `
          <div class="chat-poll-opt ${isSelected ? 'voted' : ''}" data-opt-id="${opt.id}">
            <div class="chat-poll-bar" style="width: ${pct}%"></div>
            <div class="chat-poll-opt-content">
              <span class="chat-poll-opt-text">
                ${isSelected ? '✓ ' : ''}${opt.text}
              </span>
              <span class="chat-poll-opt-pct">${pct}%</span>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.chat-poll-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const optId = btn.getAttribute('data-opt-id');
          voteOnPoll(optId);
        });
      });
    }

    function voteOnPoll(optionId) {
      currentVotedOption = optionId;
      localStorage.setItem('infinx_voted_poll_option', optionId);

      if (socket && socket.connected) {
        socket.emit('chat:poll_vote', { optionId });
      } else {
        fetch('/api/public-chat/poll/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionId })
        })
        .then(r => r.json())
        .then(renderPoll)
        .catch(() => {});
      }
    }

    // 7. Slow Mode Cooldown Controller
    let isCoolingDown = false;
    function triggerSlowMode() {
      isCoolingDown = true;
      sendBtn.disabled = true;
      sendBtn.classList.add('cooling');

      let remaining = 3;
      cooldownTimer.innerText = `${remaining}s`;

      const interval = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          cooldownTimer.innerText = `${remaining}s`;
        } else {
          clearInterval(interval);
          isCoolingDown = false;
          sendBtn.disabled = false;
          sendBtn.classList.remove('cooling');
        }
      }, 1000);
    }

    // 8. Connect Socket.io
    let socket = null;
    if (typeof io === 'function') {
      try {
        socket = io(window.location.origin, {
          transports: ['websocket', 'polling']
        });

        socket.emit('chat:join');

        socket.on('chat:history', (messages) => {
          if (Array.isArray(messages)) {
            feed.innerHTML = '';
            messages.forEach((m) => appendMessage(m));
          }
        });

        socket.on('chat:message', (msg) => {
          appendMessage(msg);
        });

        socket.on('chat:message_deleted', (data) => {
          if (data && data.id) {
            removeMessageFromFeed(data.id);
          }
        });

        socket.on('chat:poll_update', (pollData) => {
          renderPoll(pollData);
        });
      } catch (e) {
        console.warn('[PublicChat] Socket init failed, fallback to REST:', e);
      }
    }

    // REST fallback for initial poll and message feed
    fetch('/api/public-chat/poll')
      .then(r => r.json())
      .then(renderPoll)
      .catch(() => {});

    fetch('/api/public-chat/messages')
      .then(r => r.json())
      .then(msgs => {
        if (feed && feed.children.length === 0 && Array.isArray(msgs)) {
          msgs.forEach(appendMessage);
        }
      })
      .catch(() => {});

    // 9. Send Text Message
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (isCoolingDown) return;

      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      triggerSlowMode();

      // Ensure active local storage profile state is applied
      try {
        const uRaw = localStorage.getItem('infinx_user');
        if (uRaw) syncUserOtakuState(JSON.parse(uRaw));
        const uName = localStorage.getItem('infinx_username');
        if (uName) currentUser = uName;
        const uAv = localStorage.getItem('infinx_avatar');
        if (uAv) userAvatar = uAv;
        const uFr = localStorage.getItem('infinx_avatar_frame');
        if (uFr) userAvatarFrame = uFr;
        const uRk = localStorage.getItem('infinx_vip_rank');
        if (uRk) userRank = uRk;
        const uLv = localStorage.getItem('infinx_level');
        if (uLv) userLevel = parseInt(uLv, 10);
      } catch (e) {}

      const isGifLink = /^https?:\/\/.+\.(gif|webp)(\?.*)?$/i.test(text);

      const payload = {
        user: currentUser,
        role: currentRole,
        rank: userRank,
        level: userLevel,
        avatar: userAvatar,
        avatarFrame: userAvatarFrame,
        text: text,
        ...(isGifLink ? { gif: { url: text, title: 'Anime GIF' } } : {})
      };

      if (socket && socket.connected) {
        socket.emit('chat:message', payload);
      } else {
        fetch('/api/public-chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(msg => { if (msg) appendMessage(msg); })
        .catch(() => {});
      }
    });

    // 10. Send Chibi Sticker Message
    function sendStickerMessage(sticker) {
      if (isCoolingDown) return;
      triggerSlowMode();

      // Ensure active local storage profile state is applied
      try {
        const uRaw = localStorage.getItem('infinx_user');
        if (uRaw) syncUserOtakuState(JSON.parse(uRaw));
        const uName = localStorage.getItem('infinx_username');
        if (uName) currentUser = uName;
        const uAv = localStorage.getItem('infinx_avatar');
        if (uAv) userAvatar = uAv;
        const uFr = localStorage.getItem('infinx_avatar_frame');
        if (uFr) userAvatarFrame = uFr;
        const uRk = localStorage.getItem('infinx_vip_rank');
        if (uRk) userRank = uRk;
        const uLv = localStorage.getItem('infinx_level');
        if (uLv) userLevel = parseInt(uLv, 10);
      } catch (e) {}

      const payload = {
        user: currentUser,
        role: currentRole,
        rank: userRank,
        level: userLevel,
        avatar: userAvatar,
        avatarFrame: userAvatarFrame,
        sticker: sticker
      };

      if (socket && socket.connected) {
        socket.emit('chat:message', payload);
      } else {
        fetch('/api/public-chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(msg => { if (msg) appendMessage(msg); })
        .catch(() => {});
      }
    }

    // 11. Send Anime GIF Message
    function sendGifMessage(gif) {
      if (isCoolingDown) return;
      triggerSlowMode();

      // Ensure active local storage profile state is applied
      try {
        const uRaw = localStorage.getItem('infinx_user');
        if (uRaw) syncUserOtakuState(JSON.parse(uRaw));
        const uName = localStorage.getItem('infinx_username');
        if (uName) currentUser = uName;
        const uAv = localStorage.getItem('infinx_avatar');
        if (uAv) userAvatar = uAv;
        const uFr = localStorage.getItem('infinx_avatar_frame');
        if (uFr) userAvatarFrame = uFr;
        const uRk = localStorage.getItem('infinx_vip_rank');
        if (uRk) userRank = uRk;
        const uLv = localStorage.getItem('infinx_level');
        if (uLv) userLevel = parseInt(uLv, 10);
      } catch (e) {}

      const optionalText = input ? input.value.trim() : '';
      if (input) input.value = '';

      const payload = {
        user: currentUser,
        role: currentRole,
        rank: userRank,
        level: userLevel,
        avatar: userAvatar,
        avatarFrame: userAvatarFrame,
        text: optionalText,
        gif: {
          url: gif.url,
          title: gif.title
        }
      };

      if (socket && socket.connected) {
        socket.emit('chat:message', payload);
      } else {
        fetch('/api/public-chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(msg => { if (msg) appendMessage(msg); })
        .catch(() => {});
      }
    }
  }

  // Smooth Navigation / Scroll Helper for Navbar Live Chat Buttons
  window.scrollToPublicChat = function (e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof window.closeMobileMenu === 'function') window.closeMobileMenu();

    const chatSec = document.getElementById('publicLiveChatSection');
    if (chatSec) {
      chatSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const card = chatSec.querySelector('.public-chat-card');
      if (card) {
        card.classList.add('chat-focus-pulse');
        setTimeout(() => card.classList.remove('chat-focus-pulse'), 2000);
      }
      setTimeout(() => {
        const inp = document.getElementById('publicChatInput');
        if (inp) inp.focus();
      }, 450);
    } else {
      window.location.href = 'index.html#publicLiveChatSection';
    }
  };

  // If page loaded with #publicLiveChatSection hash
  if (window.location.hash === '#publicLiveChatSection') {
    setTimeout(() => {
      window.scrollToPublicChat();
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublicCommunityChat);
  } else {
    initPublicCommunityChat();
  }
})();
