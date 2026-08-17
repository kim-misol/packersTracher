# =============================================================================
# PackersTracker — Makefile
# 사용법: make <target>
# =============================================================================

.PHONY: help preview validate build deploy clean test format

# 기본 타깃: 도움말 출력
help:
	@echo ""
	@echo "  PackersTracker Makefile"
	@echo ""
	@echo "  make preview     로컬 미리보기 서버 실행 (http://localhost:8000)"
	@echo "  make validate    data/ 무결성 검사 (index.json ↔ 날짜별 상세 파일)"
	@echo "  make test        뉴스 가져오기 API(api/) 단위 테스트 실행"
	@echo "  make format      api/·tests/ JS 파일 및 package.json 포맷 정리 (prettier)"
	@echo "  make build       validate + test 통과 여부 확인 (정적 사이트라 별도 빌드 없음)"
	@echo "  make deploy      main에 푸시 → GitHub Actions가 검사 후 자동 배포"
	@echo "  make clean       임시 파일 정리"
	@echo ""
# =============================================================================
# 로컬 미리보기
# =============================================================================

preview:
	python3 -m http.server 8000

# =============================================================================
# 검증 & 테스트 & 배포
# =============================================================================

validate:
	node scripts/validate-data.js

test:
	npm test

format:
	npx prettier --write "api/**/*.js" "tests/**/*.js" "package.json"

build: validate test
	@echo "✅ 정적 사이트 — 별도 빌드 산출물 없음. validate/test 통과 시 배포 가능."

deploy: validate
	git push origin main
	@echo "✅ main에 푸시 완료 — GitHub Actions가 배포를 진행합니다."
	@echo "   진행 상황: https://github.com/kim-misol/packersTracher/actions"

# =============================================================================
# 기타
# =============================================================================

clean:
	rm -f *.bak
