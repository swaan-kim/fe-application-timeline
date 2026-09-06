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

팀 리드를 맡아 공시 근거에 기반한 답변 흐름을 설계하고, 유형별 골든셋으로 답변 품질을 일관되게 검증하고자 했습니다.

**Technical Decision**

계산과 검증까지 AI의 생성 결과에 맡기지 않도록, 근거 선택·설명은 AI가, 검증·계산·답변 조립은 코드가 담당하게 분리했습니다. 단계별로 오류를 추적하고 같은 규칙으로 재검증할 수 있도록 한 선택입니다.

![공시 AI 에이전트 · 파이프라인 아키텍처](/media/experiences/product-team-collaboration/architecture.png)

## 성과

24개 유형별 골든셋으로 검증한 AI 에이전트 챗봇을 구축하고, 반복 적용할 수 있는 QA 기준과 절차를 정립했습니다.

![공시 AI Agent 프로젝트 개요와 설계 문서](/media/experiences/product-team-collaboration/project-overview.png)
