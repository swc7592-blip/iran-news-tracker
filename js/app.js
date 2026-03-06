// Iran News Tracker
// Brave Search API 기반 실시간 뉴스 트래커

const CONFIG = {
    NEWS_DATA_URL: './news.json', // GitHub Actions로 생성된 JSON 파일
    REFRESH_INTERVAL: 5 * 60 * 1000, // 5분
    STORAGE_KEY: 'iran_news_seen_urls'
};

// 상태 관리
let state = {
    news: [],
    seenUrls: new Set(),
    lastUpdate: null,
    isLoading: false,
    error: null
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadSeenUrls();
    fetchNews();
    startAutoRefresh();
});

// localStorage에서 본 URL 목록 로드
function loadSeenUrls() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (stored) {
            const urls = JSON.parse(stored);
            state.seenUrls = new Set(urls);
            console.log('Loaded', urls.length, 'seen URLs from storage');
        }
    } catch (e) {
        console.error('Error loading seen URLs:', e);
        state.seenUrls = new Set();
    }
}

// localStorage에 본 URL 목록 저장
function saveSeenUrls() {
    try {
        const urls = Array.from(state.seenUrls);
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(urls));
    } catch (e) {
        console.error('Error saving seen URLs:', e);
    }
}

// 뉴스 데이터 가져오기 (JSON 파일에서)
async function fetchNews() {
    if (state.isLoading) return;

    setLoading(true);
    state.error = null;

    try {
        const response = await fetch(CONFIG.NEWS_DATA_URL);

        if (!response.ok) {
            throw new Error(`Failed to fetch news data: ${response.status}`);
        }

        const allNews = await response.json();

        // 중복 제거만 하고, 모든 뉴스 표시
        const urlSet = new Set();
        const uniqueNews = [];

        for (const item of allNews) {
            if (!urlSet.has(item.url)) {
                urlSet.add(item.url);
                uniqueNews.push(item);
            }
        }

        // 상태 업데이트
        state.news = uniqueNews;
        state.lastUpdate = new Date();

        // UI 업데이트
        renderNews();
        updateStatusBar(`최신 뉴스 ${uniqueNews.length}건 로드됨`, 'success');
        updateLastUpdate();

    } catch (error) {
        console.error('Error fetching news:', error);
        state.error = error.message;
        showError(error.message);
        updateStatusBar('오류: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// 뉴스 렌더링
function renderNews() {
    const container = document.getElementById('newsContainer');
    const emptyState = document.getElementById('emptyState');

    if (state.news.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    container.innerHTML = state.news.map((item, index) => createNewsCard(item, index)).join('');
}

// 뉴스 카드 생성
function createNewsCard(item, index) {
    const timeAgo = getTimeAgo(new Date(item.age));
    const formattedTime = getFormattedTime(item.page_age);
    const badgeClass = getBadgeClass(index);

    return `
        <div class="news-card bg-gray-800 rounded-lg border border-gray-700 overflow-hidden cursor-pointer hover:border-blue-500"
             onclick="openModal(${index})">
            ${item.thumbnail?.src ? `
                <div class="aspect-video w-full overflow-hidden bg-gray-700">
                    <img src="${item.thumbnail.src}" alt="${item.title}"
                         class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                </div>
            ` : ''}
            <div class="p-4">
                <div class="flex items-center gap-2 mb-2">
                    <span class="badge ${badgeClass} rounded-full font-medium">${index === 0 ? '속보' : '최신'}</span>
                    <span class="text-xs text-gray-500">${timeAgo}</span>
                </div>
                <h3 class="text-white font-semibold mb-2 line-clamp-2 hover:text-blue-400 transition-colors">
                    ${item.title}
                </h3>
                <p class="text-gray-400 text-sm line-clamp-3 mb-3">
                    ${item.description || ''}
                </p>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-500">${item.meta_url?.url || item.url}</span>
                    <span class="text-xs text-gray-600">${formattedTime}</span>
                </div>
            </div>
        </div>
    `;
}

// 뱃지 클래스 결정
function getBadgeClass(index) {
    if (index === 0) return 'badge-breaking';
    if (index < 3) return 'badge-latest';
    return 'badge-default';
}

// 시간 포맷팅
function getTimeAgo(date) {
    if (isNaN(date.getTime())) return '알 수 없음';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
}

// 정확한 작성 시간 포맷팅
function getFormattedTime(pageAge) {
    if (!pageAge) return '알 수 없음';

    const date = new Date(pageAge);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 모달 열기
function openModal(index) {
    const item = state.news[index];
    if (!item) return;

    const modal = document.getElementById('newsModal');
    const content = document.getElementById('modalContent');
    const timeAgo = getTimeAgo(new Date(item.age));
    const formattedTime = getFormattedTime(item.page_age);

    content.innerHTML = `
        ${item.thumbnail?.src ? `
            <img src="${item.thumbnail.src}" alt="${item.title}" class="w-full h-64 object-cover rounded-lg mb-4">
        ` : ''}
        <div class="flex items-center gap-2 mb-2">
            <span class="badge ${getBadgeClass(index)} rounded-full font-medium">${index === 0 ? '속보' : '최신'}</span>
            <span class="text-sm text-gray-500">${timeAgo}</span>
        </div>
        <h2 class="text-2xl font-bold text-white mb-4">${item.title}</h2>
        <div class="bg-gray-700 rounded-lg p-3 mb-4">
            <div class="flex items-center gap-4 text-sm">
                <span class="text-gray-400">작성 시간:</span>
                <span class="text-gray-300 font-medium">${formattedTime}</span>
            </div>
        </div>
        <div class="prose prose-invert max-w-none mb-6">
            <p class="text-gray-300 leading-relaxed">${item.description || ''}</p>
        </div>
        <div class="bg-gray-700 rounded-lg p-4 mb-6">
            <p class="text-sm text-gray-400 mb-2">출처</p>
            <a href="${item.url}" target="_blank" rel="noopener noreferrer"
               class="text-blue-400 hover:text-blue-300 font-medium break-all">
                ${item.meta_url?.url || item.url}
            </a>
        </div>
        <div class="flex gap-3">
            <a href="${item.url}" target="_blank" rel="noopener noreferrer"
               class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-lg font-medium transition-colors">
                원문 보기
            </a>
            <button onclick="closeModal()"
                    class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors">
                닫기
            </button>
        </div>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// 모달 닫기
function closeModal() {
    const modal = document.getElementById('newsModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// 로딩 상태
function setLoading(loading) {
    state.isLoading = loading;

    const loadingState = document.getElementById('loadingState');
    const newsGrid = document.getElementById('newsGrid');
    const errorState = document.getElementById('errorState');
    const refreshBtn = document.getElementById('refreshBtn');

    if (loading) {
        loadingState.classList.remove('hidden');
        newsGrid.classList.add('hidden');
        errorState.classList.add('hidden');
        refreshBtn.disabled = true;
        refreshBtn.classList.add('opacity-50');
        updateStatusBar('뉴스를 불러오는 중...', 'loading');
    } else {
        loadingState.classList.add('hidden');
        newsGrid.classList.remove('hidden');
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('opacity-50');
    }
}

// 에러 표시
function showError(message) {
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const newsGrid = document.getElementById('newsGrid');

    errorMessage.textContent = message;
    errorState.classList.remove('hidden');
    newsGrid.classList.add('hidden');
}

// 상태 표시줄 업데이트
function updateStatusBar(text, type) {
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');

    statusText.textContent = text;

    const colors = {
        success: 'text-green-400',
        error: 'text-red-400',
        loading: 'text-blue-400',
        default: 'text-gray-400'
    };

    statusIcon.className = colors[type] || colors.default;
}

// 마지막 업데이트 시간 업데이트
function updateLastUpdate() {
    const element = document.getElementById('lastUpdate');
    if (state.lastUpdate) {
        const time = state.lastUpdate.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        element.textContent = time;
    }
}

// 자동 새로고침 시작
function startAutoRefresh() {
    setInterval(() => {
        console.log('Auto refresh triggered');
        fetchNews();
    }, CONFIG.REFRESH_INTERVAL);
}
