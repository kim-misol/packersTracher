# 그린베이 패커스 브리핑 트래커

날짜별 브리핑이 아무리 쌓여도 가볍게 유지되도록, 데이터와 화면을 분리한 구조로 만들었습니다.

```
packersTracher/
├── index.html          # 화면 전체 (검색/필터 사이드바 + 상세 뷰)
├── data/
│   ├── index.json       # 모든 날짜의 "가벼운 요약" 목록 (날짜, 헤드라인, 태그, 개수)
│   └── 2026-08-15.json  # 그 날짜의 전체 상세 데이터 (스토리·부상·로스터무브·일정)
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

앞으로 브리핑을 채팅에 붙여넣어 주시면 제가 매번 두 가지를 만들어드릴게요.

1. `data/YYYY-MM-DD.json` — 그날의 스토리·부상현황·로스터무브·일정 (신규 파일)
2. `data/index.json` — 맨 앞에 그날 요약 한 줄을 추가한 새 버전 (기존 파일 덮어쓰기)

이 두 파일만 저장소에 반영(커밋)하면 사이트가 자동으로 인식합니다. 매번 `index.html`을
다시 만질 필요는 없습니다.

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

## 앞으로 파일이 아주 많아지면

지금 구조로도 수백 개의 날짜까지는 문제없이 가볍게 동작합니다. 만약 나중에 시즌이 여러 번
쌓여 데이터가 수천 개 단위로 커지면, `data/index.json`을 연도별로 쪼개거나(`data/index-2026.json`)
사이드바에 연도 선택 탭을 추가하는 정도로 확장하면 됩니다 — 그때 다시 말씀해 주시면
같은 원칙으로 확장해드릴게요.
