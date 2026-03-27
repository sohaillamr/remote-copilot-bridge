import { describe, it, expect } from 'vitest';
import { trackEvent } from '../lib/analytics';

describe('Analytics test', () => {
  it('should not throw', () => {
    expect(() => trackEvent('test')).not.toThrow();
  });
});