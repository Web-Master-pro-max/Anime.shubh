// Updated script.js with Jikan API integration

document.addEventListener('DOMContentLoaded', async function() {
    // ====== MOBILE MENU TOGGLE (Keep your existing code) ======
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navbar = document.querySelector('.navbar');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navbar.classList.toggle('active');
            mobileToggle.innerHTML = navbar.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });
    }
    
    // Close menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navbar.classList.remove('active');
            if (mobileToggle) mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        });
    });
    
    // ====== HEADER SCROLL EFFECT ======
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // ====== LOAD DYNAMIC CONTENT FROM API ======
    
    // 1. Load Trending Anime for the slider
    async function loadTrendingAnime() {
        const trendingContainer = document.querySelector('.trending-slider .swiper-wrapper');
        if (!trendingContainer) return;
        
        // Show loading state
        trendingContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        const trendingAnime = await AnimeAPI.getTrendingAnime(1);
        
        if (trendingAnime && trendingAnime.length > 0) {
            trendingContainer.innerHTML = '';
            
            trendingAnime.forEach((anime, index) => {
                const slide = document.createElement('div');
                slide.className = 'swiper-slide trending-item';
                slide.innerHTML = `
                    <div class="trending-number">${String(index + 1).padStart(2, '0')}</div>
                    <div class="trending-card">
                        <div class="card-image">
                            <img src="${anime.image}" alt="${anime.title}" loading="lazy">
                            <div class="card-overlay">
                                <div class="overlay-content">
                                    <h3>${anime.title.length > 30 ? anime.title.substring(0, 27) + '...' : anime.title}</h3>
                                    <p>${anime.type || 'Anime'} • ${anime.episodes || '?'} episodes</p>
                                    <div class="rating">
                                        <i class="fas fa-star"></i>
                                        <span>${anime.score || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add click event to go to video player
                slide.addEventListener('click', () => {
                    window.location.href = `player.html?id=${anime.id}`;
                });
                
                trendingContainer.appendChild(slide);
            });
            
            // Reinitialize Swiper after adding new slides
            if (window.trendingSwiper) {
                window.trendingSwiper.update();
            }
        } else {
            trendingContainer.innerHTML = '<p class="text-center">Failed to load trending anime. Please try again later.</p>';
        }
    }
    
    // 2. Load Anime by Genre for each section
    async function loadGenreSection(genreId, containerSelector, titleSelector = null) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        const animeList = await AnimeAPI.getAnimeByGenre(genreId, 6);
        
        if (animeList && animeList.length > 0) {
            container.innerHTML = '';
            
            animeList.forEach(anime => {
                const card = document.createElement('div');
                card.className = 'movie-card';
                card.innerHTML = `
                    <div class="movie-poster">
                        <div class="movie-badge">${anime.score ? '★ ' + anime.score.toFixed(1) : 'NEW'}</div>
                        <div class="movie-rating">
                            <i class="fas fa-star"></i> ${anime.score || '?'}
                        </div>
                        <img src="${anime.image}" alt="${anime.title}" loading="lazy">
                    </div>
                    <div class="movie-info">
                        <h3 class="movie-title">${anime.title.length > 25 ? anime.title.substring(0, 22) + '...' : anime.title}</h3>
                        <p class="movie-desc">${anime.synopsis ? anime.synopsis.substring(0, 80) + '...' : 'No description available.'}</p>
                        <div class="movie-actions">
                            <a href="player.html?id=${anime.id}" class="btn btn-primary btn-small">
                                <i class="fas fa-play"></i> Watch
                            </a>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p class="text-center">No anime found in this category.</p>';
        }
    }
    
    // 3. Load Newest Season Anime
    async function loadNewestAnime() {
        // If you have a "newest" section, update it
        const newestContainer = document.querySelector('#newest .movies-grid');
        if (!newestContainer) return;
        
        newestContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        const seasonAnime = await AnimeAPI.getCurrentSeasonAnime();
        
        if (seasonAnime && seasonAnime.length > 0) {
            newestContainer.innerHTML = '';
            const displayAnime = seasonAnime.slice(0, 6);
            
            displayAnime.forEach(anime => {
                const card = document.createElement('div');
                card.className = 'movie-card';
                card.innerHTML = `
                    <div class="movie-poster">
                        <div class="movie-badge">NEW</div>
                        <div class="movie-rating">
                            <i class="fas fa-star"></i> ${anime.score || '?'}
                        </div>
                        <img src="${anime.image}" alt="${anime.title}" loading="lazy">
                    </div>
                    <div class="movie-info">
                        <h3 class="movie-title">${anime.title.length > 25 ? anime.title.substring(0, 22) + '...' : anime.title}</h3>
                        <p class="movie-desc">${anime.synopsis ? anime.synopsis.substring(0, 80) + '...' : 'Currently airing this season!'}</p>
                        <div class="movie-actions">
                            <a href="player.html?id=${anime.id}" class="btn btn-primary btn-small">
                                <i class="fas fa-play"></i> Watch
                            </a>
                        </div>
                    </div>
                `;
                newestContainer.appendChild(card);
            });
        }
    }
    
    // 4. Search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length < 2) {
                // Reset to original content
                location.reload();
                return;
            }
            
            searchTimeout = setTimeout(async () => {
                const results = await AnimeAPI.searchAnime(query, 12);
                
                // Update all sections with search results
                const allContainers = document.querySelectorAll('.movies-grid');
                allContainers.forEach(container => {
                    if (container.closest('#action') || container.closest('#anime') || 
                        container.closest('#hollywood') || container.closest('#horror') || 
                        container.closest('#child')) {
                        
                        if (results.length > 0) {
                            container.innerHTML = '';
                            results.forEach(anime => {
                                const card = document.createElement('div');
                                card.className = 'movie-card';
                                card.innerHTML = `
                                    <div class="movie-poster">
                                        <div class="movie-rating">
                                            <i class="fas fa-star"></i> ${anime.score || '?'}
                                        </div>
                                        <img src="${anime.image}" alt="${anime.title}" loading="lazy">
                                    </div>
                                    <div class="movie-info">
                                        <h3 class="movie-title">${anime.title.length > 25 ? anime.title.substring(0, 22) + '...' : anime.title}</h3>
                                        <p class="movie-desc">${anime.synopsis || 'No description available.'}</p>
                                        <div class="movie-actions">
                                            <a href="player.html?id=${anime.id}" class="btn btn-primary btn-small">
                                                <i class="fas fa-play"></i> Watch
                                            </a>
                                        </div>
                                    </div>
                                `;
                                container.appendChild(card);
                            });
                        } else {
                            container.innerHTML = '<p class="text-center">No results found for "' + query + '"</p>';
                        }
                    }
                });
            }, 500);
        });
        
        // Clear search when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box') && searchInput.value) {
                searchInput.value = '';
                location.reload();
            }
        });
    }
    
    // 5. Initialize Hero Slider (keep your existing Swiper initialization)
    if (typeof Swiper !== 'undefined') {
        const heroSwiper = new Swiper('.hero-slider', {
            loop: true,
            autoplay: { delay: 7000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            effect: 'fade',
            fadeEffect: { crossFade: true },
            speed: 1000,
        });
        window.heroSwiper = heroSwiper;
    }
    
    // Initialize Trending Swiper
    if (typeof Swiper !== 'undefined') {
        const trendingSwiper = new Swiper('.trending-slider', {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: true,
            autoplay: { delay: 5000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.next-btn', prevEl: '.prev-btn' },
            breakpoints: {
                320: { slidesPerView: 2, spaceBetween: 15 },
                768: { slidesPerView: 3, spaceBetween: 20 },
                1024: { slidesPerView: 4, spaceBetween: 25 },
                1400: { slidesPerView: 5, spaceBetween: 30 }
            }
        });
        window.trendingSwiper = trendingSwiper;
    }
    
    // ====== LOAD ALL DATA ======
    await loadTrendingAnime();
    await loadNewestAnime();
    
    // Load genre sections (use appropriate genre IDs)
    // Genre IDs: 1=Action, 14=Horror, 15=Kids, 27=Shounen for Anime section
    await loadGenreSection(1, '#action .movies-grid');      // Action
    await loadGenreSection(27, '#anime .movies-grid');      // Anime (Shounen)
    await loadGenreSection(14, '#horror .movies-grid');     // Horror
    await loadGenreSection(15, '#child .movies-grid');      // Kids
    
    // For Hollywood, Jikan doesn't have Hollywood movies, so keep your existing content or use a different API
    
    // ====== SMOOTH SCROLLING ======
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ====== ACTIVE NAV LINK ON SCROLL ======
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    function setActiveNavLink() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - 100)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', setActiveNavLink);
    
    // ====== IMAGE ERROR HANDLING ======
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', function() {
            this.src = 'https://via.placeholder.com/300x450?text=No+Image';
        });
    });
    
    // ====== ANIMATION ON SCROLL ======
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.movie-card').forEach(card => {
        observer.observe(card);
    });
});