
const API_BASE = '/api';
let taskPollInterval = null;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.formatMediaUrl = function (url) {
    const fallback = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200';
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    if (url.startsWith('/uploads/')) return url;
    if (url.startsWith('posters/') || url.startsWith('banners/')) return `/uploads/${url}`;
    if (!url.includes('/')) return `/uploads/posters/${url}`;
    return url.startsWith('/') ? url : `/${url}`;
};

// Authorization & Guards
document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('infinx_token');
    const role = localStorage.getItem('infinx_user_role');

    if (!token || role !== 'ADMIN') {
        alert('Access Denied: Admin privileges required.');
        window.location.href = '/index.html';
        return;
    }

    // Display friendly Vercel upload notice if hosted on vercel.app
    if (window.location.hostname.includes('vercel.app')) {
        const vercelNotice = document.createElement('div');
        vercelNotice.style.cssText = 'background: rgba(255,165,0,0.15); border: 1px solid #ffa500; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; color: #ffb703; font-size: 1rem; font-family: Outfit, sans-serif;';
        vercelNotice.innerHTML = `<i class="fas fa-info-circle" style="margin-right: 8px;"></i> <strong>Uploading Video Files:</strong> Vercel restricts proxy uploads to 4.5MB. To upload full-length MKV/MP4 video files, open the EC2 Admin Portal at <a href="http://13.61.84.121:8000/admin.html" target="_blank" style="color: #fff; text-decoration: underline; font-weight: bold;">http://13.61.84.121:8000/admin.html</a>!`;
        const uploadPanel = document.getElementById('uploadPanel') || document.getElementById('uploadEpisodePanel');
        if (uploadPanel) uploadPanel.insertBefore(vercelNotice, uploadPanel.firstChild);
    }

    // Tab toggling logic
    const menuItems = document.querySelectorAll('.menu-item');
    const panels = document.querySelectorAll('.content-panel');

    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            menuItems.forEach(i => i.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            this.classList.add('active');
            const targetPanel = this.dataset.target;
            const targetEl = document.getElementById(targetPanel);
            if (targetEl) targetEl.classList.add('active');

            loadDashboardStats();

            if (targetPanel === 'uploadEpisodePanel') {
                loadShowsList();
                loadStorageSettings();
            } else if (targetPanel === 'addShowPanel') {
                loadCategoriesList();
            } else if (targetPanel === 'managePanel') {
                fetchManageShows();
            } else if (targetPanel === 'taskPanel') {
                fetchTasks();
            } else if (targetPanel === 'bannerPanel') {
                loadBannerCustomizer();
            } else if (targetPanel === 'storagePanel') {
                loadStorageSettings();
            } else if (targetPanel === 'usersPanel') {
                fetchUsers();
            }
        });
    });

    // Initial load of storage preferences & defaults
    loadStorageSettings();

    // File selection label mapping
    const showPosterFileInput = document.getElementById('showPosterFile');
    if (showPosterFileInput) {
        showPosterFileInput.addEventListener('change', function () {
            const label = document.getElementById('posterLabel');
            if (label) label.textContent = this.files[0] ? this.files[0].name : 'Drag & drop poster image or click to select';
        });
    }

    const globalStorageForm = document.getElementById('globalStorageForm');
    if (globalStorageForm) {
        globalStorageForm.addEventListener('submit', saveStorageSettings);
    }

    const bannerSettingsForm = document.getElementById('bannerSettingsForm');
    if (bannerSettingsForm) {
        bannerSettingsForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            const timeInput = document.getElementById('bannerSlideTime');
            const time = timeInput ? timeInput.value : 6000;
            if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            try {
                const res = await fetch(`${API_BASE}/settings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('infinx_token')}`
                    },
                    body: JSON.stringify({ bannerSlideTime: time })
                });
                if (res.ok) {
                    alert('Settings saved successfully! Changes will be reflected on the homepage.');
                } else {
                    alert('Failed to save settings.');
                }
            } catch (err) {
                alert('Connection error');
            }
            if (btn) btn.innerHTML = '<i class="fas fa-save"></i> Save Settings';
        });
    }

    // Load settings when banner panel is opened
    const bannerPanelTab = document.querySelector('[data-target="bannerPanel"]');
    if (bannerPanelTab) {
        bannerPanelTab.addEventListener('click', async () => {
            try {
                const res = await fetch(`${API_BASE}/settings`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.bannerSlideTime) {
                        const timeInput = document.getElementById('bannerSlideTime');
                        if (timeInput) timeInput.value = data.bannerSlideTime;
                    }
                }
            } catch (e) { }
        });
    }

    const episodeVideoFileInput = document.getElementById('episodeVideoFile');
    if (episodeVideoFileInput) {
        episodeVideoFileInput.addEventListener('change', function () {
            const label = document.getElementById('videoLabel');
            if (label) label.textContent = this.files[0] ? `Selected: ${this.files[0].name}` : 'Select high quality MKV/MP4 stream file';
        });
    }

    const showBannerFileInput = document.getElementById('showBannerFile');
    if (showBannerFileInput) {
        showBannerFileInput.addEventListener('change', function () {
            const label = document.getElementById('bannerLabel');
            if (label) label.textContent = this.files[0] ? `Selected: ${this.files[0].name}` : 'Drag & drop banner image/video or click to select';
        });
    }

    const bannerCustomFileInput = document.getElementById('bannerCustomFile');
    if (bannerCustomFileInput) {
        bannerCustomFileInput.addEventListener('change', function () {
            const label = document.getElementById('bannerCustomLabel');
            if (label) label.textContent = this.files[0] ? `Selected: ${this.files[0].name}` : 'Drag & drop landscape backdrop image/video or click to select';
        });
    }

    const episodeShowSelect = document.getElementById('episodeShow');
    if (episodeShowSelect) {
        episodeShowSelect.addEventListener('change', function () {
            const selectedOption = this.options[this.selectedIndex];
            const type = selectedOption ? selectedOption.getAttribute('data-type') : '';
            const epNumInput = document.getElementById('episodeNumber');
            const epTitleInput = document.getElementById('episodeTitle');
            if (type === 'movie') {
                if (epNumInput) { epNumInput.value = 1; epNumInput.disabled = true; }
                if (epTitleInput) { epTitleInput.value = 'Full Movie'; epTitleInput.disabled = true; }
            } else {
                if (epNumInput) epNumInput.disabled = false;
                if (epTitleInput) epTitleInput.disabled = false;
                if (epNumInput && epTitleInput && epNumInput.value === '1' && epTitleInput.value === 'Full Movie') {
                    epNumInput.value = '';
                    epTitleInput.value = '';
                }
            }
        });
    }

    // Form Submissions
    const createShowForm = document.getElementById('createShowForm');
    if (createShowForm) createShowForm.addEventListener('submit', handleCreateShow);

    const customizeBannerForm = document.getElementById('customizeBannerForm');
    if (customizeBannerForm) customizeBannerForm.addEventListener('submit', handleCustomizeBanner);

    const editShowForm = document.getElementById('editShowForm');
    if (editShowForm) editShowForm.addEventListener('submit', handleEditShow);

    // Populate forms initial data
    loadCategoriesList();
    loadShowsList();
    loadDashboardStats();
});

// Fetch categories to populate show creation selector
async function loadCategoriesList() {
    try {
        const res = await fetch(`${API_BASE}/shows/categories`);
        if (res.ok) {
            const data = await res.json();
            const categoriesSelect = document.getElementById('showCategories');
            if (categoriesSelect && Array.isArray(data)) {
                categoriesSelect.innerHTML = data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }
        }
    } catch (e) {
        console.error(e);
    }
}

// Fetch shows to populate episode parent selector
async function loadShowsList() {
    try {
        const res = await fetch(`${API_BASE}/shows/categories`);
        if (res.ok) {
            const categories = await res.json();
            const episodeShowSelect = document.getElementById('episodeShow');

            if (episodeShowSelect && Array.isArray(categories)) {
                // Flatten shows
                let showsList = [];
                categories.forEach(cat => {
                    if (Array.isArray(cat.shows)) {
                        cat.shows.forEach(show => {
                            if (!showsList.find(s => s.id === show.id)) {
                                showsList.push(show);
                            }
                        });
                    }
                });

                episodeShowSelect.innerHTML = `<option value="">-- Choose Anime --</option>` +
                    showsList.map(s => `<option value="${s.id}" data-type="${s.type || 'series'}">${s.title}</option>`).join('');
            }
        }
    } catch (e) {
        console.error(e);
    }
}

// Fetch real-time dashboard analytics counters
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('infinx_token');
        const res = await fetch(`${API_BASE}/admin/shows`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const shows = await res.json();
            const totalShowsEl = document.getElementById('statTotalShows');
            const totalEpsEl = document.getElementById('statTotalEpisodes');
            if (Array.isArray(shows)) {
                if (totalShowsEl) totalShowsEl.textContent = shows.length;

                let epCount = 0;
                shows.forEach(s => {
                    if (s.episodes && Array.isArray(s.episodes)) epCount += s.episodes.length;
                });
                if (totalEpsEl) totalEpsEl.textContent = epCount;
            }
        }

        // Fetch active transcode tasks
        const tasksRes = await fetch(`${API_BASE}/admin/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tasksRes.ok) {
            const tasks = await tasksRes.json();
            const statActiveTasksEl = document.getElementById('statActiveTasks');
            if (Array.isArray(tasks)) {
                const pendingOrProcessing = tasks.filter(t => t.transcodeStatus === 'PENDING' || t.transcodeStatus === 'PROCESSING').length;
                if (statActiveTasksEl) statActiveTasksEl.textContent = pendingOrProcessing;
            }
        }
    } catch (e) {
        console.error(e);
    }
}

// Handle show creations with AWS poster S3 upload
async function handleCreateShow(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalHtml = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Show...';
    btn.disabled = true;

    const title = document.getElementById('showTitle').value;
    const rating = parseFloat(document.getElementById('showRating').value);
    const badge = document.getElementById('showBadge').value;
    const year = document.getElementById('showYear').value;
    const runtime = document.getElementById('showRuntime').value;
    const description = document.getElementById('showDesc').value;
    const posterFile = document.getElementById('showPosterFile').files[0];

    const isFeatured = document.getElementById('showIsFeatured').checked;
    const bannerFile = document.getElementById('showBannerFile').files[0];
    const type = document.getElementById('showType').value;
    const dubsub = document.getElementById('showDubSub').checked;

    // Collect multi selected categories
    const selectedOptions = Array.from(document.getElementById('showCategories').selectedOptions);
    const categoryIds = selectedOptions.map(opt => parseInt(opt.value));

    // Create multi-part form data
    const formData = new FormData();
    formData.append('title', title);
    formData.append('rating', rating);
    formData.append('badge', badge);
    formData.append('year', year);
    formData.append('runtime', runtime);
    formData.append('description', description);
    formData.append('type', type);
    formData.append('dubsub', dubsub);
    formData.append('poster', posterFile);
    formData.append('isFeatured', isFeatured);
    if (bannerFile) {
        formData.append('banner', bannerFile);
    }
    formData.append('categoryIds', JSON.stringify(categoryIds));

    try {
        const token = localStorage.getItem('infinx_token');
        const res = await fetch(`${API_BASE}/admin/shows`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            alert('Anime created successfully! Poster stored in AWS S3.');
            document.getElementById('createShowForm').reset();
            document.getElementById('posterLabel').textContent = 'Drag & drop poster image or click to select';
            document.getElementById('bannerLabel').textContent = 'Drag & drop banner image or click to select';
            loadShowsList();
        } else {
            const errorData = await res.json();
            alert(`Creation failed: ${errorData.error}`);
        }
    } catch (err) {
        console.error(err);
        alert('Connection error. Please try again.');
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

// Handle raw episode uploads with XMLHttpRequest to track upload progress bar

function formatEtaText(sec) {
    if (!sec || sec <= 0 || isNaN(sec) || !isFinite(sec)) return 'ETA: Calculating...';
    if (sec < 60) return `ETA: ${Math.round(sec)}s`;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    if (h > 0) return `ETA: ${h}h ${m}m ${s}s`;
    return `ETA: ${m}m ${s}s`;
}

function uploadChunkXHR(token, uploadId, chunkIndex, totalChunks, chunkBlob, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('chunk', chunkBlob, `chunk_${chunkIndex}`);

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable && onProgress) {
                onProgress(e.loaded, e.total);
            }
        };

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`HTTP ${xhr.status}`));
            }
        };

        xhr.onerror = function () {
            reject(new Error('Network connection error uploading chunk'));
        };

        xhr.open('POST', `${API_BASE}/admin/upload-chunk`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
    });
}

// Handle Add Episode Form Upload Submission with Resumable Chunked Upload & Retry/Resume support
const uploadEpisodeForm = document.getElementById('uploadEpisodeForm');
if (uploadEpisodeForm) {
    uploadEpisodeForm.addEventListener('submit', function (e) {
        e.preventDefault();
        handleUploadEpisode(false);
    });
}

async function handleUploadEpisode(isResume = false) {
    const btn = document.getElementById('btnUploadSubmit');
    const container = document.getElementById('uploadProgressContainer');
    const resumeArea = document.getElementById('resumeUploadActionArea');
    const bar1 = document.getElementById('barStage1');
    const text1 = document.getElementById('textStage1');
    const bar2 = document.getElementById('barStage2');
    const text2 = document.getElementById('textStage2');
    const bar3 = document.getElementById('barStage3');
    const text3 = document.getElementById('textStage3');

    const showId = document.getElementById('episodeShow').value;
    const episodeNumber = parseInt(document.getElementById('episodeNumber').value, 10);
    const title = document.getElementById('episodeTitle').value;
    const videoFileInput = document.getElementById('episodeVideoFile');
    const videoFile = videoFileInput ? videoFileInput.files[0] : null;

    if (!videoFile) {
        alert('Please select a video file to upload.');
        return;
    }

    if (!showId || !episodeNumber || !title) {
        alert('Please fill in all show and episode details.');
        return;
    }

    btn.disabled = true;
    if (resumeArea) resumeArea.style.display = 'none';
    container.style.display = 'block';

    if (!isResume) {
        bar1.style.width = '0%';
        text1.textContent = '0%';
        text1.style.color = 'var(--secondary)';
        bar2.style.width = '0%';
        text2.textContent = 'Pending';
        text2.style.color = 'var(--gray-text)';
        bar3.style.width = '0%';
        text3.textContent = 'Pending';
        text3.style.color = 'var(--gray-text)';
    }

    const token = localStorage.getItem('infinx_token');
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);
    const sanitizeName = videoFile.name.replace(/[^a-zA-Z0-9]/g, '');
    const uploadId = `ep_${showId}_${episodeNumber}_${videoFile.size}_${sanitizeName}`;

    try {
        // 1. Query server for already saved chunk indices
        const statusRes = await fetch(`${API_BASE}/admin/upload-chunk-status?uploadId=${encodeURIComponent(uploadId)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let uploadedChunks = [];
        if (statusRes.ok) {
            const statusData = await statusRes.json();
            uploadedChunks = statusData.uploadedChunks || [];
        }

        // Initial base bytes already saved from previous session
        let sessionBaseBytes = 0;
        uploadedChunks.forEach(idx => {
            const chunkSizeThis = Math.min(CHUNK_SIZE, videoFile.size - (idx * CHUNK_SIZE));
            sessionBaseBytes += chunkSizeThis;
        });

        let sessionStartTime = Date.now();

        // Update progress initially if resuming
        if (uploadedChunks.length > 0) {
            const initPercent = Math.min(100, Math.round((sessionBaseBytes / videoFile.size) * 100));
            bar1.style.width = `${initPercent}%`;
            text1.textContent = `Resuming from ${initPercent}% (${uploadedChunks.length}/${totalChunks} chunks)...`;
        }

        // 2. Build queue of missing chunks & launch parallel worker pool (3x to 5x faster upload)
        const missingChunks = [];
        for (let i = 0; i < totalChunks; i++) {
            if (!uploadedChunks.includes(i)) {
                missingChunks.push(i);
            }
        }

        const chunkProgressMap = {};

        function updateOverallProgress() {
            let bytesUploadedInSession = 0;
            Object.values(chunkProgressMap).forEach(b => bytesUploadedInSession += b);

            const currentTotalUploaded = sessionBaseBytes + bytesUploadedInSession;
            const currentPercent = Math.min(100, Math.round((currentTotalUploaded / videoFile.size) * 100));
            bar1.style.width = `${currentPercent}%`;

            const elapsedSec = (Date.now() - sessionStartTime) / 1000;
            const speedBytesPerSec = bytesUploadedInSession / (elapsedSec || 0.1);

            const speedMBps = (speedBytesPerSec / (1024 * 1024)).toFixed(1);
            const speedStr = speedMBps >= 1.0 ? `${speedMBps} MB/s` : `${Math.round(speedBytesPerSec / 1024)} KB/s`;

            const remainingBytes = videoFile.size - currentTotalUploaded;
            const etaSec = speedBytesPerSec > 0 ? remainingBytes / speedBytesPerSec : 0;

            text1.textContent = `${currentPercent}% (${speedStr} • ${formatEtaText(etaSec)})`;
        }

        const CONCURRENCY = 3; // 3 parallel streams for max network throughput
        let workerError = null;

        async function uploadWorker() {
            while (missingChunks.length > 0 && !workerError) {
                const chunkIndex = missingChunks.shift();
                if (chunkIndex === undefined) break;

                const chunkStart = chunkIndex * CHUNK_SIZE;
                const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, videoFile.size);
                const chunkBlob = videoFile.slice(chunkStart, chunkEnd);

                let chunkSuccess = false;
                let attempts = 0;

                while (!chunkSuccess && attempts < 4 && !workerError) {
                    attempts++;
                    try {
                        await uploadChunkXHR(token, uploadId, chunkIndex, totalChunks, chunkBlob, (loadedInChunk) => {
                            chunkProgressMap[chunkIndex] = loadedInChunk;
                            updateOverallProgress();
                        });

                        chunkSuccess = true;
                        uploadedChunks.push(chunkIndex);
                    } catch (err) {
                        console.warn(`Chunk ${chunkIndex} attempt ${attempts} failed:`, err);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                if (!chunkSuccess) {
                    workerError = new Error(`Network connection dropped at Chunk ${chunkIndex + 1} of ${totalChunks}.`);
                    break;
                }
            }
        }

        const workerPromises = [];
        const activeWorkers = Math.min(CONCURRENCY, missingChunks.length);
        for (let w = 0; w < activeWorkers; w++) {
            workerPromises.push(uploadWorker());
        }

        await Promise.all(workerPromises);

        if (workerError) {
            throw workerError;
        }

        // 3. Finalize upload: reassemble chunks & trigger transcoding
        text1.textContent = '100% (Finalizing & Merging...)';
        text1.style.color = '#2ecc71';
        bar1.style.width = '100%';

        const selectedStorageType = document.querySelector('input[name="uploadStorageType"]:checked')?.value || 'local';
        const selectedLocalStoragePath = document.getElementById('uploadLocalPathInput')?.value.trim() || '';

        const finalizeRes = await fetch(`${API_BASE}/admin/upload-chunk-finalize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uploadId,
                showId,
                title,
                episodeNumber,
                description: document.getElementById('episodeDescription')?.value || '',
                duration: document.getElementById('episodeDuration')?.value || '',
                totalChunks,
                fileName: videoFile.name,
                storageType: selectedStorageType,
                localStoragePath: selectedLocalStoragePath
            })
        });

        if (finalizeRes.ok) {
            btn.disabled = false;
            alert('Episode video uploaded & reassembled successfully! HLS Transcoding dispatched.');
            document.getElementById('uploadEpisodeForm').reset();
            document.getElementById('videoLabel').textContent = 'Select high quality MKV/MP4 stream file';
            container.style.display = 'none';

            document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
            document.querySelectorAll('.content-panel').forEach(panel => panel.classList.remove('active'));

            const taskItem = document.querySelector('[data-target="taskPanel"]');
            if (taskItem) taskItem.classList.add('active');
            document.getElementById('taskPanel').classList.add('active');
            fetchTasks();
        } else {
            const errorData = await finalizeRes.json();
            throw new Error(errorData.error || 'Failed to finalize chunked video upload.');
        }
    } catch (err) {
        console.error('Upload Error:', err);
        btn.disabled = false;
        text1.textContent = `Upload Paused: ${err.message}`;
        text1.style.color = '#e74c3c';
        if (resumeArea) resumeArea.style.display = 'block';
        alert(`Upload Interrupted!\n${err.message}\n\nDon't worry! Click "Resume Interrupted Upload" below to pick up right where it left off.`);
    }
}

// Render real 3-stage progress bars with speed and ETA
function renderTranscodeProgress(task) {
    const overallStatus = (task.transcodeStatus || 'PENDING').toUpperCase();

    let stageObj = {
        uploadServer: { percent: 100, speed: 'Done', eta: 0, status: 'COMPLETED' },
        transcoding: { percent: 0, speed: '0x', eta: 0, status: 'PENDING' },
        uploadS3: { percent: 0, speed: '0 MB/s', eta: 0, status: 'PENDING' }
    };

    if (task.stageDetails) {
        try {
            stageObj = typeof task.stageDetails === 'string' ? JSON.parse(task.stageDetails) : task.stageDetails;
        } catch (e) { }
    }

    // If videoUrl is already generated and valid, it is fully completed
    if (task.videoUrl && task.videoUrl.includes('master.m3u8') && overallStatus !== 'FAILED') {
        stageObj.transcoding.status = 'COMPLETED';
        stageObj.transcoding.percent = 100;
        stageObj.transcoding.speed = 'Done';
        stageObj.uploadS3.status = 'COMPLETED';
        stageObj.uploadS3.percent = 100;
        stageObj.uploadS3.speed = 'Done';
    } else if (overallStatus === 'PROCESSING') {
        if (stageObj.transcoding.status === 'PENDING') {
            stageObj.transcoding.status = 'PROCESSING';
        }
    } else if (overallStatus === 'COMPLETED') {
        stageObj.transcoding.status = 'COMPLETED';
        stageObj.transcoding.percent = 100;
        stageObj.uploadS3.status = 'COMPLETED';
        stageObj.uploadS3.percent = 100;
    } else if (overallStatus === 'FAILED') {
        if (stageObj.transcoding.status === 'PROCESSING') stageObj.transcoding.status = 'FAILED';
        if (stageObj.uploadS3.status === 'PROCESSING') stageObj.uploadS3.status = 'FAILED';
    }

    function renderBar(label, icon, data, activeGradient) {
        const percent = Math.min(100, Math.max(0, Math.round(data.percent || 0)));
        const st = data.status || 'PENDING';

        let barGradient = 'rgba(255,255,255,0.1)';
        let statusColor = 'var(--gray-text)';
        let iconClass = icon;
        let statusLabel = `${percent}%`;

        if (st === 'COMPLETED') {
            barGradient = 'linear-gradient(90deg, #2ecc71, #27ae60)';
            statusColor = '#2ecc71';
            iconClass = 'fa-check-circle';
            statusLabel = '100%';
        } else if (st === 'FAILED') {
            barGradient = 'linear-gradient(90deg, #e74c3c, #c0392b)';
            statusColor = '#e74c3c';
            iconClass = 'fa-exclamation-triangle';
            const errSnippet = data.error || (data.speed && data.speed !== '0' && data.speed !== '0x' && data.speed !== 'Done' ? data.speed : 'Transcode failed');
            statusLabel = `<span title="${escapeHtml(errSnippet)}" style="cursor: help;">Failed</span>`;
        } else if (st === 'PROCESSING') {
            barGradient = activeGradient;
            statusColor = '#00a8ff';
            iconClass = `${icon} fa-spin`;

            const speedStr = data.speed && data.speed !== '0' && data.speed !== '0 MB/s' ? data.speed : '';
            const etaStr = formatEtaText(data.eta);
            const metaArr = [speedStr, etaStr].filter(Boolean);
            const metaText = metaArr.length > 0 ? ` (${metaArr.join(' • ')})` : '';
            statusLabel = `${percent}%${metaText}`;
        }

        const errDetailHtml = (st === 'FAILED' && (data.error || (data.speed && data.speed !== 'Failed' && data.speed !== '0x' && data.speed !== 'Done'))) ? `
                    <div style="font-size: 0.8rem; color: #ff7675; margin-top: 4px; line-height: 1.3; background: rgba(231,76,60,0.12); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(231,76,60,0.3); word-break: break-all;">
                        <i class="fas fa-exclamation-circle"></i> ${escapeHtml(data.error || data.speed)}
                    </div>
                ` : '';

        return `
                    <div style="margin-bottom: 6px; width: 100%; min-width: 220px; max-width: 320px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; margin-bottom: 2px;">
                            <span style="color: #e1e1e1; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas ${iconClass}" style="color: ${statusColor}; font-size: 0.85rem;"></i> ${label}
                            </span>
                            <span style="font-weight: 600; color: ${statusColor}; font-size: 0.9rem;">
                                ${statusLabel}
                            </span>
                        </div>
                        <div style="background: rgba(255,255,255,0.06); height: 6px; border-radius: 3px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
                            <div style="width: ${percent}%; height: 100%; background: ${barGradient}; border-radius: 3px; transition: width 0.4s ease;"></div>
                        </div>
                        ${errDetailHtml}
                    </div>
                `;
    }

    const isLocal = task.videoUrl ? task.videoUrl.startsWith('/uploads') : false;
    const stage3Label = isLocal ? '3. Local Storage' : '3. S3 Cloud Upload';
    const stage3Icon = isLocal ? 'fa-laptop' : 'fa-cloud-upload-alt';
    const stage3Gradient = isLocal ? 'linear-gradient(90deg, #00a8ff, #0097e6)' : 'linear-gradient(90deg, #9b59b6, #8e44ad)';

    return `
                <div style="padding: 2px 0;">
                    ${renderBar('1. Server Upload', 'fa-server', stageObj.uploadServer || { percent: 100, status: 'COMPLETED' }, 'linear-gradient(90deg, #00a8ff, #0097e6)')}
                    ${renderBar('2. HLS Transcode', 'fa-cog', stageObj.transcoding || { percent: 0, status: 'PENDING' }, 'linear-gradient(90deg, #f39c12, #e67e22)')}
                    ${renderBar(stage3Label, stage3Icon, stageObj.uploadS3 || { percent: 0, status: 'PENDING' }, stage3Gradient)}
                </div>
            `;
}

// Fetch task updates from transcoding pipeline with auto-polling
async function fetchTasks() {
    const tbody = document.getElementById('taskTableBody');
    const token = localStorage.getItem('infinx_token');

    if (!tbody) return;

    if (tbody.innerHTML.trim() === '' || tbody.innerHTML.includes('Fetching') || tbody.innerHTML.includes('Querying')) {
        tbody.innerHTML = `
                    <tr>
                        <td><div class="skeleton skeleton-text" style="height: 18px; width: 150px; margin-bottom: 6px;"></div><br><div class="skeleton skeleton-text short" style="height: 12px; width: 100px;"></div></td>
                        <td><div class="skeleton skeleton-pill" style="height: 20px; width: 70px;"></div></td>
                        <td><div class="skeleton skeleton-text" style="height: 14px; width: 120px;"></div></td>
                        <td><div class="skeleton skeleton-text" style="height: 14px; width: 80px;"></div></td>
                        <td><div class="skeleton skeleton-text" style="height: 14px; width: 90px;"></div></td>
                    </tr>
                    <tr>
                        <td><div class="skeleton skeleton-text" style="height: 18px; width: 180px; margin-bottom: 6px;"></div><br><div class="skeleton skeleton-text short" style="height: 12px; width: 120px;"></div></td>
                        <td><div class="skeleton skeleton-pill" style="height: 20px; width: 70px;"></div></td>
                        <td><div class="skeleton skeleton-text" style="height: 14px; width: 120px;"></div></td>
                        <td><div class="skeleton skeleton-text" style="height: 14px; width: 80px;"></div></td>
                        <td><div class="skeleton skeleton-text" style="height: 14px; width: 90px;"></div></td>
                    </tr>
                `;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--gray-text);">No HLS tasks recorded in pipeline yet.</td></tr>`;
                return;
            }

            const activePanel = document.querySelector('.content-panel.active');
            const isTaskPanelActive = activePanel && activePanel.id === 'taskPanel';
            const hasActiveTasks = data.some(t => {
                const isReady = t.videoUrl && t.videoUrl.includes('master.m3u8') && (t.transcodeStatus || '').toUpperCase() !== 'FAILED';
                if (isReady) return false;
                return t.transcodeStatus === 'PENDING' || t.transcodeStatus === 'PROCESSING';
            });

            if (isTaskPanelActive && hasActiveTasks && !taskPollInterval) {
                taskPollInterval = setInterval(fetchTasks, 2000);
            } else if ((!isTaskPanelActive || !hasActiveTasks) && taskPollInterval) {
                clearInterval(taskPollInterval);
                taskPollInterval = null;
            }

            tbody.innerHTML = data.map(task => {
                const isReady = task.videoUrl && task.videoUrl.includes('master.m3u8') && (task.transcodeStatus || '').toUpperCase() !== 'FAILED';
                const effectiveStatus = isReady ? 'COMPLETED' : (task.transcodeStatus || 'PENDING');
                const statusUpper = effectiveStatus.toUpperCase();
                const statusClass = statusUpper.toLowerCase();
                const timeText = new Date(task.updatedAt).toLocaleString();
                const showTitle = task.show ? task.show.title : `Show #${task.showId}`;
                const isLocal = task.videoUrl ? task.videoUrl.startsWith('/uploads') : false;
                const storageBadge = task.videoUrl ? (isLocal ? `<span style="font-size: 0.85rem; padding: 2px 6px; background: rgba(0,168,255,0.15); color: var(--secondary); border: 1px solid var(--secondary); border-radius: 4px; margin-left: 6px;"><i class="fas fa-laptop"></i> Local</span>` : `<span style="font-size: 0.85rem; padding: 2px 6px; background: rgba(255,0,85,0.15); color: var(--primary); border: 1px solid var(--primary); border-radius: 4px; margin-left: 6px;"><i class="fas fa-cloud"></i> S3</span>`) : '';
                const masterLink = task.videoUrl ? `<a href="${task.videoUrl}" target="_blank" style="color: var(--secondary); text-decoration: none; font-weight: 500;"><i class="fas fa-external-link-alt"></i> master.m3u8</a>${storageBadge}` : `<span style="color: var(--gray-text);">Not ready</span>`;

                const actionBtnsHtml = statusUpper !== 'COMPLETED' ? `
                            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
                                ${statusUpper === 'FAILED' ? `
                                    <button onclick="retryTask(${task.id})" style="padding: 4px 8px; font-size: 0.8rem; background: linear-gradient(135deg, #e74c3c, #c0392b); border: none; color: #fff; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(231,76,60,0.3);">
                                        <i class="fas fa-redo"></i> Retry
                                    </button>
                                ` : ''}
                                <button onclick="completeTask(${task.id})" style="padding: 4px 8px; font-size: 0.8rem; background: linear-gradient(135deg, #27ae60, #2ecc71); border: none; color: #fff; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(46,204,113,0.3);">
                                    <i class="fas fa-check-circle"></i> Sync Done
                                </button>
                            </div>
                        ` : '';

                return `
                            <tr>
                                <td>
                                    <strong>${showTitle}</strong><br>
                                    <span style="color: var(--gray-text); font-size: 1.1rem;">Ep ${task.episodeNumber}: ${task.title}</span>
                                </td>
                                <td>
                                    <span class="status-badge ${statusClass}">${effectiveStatus}</span>
                                    ${actionBtnsHtml}
                                </td>
                                <td>
                                    ${renderTranscodeProgress(task)}
                                </td>
                                <td>
                                    ${masterLink}
                                </td>
                                <td>
                                    <span style="color: var(--gray-text);">${timeText}</span>
                                </td>
                            </tr>
                        `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Failed to query tasks list from database.</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Connection error fetching tasks pipeline.</td></tr>`;
    }
}

// Retry failed transcode task
async function retryTask(taskId) {
    if (!confirm(`Are you sure you want to retry transcoding for Task #${taskId}?`)) return;
    const token = localStorage.getItem('infinx_token');
    try {
        const res = await fetch(`${API_BASE}/admin/tasks/${taskId}/retry`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            alert('Transcode task retry launched successfully!');
            fetchTasks();
        } else {
            alert(data.error || 'Failed to retry transcode task.');
        }
    } catch (e) {
        alert('Connection error submitting task retry.');
    }
}

// Force complete / sync a stuck transcode task
async function completeTask(taskId) {
    if (!confirm(`Sync and mark Task #${taskId} as COMPLETED?`)) return;
    const token = localStorage.getItem('infinx_token');
    try {
        const res = await fetch(`${API_BASE}/admin/tasks/${taskId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        if (res.ok) {
            alert('Task synchronized and marked as COMPLETED!');
            fetchTasks();
        } else {
            alert(data.error || 'Failed to complete task.');
        }
    } catch (e) {
        alert('Connection error completing task: ' + e.message);
    }
}

// Manual trigger to clean raw upload files & abandoned chunk folders older than 2 days
async function cleanOldUploadsManual() {
    if (!confirm('Run storage cleanup now to purge raw video files & temporary chunks older than 2 days?')) return;
    const token = localStorage.getItem('infinx_token');
    try {
        const res = await fetch(`${API_BASE}/admin/clean-uploads`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message || 'Storage cleanup completed successfully!');
        } else {
            alert(data.error || 'Storage cleanup failed.');
        }
    } catch (err) {
        alert('Connection error performing storage cleanup.');
    }
}

// Fetch and render shows in Manage Catalog panel
async function fetchManageShows() {
    const tbody = document.getElementById('manageTableBody');
    tbody.innerHTML = `
                <tr>
                    <td><div class="skeleton" style="width: 50px; height: 75px; border-radius: 4px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="height: 16px; width: 150px; margin-bottom: 6px;"></div><br><div class="skeleton skeleton-text" style="height: 14px; width: 250px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="height: 14px; width: 80px; margin-bottom: 6px;"></div><br><div class="skeleton skeleton-text extra-short" style="height: 12px; width: 40px;"></div></td>
                    <td><div class="skeleton skeleton-pill" style="height: 20px; width: 70px;"></div></td>
                    <td><div class="skeleton skeleton-pill" style="height: 28px; width: 60px; display: inline-block; margin-right: 6px;"></div><div class="skeleton skeleton-pill" style="height: 28px; width: 60px; display: inline-block;"></div></td>
                </tr>
                <tr>
                    <td><div class="skeleton" style="width: 50px; height: 75px; border-radius: 4px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="height: 16px; width: 120px; margin-bottom: 6px;"></div><br><div class="skeleton skeleton-text" style="height: 14px; width: 200px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="height: 14px; width: 80px; margin-bottom: 6px;"></div><br><div class="skeleton skeleton-text extra-short" style="height: 12px; width: 40px;"></div></td>
                    <td><div class="skeleton skeleton-pill" style="height: 20px; width: 70px;"></div></td>
                    <td><div class="skeleton skeleton-pill" style="height: 28px; width: 60px; display: inline-block; margin-right: 6px;"></div><div class="skeleton skeleton-pill" style="height: 28px; width: 60px; display: inline-block;"></div></td>
                </tr>
            `;

    try {
        const res = await fetch(`${API_BASE}/shows/categories`);
        if (res.ok) {
            const categories = await res.json();

            // Flatten shows list
            let showsList = [];
            categories.forEach(cat => {
                cat.shows.forEach(show => {
                    if (!showsList.find(s => s.id === show.id)) {
                        showsList.push(show);
                    }
                });
            });

            if (showsList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--gray-text);">No shows registered yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = showsList.map(show => {
                const fallbackPoster = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200';
                const posterUrl = window.formatMediaUrl(show.poster) || fallbackPoster;
                const episodesCount = show.episodes ? show.episodes.length : 0;
                const isMovie = show.type === 'movie';
                const epBtnLabel = isMovie ? '<i class="fas fa-video"></i> Movie File' : '<i class="fas fa-tasks"></i> Episodes';
                const epBadge = isMovie ? (episodesCount > 0 ? 'Movie Uploaded' : 'No Video') : `${episodesCount} Episodes`;
                const badgeClass = isMovie ? (episodesCount > 0 ? 'completed' : 'failed') : 'completed';

                return `
                            <tr>
                                <td>
                                    <img src="${posterUrl}" alt="${escapeHtml(show.title)}" style="width: 50px; height: 75px; object-fit: cover; border-radius: 4px; border: 1px solid var(--gray-border);" onerror="this.onerror=null; this.src='${fallbackPoster}';">
                                </td>
                                <td>
                                    <strong style="font-size: 1.4rem; font-family: 'Outfit';">${show.title}</strong><br>
                                    <span style="color: var(--gray-text); font-size: 1.1rem; max-width: 300px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${show.description}</span>
                                </td>
                                <td>
                                    <span style="color: var(--warning);"><i class="fas fa-star"></i> ${show.rating}</span><br>
                                    <span style="color: var(--gray-text); font-size: 1.1rem;">${show.year} | ${show.runtime}</span>
                                </td>
                                <td>
                                    <span class="status-badge ${badgeClass}" style="font-size: 1.1rem;">${epBadge}</span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 8px;">
                                        <button onclick="manageEpisodes(${show.id}, '${show.title.replace(/'/g, "\\'")}')" class="btn-back" style="padding: 6px 12px; font-size: 1.1rem; background: rgba(0, 168, 255, 0.1); border-color: var(--secondary); color: var(--secondary); cursor: pointer;">${epBtnLabel}</button>
                                        <button onclick="openEditShowModal(${show.id})" class="btn-back" style="padding: 6px 12px; font-size: 1.1rem; background: rgba(241, 196, 15, 0.1); border-color: var(--warning); color: var(--warning); cursor: pointer;"><i class="fas fa-edit"></i> Edit</button>
                                        <button onclick="deleteShow(${show.id}, '${show.title.replace(/'/g, "\\'")}')" class="btn-back" style="padding: 6px 12px; font-size: 1.1rem; background: rgba(231, 76, 60, 0.1); border-color: var(--danger); color: var(--danger); cursor: pointer;"><i class="fas fa-trash"></i> Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Failed to load shows.</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Error connecting to API.</td></tr>`;
    }
}

// Delete entire show
async function deleteShow(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"? This will delete the show and all its episodes permanently!`)) {
        return;
    }

    const token = localStorage.getItem('infinx_token');
    try {
        const res = await fetch(`${API_BASE}/admin/shows/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert(`Show "${title}" has been deleted successfully.`);
            fetchManageShows();
            loadShowsList();
        } else {
            const err = await res.json();
            alert(`Failed to delete: ${err.error || 'Server error'}`);
        }
    } catch (e) {
        console.error(e);
        alert("Connection error trying to delete show.");
    }
}

let currentActiveShowId = null;

// Manage episodes inside a modal
async function manageEpisodes(showId, showTitle) {
    currentActiveShowId = showId;
    document.getElementById('episodeModalTitle').textContent = `Manage Episodes: ${showTitle}`;
    document.getElementById('episodeManagerModal').style.display = 'flex';

    await fetchShowEpisodesList(showId);
}

async function fetchShowEpisodesList(showId) {
    const tbody = document.getElementById('modalEpisodesTableBody');
    tbody.innerHTML = `
                <tr>
                    <td><div class="skeleton skeleton-text" style="height: 14px; width: 40px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="height: 14px; width: 120px;"></div></td>
                    <td><div class="skeleton skeleton-pill" style="height: 20px; width: 70px;"></div></td>
                    <td><div class="skeleton skeleton-pill" style="height: 26px; width: 60px; display: inline-block; margin-right: 6px;"></div><div class="skeleton skeleton-pill" style="height: 26px; width: 60px; display: inline-block;"></div></td>
                </tr>
                <tr>
                    <td><div class="skeleton skeleton-text" style="height: 14px; width: 40px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="height: 14px; width: 100px;"></div></td>
                    <td><div class="skeleton skeleton-pill" style="height: 20px; width: 70px;"></div></td>
                    <td><div class="skeleton skeleton-pill" style="height: 26px; width: 60px; display: inline-block; margin-right: 6px;"></div><div class="skeleton skeleton-pill" style="height: 26px; width: 60px; display: inline-block;"></div></td>
                </tr>
            `;

    try {
        // Fetch single show detail (which includes full episodes array!)
        const res = await fetch(`${API_BASE}/shows/${showId}`);
        if (res.ok) {
            const show = await res.json();
            const eps = show.episodes || [];
            window.currentShowEpisodesList = eps;

            if (eps.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--gray-text);">No episodes added to this show yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = eps.map(ep => {
                const statusClass = (ep.transcodeStatus || 'COMPLETED').toLowerCase();
                const isTranscoding = ep.transcodeStatus === 'PROCESSING';
                const isPaused = ep.transcodeStatus === 'PAUSED';
                const isPending = ep.transcodeStatus === 'PENDING';

                const hasS3 = ep.s3Url || (ep.videoUrl && (ep.videoUrl.includes('amazonaws.com') || (ep.videoUrl.startsWith('http') && !ep.videoUrl.includes('/uploads/'))));
                const hasLocal = ep.localUrl || (ep.videoUrl && (ep.videoUrl.startsWith('/uploads') || ep.videoUrl.includes('/uploads/')));
                const s3Badge = hasS3 ? '<span style="font-size: 0.8rem; padding: 2px 6px; background: rgba(255,0,85,0.15); color: var(--primary); border: 1px solid var(--primary); border-radius: 4px; margin-left: 4px;" title="Server 1: AWS S3"><i class="fas fa-cloud"></i> S3</span>' : '';
                const localBadge = hasLocal ? '<span style="font-size: 0.8rem; padding: 2px 6px; background: rgba(0,168,255,0.15); color: var(--secondary); border: 1px solid var(--secondary); border-radius: 4px; margin-left: 4px;" title="Server 2: Laptop Local Storage"><i class="fas fa-laptop"></i> Laptop</span>' : '';

                return `
                            <tr>
                                <td><strong>Ep ${ep.episodeNumber}</strong></td>
                                <td>${ep.title} ${s3Badge}${localBadge}</td>
                                <td><span class="status-badge ${statusClass}">${ep.transcodeStatus || 'COMPLETED'}</span></td>
                                <td>
                                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                        ${isTranscoding ? `<button onclick="pauseTranscodeTask(${ep.id})" style="background: rgba(241, 196, 15, 0.15); border: 1px solid var(--warning); color: var(--warning); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 1.1rem; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-pause"></i> Pause</button>` : ''}
                                        ${isPaused ? `<button onclick="resumeTranscodeTask(${ep.id})" style="background: rgba(46, 204, 113, 0.15); border: 1px solid var(--success); color: var(--success); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 1.1rem; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-play"></i> Resume</button>` : ''}
                                        ${(isTranscoding || isPending || isPaused) ? `<button onclick="stopTranscodeTask(${ep.id})" style="background: rgba(231, 76, 60, 0.15); border: 1px solid var(--danger); color: var(--danger); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 1.1rem; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-stop"></i> Stop</button>` : ''}
                                        <button onclick="openEditEpisodeModal(${ep.id})" style="background: rgba(0, 168, 255, 0.1); border: 1px solid var(--secondary); color: var(--secondary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 1.1rem; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-edit"></i> Edit</button>
                                        <button onclick="deleteEpisode(${ep.id}, ${ep.episodeNumber})" style="background: rgba(231, 76, 60, 0.1); border: 1px solid var(--danger); color: var(--danger); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 1.1rem; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-trash-alt"></i> Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger);">Failed to load show episodes.</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger);">Connection error.</td></tr>`;
    }
}

function closeEpisodeModal() {
    document.getElementById('episodeManagerModal').style.display = 'none';
}

async function pauseTranscodeTask(epId) {
    const token = localStorage.getItem('infinx_token');
    try {
        const res = await fetch(`${API_BASE}/admin/tasks/${epId}/pause`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            if (currentActiveShowId) fetchShowEpisodesList(currentActiveShowId);
        }
    } catch (e) { console.error(e); }
}

async function resumeTranscodeTask(epId) {
    const token = localStorage.getItem('infinx_token');
    try {
        const res = await fetch(`${API_BASE}/admin/tasks/${epId}/resume`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            if (currentActiveShowId) fetchShowEpisodesList(currentActiveShowId);
        }
    } catch (e) { console.error(e); }
}

async function stopTranscodeTask(epId) {
    if (!confirm('Are you sure you want to stop/cancel this transcoding task?')) return;
    const token = localStorage.getItem('infinx_token');
    try {
        const res = await fetch(`${API_BASE}/admin/tasks/${epId}/stop`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            if (currentActiveShowId) fetchShowEpisodesList(currentActiveShowId);
        }
    } catch (e) { console.error(e); }
}

// Delete single episode
async function deleteEpisode(id, epNumber) {
    if (!confirm(`Are you sure you want to delete Episode ${epNumber}?`)) {
        return;
    }

    const token = localStorage.getItem('infinx_token');
    try {
        const res = await fetch(`${API_BASE}/admin/episodes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert(`Episode ${epNumber} deleted successfully.`);
            if (currentActiveShowId) {
                fetchShowEpisodesList(currentActiveShowId);
            }
            fetchManageShows();
        } else {
            const err = await res.json();
            alert(`Failed to delete: ${err.error || 'Server error'}`);
        }
    } catch (e) {
        console.error(e);
        alert("Connection error trying to delete episode.");
    }
}

function openAddEpisodeModalFromManager() {
    if (!currentActiveShowId) {
        alert('No show selected.');
        return;
    }
    document.getElementById('manualEpNumber').value = '';
    document.getElementById('manualEpTitle').value = '';
    if (document.getElementById('manualEpS3Url')) document.getElementById('manualEpS3Url').value = '';
    if (document.getElementById('manualEpLocalUrl')) document.getElementById('manualEpLocalUrl').value = '';
    if (document.getElementById('manualEpVideoUrl')) document.getElementById('manualEpVideoUrl').value = '';
    document.getElementById('manualEpDuration').value = '';
    document.getElementById('manualEpDesc').value = '';
    document.getElementById('addEpisodeManualModal').style.display = 'flex';
}

function closeAddEpisodeManualModal() {
    document.getElementById('addEpisodeManualModal').style.display = 'none';
}

async function handleCreateEpisodeManual(e) {
    e.preventDefault();
    const showId = currentActiveShowId;
    const episodeNumber = document.getElementById('manualEpNumber').value;
    const title = document.getElementById('manualEpTitle').value;
    const s3Url = (document.getElementById('manualEpS3Url')?.value || '').trim();
    const localUrl = (document.getElementById('manualEpLocalUrl')?.value || '').trim();
    const fallbackVideo = (document.getElementById('manualEpVideoUrl')?.value || '').trim();
    const videoUrl = localUrl || s3Url || fallbackVideo || null;
    const duration = document.getElementById('manualEpDuration').value;
    const description = document.getElementById('manualEpDesc').value;

    if (!showId || !episodeNumber || !title) {
        alert('Please provide episode number and title.');
        return;
    }

    const token = localStorage.getItem('infinx_token');
    try {
        const res = await fetch(`${API_BASE}/admin/episodes/manual`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                showId,
                episodeNumber,
                title,
                videoUrl,
                s3Url: s3Url || null,
                localUrl: localUrl || null,
                duration: duration.trim() || null,
                description: description.trim() || ''
            })
        });

        const data = await res.json();
        if (res.ok) {
            alert('Episode added manually successfully!');
            closeAddEpisodeManualModal();
            fetchShowEpisodesList(showId);
            fetchManageShows();
        } else {
            alert(data.error || 'Failed to add episode manually.');
        }
    } catch (err) {
        console.error(err);
        alert('Connection error adding episode manually.');
    }
}

// =========================================================================
// BANNER CUSTOMIZER & SPOTLIGHT MANAGEMENT
// Allows adding both Anime (LunarX / AniList) and Local Shows to Homepage.
// Slide #1 is permanently reserved for the designated Spotlight Banner.
// =========================================================================
window.currentBannerSource = 'anime';
window.activeBannerSlides = [];
window.currentTrendingList = [];
window.currentSearchResults = [];
let currentBannerSource = 'anime';
let activeBannerSlides = [];
let currentTrendingList = [];
let currentSearchResults = [];
let animeSearchTimeout = null;

// Switch between Anime Catalog source and Local Show Library source
function switchBannerSource(source) {
    currentBannerSource = source;
    window.currentBannerSource = source;
    const tabAnime = document.getElementById('tabBannerAnime');
    const tabShow = document.getElementById('tabBannerShow');
    const secAnime = document.getElementById('animeSourceSection');
    const secShow = document.getElementById('showSourceSection');

    if (source === 'anime') {
        if (tabAnime) {
            tabAnime.style.borderColor = 'var(--primary)';
            tabAnime.style.background = 'rgba(255, 80, 110, 0.15)';
            tabAnime.style.color = '#fff';
        }
        if (tabShow) {
            tabShow.style.borderColor = 'var(--gray-border)';
            tabShow.style.background = 'var(--surface-bright)';
            tabShow.style.color = 'var(--gray-text)';
        }
        if (secAnime) secAnime.style.display = 'block';
        if (secShow) secShow.style.display = 'none';
    } else {
        if (tabShow) {
            tabShow.style.borderColor = 'var(--primary)';
            tabShow.style.background = 'rgba(255, 80, 110, 0.15)';
            tabShow.style.color = '#fff';
        }
        if (tabAnime) {
            tabAnime.style.borderColor = 'var(--gray-border)';
            tabAnime.style.background = 'var(--surface-bright)';
            tabAnime.style.color = 'var(--gray-text)';
        }
        if (secAnime) secAnime.style.display = 'none';
        if (secShow) secShow.style.display = 'block';
    }
}
window.switchBannerSource = switchBannerSource;

// Select an anime from live search or trending results
function selectAnimeForBanner(anime) {
    if (!anime) return;
    const anilistId = anime.anilistId || anime.id;
    const title = anime.title?.english || anime.title?.romaji || anime.title || anime.englishTitle || 'Selected Anime';
    const subtitle = anime.romajiTitle || anime.nativeTitle || anime.title?.romaji || '';
    const poster = anime.poster || anime.coverImage?.large || anime.coverImage?.extraLarge || '';
    const banner = anime.banner || anime.bannerImage || poster;
    const rating = anime.rating || anime.averageScore ? ((anime.averageScore ? anime.averageScore / 10 : anime.rating) || '9.8') : '9.8';
    const year = anime.year || (anime.startDate ? anime.startDate.year : '2025');
    const desc = (anime.description || '').replace(/<[^>]*>?/gm, '').trim();

    const anilistIdInput = document.getElementById('bannerAnimeAnilistId');
    if (anilistIdInput) anilistIdInput.value = anilistId;
    const posterUrlInput = document.getElementById('bannerAnimePosterUrl');
    if (posterUrlInput) posterUrlInput.value = poster;
    const bannerUrlInput = document.getElementById('bannerAnimeBannerUrl');
    if (bannerUrlInput) bannerUrlInput.value = banner;
    const ratingInput = document.getElementById('bannerAnimeRating');
    if (ratingInput) ratingInput.value = rating;
    const yearInput = document.getElementById('bannerAnimeYear');
    if (yearInput) yearInput.value = year;

    const titleOverrideInput = document.getElementById('bannerTitleOverride');
    if (titleOverrideInput) titleOverrideInput.value = title;
    const descOverrideInput = document.getElementById('bannerDescOverride');
    if (descOverrideInput) descOverrideInput.value = desc;
    const badgeOverrideInput = document.getElementById('bannerBadgeOverride');
    if (badgeOverrideInput) badgeOverrideInput.value = 'SIMULCAST';

    // Preview UI
    const coverEl = document.getElementById('selectedAnimeCover');
    if (coverEl) coverEl.src = poster || 'Postes/spyfamS3p.jpg';
    const titleEl = document.getElementById('selectedAnimeTitle');
    if (titleEl) titleEl.textContent = title;
    const idBadge = document.getElementById('selectedAnimeIdBadge');
    if (idBadge) idBadge.textContent = `AniList #${anilistId}`;
    const subEl = document.getElementById('selectedAnimeSubtitle');
    if (subEl) subEl.textContent = subtitle;
    const metaEl = document.getElementById('selectedAnimeMeta');
    if (metaEl) {
        metaEl.innerHTML = `<span><i class="fas fa-star" style="color:var(--warning);"></i> ${rating}</span> <span>• Year ${year}</span> <span>• Simulcast</span>`;
    }

    const card = document.getElementById('selectedAnimeCard');
    if (card) card.style.display = 'flex';

    const resultsDropdown = document.getElementById('bannerAnimeSearchResults');
    if (resultsDropdown) resultsDropdown.style.display = 'none';

    const customLabel = document.getElementById('bannerCustomLabel');
    if (customLabel) {
        customLabel.textContent = banner ? 'Official High-Res Anime Backdrop Attached (Click to override with custom file)' : 'Drag & drop landscape backdrop image/video or click to select';
    }
}
window.selectAnimeForBanner = selectAnimeForBanner;

// Clear currently selected anime
function clearSelectedAnime() {
    const anilistIdInput = document.getElementById('bannerAnimeAnilistId');
    if (anilistIdInput) anilistIdInput.value = '';
    const posterUrlInput = document.getElementById('bannerAnimePosterUrl');
    if (posterUrlInput) posterUrlInput.value = '';
    const bannerUrlInput = document.getElementById('bannerAnimeBannerUrl');
    if (bannerUrlInput) bannerUrlInput.value = '';
    const ratingInput = document.getElementById('bannerAnimeRating');
    if (ratingInput) ratingInput.value = '';
    const yearInput = document.getElementById('bannerAnimeYear');
    if (yearInput) yearInput.value = '';
    const titleOverrideInput = document.getElementById('bannerTitleOverride');
    if (titleOverrideInput) titleOverrideInput.value = '';
    const descOverrideInput = document.getElementById('bannerDescOverride');
    if (descOverrideInput) descOverrideInput.value = '';
    const badgeOverrideInput = document.getElementById('bannerBadgeOverride');
    if (badgeOverrideInput) badgeOverrideInput.value = '';

    const card = document.getElementById('selectedAnimeCard');
    if (card) card.style.display = 'none';
    const searchInput = document.getElementById('bannerAnimeSearch');
    if (searchInput) searchInput.value = '';
    const customLabel = document.getElementById('bannerCustomLabel');
    if (customLabel) customLabel.textContent = 'Drag & drop landscape backdrop image/video or click to select';
}
window.clearSelectedAnime = clearSelectedAnime;

// Quick pick from Trending Anime list
async function loadTrendingAnimeForBanner() {
    const resultsDropdown = document.getElementById('bannerAnimeSearchResults');
    const spinner = document.getElementById('bannerAnimeSearchSpinner');
    if (!resultsDropdown) return;

    resultsDropdown.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--gray-text); font-size: 1.25rem;"><i class="fas fa-spinner fa-spin"></i> Fetching trending anime...</div>`;
    resultsDropdown.style.display = 'block';
    if (spinner) spinner.style.display = 'inline-block';

    try {
        const res = await fetch(`${API_BASE}/lunarx/trending`);
        let list = [];
        if (res.ok) {
            const raw = await res.json();
            list = Array.isArray(raw) ? raw : (raw.trendingNow || raw.popularThisSeason || []);
        }

        // If remote trending is empty, fallback to search for popular titles
        if (!list || list.length === 0) {
            try {
                const fallbackRes = await fetch(`${API_BASE}/lunarx/search?q=Solo&limit=8`);
                if (fallbackRes.ok) {
                    const fallbackList = await fallbackRes.json();
                    if (Array.isArray(fallbackList) && fallbackList.length > 0) {
                        list = fallbackList;
                    }
                }
            } catch (fbErr) {
                console.warn('Fallback popular anime fetch warning:', fbErr);
            }
        }

        currentTrendingList = list;
        window.currentTrendingList = list;

        if (list.length > 0) {
            resultsDropdown.innerHTML = `
                <div style="padding: 10px 14px; background: rgba(0, 238, 252, 0.08); border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 1.15rem; font-weight: 700; color: #00eefc; display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fas fa-fire"></i> TOP TRENDING ANIME (CLICK TO SELECT)</span>
                    <span style="font-size: 1.1rem; color: var(--gray-text); cursor: pointer;" onclick="document.getElementById('bannerAnimeSearchResults').style.display='none'">Close &times;</span>
                </div>
                <div style="display: flex; flex-direction: column;">
                    ${list.slice(0, 10).map((a, i) => {
                        const poster = a.poster || a.coverImage?.large || 'Postes/spyfamS3p.jpg';
                        const rating = a.rating || '9.8';
                        const year = a.year || '2024';
                        const anilistId = a.anilistId || a.id;
                        const titleStr = escapeHtml(a.title?.english || a.title?.romaji || a.title || 'Untitled Anime');
                        return `
                            <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'" onclick="selectAnimeForBanner(currentTrendingList[${i}])">
                                <span style="font-weight: 800; font-size: 1.25rem; color: ${i === 0 ? '#ff506e' : '#00eefc'}; width: 22px;">#${i + 1}</span>
                                <img src="${poster}" style="width: 36px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);" onerror="this.src='Postes/spyfamS3p.jpg';">
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 1.35rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titleStr}</div>
                                    <div style="font-size: 1.15rem; color: var(--gray-text); margin-top: 2px;">
                                        <span style="color: var(--warning);"><i class="fas fa-star"></i> ${rating}</span> &bull; <span>${year}</span> &bull; <span style="color:#00eefc;">AniList #${anilistId}</span>
                                    </div>
                                </div>
                                <button type="button" style="background: rgba(0,238,252,0.15); border: 1px solid rgba(0,238,252,0.3); color: #00eefc; padding: 4px 10px; border-radius: 4px; font-size: 1.15rem; font-weight: 600;">Select</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            resultsDropdown.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--gray-text); font-size: 1.25rem;">No trending anime found.</div>`;
        }
    } catch (err) {
        console.error(err);
        resultsDropdown.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--danger); font-size: 1.25rem;">Connection error loading trending anime.</div>`;
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}
        window.loadTrendingAnimeForBanner = loadTrendingAnimeForBanner;

        // Setup real-time debounced anime search input listener
        function initBannerAnimeSearch() {
            const searchInput = document.getElementById('bannerAnimeSearch');
            const resultsDropdown = document.getElementById('bannerAnimeSearchResults');
            const spinner = document.getElementById('bannerAnimeSearchSpinner');
            if (!searchInput) return;

            searchInput.addEventListener('input', function () {
                const query = this.value.trim();
                clearTimeout(animeSearchTimeout);

                if (!query) {
                    if (resultsDropdown) resultsDropdown.style.display = 'none';
                    return;
                }

                animeSearchTimeout = setTimeout(async () => {
                    if (spinner) spinner.style.display = 'inline-block';
                    if (resultsDropdown) {
                        resultsDropdown.innerHTML = `<div style="padding: 14px; text-align: center; color: var(--gray-text); font-size: 1.2rem;"><i class="fas fa-spinner fa-spin"></i> Searching anime catalog...</div>`;
                        resultsDropdown.style.display = 'block';
                    }

                    try {
                        const res = await fetch(`${API_BASE}/lunarx/search?q=${encodeURIComponent(query)}&limit=8`);
                        if (res.ok) {
                            const results = await res.json();
                            currentSearchResults = Array.isArray(results) ? results : [];
                            window.currentSearchResults = currentSearchResults;

                            if (currentSearchResults.length > 0) {
                                resultsDropdown.innerHTML = currentSearchResults.map((anime, idx) => {
                                    const title = anime.title?.english || anime.title?.romaji || anime.title || 'Untitled Anime';
                                    const poster = anime.poster || anime.coverImage?.large || 'Postes/spyfamS3p.jpg';
                                    const rating = anime.rating || '9.8';
                                    const year = anime.year || (anime.startDate ? anime.startDate.year : '2025');
                                    const anilistId = anime.anilistId || anime.id;

                                    return `
                                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'" onclick="selectAnimeForBanner(currentSearchResults[${idx}])">
                                            <img src="${poster}" style="width: 36px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);" onerror="this.src='Postes/spyfamS3p.jpg';">
                                            <div style="flex: 1; min-width: 0;">
                                                <div style="font-size: 1.35rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(title)}</div>
                                                <div style="font-size: 1.15rem; color: var(--gray-text); margin-top: 2px;">
                                                    <span style="color: var(--warning);"><i class="fas fa-star"></i> ${rating}</span> &bull; <span>${year}</span> &bull; <span style="color:#00eefc;">AniList #${anilistId}</span>
                                                </div>
                                            </div>
                                            <button type="button" style="background: rgba(0,238,252,0.15); border: 1px solid rgba(0,238,252,0.3); color: #00eefc; padding: 4px 10px; border-radius: 4px; font-size: 1.15rem; font-weight: 600;">Select</button>
                                        </div>
                                    `;
                                }).join('');
                            } else {
                                resultsDropdown.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--gray-text); font-size: 1.25rem;">No anime found matching "${escapeHtml(query)}".</div>`;
                            }
                        }
                    } catch (err) {
                        console.error('Anime search error:', err);
                        if (resultsDropdown) resultsDropdown.innerHTML = `<div style="padding: 14px; text-align: center; color: var(--danger); font-size: 1.2rem;">Failed to search anime.</div>`;
                    } finally {
                        if (spinner) spinner.style.display = 'none';
                    }
                }, 250);
            });

            // Close search results on outside click
            document.addEventListener('click', (e) => {
                if (resultsDropdown && !resultsDropdown.contains(e.target) && e.target !== searchInput) {
                    resultsDropdown.style.display = 'none';
                }
            });
        }

    // Load and populate the Banner Customizer tab
    async function loadBannerCustomizer() {
        const token = localStorage.getItem('infinx_token');
        const showSelect = document.getElementById('bannerShowSelect');
        const listBody = document.getElementById('featuredBannerList');

        if (showSelect) showSelect.innerHTML = `<option value="">Loading shows...</option>`;
        if (listBody) {
            listBody.innerHTML = `
                    <tr>
                        <td><div class="skeleton skeleton-pill" style="height: 24px; width: 100px;"></div></td>
                        <td><div class="skeleton skeleton-pill" style="height: 22px; width: 60px;"></div></td>
                        <td><div class="skeleton skeleton-text" style="height: 16px; width: 150px;"></div></td>
                        <td><div class="skeleton" style="width: 40px; height: 55px; border-radius: 4px;"></div></td>
                        <td><div class="skeleton" style="width: 100px; height: 55px; border-radius: 4px;"></div></td>
                        <td><div class="skeleton skeleton-pill" style="height: 24px; width: 110px;"></div></td>
                        <td><div class="skeleton skeleton-pill" style="height: 28px; width: 70px;"></div></td>
                    </tr>
                `;
        }

        try {
            // Initialize anime search listener once
            initBannerAnimeSearch();

            // Fetch local shows for local show selector
            try {
                const showsRes = await fetch(`${API_BASE}/admin/shows`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (showsRes.ok && showSelect) {
                    const shows = await showsRes.json();
                    showSelect.innerHTML = `<option value="">-- Choose Anime / Show --</option>` +
                        shows.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
                }
            } catch (e) {
                console.error('Error loading shows for selector:', e);
            }

            // Fetch active banner slides
            const res = await fetch(`${API_BASE}/admin/banners`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                activeBannerSlides = data.banners || [];
                window.activeBannerSlides = activeBannerSlides;

                if (activeBannerSlides.length === 0) {
                    listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--gray-text); padding: 30px 10px;">No active banner slideshow entries. Use the form above to add an anime or local show!</td></tr>`;
                    return;
                }

                listBody.innerHTML = activeBannerSlides.map((banner, index) => {
                    const fallbackImage = 'Postes/spyfamS3p.jpg';
                    const posterUrl = window.formatMediaUrl(banner.poster) || fallbackImage;
                    const bannerUrl = window.formatMediaUrl(banner.banner) || fallbackImage;
                    const isSpotlight = (index === 0) || !!banner.isSpotlight;
                    const isAnime = banner.type === 'anime' || !!banner.anilistId;
                    const total = activeBannerSlides.length;

                    return `
                            <tr style="${isSpotlight ? 'background: rgba(255, 80, 110, 0.05);' : ''}">
                                <td>
                                    ${isSpotlight ? `
                                        <span style="padding: 4px 10px; border-radius: 9999px; background: rgba(255, 80, 110, 0.2); border: 1px solid rgba(255, 80, 110, 0.6); color: #ff506e; font-weight: 800; font-size: 1.15rem; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 0 12px rgba(255, 80, 110, 0.4);">
                                            <i class="fas fa-crown"></i> SPOTLIGHT (#1)
                                        </span>
                                    ` : `
                                        <span style="padding: 3px 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.06); color: #8e8e8e; font-weight: 600; font-size: 1.15rem;">
                                            Slide #${index + 1}
                                        </span>
                                    `}
                                </td>
                                <td>
                                    ${isAnime ? `
                                        <span style="padding: 3px 8px; border-radius: 4px; background: rgba(0, 238, 252, 0.15); border: 1px solid rgba(0, 238, 252, 0.35); color: #00eefc; font-size: 1.1rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;">
                                            <i class="fas fa-tv"></i> Anime
                                        </span>
                                    ` : `
                                        <span style="padding: 3px 8px; border-radius: 4px; background: rgba(160, 120, 255, 0.15); border: 1px solid rgba(160, 120, 255, 0.35); color: #a078ff; font-size: 1.1rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;">
                                            <i class="fas fa-film"></i> Show
                                        </span>
                                    `}
                                </td>
                                <td>
                                    <div style="font-size: 1.35rem; font-weight: 700; color: white;">${escapeHtml(banner.title)}</div>
                                    <div style="font-size: 1.15rem; color: var(--gray-text); margin-top: 2px;">
                                        <span style="color: var(--warning);"><i class="fas fa-star"></i> ${banner.rating || '9.8'}</span>
                                        <span style="margin: 0 6px;">&bull;</span>
                                        <span>${banner.year || '2025'}</span>
                                        <span style="margin: 0 6px;">&bull;</span>
                                        <span style="color: ${isAnime ? '#00eefc' : '#a078ff'}; font-family: monospace;">${isAnime ? `AniList #${banner.anilistId || banner.id}` : `ID #${banner.showId || banner.id}`}</span>
                                    </div>
                                </td>
                                <td>
                                    <img src="${posterUrl}" style="height: 55px; width: 38px; border-radius: var(--radius-xs); border: 1px solid var(--gray-border); object-fit: cover;" onerror="this.onerror=null; this.src='${fallbackImage}';">
                                </td>
                                <td>
                                    <img src="${bannerUrl}" style="height: 55px; width: 110px; border-radius: var(--radius-xs); border: 1px solid var(--gray-border); object-fit: cover;" onerror="this.onerror=null; this.src='${fallbackImage}';">
                                </td>
                                <td>
                                    ${isSpotlight ? `
                                        <span style="color: #ff506e; font-weight: 700; font-size: 1.15rem; display: inline-flex; align-items: center; gap: 5px;">
                                            <i class="fas fa-check-circle"></i> Slide #1 Reserved
                                        </span>
                                    ` : `
                                        <button type="button" onclick="setBannerSpotlight('${banner.id}')" style="background: rgba(255, 80, 110, 0.12); border: 1px solid rgba(255, 80, 110, 0.45); color: #ff506e; padding: 5px 11px; border-radius: 4px; cursor: pointer; font-size: 1.15rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;">
                                            <i class="fas fa-star"></i> Set as Spotlight
                                        </button>
                                    `}
                                </td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <button type="button" onclick="moveBanner('${banner.id}', -1)" title="Move Up" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; width: 28px; height: 28px; border-radius: 4px; display: flex; align-items: center; justify-content: center; ${index === 0 ? 'opacity: 0.3; cursor: not-allowed;' : 'cursor: pointer;'}" ${index === 0 ? 'disabled' : ''}>
                                            <i class="fas fa-arrow-up" style="font-size: 11px;"></i>
                                        </button>
                                        <button type="button" onclick="moveBanner('${banner.id}', 1)" title="Move Down" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; width: 28px; height: 28px; border-radius: 4px; display: flex; align-items: center; justify-content: center; ${index === total - 1 ? 'opacity: 0.3; cursor: not-allowed;' : 'cursor: pointer;'}" ${index === total - 1 ? 'disabled' : ''}>
                                            <i class="fas fa-arrow-down" style="font-size: 11px;"></i>
                                        </button>
                                        <button type="button" onclick="removeBanner('${banner.id}')" title="Remove Slide" style="background: rgba(231, 76, 60, 0.12); border: 1px solid var(--danger); color: var(--danger); padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 1.15rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
                                            <i class="fas fa-trash-alt"></i> Remove
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                }).join('');
            }
        } catch (e) {
            console.error('Error loading banner customizer:', e);
            if (listBody) {
                listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 25px;">Failed to load carousel banners.</td></tr>`;
            }
        }
    }
    window.loadBannerCustomizer = loadBannerCustomizer;

    // Handle Customize Banner Form Submission (Supports Anime and Local Show)
    async function handleCustomizeBanner(e) {
        e.preventDefault();
        const btn = document.getElementById('btnFeatureSubmit');
        const originalHtml = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Banner Slide...';
        btn.disabled = true;

        const token = localStorage.getItem('infinx_token');
        const formData = new FormData();

        const titleOverride = document.getElementById('bannerTitleOverride').value.trim();
        const badgeOverride = document.getElementById('bannerBadgeOverride').value.trim();
        const descriptionOverride = document.getElementById('bannerDescOverride').value.trim();
        const bannerFile = document.getElementById('bannerCustomFile').files[0];
        const isSpotlight = document.getElementById('bannerIsSpotlight').checked;

        formData.append('isSpotlight', isSpotlight ? 'true' : 'false');
        if (titleOverride) formData.append('title', titleOverride);
        if (badgeOverride) formData.append('badge', badgeOverride);
        if (descriptionOverride) formData.append('description', descriptionOverride);
        if (bannerFile) formData.append('banner', bannerFile);

        if (currentBannerSource === 'anime') {
            const anilistId = document.getElementById('bannerAnimeAnilistId').value.trim();
            const posterUrl = document.getElementById('bannerAnimePosterUrl').value.trim();
            const bannerUrl = document.getElementById('bannerAnimeBannerUrl').value.trim();
            const rating = document.getElementById('bannerAnimeRating').value.trim();
            const year = document.getElementById('bannerAnimeYear').value.trim();

            if (!anilistId && !titleOverride) {
                alert('Please search and select an anime or enter an AniList ID/title to feature.');
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                return;
            }

            formData.append('type', 'anime');
            if (anilistId) formData.append('anilistId', anilistId);
            if (posterUrl) formData.append('poster', posterUrl);
            if (bannerUrl && !bannerFile) formData.append('banner', bannerUrl);
            if (rating) formData.append('rating', rating);
            if (year) formData.append('year', year);
        } else {
            const showSelect = document.getElementById('bannerShowSelect');
            const showId = showSelect ? showSelect.value : null;

            if (!showId) {
                alert('Please select an anime or show from your local library.');
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                return;
            }

            formData.append('type', 'show');
            formData.append('showId', showId);
        }

        try {
            const res = await fetch(`${API_BASE}/admin/banners`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                alert(isSpotlight
                    ? '★ Spotlight banner slide saved successfully! (Pinned as Slide #1 on Homepage)'
                    : 'Homepage carousel banner added successfully!');
                document.getElementById('customizeBannerForm').reset();
                clearSelectedAnime();
                loadBannerCustomizer();
            } else {
                const err = await res.json();
                alert(`Failed to save banner: ${err.error || 'Server error'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Connection error trying to save carousel banner.');
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
    window.handleCustomizeBanner = handleCustomizeBanner;

    // Set an existing slide as the reserved Spotlight Banner (Slide #1)
    async function setBannerSpotlight(bannerId) {
        const token = localStorage.getItem('infinx_token');
        try {
            const res = await fetch(`${API_BASE}/admin/banners/${encodeURIComponent(bannerId)}/spotlight`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                loadBannerCustomizer();
            } else {
                const err = await res.json();
                alert(`Failed to set Spotlight banner: ${err.error || 'Server error'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Connection error setting Spotlight banner.');
        }
    }
    window.setBannerSpotlight = setBannerSpotlight;

    // Reorder banner slide up or down
    async function moveBanner(bannerId, direction) {
        const index = activeBannerSlides.findIndex(b => b.id === bannerId);
        if (index === -1) return;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= activeBannerSlides.length) return;

        const copy = [...activeBannerSlides];
        const [item] = copy.splice(index, 1);
        copy.splice(targetIndex, 0, item);

        const ids = copy.map(b => b.id);
        const token = localStorage.getItem('infinx_token');

        try {
            const res = await fetch(`${API_BASE}/admin/banners/reorder`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids })
            });

            if (res.ok) {
                loadBannerCustomizer();
            }
        } catch (e) {
            console.error('Error reordering banners:', e);
        }
    }
    window.moveBanner = moveBanner;

    // Remove slide from carousel
    async function removeBanner(bannerId, bannerTitle) {
        const list = window.activeBannerSlides || activeBannerSlides || [];
        const target = list.find(b => String(b.id) === String(bannerId));
        const title = bannerTitle || (target && target.title ? target.title : 'this banner slide');
        if (!confirm(`Are you sure you want to remove "${title}" from the Homepage Slideshow?`)) {
            return;
        }

        const token = localStorage.getItem('infinx_token');
        try {
            const res = await fetch(`${API_BASE}/admin/banners/${encodeURIComponent(bannerId)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                loadBannerCustomizer();
            } else {
                const err = await res.json();
                alert(`Failed to remove banner: ${err.error || 'Server error'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Connection error trying to remove banner slide.');
        }
    }
    window.removeBanner = removeBanner;
    window.removeFeatured = removeBanner;


    // ======= USER MANAGEMENT & OTAKU RANK PROMOTION =======
    function getRankBadgeHtml(rank) {
        const r = (rank || 'GENIN').toUpperCase();
        if (r === 'HOKAGE_VIP' || r === 'HOKAGE') {
            return `<span style="background: linear-gradient(135deg, #ffb700, #ff0055); color: #fff; font-weight: 800; padding: 4px 10px; border-radius: 999px; font-size: 1.05rem; box-shadow: 0 0 10px rgba(255,183,0,0.4);"><i class="fas fa-crown"></i> HOKAGE VIP</span>`;
        }
        if (r === 'HASHIRA') {
            return `<span style="background: linear-gradient(135deg, #e50914, #ff5e57); color: #fff; font-weight: 800; padding: 4px 10px; border-radius: 999px; font-size: 1.05rem; box-shadow: 0 0 10px rgba(229,9,20,0.3);"><i class="fas fa-khanda"></i> HASHIRA</span>`;
        }
        if (r === 'JOUNIN') {
            return `<span style="background: rgba(255, 0, 85, 0.2); border: 1px solid #ff0055; color: #ff0055; font-weight: 700; padding: 3px 8px; border-radius: 999px; font-size: 1.05rem;">🔥 JOUNIN</span>`;
        }
        if (r === 'CHUNIN') {
            return `<span style="background: rgba(0, 240, 255, 0.2); border: 1px solid #00f0ff; color: #00f0ff; font-weight: 700; padding: 3px 8px; border-radius: 999px; font-size: 1.05rem;">⚡ CHUNIN</span>`;
        }
        return `<span style="background: rgba(46, 213, 115, 0.15); border: 1px solid #2ed573; color: #2ed573; font-weight: 700; padding: 3px 8px; border-radius: 999px; font-size: 1.05rem;">🌱 GENIN</span>`;
    }

    function updateRankPreview() {
        const rankSelect = document.getElementById('editUserVipRank');
        const previewEl = document.getElementById('editRankBadgePreview');
        if (rankSelect && previewEl) {
            previewEl.innerHTML = getRankBadgeHtml(rankSelect.value);
        }
    }

    async function fetchUsers() {
        const tbody = document.getElementById('usersTableBody');
        const token = localStorage.getItem('infinx_token');

        if (tbody.innerHTML.trim() === '' || tbody.innerHTML.includes('Loading users database...') || tbody.innerHTML.includes('Querying')) {
            tbody.innerHTML = `
                    <tr>
                        <td><div class="skeleton skeleton-text" style="height: 14px; width: 30px;"></div></td>
                        <td><div class="skeleton skeleton-text" style="height: 14px; width: 150px;"></div></td>
                        <td><div class="skeleton skeleton-text" style="height: 14px; width: 60px;"></div></td>
                        <td><div class="skeleton skeleton-pill" style="height: 20px; width: 70px;"></div></td>
                        <td><div class="skeleton skeleton-text" style="height: 14px; width: 80px;"></div></td>
                        <td><div class="skeleton skeleton-pill" style="height: 26px; width: 60px; display: inline-block; margin-right: 6px;"></div><div class="skeleton skeleton-pill" style="height: 26px; width: 60px; display: inline-block;"></div></td>
                    </tr>
                `;
        }

        try {
            const res = await fetch(`${API_BASE}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const users = await res.json();
                if (users.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--gray-text);">No registered users found.</td></tr>`;
                    return;
                }

                tbody.innerHTML = users.map(user => {
                    const registerDate = new Date(user.createdAt).toLocaleDateString();
                    const isBannedText = user.isBanned
                        ? `<span class="status-badge failed"><i class="fas fa-user-slash"></i> Banned</span>`
                        : `<span class="status-badge completed"><i class="fas fa-user-check"></i> Active</span>`;

                    let roleColor = 'var(--secondary)';
                    let roleIcon = 'fa-user';
                    if (user.role === 'ADMIN') { roleColor = 'var(--primary)'; roleIcon = 'fa-user-shield'; }
                    else if (user.role === 'VIP') { roleColor = '#ffb700'; roleIcon = 'fa-gem'; }
                    else if (user.role === 'MODERATOR') { roleColor = '#00f0ff'; roleIcon = 'fa-shield-alt'; }

                    const displayName = user.username || user.email.split('@')[0];
                    const avatarSrc = user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`;

                    return `
                            <tr>
                                <td><strong>#${user.id}</strong></td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <img src="${avatarSrc}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.2);" />
                                        <div>
                                            <div style="font-weight: 700; color: #fff;">${displayName}</div>
                                            <div style="font-size: 1.05rem; color: var(--gray-text);">${user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span style="font-weight: 700; color: ${roleColor};"><i class="fas ${roleIcon}"></i> ${user.role}</span></td>
                                <td>${getRankBadgeHtml(user.vipRank)}</td>
                                <td><span style="font-weight: 600; color: #00f0ff;">Lv. ${user.level || 1}</span> <span style="font-size: 1.05rem; color: var(--gray-text);">(${(user.xp || 0)} XP)</span></td>
                                <td>${isBannedText}</td>
                                <td><span style="color: var(--gray-text);">${registerDate}</span></td>
                                <td>
                                    <div style="display: flex; gap: 8px;">
                                        <button onclick="openEditUserModal(${user.id}, '${escape(user.email)}', '${escape(user.username || '')}', '${user.role}', '${user.vipRank || 'GENIN'}', ${user.level || 1}, ${user.xp || 0}, ${user.isBanned})" class="btn-back" style="padding: 6px 12px; font-size: 1.1rem; background: rgba(0, 168, 255, 0.1); border-color: var(--secondary); color: var(--secondary); cursor: pointer;"><i class="fas fa-crown"></i> Promote / Edit</button>
                                        <button onclick="deleteUser(${user.id}, '${user.email}')" class="btn-back" style="padding: 6px 12px; font-size: 1.1rem; background: rgba(231, 76, 60, 0.1); border-color: var(--danger); color: var(--danger); cursor: pointer;"><i class="fas fa-trash"></i> Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                }).join('');
            } else {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">Failed to query users database.</td></tr>`;
            }
        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">Error connecting to API.</td></tr>`;
        }
    }

    function openAddUserModal() {
        document.getElementById('addUserForm').reset();
        document.getElementById('addUserModal').style.display = 'flex';
    }

    function closeAddUserModal() {
        document.getElementById('addUserModal').style.display = 'none';
    }

    async function handleAddUser(e) {
        e.preventDefault();
        const email = document.getElementById('newUserEmail').value;
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('newUserRole').value;
        const isBanned = document.getElementById('newUserBanned').checked;
        const token = localStorage.getItem('infinx_token');

        try {
            const res = await fetch(`${API_BASE}/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, password, role, isBanned })
            });

            if (res.ok) {
                alert('New user account created successfully!');
                closeAddUserModal();
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Failed to add user: ${err.error || 'Server error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Connection error trying to add user.');
        }
    }

    function openEditUserModal(id, rawEmail, rawUsername, role, vipRank, level, xp, isBanned) {
        document.getElementById('editUserId').value = id;
        document.getElementById('editUserEmail').value = unescape(rawEmail);
        document.getElementById('editUserUsername').value = unescape(rawUsername || '');
        document.getElementById('editUserPassword').value = '';
        document.getElementById('editUserRole').value = role || 'USER';
        document.getElementById('editUserVipRank').value = vipRank || 'GENIN';
        document.getElementById('editUserLevel').value = level || 1;
        document.getElementById('editUserXp').value = xp || 0;
        document.getElementById('editUserBanned').checked = Boolean(isBanned);
        updateRankPreview();
        document.getElementById('editUserModal').style.display = 'flex';
    }

    function closeEditUserModal() {
        document.getElementById('editUserModal').style.display = 'none';
    }

    async function handleEditUser(e) {
        e.preventDefault();
        const id = document.getElementById('editUserId').value;
        const email = document.getElementById('editUserEmail').value;
        const username = document.getElementById('editUserUsername').value;
        const password = document.getElementById('editUserPassword').value;
        const role = document.getElementById('editUserRole').value;
        const vipRank = document.getElementById('editUserVipRank').value;
        const level = document.getElementById('editUserLevel').value;
        const xp = document.getElementById('editUserXp').value;
        const isBanned = document.getElementById('editUserBanned').checked;
        const token = localStorage.getItem('infinx_token');

        const payload = { email, username, role, vipRank, level, xp, isBanned };
        if (password && password.trim() !== '') {
            payload.password = password;
        }

        try {
            const res = await fetch(`${API_BASE}/admin/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('User promoted and saved successfully! 👑');
                closeEditUserModal();
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Failed to save user: ${err.error || 'Server error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Connection error trying to edit user.');
        }
    }

    async function deleteUser(id, email) {
        if (!confirm(`Are you absolutely sure you want to completely delete the user account: "${email}"?`)) {
            return;
        }

        const token = localStorage.getItem('infinx_token');
        try {
            const res = await fetch(`${API_BASE}/admin/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert(`User "${email}" deleted successfully.`);
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Failed to delete: ${err.error || 'Server error'}`);
            }
        } catch (e) {
            console.error(e);
            alert("Connection error trying to delete user.");
        }
    }

    // ======= EPISODE CUSTOMIZATION & EDITING =======
    function openEditEpisodeModal(id, title, epNum, duration, videoUrl, status, s3Url, localUrl) {
        document.getElementById('editEpisodeId').value = id;

        let epObj = null;
        if (window.currentShowEpisodesList && Array.isArray(window.currentShowEpisodesList)) {
            epObj = window.currentShowEpisodesList.find(e => e.id === id);
        }

        document.getElementById('editEpisodeTitle').value = (epObj ? epObj.title : title) || '';
        document.getElementById('editEpisodeNumber').value = (epObj ? epObj.episodeNumber : epNum) || 1;
        document.getElementById('editEpisodeDuration').value = (epObj ? epObj.duration : duration) || '';

        let s3Val = (epObj && epObj.s3Url) || s3Url || '';
        let localVal = (epObj && epObj.localUrl) || localUrl || '';
        const rawVideo = (epObj && epObj.videoUrl) || videoUrl || '';

        if (!s3Val && rawVideo && (rawVideo.includes('amazonaws.com') || (rawVideo.startsWith('http') && !rawVideo.includes('/uploads/')))) {
            s3Val = rawVideo;
        }
        if (!localVal && rawVideo && (rawVideo.startsWith('/uploads') || rawVideo.includes('/uploads/'))) {
            localVal = rawVideo;
        }

        if (document.getElementById('editEpisodeS3Url')) document.getElementById('editEpisodeS3Url').value = s3Val;
        if (document.getElementById('editEpisodeLocalUrl')) document.getElementById('editEpisodeLocalUrl').value = localVal;
        if (document.getElementById('editEpisodeVideoUrl')) document.getElementById('editEpisodeVideoUrl').value = rawVideo;
        document.getElementById('editEpisodeStatus').value = (epObj && epObj.transcodeStatus) || status || 'COMPLETED';
        document.getElementById('editEpisodeModal').style.display = 'flex';
    }

    function closeEditEpisodeModal() {
        document.getElementById('editEpisodeModal').style.display = 'none';
    }

    async function handleEditEpisode(e) {
        e.preventDefault();
        const id = document.getElementById('editEpisodeId').value;
        const title = document.getElementById('editEpisodeTitle').value;
        const episodeNumber = parseInt(document.getElementById('editEpisodeNumber').value);
        const duration = document.getElementById('editEpisodeDuration').value;
        const s3Url = document.getElementById('editEpisodeS3Url') ? document.getElementById('editEpisodeS3Url').value.trim() : '';
        const localUrl = document.getElementById('editEpisodeLocalUrl') ? document.getElementById('editEpisodeLocalUrl').value.trim() : '';
        const fallbackVideo = document.getElementById('editEpisodeVideoUrl') ? document.getElementById('editEpisodeVideoUrl').value.trim() : '';
        const videoUrl = localUrl || s3Url || fallbackVideo || null;
        const transcodeStatus = document.getElementById('editEpisodeStatus').value;
        const token = localStorage.getItem('infinx_token');

        try {
            const res = await fetch(`${API_BASE}/admin/episodes/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    episodeNumber,
                    duration,
                    videoUrl,
                    s3Url: s3Url || null,
                    localUrl: localUrl || null,
                    transcodeStatus
                })
            });

            if (res.ok) {
                alert('Episode settings updated and saved successfully!');
                closeEditEpisodeModal();
                if (currentActiveShowId) {
                    fetchShowEpisodesList(currentActiveShowId);
                }
                fetchManageShows();
            } else {
                const err = await res.json();
                alert(`Failed to update episode: ${err.error || 'Server error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Connection error trying to update episode.');
        }
    }

    // ======= SHOW CUSTOMIZATION & EDITING =======
    async function openEditShowModal(id) {
        try {
            const res = await fetch(`${API_BASE}/shows/${id}`);
            if (!res.ok) {
                alert('Failed to fetch show metadata.');
                return;
            }
            const show = await res.json();

            document.getElementById('editShowId').value = show.id;
            document.getElementById('editShowTitle').value = show.title;
            document.getElementById('editShowRating').value = show.rating;
            document.getElementById('editShowType').value = show.type || 'series';
            document.getElementById('editShowBadge').value = show.badge || 'HD';
            document.getElementById('editShowDubSub').checked = show.dubsub || false;
            document.getElementById('editShowYear').value = show.year;
            document.getElementById('editShowRuntime').value = show.runtime;
            document.getElementById('editShowDesc').value = show.description;
            document.getElementById('editShowIsFeatured').checked = show.isFeatured || false;

            // Reset file labels and selections
            document.getElementById('editShowPosterFile').value = '';
            document.getElementById('editShowBannerFile').value = '';
            document.getElementById('editPosterLabel').textContent = 'Drag & drop poster image or click to select';
            document.getElementById('editBannerLabel').textContent = 'Drag & drop banner image or click to select';

            // Setup file label handlers
            document.getElementById('editShowPosterFile').onchange = function () {
                const label = document.getElementById('editPosterLabel');
                label.textContent = this.files[0] ? `Selected: ${this.files[0].name}` : 'Drag & drop poster image or click to select';
            };
            document.getElementById('editShowBannerFile').onchange = function () {
                const label = document.getElementById('editBannerLabel');
                label.textContent = this.files[0] ? `Selected: ${this.files[0].name}` : 'Drag & drop banner image or click to select';
            };

            // Load and select categories
            const catRes = await fetch(`${API_BASE}/shows/categories`);
            if (catRes.ok) {
                const data = await catRes.json();
                const categoriesSelect = document.getElementById('editShowCategories');
                categoriesSelect.innerHTML = data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

                // Select current categories
                const currentCategoryIds = show.categories ? show.categories.map(c => c.categoryId) : [];
                Array.from(categoriesSelect.options).forEach(opt => {
                    if (currentCategoryIds.includes(parseInt(opt.value))) {
                        opt.selected = true;
                    }
                });
            }

            // Server streaming URLs for movies / first episode
            const firstEp = (show.episodes && show.episodes[0]) || null;
            let s3Val = (firstEp && firstEp.s3Url) || '';
            let localVal = (firstEp && firstEp.localUrl) || '';
            const epVid = (firstEp && firstEp.videoUrl) || '';

            if (!s3Val && epVid && (epVid.includes('amazonaws.com') || (epVid.startsWith('http') && !epVid.includes('/uploads/')))) {
                s3Val = epVid;
            }
            if (!localVal && epVid && (epVid.startsWith('/uploads') || epVid.includes('/uploads/'))) {
                localVal = epVid;
            }

            if (document.getElementById('editShowS3Url')) document.getElementById('editShowS3Url').value = s3Val;
            if (document.getElementById('editShowLocalUrl')) document.getElementById('editShowLocalUrl').value = localVal;

            document.getElementById('editShowModal').style.display = 'flex';
        } catch (err) {
            console.error(err);
            alert('Connection error fetching show metadata.');
        }
    }

    function closeEditShowModal() {
        document.getElementById('editShowModal').style.display = 'none';
    }

    async function handleEditShow(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        const id = document.getElementById('editShowId').value;
        const title = document.getElementById('editShowTitle').value;
        const rating = parseFloat(document.getElementById('editShowRating').value);
        const type = document.getElementById('editShowType').value;
        const badge = document.getElementById('editShowBadge').value;
        const dubsub = document.getElementById('editShowDubSub').checked;
        const year = document.getElementById('editShowYear').value;
        const runtime = document.getElementById('editShowRuntime').value;
        const description = document.getElementById('editShowDesc').value;
        const isFeatured = document.getElementById('editShowIsFeatured').checked;
        const posterFile = document.getElementById('editShowPosterFile').files[0];
        const bannerFile = document.getElementById('editShowBannerFile').files[0];
        const s3Url = document.getElementById('editShowS3Url') ? document.getElementById('editShowS3Url').value.trim() : '';
        const localUrl = document.getElementById('editShowLocalUrl') ? document.getElementById('editShowLocalUrl').value.trim() : '';

        // Collect selected categories
        const selectedOptions = Array.from(document.getElementById('editShowCategories').selectedOptions);
        const categoryIds = selectedOptions.map(opt => parseInt(opt.value));

        const formData = new FormData();
        formData.append('title', title);
        formData.append('rating', rating);
        formData.append('type', type);
        formData.append('badge', badge);
        formData.append('dubsub', dubsub);
        formData.append('year', year);
        formData.append('runtime', runtime);
        formData.append('description', description);
        formData.append('isFeatured', isFeatured);
        formData.append('s3Url', s3Url);
        formData.append('localUrl', localUrl);
        if (posterFile) {
            formData.append('poster', posterFile);
        }
        if (bannerFile) {
            formData.append('banner', bannerFile);
        }
        formData.append('categoryIds', JSON.stringify(categoryIds));

        try {
            const token = localStorage.getItem('infinx_token');
            const res = await fetch(`${API_BASE}/admin/shows/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                alert('Show updated successfully!');
                closeEditShowModal();
                fetchManageShows();
                loadShowsList();
            } else {
                const err = await res.json();
                alert(`Update failed: ${err.error || 'Server error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Connection error updating show.');
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }

    // ======= VIDEO STORAGE MANAGEMENT & CONFIGURATION =======
    async function loadStorageSettings() {
        try {
            const res = await fetch(`${API_BASE}/settings`);
            if (!res.ok) return;
            const data = await res.json();

            const currentType = (data.storageType || 'local').toLowerCase().trim();
            const currentPath = data.localStoragePath || '';
            const s3Bucket = data.s3Bucket || 'serverbuket-12';
            const s3Region = data.s3Region || 'ap-south-1';

            // Update Storage Panel elements
            const globalPathInput = document.getElementById('globalLocalStoragePath');
            if (globalPathInput) globalPathInput.value = currentPath;

            const localRadio = document.querySelector('input[name="globalStorageType"][value="local"]');
            const s3Radio = document.querySelector('input[name="globalStorageType"][value="s3"]');
            if (currentType === 's3' && s3Radio) {
                s3Radio.checked = true;
                handleGlobalStorageChange('s3');
            } else if (localRadio) {
                localRadio.checked = true;
                handleGlobalStorageChange('local');
            }

            // Update Status Cards
            const bucketEl = document.getElementById('statusS3Bucket');
            if (bucketEl) bucketEl.textContent = `${s3Bucket} (${s3Region})`;

            const mountEl = document.getElementById('statusLocalMount');
            if (mountEl) mountEl.textContent = currentPath || './uploads';

            // Update Episode Upload Form defaults if not already modified by user
            const uploadLocalRadio = document.querySelector('input[name="uploadStorageType"][value="local"]');
            const uploadS3Radio = document.querySelector('input[name="uploadStorageType"][value="s3"]');
            const uploadPathInput = document.getElementById('uploadLocalPathInput');
            const uploadBucketName = document.getElementById('uploadS3BucketName');

            if (uploadBucketName) uploadBucketName.textContent = `${s3Bucket} (${s3Region})`;

            if (uploadPathInput && !uploadPathInput.value && currentPath) {
                uploadPathInput.placeholder = `Default: ${currentPath}`;
            }

            if (currentType === 's3' && uploadS3Radio && !uploadS3Radio.dataset.userTouched) {
                uploadS3Radio.checked = true;
                toggleUploadStorageType('s3');
            } else if (currentType === 'local' && uploadLocalRadio && !uploadLocalRadio.dataset.userTouched) {
                uploadLocalRadio.checked = true;
                toggleUploadStorageType('local');
            }
        } catch (err) {
            console.warn('Could not load storage settings:', err);
        }
    }

    async function saveStorageSettings(e) {
        if (e && e.preventDefault) e.preventDefault();
        const btn = document.getElementById('btnSaveStorageSettings');
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;
        }

        try {
            const storageType = document.querySelector('input[name="globalStorageType"]:checked')?.value || 'local';
            const localStoragePath = document.getElementById('globalLocalStoragePath')?.value.trim() || '';
            const token = localStorage.getItem('infinx_token');

            const res = await fetch(`${API_BASE}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ storageType, localStoragePath })
            });

            if (res.ok) {
                const result = await res.json();
                alert('✅ Storage preferences saved successfully!\nNew video uploads will automatically follow this configuration.');
                await loadStorageSettings();
            } else {
                const err = await res.json();
                alert(`Failed to save storage settings: ${err.error || 'Server error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Connection error while saving storage settings.');
        } finally {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }
    }

    function toggleUploadStorageType(type) {
        const radio = document.querySelector(`input[name="uploadStorageType"][value="${type}"]`);
        if (radio) radio.dataset.userTouched = "true";

        const localCard = document.getElementById('uploadStorageLocalLabel');
        const s3Card = document.getElementById('uploadStorageS3Label');
        const localContainer = document.getElementById('uploadLocalPathContainer');
        const s3Container = document.getElementById('uploadS3DetailsContainer');
        const badge = document.getElementById('storageBadgeActive');
        const labelStage3 = document.getElementById('labelStage3');
        const iconStage3 = document.getElementById('iconStage3');

        if (type === 'local') {
            if (localCard) {
                localCard.style.borderColor = 'var(--secondary)';
                localCard.style.background = 'rgba(0, 168, 255, 0.08)';
            }
            if (s3Card) {
                s3Card.style.borderColor = 'var(--gray-border)';
                s3Card.style.background = 'rgba(255, 255, 255, 0.02)';
            }
            if (localContainer) localContainer.style.display = 'block';
            if (s3Container) s3Container.style.display = 'none';
            if (badge) {
                badge.style.background = 'rgba(0, 168, 255, 0.15)';
                badge.style.color = 'var(--secondary)';
                badge.style.borderColor = 'var(--secondary)';
                badge.innerHTML = '<i class="fas fa-laptop"></i> Laptop Local Storage';
            }
            if (labelStage3) labelStage3.textContent = '3. Save to Laptop Local Storage';
            if (iconStage3) {
                iconStage3.className = 'fas fa-laptop';
                iconStage3.style.color = 'var(--secondary)';
            }
        } else {
            if (localCard) {
                localCard.style.borderColor = 'var(--gray-border)';
                localCard.style.background = 'rgba(255, 255, 255, 0.02)';
            }
            if (s3Card) {
                s3Card.style.borderColor = 'var(--primary)';
                s3Card.style.background = 'rgba(255, 0, 85, 0.08)';
            }
            if (localContainer) localContainer.style.display = 'none';
            if (s3Container) s3Container.style.display = 'block';
            if (badge) {
                badge.style.background = 'rgba(255, 0, 85, 0.15)';
                badge.style.color = 'var(--primary)';
                badge.style.borderColor = 'var(--primary)';
                badge.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> AWS S3 Cloud';
            }
            if (labelStage3) labelStage3.textContent = '3. Upload to AWS S3 Cloud';
            if (iconStage3) {
                iconStage3.className = 'fas fa-cloud-upload-alt';
                iconStage3.style.color = 'var(--primary)';
            }
        }
    }

    function setUploadPathPreset(preset) {
        const input = document.getElementById('uploadLocalPathInput');
        if (input) {
            input.value = preset;
            input.focus();
        }
    }

    function handleGlobalStorageChange(type) {
        const localCard = document.getElementById('globalStorageLocalCard');
        const s3Card = document.getElementById('globalStorageS3Card');
        const localBadge = document.getElementById('globalLocalBadge');
        const s3Badge = document.getElementById('globalS3Badge');
        const pathSection = document.getElementById('globalLocalPathSection');

        if (type === 'local') {
            if (localCard) {
                localCard.style.borderColor = 'var(--secondary)';
                localCard.style.background = 'rgba(0, 168, 255, 0.08)';
            }
            if (s3Card) {
                s3Card.style.borderColor = 'var(--gray-border)';
                s3Card.style.background = 'rgba(255, 255, 255, 0.02)';
            }
            if (localBadge) localBadge.style.display = 'inline-block';
            if (s3Badge) s3Badge.style.display = 'none';
            if (pathSection) pathSection.style.display = 'block';
        } else {
            if (localCard) {
                localCard.style.borderColor = 'var(--gray-border)';
                localCard.style.background = 'rgba(255, 255, 255, 0.02)';
            }
            if (s3Card) {
                s3Card.style.borderColor = 'var(--primary)';
                s3Card.style.background = 'rgba(255, 0, 85, 0.08)';
            }
            if (localBadge) localBadge.style.display = 'none';
            if (s3Badge) s3Badge.style.display = 'inline-block';
            if (pathSection) pathSection.style.display = 'none';
        }
    }

    function setGlobalPathPreset(preset) {
        const input = document.getElementById('globalLocalStoragePath');
        if (input) {
            input.value = preset;
            input.focus();
        }
    }

// Expose functions globally to window for HTML inline event handlers
window.toggleUploadStorageType = toggleUploadStorageType;
window.setUploadPathPreset = setUploadPathPreset;
window.handleGlobalStorageChange = handleGlobalStorageChange;
window.setGlobalPathPreset = setGlobalPathPreset;
window.openAddUserModal = openAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.handleAddUser = handleAddUser;
window.openEditUserModal = openEditUserModal;
window.closeEditUserModal = closeEditUserModal;
window.handleEditUser = handleEditUser;
window.deleteUser = deleteUser;
window.updateRankPreview = updateRankPreview;
window.openEditShowModal = openEditShowModal;
window.closeEditShowModal = closeEditShowModal;
window.handleEditShow = handleEditShow;
window.openEditEpisodeModal = openEditEpisodeModal;
window.closeEditEpisodeModal = closeEditEpisodeModal;
window.handleEditEpisode = handleEditEpisode;
window.deleteEpisode = deleteEpisode;
window.closeEpisodeModal = closeEpisodeModal;
window.openAddEpisodeModalFromManager = openAddEpisodeModalFromManager;
window.closeAddEpisodeManualModal = closeAddEpisodeManualModal;
window.handleCreateEpisodeManual = handleCreateEpisodeManual;
window.manageEpisodes = manageEpisodes;
window.deleteShow = deleteShow;
window.pauseTranscodeTask = pauseTranscodeTask;
window.resumeTranscodeTask = resumeTranscodeTask;
window.stopTranscodeTask = stopTranscodeTask;
window.retryTask = retryTask;
window.completeTask = completeTask;
window.cleanOldUploadsManual = cleanOldUploadsManual;
window.fetchTasks = fetchTasks;
window.handleUploadEpisode = handleUploadEpisode;

