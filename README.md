# 그린베이 패커스 브리핑 트래커

🔗 **바로가기: [https://kim-misol.github.io/packersTracher/](https://kim-misol.github.io/packersTracher/)**

날짜별 브리핑이 아무리 쌓여도 가볍게 유지되도록, 데이터와 화면을 분리한 구조로 만들었습니다.

```
packersTracher/
├── index.html          # 화면 전체 (검색/필터 사이드바 + 상세 뷰 + 뉴스 가져오기 버튼)
├── data/
│   ├── index.json       # 모든 날짜의 "가벼운 요약" 목록 (날짜, 헤드라인, 태그, 개수)
│   └── 2026-08-15.json  # 그 날짜의 전체 상세 데이터 (스토리·부상·로스터무브·일정)
├── api/                 # 뉴스 가져오기 버튼의 백엔드 (Vercel Functions)
│   ├── fetch-news.js     # POST /api/fetch-news — 실제 엔드포인트
│   └── _lib/             # 순수 함수 위주 헬퍼 (단위 테스트 대상)
├── tests/                # api/ 에 대한 단위 테스트 (node --test)
└── README.md
```

## 왜 이 구조인가

이전 방식(모든 날짜를 `index.html` 안에 하나의 배열로 저장)은 브리핑이 쌓일수록 파일이
무한히 커지고, 날짜 탭이 수십~수백 개로 늘어나면 스크롤도 클릭도 불편해집니다.

이 구조는 다음을 해결합니다.

- **파일이 안 커짐**: `index.html`과 렌더링 코드는 고정. 새 날짜는 `data/` 안에 작은 JSON 파일 하나로만 추가됨.
- **git 히스토리가 깔끔함**: 매일 "파일 1개 추가 + index.json 한 줄 추가"가 커밋 하나. diff가 항상 작고 리뷰하기 쉬움.
- **로딩이 가벼움**: 처음 열 때는 `index.json`(목록용 요약)만 불러오고, 특정 날짜를 클릭해야 그 날짜의 상세 JSON을 불러옵니다. 브리핑이 몇 년치 쌓여도 초기 로딩 속도는 그대로.
- **검색·필터·URL 공유**: 왼쪽 사이드바에서 키워드·태그로 검색되고, 월별로 접고 펼칠 수 있습니다. 특정 날짜는 `index.html#2026-08-15` 같은 주소로 바로 공유·북마크 가능.

## 새 브리핑 추가하는 법

두 가지 방법이 있습니다.

1. **채팅으로**: 브리핑을 채팅에 붙여넣어 주시면 `data/YYYY-MM-DD.json`(신규 파일)과
   `data/index.json`(맨 앞에 그날 요약 한 줄 추가)을 만들어드립니다. 이 두 파일만 저장소에
   반영(커밋)하면 사이트가 자동으로 인식합니다. 매번 `index.html`을 다시 만질 필요는 없습니다.
2. **사이트의 "📰 최신 뉴스 가져오기" 버튼으로**: 아래 [뉴스 가져오기 버튼 설정](#뉴스-가져오기-버튼-설정-vercel-functions) 섹션을 참고해
   백엔드를 한 번 배포해두면, 버튼 클릭 한 번으로 packers.com의 새 기사를 가져와 같은 방식의
   JSON 파일을 만들고 커밋까지 자동으로 처리합니다.

## 로컬에서 미리보기

이 페이지는 데이터를 `fetch`로 불러오기 때문에, 파일 탐색기에서 `index.html`을
더블클릭해서 열면(즉 `file://` 방식) 브라우저 보안 정책 때문에 목록이 비어 보입니다.
아래처럼 간이 서버로 열어야 정상 동작합니다.

```bash
cd packersTracher
python3 -m http.server 8000
```
그다음 브라우저에서 `http://localhost:8000` 접속.

(VS Code를 쓰신다면 "Live Server" 확장으로 열어도 동일하게 동작합니다.)

## GitHub 저장소 연결 & GitHub Pages 배포

이 폴더가 아직 git 저장소가 아니라면:

```bash
cd packersTracher
git init
git add .
git commit -m "패커스 브리핑 트래커 초기 커밋"
git branch -M main
git remote add origin https://github.com/<깃허브아이디>/packersTracher.git
git push -u origin main
```

이미 GitHub에 저장소를 만들어 두셨다면 `git remote add origin ...` 대신 해당 주소를 쓰시면 됩니다.

배포는 GitHub 저장소의 **Settings → Pages** 에서:
- Source: `Deploy from a branch`
- Branch: `main` / `/ (root)`
- Save

몇 분 후 `https://<깃허브아이디>.github.io/packersTracher/` 에서 확인할 수 있습니다.

## 뉴스 가져오기 버튼 설정 (Vercel Functions)

사이트의 "📰 최신 뉴스 가져오기" 버튼은 정적 사이트인 GitHub Pages가 직접 처리할 수 없어서,
별도의 백엔드(Vercel Functions, `api/fetch-news.js`)가 필요합니다. 아래는 **직접** 하셔야
하는 설정입니다 — API 키는 제가 절대 보거나 다루지 않습니다.

### 1. Vercel 프로젝트 생성

1. [vercel.com](https://vercel.com) 에서 GitHub 계정으로 로그인합니다.
2. "Add New… → Project"에서 `kim-misol/packersTracher` 저장소를 import합니다.
3. Framework Preset은 "Other"로 두면 됩니다(별도 빌드 없이 `api/` 폴더가 자동으로
   서버리스 함수로 인식됩니다).

### 2. 환경변수 설정 (Vercel 프로젝트 → Settings → Environment Variables)

| 이름 | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API 키. [console.anthropic.com](https://console.anthropic.com)에서 발급 |
| `GITHUB_TOKEN` | `kim-misol/packersTracher`에 대해 **Contents: Read and write** 권한을 가진 GitHub Personal Access Token (Fine-grained PAT 권장) |
| `ALLOWED_ORIGIN` | (선택) 기본값 `https://kim-misol.github.io` — CORS 허용 출처 |
| `GITHUB_OWNER` | (선택) 기본값 `kim-misol` |
| `GITHUB_REPO` | (선택) 기본값 `packersTracher` |

두 값 모두 이 환경변수 화면에만 입력하시면 됩니다. 채팅에는 절대 붙여넣지 마세요.

### 3. 배포 후 URL을 `index.html`에 연결

배포가 끝나면 Vercel이 `https://<프로젝트명>.vercel.app` 형태의 주소를 줍니다. 그 주소를
`index.html`에서 `NEWS_API_URL` 상수 값으로 바꿔주세요 (파일 안에 `TODO` 주석으로
표시되어 있습니다). 이 부분은 알려주시면 제가 반영해드릴게요.

### 동작 방식 요약

버튼을 누르면 `api/fetch-news.js`가: `data/index.json`에서 가장 최근 저장된 날짜 확인 →
packers.com/news/all-news에서 새 기사 목록을 Claude로 추출 → 그 날짜 이후의 새 기사만
필터링 → 같은 날짜 기사는 하나로 묶어서 Claude가 영어로 먼저 정리 후 한국어로 번역 →
사이트 스키마에 맞게 검증 → `data/<날짜>.json`과 `data/index.json`을 GitHub에 직접 커밋합니다.
완료되면 GitHub Actions가 평소처럼 데이터 무결성을 검사하고 GitHub Pages에 배포합니다.

## 앞으로 파일이 아주 많아지면

지금 구조로도 수백 개의 날짜까지는 문제없이 가볍게 동작합니다. 만약 나중에 시즌이 여러 번
쌓여 데이터가 수천 개 단위로 커지면, `data/index.json`을 연도별로 쪼개거나(`data/index-2026.json`)
사이드바에 연도 선택 탭을 추가하는 정도로 확장하면 됩니다 — 그때 다시 말씀해 주시면
같은 원칙으로 확장해드릴게요.
