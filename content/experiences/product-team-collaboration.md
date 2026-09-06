---
title: 미래에셋 챗봇
category: work
# 2026년 8월부터 진행 중. endDate는 종료일이 아닌 현재 타임라인 표시 기준일입니다.
startDate: '2026-08-01'
endDate: '2026-09-03'
ongoing: true
status: draft
---

## 목적

[미래에셋증권 AI Festival](https://miraeassetfesta.com/)에 참가해, 공시를 근거로 답변하는 챗봇 제작에 참여했습니다.

## 의도

팀 리드를 맡아, AI의 근거 선택·설명과 코드의 검증·계산을 분리하는 파이프라인을 설계했습니다. API 응답만으로는 팀원이 오류를 찾고 공유하기 어려워, 질문 입력부터 답변·공시 근거 확인까지 이어지는 웹 QA 화면을 구현했습니다.

**Technical Decision**

답변·AI가 해석한 조건·사용 공시는 먼저 보여주고, 검색·계산·한계는 펼쳐 보는 구조로 분리했습니다. 빠른 답변 확인과 상세한 오류 검증을 한 화면에서 이어갈 수 있도록 한 선택입니다.

실행 중에는 중복 요청을 막고, 응답 상태·시간·빌드 정보를 함께 표시했습니다. 질문과 근거, 잘못된 값·단위·기간을 QA 이슈 양식으로 묶어, ‘답변이 이상하다’는 피드백을 재현 가능한 기록으로 남기도록 했습니다.

![공시 AI 에이전트 · 파이프라인 아키텍처](/media/experiences/product-team-collaboration/architecture.png)

## 성과

공시 챗봇과 웹 QA 화면을 구축하고, 24개 질문 유형별 골든셋을 기준으로 검증·오류 기록·재확인의 QA 절차를 정립했습니다. 골든셋으로 기준을 맞추고, 팀원의 자유 질문으로 예외 사례를 찾는 검증 흐름을 마련했습니다.

[웹 QA 화면 보기](http://101.79.16.190/team-test)

![공시 AI Agent 프로젝트 개요와 설계 문서](/media/experiences/product-team-collaboration/project-overview.png)
