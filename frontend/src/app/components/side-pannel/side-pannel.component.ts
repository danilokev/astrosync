import { Component, Output, EventEmitter } from '@angular/core';
import { AuthService, AuthSessionUser } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';
import { Router } from '@angular/router';
import { Evento } from '../../services/eventos.service';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PhotoGalleryComponent } from '../photos/photo-gallery/photo-gallery.component';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { EngineService } from '../../pages/facade-engine/facade-engine.service';
import { AnimationsGalleryComponent } from '../animations-gallery/animations-gallery.component';

interface Tab {
  title: string;
  icon: string;
  key?: string;
  isBottom?: boolean;
  action?: () => void;
  route?: string;
  auth?: 'guest' | 'user' | 'both' | 'admin';
}

@Component({
  selector: 'app-side-pannel',
  standalone: true,
  imports: [
    CommonModule,
    PhotoGalleryComponent,
    AvatarComponent,
    AnimationsGalleryComponent,
  ],
  templateUrl: './side-pannel.component.html',
  styleUrl: './side-pannel.component.css',
})
export class SidePannelComponent {
  eventos: Evento[] = [];

  isPhotoGalleryOpen: boolean = false;
  isPanelOpen: boolean = false;
  isPanelExpanded: boolean = false;
  isAnimationsGalleryOpen: boolean = false;

  @Output() chatbotStarRequested = new EventEmitter<string>();

  constructor(
    public authService: AuthService,
    private uiService: UiService,
    private engineSevice: EngineService,
    private router: Router,
  ) {}

  tabs: Tab[] = [
    {
      title: 'Explorar el cielo',
      icon: 'bi-moon-stars-fill',
      action: () => this.openSky(),
      key: 'sky',
      auth: 'both',
      route: '/app',
    },
    {
      title: 'Lugares de observación',
      icon: 'bi-geo-alt-fill',
      action: () => this.openPlaces(),
      key: 'map',
      auth: 'both',
      route: '/app',
    },
    {
      title: 'Cuerpos celestes guardados',
      icon: 'bi-bookmark-star-fill',
      action: () => this.openSaved(),
      key: 'save',
      auth: 'user',
      route: '/app',
    },
    {
      title: 'Galería de fotos',
      icon: 'bi-images',
      action: () => this.openPhotos(),
      key: 'photo',
      auth: 'user',
      route: '/app',
    },
    {
      title: 'Calendario de eventos',
      icon: 'bi-calendar-event-fill',
      action: () => this.openCalendar(),
      key: 'calendar',
      auth: 'both',
      route: '/app',
    },
    {
      title: 'Pronóstico de tiempo',
      icon: 'bi-cloud-sun-fill',
      action: () => this.openWeather(),
      key: 'weather',
      auth: 'both',
      route: '/app',
    },
    {
      title: 'Animaciones',
      icon: 'bi-play-circle-fill',
      action: () => this.openAnimations(),
      key: 'animations',
      auth: 'both',
      route: '/app',
    },
    {
      title: 'Panel de administración',
      icon: 'bi-person-fill-gear',
      action: () => this.openAdmin(),
      isBottom: true,
      key: 'admin',
      auth: 'admin',
      route: '/admin',
    },
    {
      title: 'Cerrar sesión',
      icon: 'bi-box-arrow-right',
      action: () => this.logout(),
      isBottom: true,
      auth: 'user',
    },
  ];

  private destroy$ = new Subject<void>();

  get visibleTabs(): Tab[] {
    const isAuth = this.authService.isAuthenticated();
    const currentUser = this.authService.currentUser();

    return this.tabs.filter(
      (tab) =>
        tab.auth === 'both' ||
        (tab.auth === 'user' && isAuth) ||
        (tab.auth === 'admin' && isAuth && currentUser?.rol === 'ROL_ADMIN') ||
        (tab.auth === 'guest' && !isAuth),
    );
  }

  get firstBottomIndex(): number {
    return this.visibleTabs.findIndex((tab) => tab.isBottom);
  }

  get activeTabIndex(): number {
    return this.uiService.activeTabIndex();
  }

  ngOnInit(): void {
    this.uiService.sidebarExpanded.set(this.isPanelExpanded);

    const activatedFromUrl = this.activateTabFromUrl();

    if (!activatedFromUrl) {
      const savedKey = this.uiService.activeTabKey();

      if (savedKey) {
        const index = this.visibleTabs.findIndex((tab) => tab.key === savedKey);
        if (index !== -1) {
          this.uiService.activeTabIndex.set(index);
        }
      }
    }

    this.uiService.panelOpened$
      .pipe(takeUntil(this.destroy$))
      .subscribe((panelKey) => {
        if (panelKey && this.isPhotoGalleryOpen) {
          this.isPhotoGalleryOpen = false;
        }

        if (panelKey && this.isAnimationsGalleryOpen) {
          this.isAnimationsGalleryOpen = false;
        }
      });

    fromEvent<CustomEvent>(window, 'df-response-received')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const response = event.detail?.response;

        const tab = response?.queryResult?.parameters?.tab;
        if (tab) {
          this.handleTabRequest(tab);
        }

        const astro = response?.queryResult?.parameters?.astro;
        if (astro && astro !== 'astro desconocido') {
          this.chatbotStarRequested.emit(astro);
        }

        const index = Number(response?.queryResult?.parameters?.toggleIndex);
        if (index === 3) {
          setTimeout(() => {
            this.uiService.triggerToggleButton(index);
          }, 2500);
        }

        const messages = response?.fulfillmentMessages;
        if (!messages) return;

        const payloadMessage = messages.find((m: any) => m.payload);
        if (!payloadMessage) return;

        const payload = payloadMessage.payload;
      });
  }

  private activateTabFromUrl(): boolean {
    const url = this.router.url;

    if (url.startsWith('/admin')) {
      const index = this.visibleTabs.findIndex((tab) => tab.route === '/admin');
      if (index !== -1) {
        this.uiService.activeTabIndex.set(index);
        this.uiService.activeTabKey.set('admin');
        return true;
      }
    }

    return false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleTabRequest(key: string): void {
    const tab = this.findTabByKey(key);

    if (!tab) {
      /*if(key==='photo' && !this.authService.isAuthenticated()){
        this.router.navigate(['/login']);
        return;
      }*/
      //console.warn(`Tab not found: ${key}`);
      return;
    }

    if (tab.auth === 'user' && !this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.openTab(tab);
  }

  private findTabByKey(key: string): Tab | undefined {
    return this.tabs.find((tab) => tab.key === key);
  }

  private openTab(tab: Tab): void {
    const index = this.visibleTabs.findIndex((t) => t === tab);
    if (index === -1) return;

    this.setActiveTab(index, tab.action);
  }

  togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
  }

  togglePanelExpanded(): void {
    this.isPanelExpanded = !this.isPanelExpanded;
    this.uiService.sidebarExpanded.set(this.isPanelExpanded);
  }

  setActiveTab(index: number, action?: () => void) {
    const tab = this.visibleTabs[index];
    if (!tab) return;

    this.uiService.activeTabIndex.set(index);
    this.uiService.activeTabKey.set(tab.key ?? null);
    this.uiService.notifyTabChange(index);

    if (tab.route && !this.router.url.startsWith(tab.route)) {
      this.router.navigateByUrl(tab.route);
    }

    action?.();

    if (this.isPanelOpen) {
      this.togglePanel();
    }
  }

  openAdmin() {
    this.closePhotoGallery(false);
    this.closeAnimationsGallery(false);
    this.router.navigateByUrl('/admin');
  }

  openSky() {
    this.closePhotoGallery(false);
    this.closeAnimationsGallery(false);
    this.uiService.clearPanel();
  }

  openPlaces() {
    this.closePhotoGallery(false);
    this.closeAnimationsGallery(false);
    this.uiService.clearPanel();
  }

  openSaved() {
    this.closeAnimationsGallery(false);
    this.uiService.togglePanel('save', 'Mis favoritos');
  }

  openPhotos() {
    this.closeAnimationsGallery(false);
    this.uiService.clearPanel();
    this.isPhotoGalleryOpen = true;
  }

  openCalendar() {
    this.closeAnimationsGallery(false);
    this.uiService.togglePanel('calendar', 'Eventos próximos');
  }

  openWeather() {
    this.closeAnimationsGallery(false);
    this.uiService.togglePanel('weather', 'Pronostico del tiempo');
  }

  openAnimations() {
    this.uiService.clearPanel();
    this.closePhotoGallery(false);
    this.isAnimationsGalleryOpen = true;
  }

  closeAnimationsGallery(resetTab: boolean = true) {
    if (this.isAnimationsGalleryOpen && resetTab) {
      this.uiService.activeTabIndex.set(0);
      this.uiService.activeTabKey.set(null);
    }
    this.isAnimationsGalleryOpen = false;
  }

  closePhotoGallery(resetTab: boolean = true) {
    if (this.isPhotoGalleryOpen && resetTab) {
      this.uiService.activeTabIndex.set(0);
      this.uiService.activeTabKey.set(null);
    }
    this.isPhotoGalleryOpen = false;
  }

  getDisplayName(
    user: AuthSessionUser | null,
  ): { nombre: string; apellidos: string } | null {
    if (!user) return null;
    const nombre = user.nombre?.trim() ?? '';
    const apellidos = user.apellidos?.trim() ?? '';
    if (!nombre && !apellidos) return null;
    return { nombre: nombre || 'Usuario', apellidos };
  }

  navigateToLogin(): void {
    this.setActiveTab(0);
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  logout() {
    this.uiService.clearPanel();
    this.authService.logout();
    this.closePhotoGallery();
    this.closeAnimationsGallery();

    if (this.visibleTabs.length > 0) {
      this.setActiveTab(0);
    }
  }
}
