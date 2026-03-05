// Iran News Tracker
// Brave Search API 기반 실시간 뉴스 트래커

const CONFIG = {
    API_ENDPOINT: 'https://api.search.brave.com/res/v1/news/search',
    API_KEY: '', // localStorage에서 불러옴
    SEARCH_QUERIES: [
        '이란 전쟁',
        'Iran war',
        '이란 이스라엘',
        'Iran Israel',
        '이란 공격',
        'Iran attack'
    ],
    REFRESH_INTERVAL: 5 * 60 * 1000, // 5분
    MAX_RESULTS: 20,
    STORAGE_KEY: 'iran_news_seen_urls',
    API_KEY_STORAGE_KEY: 'brave_api_key'
};

// 상태 관리
let state = {
    news: [],
    seenUrls: new Set(),
    lastUpdate: null,
    isLoading: false,
    error: null
};

// API 키 저장
function saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    const apiKey = input.value.trim();

    if (!apiKey) {
        alert('API 키를 입력해주세요.');
        return;
    }

    try {
        localStorage.setItem(CONFIG.API_KEY_STORAGE_KEY, apiKey);
        CONFIG.API_KEY = apiKey;
        document.getElementById('apiKeyBanner').classList.add('hidden');
        fetchNews();
    } catch (e) {
        console.error('Error saving API key:', e);
        alert('API 키 저장에 실패했습니다.');
    }
}

// API 키 로드
function loadApiKey() {
    try {
        const apiKey = localStorage.getItem(CONFIG.API_KEY_STORAGE_KEY);
        if (apiKey) {
            CONFIG.API_KEY = apiKey;
            document.getElementById('apiKeyBanner').classList.add('hidden');
            return true;
        }
    } catch (e) {
        console.error('Error loading API key:', e);
    }
    return false;
}

// API 키 변경
function changeApiKey() {
    document.getElementById('apiKeyBanner').classList.remove('hidden');
    document.getElementById('apiKeyInput').focus();
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadSeenUrls();

    if (loadApiKey()) {
        // API 키가 있으면 바로 뉴스 로드
        fetchNews();
    } else {
        // API 키가 없으면 배너 표시
        updateStatusBar('API 키를 입력해주세요', 'default');
    }

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

// Brave Search API로 뉴스 가져오기
async function fetchNews() {
    if (state.isLoading) return;

    // API 키 체크
    if (!CONFIG.API_KEY) {
        updateStatusBar('API 키가 필요합니다', 'error');
        return;
    }

    setLoading(true);
    state.error = null;

    try {
        // 모든 쿼리에 대해 뉴스 검색 (병렬)
        const allResults = await Promise.all(
            CONFIG.SEARCH_QUERIES.map(query => searchNews(query))
        );

        // 결과 합치기 및 중복 제거
        const uniqueNews = [];
        const urlSet = new Set();

        allResults.flat().forEach(item => {
            if (!urlSet.has(item.url)) {
                urlSet.add(item.url);
                uniqueNews.push(item);
            }
        });

        // 새로운 뉴스만 필터링
        const newNews = uniqueNews.filter(item => !state.seenUrls.has(item.url));

        // 새로운 뉴스 URL을 본 URL 목록에 추가
        newNews.forEach(item => state.seenUrls.add(item.url));
        saveSeenUrls();

        // 상태 업데이트
        state.news = newNews;
        state.lastUpdate = new Date();

        // UI 업데이트
        renderNews();
        updateStatusBar('최신 뉴스 ' + newNews.length + '건 로드됨', 'success');
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

// 단일 쿼리로 뉴스 검색
async function searchNews(query) {
    if (!CONFIG.API_KEY) {
        throw new Error('API 키가 필요합니다. 페이지 상단의 입력창에 API 키를 입력해주세요.');
    }

    const url = new URL(CONFIG.API_ENDPOINT);
    url.searchParams.append('q', query);
    url.searchParams.append('count', CONFIG.MAX_RESULTS.toString());
    url.searchParams.append('freshness', 'pd'); // past day

    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': CONFIG.API_KEY
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.results?.results || [];
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
                    <span class="badge ${badgeClass} rounded-full font-medium">${index === 0 ? 'BREAKING' : 'LATEST'}</span>
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
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
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

// 모달 열기
function openModal(index) {
    const item = state.news[index];
    if (!item) return;

    const modal = document.getElementById('newsModal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        ${item.thumbnail?.src ? `
            <img src="${item.thumbnail.src}" alt="${item.title}" class="w-full h-64 object-cover rounded-lg mb-4">
        ` : ''}
        <div class="flex items-center gap-2 mb-2">
            <span class="badge ${getBadgeClass(index)} rounded-full font-medium">${index === 0 ? 'BREAKING' : 'LATEST'}</span>
            <span class="text-sm text-gray-500">${getTimeAgo(new Date(item.age))}</span>
        </div>
        <h2 class="text-2xl font-bold text-white mb-4">${item.title}</h2>
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
