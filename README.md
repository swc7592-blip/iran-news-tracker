# 이란 전쟁 실시간 뉴스 트래커

Brave Search API를 활용한 이란 전쟁 관련 실시간 뉴스 트래커입니다.

## 기능

- ✅ 5분마다 자동 새로고침
- ✅ Brave Search API 기반 뉴스 검색
- ✅ 깔끔한 다크 모드 디자인 (Tailwind CSS)
- ✅ 헤드라인 클릭 시 상세 내용 모달 표시
- ✅ 중복 뉴스 자동 필터링 (localStorage 저장)
- ✅ 여러 검색어 병렬 검색 (한국어 + 영어)
- ✅ 반응형 디자인 (모바일/태블릿/데스크톱)

## 설정

### 1. Brave Search API 키 설정

`js/app.js` 파일에서 API 키를 설정하세요:

```javascript
const CONFIG = {
    API_KEY: 'YOUR_BRAVE_SEARCH_API_KEY',  // 여기에 API 키 입력
    // ... 다른 설정들
};
```

### 2. Brave Search API 키 발급 방법

1. [Brave Search API](https://api.search.brave.com/app/keys) 접속
2. 계정 로그인 또는 회원가입
3. API 키 발급 (무료 플랜 가능)

## 실행 방법

### 방법 1: 로컬 서버 (추천)

```bash
# Python 3
python -m http.server 8000

# Node.js (npx 사용)
npx serve .

# PHP
php -S localhost:8000
```

브라우저에서 `http://localhost:8000` 접속

### 방법 2: 파일 직접 열기

`index.html` 파일을 브라우저로 직접 열 수도 있습니다 (일부 기능 제한될 수 있음).

## 검색 쿼리

다음 검색어를 사용하여 뉴스를 검색합니다:

- 이란 전쟁
- Iran war
- 이란 이스라엘
- Iran Israel
- 이란 공격
- Iran attack

`js/app.js` 파일에서 `CONFIG.SEARCH_QUERIES` 배열을 수정하여 검색어를 추가/삭제할 수 있습니다.

## 중복 뉴스 필터링

- localStorage에 이미 본 뉴스 URL 저장
- 같은 URL의 뉴스는 다시 표시하지 않음
- 브라우저 캐시를 지우면 초기화됨

## 파일 구조

```
iran-news-tracker/
├── index.html          # 메인 HTML 파일
├── css/
│   └── style.css      # 추가 스타일
├── js/
│   └── app.js         # 메인 JavaScript 로직
└── README.md          # 이 파일
```

## 커스터마이징

### 새로고침 간격 변경

`js/app.js`에서 수정:

```javascript
const CONFIG = {
    REFRESH_INTERVAL: 5 * 60 * 1000,  // 5분 (밀리초 단위)
    // ...
};
```

### 최대 결과 수 변경

```javascript
const CONFIG = {
    MAX_RESULTS: 20,  // 각 검색어당 최대 결과 수
    // ...
};
```

## 브라우저 호환성

- Chrome/Edge: ✅ 완전 지원
- Firefox: ✅ 완전 지원
- Safari: ✅ 완전 지원
- Mobile Safari: ✅ 완전 지원

## 참고

- 이 프로젝트는 Brave Search API를 사용합니다.
- 무료 API 플랜은 월별 호출 제한이 있습니다.
- 뉴스 소스는 Brave의 뉴스 인덱스에서 가져옵니다.
