/**
 * Pinterest Client-Side Conversion Tracking Utilities
 * 
 * Key implementation notes:
 * - epik parameter is stored in _epik cookie (Pinterest's expected location)
 * - Pinterest auto-hashes email client-side, no SHA256 needed
 * - Event names use lowercase (Pinterest normalizes them)
 * - order_id is critical for conversion deduplication
 */

/**
 * Capture Pinterest Click ID (epik) from URL and store in cookie.
 * Pinterest appends this to ad click URLs for attribution.
 * Should be called on app mount.
 */
export function capturePinterestClickId(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const epik = params.get('epik');
    
    if (epik) {
      // Store in _epik cookie - Pinterest's expected cookie name
      // 7-day expiry matches Pinterest's attribution window
      const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
      document.cookie = `_epik=${encodeURIComponent(epik)}; max-age=${maxAge}; path=/; SameSite=Lax`;
      
      // Also store in localStorage as backup
      const expiry = Date.now() + (maxAge * 1000);
      localStorage.setItem('pinterest_epik', JSON.stringify({ value: epik, expiry }));
      
      console.log('[Pinterest] Click ID captured:', epik);
    }
  } catch (e) {
    // Fail silently - tracking should never break the app
    console.warn('[Pinterest] Failed to capture epik:', e);
  }
}

/**
 * Get stored Pinterest Click ID from cookie or localStorage.
 */
export function getPinterestClickId(): string | null {
  try {
    // Try cookie first (Pinterest's preferred method)
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === '_epik' && value) {
        return decodeURIComponent(value);
      }
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem('pinterest_epik');
    if (stored) {
      const { value, expiry } = JSON.parse(stored);
      if (Date.now() < expiry) {
        return value;
      }
      // Expired, clean up
      localStorage.removeItem('pinterest_epik');
    }
  } catch (e) {
    console.warn('[Pinterest] Failed to get epik:', e);
  }
  
  return null;
}

/**
 * Track a Pinterest conversion event.
 * 
 * @param event - Event name (checkout, signup, addtocart, pagevisit, lead)
 * @param data - Optional event data (value, currency, order_id, etc.)
 */
export function trackPinterestEvent(
  event: 'checkout' | 'signup' | 'addtocart' | 'pagevisit' | 'lead',
  data?: {
    value?: number;
    currency?: string;
    order_id?: string;
    order_quantity?: number;
    product_name?: string;
  }
): void {
  if (typeof window === 'undefined' || !window.pintrk) {
    console.warn('[Pinterest] pintrk not loaded');
    return;
  }
  
  try {
    const eventData: Record<string, any> = {};
    
    if (data?.value !== undefined) {
      eventData.value = data.value;
      eventData.currency = data.currency || 'USD';
    }
    
    if (data?.order_id) {
      eventData.order_id = data.order_id;
    }
    
    if (data?.order_quantity) {
      eventData.order_quantity = data.order_quantity;
    }
    
    if (data?.product_name) {
      eventData.product_name = data.product_name;
    }
    
    // Fire the event
    if (Object.keys(eventData).length > 0) {
      window.pintrk('track', event, eventData);
    } else {
      window.pintrk('track', event);
    }
    
    console.log(`[Pinterest] Tracked "${event}"`, eventData);
  } catch (e) {
    console.warn('[Pinterest] Failed to track event:', e);
  }
}

