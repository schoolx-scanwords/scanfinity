'use client';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';

  const key = 'scanfinity_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
    localStorage.setItem(key, id);
  }
  return id;
}
