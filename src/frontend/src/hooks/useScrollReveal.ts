import { useEffect, useRef } from "react";

export function useScrollReveal(staggerChildren = false) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (staggerChildren) {
      const children = Array.from(el.children) as HTMLElement[];
      for (const child of children) {
        child.classList.add("scroll-reveal");
      }
    } else {
      el.classList.add("scroll-reveal");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (staggerChildren) {
              const children = Array.from(el.children) as HTMLElement[];
              children.forEach((child, i) => {
                setTimeout(() => child.classList.add("revealed"), i * 100);
              });
            } else {
              el.classList.add("revealed");
            }
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [staggerChildren]);

  return ref;
}
