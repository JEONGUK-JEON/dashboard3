# GitHub Pages 배포용 매출 분석 대시보드

## 포함 파일
- `index.html`
- `styles.css`
- `script.js`
- `data.json`

## 배포 방법
1. 이 압축을 해제합니다.
2. GitHub 저장소를 생성하거나 기존 저장소를 엽니다.
3. 위 4개 파일을 저장소 루트에 업로드합니다.
4. GitHub 저장소의 `Settings > Pages`에서 배포 소스를 `main` 브랜치의 `/ (root)`로 지정합니다.
5. 배포 후 `https://사용자명.github.io/저장소명/`으로 접속합니다.

## 비밀번호
- `buhmwoo2026`

## 월간 업데이트
- `data.json`의 월별 매출 데이터만 교체하면 화면이 자동 반영됩니다.
- 기준월은 `data.json`의 마지막 월(`latestMonth`)을 따릅니다.

## 참고
- 현재 화면은 정적 웹 대시보드입니다.
- 민감한 실데이터를 공개 저장소에 그대로 업로드하는 방식은 권장하지 않습니다.
