# Security & Error Handling Issues

> Identified during code review on December 2024. Address these before production release.

---

## HIGH Priority

### 1. Empty Focusable Elements Array - Undefined Behavior

**File:** `components/layout/navigation/MobileDrawer.tsx:60-67`

**Issue:** Focus trap assumes focusable elements exist. If drawer renders without any (edge case during auth loading), accessing undefined indices silently breaks keyboard navigation.

**Fix:**

```typescript
const focusableElements = getFocusableElements(drawerRef.current);

if (focusableElements.length === 0) {
  console.warn('MobileDrawer: No focusable elements found');
  drawerRef.current.tabIndex = -1;
  drawerRef.current.focus();
  return;
}
```

---

### 2. SSR/Hydration Mismatch with useIsDesktop

**File:** `hooks/useBreakpoint.ts:189-192`

**Issue:** `useIsDesktop()` returns `false` during SSR (width=0), but `true` on desktop client. Causes hydration mismatch.

**Fix:** Add mounted state or document that hook should only be used in client-only components.

```typescript
export function useIsDesktop(): boolean {
  const [mounted, setMounted] = useState(false);
  const { isAbove } = useBreakpoint();

  useEffect(() => setMounted(true), []);

  if (!mounted) return false; // Consistent SSR value
  return isAbove('lg');
}
```

---

## MEDIUM Priority

### 3. SSR Returns 0 Width Without Indication

**File:** `hooks/useBreakpoint.ts:74-77`

**Issue:** `getWindowWidth()` silently returns 0 during SSR. Components can't distinguish "SSR" from "very narrow viewport."

**Recommendation:** Add `isSSR: boolean` to BreakpointState interface.

---

### 4. Missing Escape Key Handler

**File:** `components/layout/navigation/MobileDrawer.tsx:69-97`

**Issue:** Focus trap handles Tab but not Escape. WCAG requires modal dialogs to close on Escape.

**Fix:**

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    return;
  }
  // ... existing Tab handling
};
```

---

### 5. Focus Restoration May Fail Silently

**File:** `components/layout/navigation/MobileDrawer.tsx:92-95`

**Issue:** Focus restoration calls `.focus()` without checking if element still exists in DOM or is focusable.

**Fix:**

```typescript
if (previousElement && document.body.contains(previousElement)) {
  previousElement.focus();
} else {
  document.body.focus(); // Fallback
}
```

---

### 6. Division by Zero in Progress Bar

**File:** `components/layout/navigation/MobileDrawer.tsx:189-191`

**Issue:** `limits.total.used / limits.total.limit` can be `Infinity` or `NaN` if limit is 0.

**Fix:**

```typescript
const percentage = limits.total.limit > 0 ? (limits.total.used / limits.total.limit) * 100 : 0;
```

---

### 7. Silent Fallback in Show/Hide Components

**File:** `lib/design/responsive.tsx:119-128`

**Issue:** `<Show>` without `above` or `below` prop renders children unconditionally without warning.

**Recommendation:** Add dev-only warning for likely unintended usage.

---

## LOW Priority

### 8. No Error Boundary for Drawer Content

**File:** `components/layout/navigation/MobileDrawer.tsx`

**Issue:** If child components throw, drawer crashes and scroll lock may not be cleaned up.

**Recommendation:** Consider wrapping error-prone sections with error boundary.

---

### 9. matchMedia Browser Compatibility

**File:** `hooks/useBreakpoint.ts:210-234`

**Issue:** No feature detection for `matchMedia` on very old browsers.

**Recommendation:** Add fallback for legacy browsers if needed.

---

## Type Design Recommendations

### ShowHideProps - Consider Discriminated Union

```typescript
type ShowHideProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
} & (
  | { above: Breakpoint; below?: never }
  | { below: Breakpoint; above?: never }
  | { above: Breakpoint; below: Breakpoint }
);
```

This would prevent the "neither provided" case at compile time.

---

## Status

| #   | Issue                  | Severity | Status |
| --- | ---------------------- | -------- | ------ |
| 1   | Empty focusable array  | HIGH     | TODO   |
| 2   | SSR/hydration mismatch | HIGH     | TODO   |
| 3   | SSR width indication   | MEDIUM   | TODO   |
| 4   | Escape key handler     | MEDIUM   | TODO   |
| 5   | Focus restoration      | MEDIUM   | TODO   |
| 6   | Division by zero       | MEDIUM   | TODO   |
| 7   | Silent fallback        | MEDIUM   | TODO   |
| 8   | Error boundary         | LOW      | TODO   |
| 9   | matchMedia compat      | LOW      | TODO   |
