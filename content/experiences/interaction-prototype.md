---
title: AI로 PPT '잘' 만들기
category: build
# 타임라인 배치용 근사 날짜: 2026년 6월 후반부터 8월 초. 화면에는 월만 표시합니다.
startDate: '2026-06-21'
endDate: '2026-08-07'
status: draft
---

## 목적

AX 해커톤에서 PPT 제작 워크플로우로 수상한 뒤에도, AI로 만든 발표자료의 배치와 수정 과정이 아쉬웠습니다. AI와 여러 번 고쳐도 전체 디자인을 일관되게 유지할 방법을 찾고자 했습니다.

## 의도

발표자료를 한 번 생성하는 것보다, 내용이 바뀔 때 쉽게 고칠 수 있는 구조에 집중했습니다.

**Technical Decision**

이번 제작에서는 요소별 좌표를 지정하는 PPTX 생성 방식 대신 HTML·CSS의 Flex·Grid를 선택했습니다. 요소 간 배치 관계를 정해 두면 내용 길이가 달라져도 겹침을 줄이고, 공통 스타일로 여러 슬라이드를 함께 수정하기 쉬웠기 때문입니다.

**PDF에서도 같은 화면을 보여주려면**

애니메이션을 끄기만 하면 일부 요소가 보이지 않거나 원래 위치에 남는 문제가 있었습니다. 폰트·이미지 로딩과 애니메이션의 최종 상태를 확인한 뒤, Playwright로 슬라이드를 캡처해 PDF로 만들었습니다.

텍스트 선택·검색이 제한되는 대신, 발표 화면의 모양을 그대로 전달하는 데 우선순위를 뒀습니다.

## 성과

다음 발표자료에도 같은 과정을 적용할 수 있도록 기획·제작·검수·PDF 출력을 AI 제작 스킬로 정리했습니다. [PDF 출력 사례와 실제 코드 발췌 보기](https://github.com/swaan-kim/fe-application-timeline/blob/main/docs/evidence/ppt-export-decision.md)

![슬라이드 전환 시연](/media/experiences/interaction-prototype/slide-demo.gif)

![학습 데이터 설명 슬라이드](/media/experiences/interaction-prototype/training-data.png)

![제품 화면 설명 슬라이드](/media/experiences/interaction-prototype/product-history.png)
