import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieConsentService, CookiePreferences } from '../../services/cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-banner.component.html',
  styleUrls: ['./cookie-banner.component.css']
})
export class CookieBannerComponent implements OnInit, OnChanges {

  // El landing puede forzar la apertura del modal de preferencias
  // desde el enlace "Gestionar cookies" del footer
  @Input()  forceOpenPreferences = false;
  @Output() preferencesOpened    = new EventEmitter<void>();
  @Output() openPrivacyPolicy    = new EventEmitter<void>();

  visible         = false;
  showPreferences = false;

  preferences: CookiePreferences = {
    essential:   true,
    analytics:   false,
    preferences: false,
    thirdParty:  false
  };

  constructor(private cookieService: CookieConsentService) {}

  ngOnInit(): void {
    this.visible = !this.cookieService.hasConsent();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Cuando el footer activa "Gestionar cookies"
    if (changes['forceOpenPreferences']?.currentValue === true) {
      this.preferences = this.cookieService.getPreferences();
      this.showPreferences = true;
      this.preferencesOpened.emit(); // resetea el flag en el padre
    }
  }

  acceptAll(): void {
    this.cookieService.saveConsent({ essential: true, analytics: true, preferences: true, thirdParty: true });
    this.visible = false;
  }

  acceptEssential(): void {
    this.cookieService.saveConsent({ essential: true, analytics: false, preferences: false, thirdParty: false });
    this.visible = false;
  }

  openCustomize(): void {
    this.preferences = this.cookieService.getPreferences();
    this.showPreferences = true;
  }

  savePreferences(): void {
    this.cookieService.saveConsent(this.preferences);
    this.showPreferences = false;
    this.visible = false;
  }

  closePreferences(): void {
    this.showPreferences = false;
  }

  onOpenPrivacy(): void {
    this.openPrivacyPolicy.emit();
  }
}
