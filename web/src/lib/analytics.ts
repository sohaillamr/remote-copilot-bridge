export function trackEvent(eventName: string, props?: Record<string, any>) {
  if (import.meta.env.DEV) {
    console.log('[Analytics]', eventName, props);
  } else {
    try {
      if (typeof window !== 'undefined' && (window as any).plausible) {
        (window as any).plausible(eventName, { props });
      }
    } catch {}
  }
}

export function trackSetupStep(step: string, status: string, error?: string) {
  trackEvent('setup_step', { step, status, error });
}