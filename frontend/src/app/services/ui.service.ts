import { computed, Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UiService {
  activeTabIndex = signal<number>(0);
  activeTabKey = signal<string | null>(null);
  sidebarExpanded = signal<boolean>(false);
  toggleButtonRequest = signal<number | null>(null);

  // Propiedades para la barra lateral (px)
  readonly SIDEBAR_WIDTH_COLLAPSED = 56;
  readonly SIDEBAR_WIDTH_EXPANDED = 278;
  readonly SIDEBAR_GAP = 12;

  // Para paneles secundarios (barra + gap)
  sidebarOffset = computed(() => {
    const width = this.sidebarExpanded()
      ? this.SIDEBAR_WIDTH_EXPANDED
      : this.SIDEBAR_WIDTH_COLLAPSED;
    return width + this.SIDEBAR_GAP;
  });

  private panelClearedSubject = new BehaviorSubject<void>(undefined);
  panelCleared$ = this.panelClearedSubject.asObservable();

  // Controla si el panel está visible
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  isOpen$ = this.isOpenSubject.asObservable();

  // Controla qué contenido mostrar
  private activeContentSubject = new BehaviorSubject<string>('');
  activeContent$ = this.activeContentSubject.asObservable();

  // Título dinámico
  private titleSubject = new BehaviorSubject<string>('');
  title$ = this.titleSubject.asObservable();

  // Notifica cuando se abre un panel
  private panelOpenedSubject = new BehaviorSubject<string>('');
  panelOpened$ = this.panelOpenedSubject.asObservable();

  // Observable para controlar cuando cambiar de tab
  private activeTabChangedSubject = new BehaviorSubject<number | null>(null);
  activeTabChanged$ = this.activeTabChangedSubject.asObservable();

  constructor() {}

  notifyTabChange(index: number) {
    this.activeTabChangedSubject.next(index);
  }

  triggerToggleButton(index: number) {
    this.toggleButtonRequest.set(index);
  }

  openPanel(key: string, title: string) {
    this.activeContentSubject.next(key);
    this.titleSubject.next(title);
    this.isOpenSubject.next(true);
    this.panelOpenedSubject.next(key);
  }

  closePanel() {
    this.activeTabIndex.set(0);
    this.activeTabKey.set(null);
    this.isOpenSubject.next(false);
    this.panelOpenedSubject.next('');
  }

  clearPanel() {
    this.activeContentSubject.next('');
    this.titleSubject.next('');
    this.isOpenSubject.next(false);
    this.panelClearedSubject.next();
  }

  togglePanel(key: string, title: string) {
    if (this.isOpenSubject.value && this.activeContentSubject.value === key) {
      this.closePanel();
    } else {
      this.openPanel(key, title);
    }
  }

  get isOpenValue(): boolean {
    return this.isOpenSubject.value;
  }
}
