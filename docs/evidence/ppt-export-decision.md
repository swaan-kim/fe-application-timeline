# HTML 발표자료 — 배치 규칙과 PDF 출력 상태를 분리한 이유

## 제목 겹침에서 확인한 문제와 분석 범위

지원서에 첨부한 기존 슬라이드는 두 줄 카드 제목과 본문 첫 줄이 겹칩니다. 일반적으로 텍스트 상자의 높이 또는 본문 시작 위치를 고정하면, 줄바꿈으로 늘어난 제목 높이가 다음 요소의 위치에 반영되지 않아 이런 문제가 생길 수 있습니다. 다만 해당 캡처의 원본 파일·배치 코드는 확보하지 않았으므로, 그 이미지가 PPTX인지 HTML인지 또는 어떤 속성이 원인인지는 단정하지 않습니다.

HTML 선택의 이유는 PPTX가 원천적으로 겹침을 해결할 수 없어서가 아닙니다. 요소별 좌표를 직접 관리하는 생성 방식보다, AI가 수정할 콘텐츠와 공통 배치 규칙을 분리하고 브라우저에서 결과를 검사하기에 적합했기 때문입니다.

## FE와 AI 수정 관점의 실제 구조

- `content/*.js`: 제목·본문과 사용할 레이아웃 종류를 슬라이드 데이터로 관리합니다.
- `runtime.js`의 `renderBody(slide)`: 데이터의 `layout`에 따라 공통 HTML 구조를 만듭니다. 문구 수정과 마크업 수정을 분리할 수 있습니다.
- `theme.css`: Grid로 카드 열을 나누고, 카드 내부는 세로 Flex와 여백으로 제목·본문을 배치합니다. 공통 CSS와 변수를 수정하면 같은 규칙을 사용하는 슬라이드에 함께 적용됩니다.

아래는 `assets/templates/pitch-deck/theme.css`의 배치 관련 선언만 발췌한 코드입니다. 색·테두리 등 시각적 선언은 생략했습니다. 첨부 이미지의 수정 전후 코드가 아니라, 재사용 템플릿의 실제 구현 근거입니다.

```css
.contrast-grid {
  position: absolute;
  left: 84px;
  right: 84px;
  top: 350px;
  bottom: 100px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}
.contrast-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 52px;
}
.contrast-card strong {
  margin-top: 32px;
  font-size: 49px;
  line-height: 1.05;
}
.contrast-card p {
  margin-top: 24px;
  font-size: 22px;
}
```

슬라이드의 큰 영역에는 여전히 절대 위치와 고정 크기를 사용합니다. 내부를 Flex/Grid로 배치해도 임의 길이의 문구가 항상 들어가는 것은 아닙니다. `inspect_artifact.mjs`는 지정된 `[data-qa-fit]` 요소의 경계를 페이지와 비교하고, 텍스트의 스크롤 크기와 박스 크기로 잘림을 검사합니다. 모든 요소 사이의 겹침을 탐지하는 검사는 아니므로 캡처 확인도 필요합니다.

배치 모델의 일반 원리는 [MDN Flexbox 가이드](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts)를 참고할 수 있습니다. 개인 프로젝트의 구현 근거는 위 코드와 아래에 명시한 원본 리비전입니다.

## 문제와 선택

HTML 발표자료에서 애니메이션을 단순히 끄면 초기 CSS의 투명도·위치가 남아, PDF에서 요소가 보이지 않거나 잘못 배치될 수 있습니다. 원본 저장소의 README와 실패 진단 문서에 기록된 출력 문제입니다.

개별 요소를 인쇄용 CSS로 계속 보정하는 대신, 브라우저가 캡처해도 되는 최종 상태를 `prepareForExport()`로 명시했습니다. HTML·CSS의 Flex/Grid 레이아웃은 유지하고, 화면 상태를 준비하는 단계와 PDF 조립 단계를 분리했습니다.

최종 화면 준비 → Playwright 페이지별 캡처 → 이미지형 PDF 생성·재렌더링 비교

## 실제 구현 발췌

아래 코드는 `html-pitch-artifacts`의 `assets/templates/pitch-deck/runtime.js`에서 발췌했습니다. 원본 전체 저장소의 접근 권한은 변경하지 않고, 이 사례와 관련된 함수만 공개합니다.

```js
window.prepareForExport = async function prepareForExport() {
  document.documentElement.dataset.artifactExport = 'true';
  pages.forEach((page) => page.classList.add('is-export-ready'));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  for (const animation of document.getAnimations()) {
    const iterations = animation.effect?.getTiming?.().iterations;
    if (Number.isFinite(iterations)) {
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    } else animation.cancel();
  }
  await document.fonts.ready;
  await Promise.all([...document.images].map((image) => image.decode?.().catch(() => {})));
};
```

- 각 페이지에 출력 준비 클래스를 적용하고 두 프레임 뒤 애니메이션을 정리합니다. 유한 애니메이션은 완료하고, 무한 애니메이션은 취소합니다. 취소만으로 최종 모습이 보장되는 것은 아니므로 출력 클래스의 스타일과 함께 처리합니다.
- 폰트 로딩·이미지 디코딩을 기다린 뒤 캡처합니다. 이미지 디코딩 오류를 여기서 잡는 것만으로 검증을 끝내지는 않습니다.
- `scripts/inspect_artifact.mjs`에서 필수 폰트, 이미지, 진행 중인 애니메이션과 넘침 등을 검사하고, `scripts/export_fidelity_pdf.mjs`는 사전 검사 오류가 있으면 출력을 중단합니다.
- 통과한 HTML 페이지를 Playwright로 캡처해 이미지형 PDF로 조립하고, `scripts/verify_pdf.py`로 PDF를 다시 이미지화해 원본 캡처와 비교하는 절차를 구성했습니다.

## 제약과 근거 범위

이미지형 PDF는 글자를 선택·검색하기 어렵고, 텍스트 기반 접근성 및 편집 가능성이 낮아집니다. 이 출력 경로는 최종 발표 화면의 시각적 일관성을 우선한 선택이며 모든 문서에 적합한 방식은 아닙니다.

확인한 원본 리비전: `842afc6c8faf9904cccfbd21ae25dcd029bf74bd` (2026-09-07). 코드의 서식만 정리했으며 로직은 동일합니다. 이 문서는 구현과 저장소에 기록된 문제를 설명합니다. 수정 전후 비교 이미지나 이번 작업에서 새로 실행한 PDF 검증 결과를 제시하는 것은 아닙니다.
