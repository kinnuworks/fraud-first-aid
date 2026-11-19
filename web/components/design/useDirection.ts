'use client';
// Which design direction is showing while light directions are compared (?direction=b|d|e|f).
// No parameter shows the applied design.
import { useEffect, useState } from 'react';

export type Direction = 'c' | 'b' | 'd' | 'e' | 'f';

export function useDirection(): Direction {
  const [d, setD] = useState<Direction>('c');
  useEffect(() => {
    const v = document.documentElement.dataset.direction;
    if (v === 'b' || v === 'd' || v === 'e' || v === 'f') setD(v);
  }, []);
  return d;
}
