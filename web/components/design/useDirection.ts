'use client';
// Which design direction is showing while light directions are compared (?direction=b|g|h|i).
// No parameter shows the applied design.
import { useEffect, useState } from 'react';

export type Direction = 'c' | 'b' | 'g' | 'h' | 'i';

export function useDirection(): Direction {
  const [d, setD] = useState<Direction>('c');
  useEffect(() => {
    const v = document.documentElement.dataset.direction;
    if (v === 'b' || v === 'g' || v === 'h' || v === 'i') setD(v);
  }, []);
  return d;
}
