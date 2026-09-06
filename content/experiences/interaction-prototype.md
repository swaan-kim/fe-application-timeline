---
title: AI로 PPT '잘' 만들기
category: build
# 타임라인 배치용 근사 날짜: 2026년 6월 후반부터 8월 초. 화면에는 월만 표시합니다.
startDate: '2026-06-21'
endDate: '2026-08-07'
status: draft
---

## 목적

AX 해커톤에서 PPT 제작 워크플로우로 수상한 뒤, ‘AI는 왜 발표자료를 기대만큼 만들지 못할까?’라는 궁금증에서 제작 방식을 다시 탐구했습니다.

## 의도

AI와 반복 수정해도 배치가 흐트러지지 않고, 전체 디자인을 일관되게 바꿀 수 있는 제작 방식을 고민했습니다.

**Technical Decision**

좌표를 개별 지정하는 PPTX 생성 대신 HTML·CSS의 Flex·Grid로 요소 간 배치 관계를 정의했습니다. 내용 길이가 달라져도 글자 겹침을 줄이고, AI가 구조를 바탕으로 레이아웃을 수정하기 쉽도록 선택했습니다.

**사례 · PDF에서도 최종 화면 유지**

애니메이션을 단순히 끄면 초기 투명도·위치가 남아 요소가 누락되는 출력 문제를 다뤘습니다. prepareForExport()로 최종 상태와 폰트·이미지 로딩을 확정한 뒤 Playwright로 캡처해 PDF를 만들도록 구성했습니다.

이미지형 PDF는 텍스트 선택·검색이 제한되지만, 발표 화면의 시각적 일관성을 우선한 선택입니다.

## 성과

기획·제작·검수·PDF 출력 과정을 재사용 가능한 AI 발표자료 제작 스킬로 정리했습니다. [PDF 출력 사례와 실제 코드 발췌 보기](https://github.com/swaan-kim/fe-application-timeline/blob/main/docs/evidence/ppt-export-decision.md)

![슬라이드 전환 시연](/media/experiences/interaction-prototype/slide-demo.gif)

![학습 데이터 설명 슬라이드](/media/experiences/interaction-prototype/training-data.png)

![제품 화면 설명 슬라이드](/media/experiences/interaction-prototype/product-history.png)
