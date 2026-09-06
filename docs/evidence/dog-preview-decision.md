# 옆집 강아지 — 꾸미는 동안 결과를 놓치지 않는 미리보기

## 문제와 선택

모바일에서 귀·털색·소품 옵션을 내려 보다가 결과를 확인하려고 다시 위로 올라가야 하는 흐름을 줄이고자 했습니다. 큰 미리보기가 뷰포트를 벗어나면 작은 상단 고정 미리보기를 보여줍니다. 새 입력 모달을 여는 방식이 아니라, 같은 외형 상태를 보여 주는 읽기 전용 미리보기입니다.

## 실제 코드 발췌

`src/components/UploadPetPreview.tsx`의 전환 감지 부분입니다. 미리보기 뒤의 기준 요소(sentinel)가 화면 상단을 지났는지 확인합니다.

```tsx
useEffect(() => {
  const update = () => {
    const sentinel = sentinelRef.current;
    if (sentinel) setCompact(sentinel.getBoundingClientRect().bottom <= 4);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  return () => {
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
  };
}, []);
```

큰 미리보기와 작은 미리보기는 같은 `traits`, `style`, `accessory` props를 `PetArtwork`에 전달합니다. 스크롤 상태만 따로 관리하므로, 귀·털색·소품을 바꾸면 두 미리보기에 같은 결과가 반영됩니다. 기준 요소가 다시 보이면 작은 미리보기를 제거합니다.

`src/styles.css`에서 발췌한 위치·입력 관련 속성입니다. 장식 속성은 생략했습니다.

```css
.upload-pet-preview-compact {
  position: fixed;
  top: max(8px, calc(var(--ait-safe-top) + 8px));
  left: 50%;
  transform: translateX(-50%);
  width: min(calc(100vw - var(--ait-safe-left) - var(--ait-safe-right) - 32px), 608px);
  height: 92px;
  pointer-events: none;
}
```

뷰포트와 토스 safe area를 기준으로 폭·상단 위치를 계산합니다. 고정 미리보기는 `pointer-events: none`으로 뒤쪽 옵션의 터치를 가로채지 않으며, 중복 표현이므로 `aria-hidden`을 적용합니다. 다만 입력을 막지 않는 것과 시각적으로 가리지 않는 것은 다른 문제이므로, 실제 기기의 좁은 화면에서 겹침 여부를 별도로 확인해야 합니다.

## 저장소의 회귀 테스트

`src/components/UploadPetPreview.test.tsx`는 기준 요소 위치를 바꾸고 scroll 이벤트를 보내 고정 미리보기의 표시·해제를 확인합니다. 그 사이 소품 props를 리본에서 공으로 바꿔, 작은 미리보기에도 새 소품과 색상이 반영되는지 확인합니다.

이는 컴포넌트 상태와 동작을 검사하는 테스트이며 실제 기기의 safe area나 터치 사용성을 모두 검증한 결과는 아닙니다.

확인한 원본: `cute-enough`, 리비전 `a20041e5334bc8d57e41a18d72388f62b56f754b` (2026-09-07). 원본 저장소는 비공개로 유지하고, 이 문서에는 해당 사례의 코드 일부와 확인한 테스트 내용을 공개했습니다. 이번 지원서 수정에서 원본 앱의 테스트를 새로 실행한 것은 아닙니다.
