# FE Application Timeline

경험을 시간과 분류로 훑고, 필요한 경험의 목적·의도·성과를 읽는 프론트엔드 지원서입니다.

[지원서 보기](https://fe-application-timeline.vercel.app/) · [검사 결과](https://github.com/swaan-kim/fe-application-timeline/actions/workflows/ci.yml)

## 읽는 사람을 위한 구성

- **빠르게 훑기:** 데스크톱에서는 타임라인, 모바일에서는 Build / Work / Grow 목록으로 경험을 보여줍니다.
- **필요한 경험 읽기:** 제목을 누르면 독립된 상세 페이지에서 판단과 결과, 관련 자료를 확인할 수 있습니다.
- **이어서 탐색하기:** 상세에서 돌아오면 읽던 행으로 포커스를 복원하고, 다음 경험으로 바로 이동할 수 있습니다.

카드나 자동재생 대신 문서의 여백과 읽기 순서에 집중했습니다. 본문과 기술 이름은 텍스트로 제공하며, 색상이나 로고에만 정보를 의존하지 않습니다. 홈에는 별도 GitHub 링크를 두지 않고 각 상세에서 관련 코드와 자료를 연결합니다.

## 구현에서 선택한 것

- **콘텐츠와 화면 분리:** 경험별 Markdown을 원본으로 사용하고, 빌드 전에 형식과 공개 범위를 검증합니다.
- **규칙을 순수 함수로 관리:** 날짜 계산과 기간 겹침 배치를 UI에서 분리해 경계값과 변경 영향을 테스트합니다.
- **탐색 흐름 유지:** 상세 화면과 Markdown 렌더러를 지연 로딩하고, 직접 접근·뒤로가기·키보드 이동을 함께 다룹니다.

React · TypeScript · Vite · CSS Modules를 사용합니다. 전역 상태관리, 별도 라우터, 차트 라이브러리는 추가하지 않았습니다.

```text
content/experiences/   경험별 Markdown
build/                콘텐츠 검증과 빌드 로더
src/domain/           날짜·배치·공개 규칙
src/features/         타임라인과 상세 화면
scripts/              콘텐츠 검사와 Notion 가져오기
e2e/                  브라우저 사용 흐름 검사
docs/                 구현 판단과 편집·검증 안내
```

## 실행

Node.js 24를 기준으로 합니다.

```bash
npm ci
npm run dev
npm run check
npm run build
```

브라우저 테스트의 설치·실행 방법과 검사 범위는 [검증 안내](docs/verification.md)에 정리했습니다.

## 더 살펴보기

- [구조와 구현 판단](docs/architecture.md)
- [콘텐츠 편집](docs/content-guide.md) · [Notion 연결](docs/notion-template.md)
- [검증 안내](docs/verification.md) · [배포 안내](docs/deployment.md)
- [옆집 강아지: 미리보기 전환 코드와 회귀 테스트](docs/evidence/dog-preview-decision.md)
- [HTML 발표자료: PDF 출력 상태와 제약](docs/evidence/ppt-export-decision.md)

이 저장소의 테스트는 지원서 웹사이트를 대상으로 합니다. 경험에 소개한 다른 프로젝트의 구현·검증 근거는 각 상세 페이지와 evidence 문서에서 구분해 설명합니다.
