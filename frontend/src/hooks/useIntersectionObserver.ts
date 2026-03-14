"use client";

import { useEffect, useState, useRef } from "react";

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = "0px",
  triggerOnce = false,
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIntersecting] = useState(false);
  const ref = useRef<Element | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && triggerOnce) {
          observer.unobserve(element);
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);
    return () => {
      observer.unobserve(element);
    };
  }, [threshold, root, rootMargin, triggerOnce]);

  const setRef = (node: Element | null) => {
    if (ref.current !== node) {
      ref.current = node;
    }
  };

  return { isIntersecting, ref: setRef };
}
