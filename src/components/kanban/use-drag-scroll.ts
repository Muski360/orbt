"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

export function useDragScroll(reducedMotion: boolean | null) {
  const ref = useRef<HTMLDivElement>(null);
  const pan = useRef<{ x: number; scrollLeft: number } | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const viewport = ref.current;
    if (!viewport) return;

    function updateEdges() {
      if (!viewport) return;
      setEdges({
        left: viewport.scrollLeft > 1,
        right:
          viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1,
      });
    }

    const observer = new ResizeObserver(updateEdges);
    observer.observe(viewport);
    viewport.addEventListener("scroll", updateEdges, { passive: true });
    updateEdges();

    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", updateEdges);
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button, select, [data-task]")
    )
      return;

    pan.current = {
      x: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.panning = "true";
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pan.current) return;
    event.currentTarget.scrollLeft =
      pan.current.scrollLeft + pan.current.x - event.clientX;
  }

  function endPan(event: PointerEvent<HTMLDivElement>) {
    pan.current = null;
    delete event.currentTarget.dataset.panning;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function scroll(direction: number) {
    ref.current?.scrollBy({
      left: direction * 256,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  return {
    ref,
    edges,
    scroll,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
      onLostPointerCapture: endPan,
    },
  };
}
