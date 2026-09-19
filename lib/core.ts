import { createHash } from 'node:crypto';

export type Flag = { key: string; enabled: boolean; rollout: number; salt: string; version: number };

export function validateKey(key: string): boolean {
  return /^[a-z][a-z0-9_-]{2,63}$/.test(key);
}

export function validateRollout(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

export function evaluate(flag: Flag, subject: string): { enabled: boolean; bucket: number; reason: string } {
  if (!flag.enabled) return { enabled: false, bucket: -1, reason: 'disabled' };
  const digest = createHash('sha256').update(`${flag.salt}:${flag.key}:${subject}`).digest();
  const bucket = digest.readUInt32BE(0) % 10000;
  return { enabled: bucket < flag.rollout * 100, bucket, reason: 'rollout' };
}
