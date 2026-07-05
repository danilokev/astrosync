import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieConsentService } from '../../services/cookie-consent.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.css']
})
export class PrivacyPolicyComponent {
  @Output() close = new EventEmitter<void>();

  activeTab: 'privacy' | 'cookies' = 'privacy';
  lastUpdated = '17 de mayo de 2026';
  contactEmail = 'astrosync.ua@gmail.com';

  constructor(private cookieService: CookieConsentService) {}

  setTab(tab: 'privacy' | 'cookies'): void {
    this.activeTab = tab;
  }

  onRevokeConsent(): void {
    this.cookieService.revokeConsent();
    this.close.emit();
  }

  onClose(): void {
    this.close.emit();
  }
}
