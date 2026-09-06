# HTML 발표자료 — PDF 출력 상태를 명시적으로 준비한 이유

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
