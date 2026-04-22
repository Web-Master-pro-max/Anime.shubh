// anime-api.js - Complete API integration for Jikan + Consumet

const JIKAN_API = 'https://api.jikan.moe/v4';
const CONSUMET_API = 'https://api.consumet.org';

// Cache to avoid rate limits
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Generic fetch function with caching
async function fetchFromAPI(baseUrl, endpoint, useCache = true) {
    const cacheKey = `${baseUrl}${endpoint}`;
    const cached = cache.get(cacheKey);
    
    if (useCache && cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log('Using cached data for:', endpoint);
        return cached.data;
    }
    
    try {
        // Respect rate limits for Jikan API
        if (baseUrl === JIKAN_API) {
            await new Promise(resolve => setTimeout(resolve, 350));
        }
        
        const response = await fetch(`${baseUrl}${endpoint}`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (useCache) {
            cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
        }
        
        return data;
    } catch (error) {
        console.error('API Fetch Error:', error);
        return null;
    }
}

// ===== JIKAN API FUNCTIONS (for anime metadata) =====

// Get top anime (for trending and popular sections)
async function getTopAnime(page = 1, limit = 10) {
    const data = await fetchFromAPI(JIKAN_API, `/top/anime?page=${page}`);
    if (data && data.data) {
        return data.data.slice(0, limit).map(anime => ({
            id: anime.mal_id,
            title: anime.title,
            image: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
            score: anime.score || 'N/A',
            episodes: anime.episodes || '?',
            synopsis: anime.synopsis || 'No synopsis available.',
            type: anime.type || 'TV',
            year: anime.year || new Date().getFullYear()
        }));
    }
    return [];
}

// Get anime by genre
async function getAnimeByGenre(genreId, limit = 12) {
    const data = await fetchFromAPI(JIKAN_API, `/anime?genres=${genreId}&limit=${limit}&order_by=score&sort=desc`);
    if (data && data.data) {
        return data.data.map(anime => ({
            id: anime.mal_id,
            title: anime.title,
            image: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
            score: anime.score || 'N/A',
            synopsis: anime.synopsis?.substring(0, 100) || 'No description available.',
            episodes: anime.episodes || '?',
            year: anime.year || '?'
        }));
    }
    return [];
}

// Search anime
async function searchAnime(query, limit = 20) {
    if (!query || query.trim() === '') return [];
    const encodedQuery = encodeURIComponent(query.trim());
    const data = await fetchFromAPI(JIKAN_API, `/anime?q=${encodedQuery}&limit=${limit}`);
    if (data && data.data) {
        return data.data.map(anime => ({
            id: anime.mal_id,
            title: anime.title,
            image: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
            score: anime.score || 'N/A',
            synopsis: anime.synopsis?.substring(0, 150) || 'No description available.',
            episodes: anime.episodes || '?',
            year: anime.year || '?'
        }));
    }
    return [];
}

// Get anime details by ID
async function getAnimeDetails(animeId) {
    const data = await fetchFromAPI(JIKAN_API, `/anime/${animeId}/full`);
    if (data && data.data) {
        const anime = data.data;
        return {
            id: anime.mal_id,
            title: anime.title,
            titleEnglish: anime.title_english,
            synopsis: anime.synopsis || 'No synopsis available.',
            background: anime.background,
            score: anime.score || 'N/A',
            scoredBy: anime.scored_by,
            rank: anime.rank,
            popularity: anime.popularity,
            members: anime.members,
            favorites: anime.favorites,
            episodes: anime.episodes || '?',
            status: anime.status || 'Unknown',
            duration: anime.duration || '?',
            season: anime.season,
            year: anime.year || '?',
            genres: anime.genres?.map(g => g.name) || [],
            themes: anime.themes?.map(t => t.name) || [],
            studios: anime.studios?.map(s => s.name) || [],
            images: {
                large: anime.images?.jpg?.large_image_url || '',
                small: anime.images?.jpg?.image_url || ''
            },
            trailer: anime.trailer?.embed_url || null
        };
    }
    return null;
}

// ===== CONSUMET API FUNCTIONS (for actual video streams) =====

// Search for anime on Gogoanime (to get the ID needed for episodes)
async function searchAnimeForStreaming(query) {
    if (!query || query.trim() === '') return [];
    const encodedQuery = encodeURIComponent(query.trim());
    const data = await fetchFromAPI(CONSUMET_API, `/anime/gogoanime/${encodedQuery}`, false);
    
    if (data && data.results && data.results.length > 0) {
        return data.results.map(anime => ({
            id: anime.id,
            title: anime.title,
            image: anime.image,
            releaseDate: anime.releaseDate,
            subOrDub: anime.subOrDub || 'sub'
        }));
    }
    return [];
}

// Get episode list for an anime (using Gogoanime ID)
async function getAnimeEpisodes(gogoanimeId, page = 1) {
    try {
        const data = await fetchFromAPI(CONSUMET_API, `/anime/gogoanime/info/${gogoanimeId}?page=${page}`, false);
        
        if (data && data.episodes && data.episodes.length > 0) {
            return {
                animeTitle: data.title,
                totalEpisodes: data.totalEpisodes || data.episodes.length,
                episodes: data.episodes.map(ep => ({
                    id: ep.id,
                    number: ep.number,
                    title: ep.title || `Episode ${ep.number}`,
                    image: ep.image,
                    isFiller: ep.isFiller || false
                }))
            };
        }
        return { episodes: [] };
    } catch (error) {
        console.error('Failed to get episodes:', error);
        return { episodes: [] };
    }
}

// Get streaming links for a specific episode
async function getEpisodeStreams(episodeId) {
    try {
        const data = await fetchFromAPI(CONSUMET_API, `/anime/gogoanime/watch/${episodeId}`, false);
        
        if (data && data.sources && data.sources.length > 0) {
            // Filter and organize sources by quality
            const sources = data.sources.map(source => ({
                url: source.url,
                quality: source.quality || 'auto',
                isM3U8: source.url.includes('.m3u8'),
                type: source.isM3U8 ? 'hls' : 'mp4'
            }));
            
            // Remove duplicates and sort by quality
            const uniqueSources = [];
            const seenUrls = new Set();
            for (const source of sources) {
                if (!seenUrls.has(source.url)) {
                    seenUrls.add(source.url);
                    uniqueSources.push(source);
                }
            }
            
            // Sort: 1080p > 720p > 480p > 360p > auto
            const qualityOrder = { '1080p': 4, '720p': 3, '480p': 2, '360p': 1, 'auto': 0 };
            uniqueSources.sort((a, b) => (qualityOrder[a.quality] || 0) - (qualityOrder[b.quality] || 0));
            
            return {
                sources: uniqueSources,
                subtitles: data.subtitles || [],
                download: data.download || null,
                headers: data.headers || { Referer: 'https://gogoanime.gg/' }
            };
        }
        return { sources: [] };
    } catch (error) {
        console.error('Failed to get streams:', error);
        return { sources: [] };
    }
}

// Alternative: Get from Zoro (sometimes has different sources)
async function getZoroEpisodeStreams(episodeId) {
    try {
        const data = await fetchFromAPI(CONSUMET_API, `/anime/zoro/watch/${episodeId}`, false);
        if (data && data.sources && data.sources.length > 0) {
            return data.sources.map(source => ({
                url: source.url,
                quality: source.quality || 'auto',
                isM3U8: source.url.includes('.m3u8'),
                type: source.isM3U8 ? 'hls' : 'mp4'
            }));
        }
        return [];
    } catch (error) {
        console.error('Failed to get Zoro streams:', error);
        return [];
    }
}

// Export all functions
window.AnimeAPI = {
    // Jikan functions (metadata)
    getTopAnime,
    getAnimeByGenre,
    searchAnime,
    getAnimeDetails,
    // Consumet functions (video streams)
    searchAnimeForStreaming,
    getAnimeEpisodes,
    getEpisodeStreams,
    getZoroEpisodeStreams
};

console.log('AnimeAPI loaded successfully!');