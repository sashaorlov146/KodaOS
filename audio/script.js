const WHITE_SQUARE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const player = document.getElementById('player');
const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const coverEl = document.getElementById('cover');
const tracksList = document.getElementById('tracks-list');
const modal = document.getElementById('modal');

let playlist = [];
let db;
let currentTrackId = null;
let currentFilter = 'all';

document.addEventListener('contextmenu', e => e.preventDefault());

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// --- РАБОТА С БАЗОЙ ДАННЫХ (IndexedDB) ---

const request = indexedDB.open("MusicDB", 5);
request.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains("songs")) {
        db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
    }
};
request.onsuccess = (e) => {
    db = e.target.result;
    loadSavedSongs();
};

function loadSavedSongs() {
    const tx = db.transaction("songs", "readonly");
    const store = tx.objectStore("songs");
    store.getAll().onsuccess = (e) => {
        let results = e.target.result || [];
        playlist = shuffle(results); 
        renderPlaylist();
        if (playlist.length > 0) {
            const forceStart = localStorage.getItem('autoPlayNext') === 'true';
            localStorage.removeItem('autoPlayNext');
            loadTrack(playlist[0], forceStart);
        }
    };
}

function saveTrackToDB(track) {
    const tx = db.transaction(["songs"], "readwrite");
    const store = tx.objectStore("songs");
    store.put(track).onsuccess = () => {
        if (currentTrackId === track.id) {
            loadTrack(track, !player.paused);
        }
        renderPlaylist();
    };
}

// --- ЛОГИКА ПЛЕЕРА ---

function renderPlaylist() {
    if (!tracksList) return;
    tracksList.innerHTML = '';
    const filtered = playlist.filter(t => currentFilter === 'favorite' ? t.favorite : true);
    
    filtered.forEach((track) => {
        const isActive = track.id === currentTrackId;
        const item = document.createElement('div');
        item.className = `track-item ${isActive ? 'active' : ''}`;
        
        const badge = track.explicit ? '<span class="explicit-badge">E</span>' : '';
        const heartIcon = track.favorite ? '♥' : '♡';
        
        item.innerHTML = `
            <div class="track-info-mini" style="cursor:pointer;flex:1" onclick="loadTrackById(${track.id}, true)">
                <div class="track-title-mini" style="font-weight:bold">${track.title}</div>
                <div class="track-artist-mini" style="opacity:0.6;font-size:0.9em">${track.artist}${badge}</div>
            </div>
            <div class="track-actions" style="display: flex; align-items: center;">
                <span class="fav-btn" onclick="event.stopPropagation(); toggleFavorite(${track.id})" 
                      style="cursor:pointer; font-size: 18px; color: var(--accent, #a349a4); margin-right: 5px;">
                    ${heartIcon}
                </span>
                <button class="action-btn" onclick="event.stopPropagation(); editTrack(${track.id})">✎</button>
                <button class="action-btn" onclick="event.stopPropagation(); deleteTrack(${track.id})" style="color:#ff4444">🗑</button>
            </div>`;
        tracksList.appendChild(item);
    });
}

function loadTrack(track, shouldPlay = false) {
    if (!track) return;
    currentTrackId = track.id;
    
    const badge = track.explicit ? '<span class="explicit-badge">E</span>' : '';
    titleEl.innerHTML = track.title;
    artistEl.innerHTML = `${track.artist} ${badge}`;

    if (coverEl.src.startsWith('blob:')) URL.revokeObjectURL(coverEl.src);
    if (player.src.startsWith('blob:')) URL.revokeObjectURL(player.src);
    
    const coverBlob = (track.img instanceof Blob) ? URL.createObjectURL(track.img) : (track.img || WHITE_SQUARE);
    coverEl.src = coverBlob;
    player.src = (track.src instanceof Blob) ? URL.createObjectURL(track.src) : track.src;
    
    if (shouldPlay) {
        player.play().catch(() => console.warn("Ждем клика пользователя"));
        // УВЕДОМЛЕНИЕ
        if (typeof Notifier !== 'undefined') {
            Notifier.show("Koda Плеер", track.title, track.artist, coverBlob);
        }
    }
    renderPlaylist();
}

window.loadTrackById = (id, play = true) => {
    const track = playlist.find(t => t.id === id);
    if (track) loadTrack(track, play);
};

// --- УПРАВЛЕНИЕ ТРЕКАМИ ---

window.toggleFavorite = (id) => {
    const track = playlist.find(t => t.id === id);
    if (!track) return;
    track.favorite = !track.favorite;
    const tx = db.transaction(["songs"], "readwrite");
    tx.objectStore("songs").put(track).onsuccess = () => renderPlaylist();
};

window.setFilter = (filter) => {
    currentFilter = filter;
    renderPlaylist();
};

window.editTrack = (id) => {
    const track = playlist.find(t => t.id === id);
    if (!track) return;
    const newTitle = prompt("Название:", track.title);
    const newArtist = prompt("Артист:", track.artist);
    if (newTitle !== null && newArtist !== null) {
        track.title = newTitle;
        track.artist = newArtist;
        if (confirm("Хотите изменить обложку?")) {
            const fileInput = document.getElementById('edit-cover-input');
            fileInput.value = ''; 
            fileInput.click();
            fileInput.onchange = () => {
                if (fileInput.files && fileInput.files[0]) track.img = fileInput.files[0];
                saveTrackToDB(track);
            };
        } else {
            saveTrackToDB(track);
        }
    }
};

window.deleteTrack = (id) => {
    if (confirm("Удалить этот трек?")) {
        const tx = db.transaction(["songs"], "readwrite");
        tx.objectStore("songs").delete(id).onsuccess = () => {
            playlist = playlist.filter(t => t.id !== id);
            if (currentTrackId === id) player.pause();
            renderPlaylist();
        };
    }
};

// --- ЗАГРУЗКА НОВЫХ ТРЕКОВ ---

document.getElementById('upload').onchange = (e) => {
    window.tempFile = e.target.files[0];
    if (!window.tempFile) return;
    document.getElementById('track-title').value = window.tempFile.name.replace(/\.[^/.]+$/, "");
    document.getElementById('track-artist').value = localStorage.getItem('lastArtist') || "";
    modal.style.display = 'flex';
};

document.getElementById('save-track').onclick = () => {
    const artist = document.getElementById('track-artist').value || "Unknown";
    localStorage.setItem('lastArtist', artist);
    const nT = {
        title: document.getElementById('track-title').value || "Unknown",
        artist: artist,
        src: window.tempFile,
        img: document.getElementById('track-cover-input').files[0] || WHITE_SQUARE,
        explicit: document.getElementById('track-explicit').checked,
        favorite: false
    };
    const tx = db.transaction(["songs"], "readwrite");
    tx.objectStore("songs").add(nT).onsuccess = (e) => {
        nT.id = e.target.result;
        playlist.unshift(nT);
        modal.style.display = 'none';
        renderPlaylist();
        loadTrack(nT, true);
    };
};

// --- СОБЫТИЯ ПЛЕЕРА ---

player.onended = () => {
    const filteredQueue = playlist.filter(t => currentFilter === 'favorite' ? t.favorite : true);
    let idx = filteredQueue.findIndex(t => t.id === currentTrackId);
    if (idx !== -1 && idx < filteredQueue.length - 1) {
        loadTrack(filteredQueue[idx + 1], true);
    } else {
        localStorage.setItem('autoPlayNext', 'true');
        location.reload(); 
    }
};

window.resetLocal = () => {
    if (confirm("ТЫ УВЕРЕН?! Сбросить всё? Это удалит ВООБЩЕ ВСЮ музыку из плеера!")) {
        if (typeof Notifier !== 'undefined') {
            Notifier.show("система", "очистка данных", "все файлы и настройки удалены");
        }
        indexedDB.deleteDatabase("MusicDB");
        localStorage.clear();
        setTimeout(() => location.reload(), 500);
    }
};