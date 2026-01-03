import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  /** Threshold for intersection (0-1). Default: 0.1 */
  threshold?: number;
  /** Root margin for earlier triggering. Default: '100px' */
  rootMargin?: string;
  /** Only trigger once. Default: false */
  triggerOnce?: boolean;
}

interface UseIntersectionObserverReturn {
  /** Ref to attach to the target element */
  ref: React.RefObject<HTMLDivElement | null>;
  /** Whether the element is currently intersecting */
  isIntersecting: boolean;
}

/**
 * Hook for detecting when an element enters the viewport
 * Used for infinite scroll and lazy loading
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const { threshold = 0.1, rootMargin = '100px', triggerOnce = false } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);

  const handleIntersection = useCallback(
    ([entry]: IntersectionObserverEntry[]) => {
      if (triggerOnce && hasTriggered.current) return;

      if (entry.isIntersecting) {
        setIsIntersecting(true);
        if (triggerOnce) {
          hasTriggered.current = true;
        }
      } else {
        setIsIntersecting(false);
      }
    },
    [triggerOnce]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, handleIntersection]);

  return { ref, isIntersecting };
}
