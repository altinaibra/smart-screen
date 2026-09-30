import { useEffect, useState } from 'react';
import type { Branding } from './types';

/** Emri, logo dhe ngjyrat e biznesit nga databaza (GET /api/branding), të ndara mes komponentëve. */
let current: Branding | null = null;
const listeners = new Set<(b: Branding | null) => void>();

export async function refreshBranding() {
  try {
    const res = await fetch('/api/branding');
    if (!res.ok) return;
    current = await res.json();
    if (current?.businessName) document.title = current.businessName;
    listeners.forEach(l => l(current));
  } catch { /* serveri offline */ }
}

export function useBranding() {
  const [b, setB] = useState(current);
  useEffect(() => {
    listeners.add(setB);
    if (!current) refreshBranding();
    return () => { listeners.delete(setB); };
  }, []);
  return b;
}
