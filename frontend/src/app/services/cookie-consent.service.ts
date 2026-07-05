import { Injectable } from '@angular/core';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  preferences: boolean;
  thirdParty: boolean;
}

const CONSENT_KEY = 'astrosync_cookie_consent';
const CONSENT_DATE_KEY = 'astrosync_cookie_consent_date';
const CONSENT_VERSION = '1.0';

@Injectable({ providedIn: 'root' })
export class CookieConsentService {

  hasConsent(): boolean {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return false;
    try {
      const parsed = JSON.parse(stored);
      return parsed.version === CONSENT_VERSION;
    } catch {
      return false;
    }
  }

  saveConsent(preferences: CookiePreferences): void {
    const data = {
      version: CONSENT_VERSION,
      preferences: { ...preferences, essential: true }
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());
  }

  getPreferences(): CookiePreferences {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return { essential: true, analytics: false, preferences: false, thirdParty: false };
    try {
      return JSON.parse(stored).preferences ?? { essential: true, analytics: false, preferences: false, thirdParty: false };
    } catch {
      return { essential: true, analytics: false, preferences: false, thirdParty: false };
    }
  }

  revokeConsent(): void {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(CONSENT_DATE_KEY);
  }

  hasAnalytics(): boolean   { return this.getPreferences().analytics; }
  hasPreferences(): boolean { return this.getPreferences().preferences; }
  hasThirdParty(): boolean  { return this.getPreferences().thirdParty; }
}
