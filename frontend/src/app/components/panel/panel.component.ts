import { Component, Output, EventEmitter, effect } from '@angular/core';
import { UiService } from '../../services/ui.service';
import { CommonModule } from '@angular/common';
import { FavoriteCardComponent } from '../favorite-card/favorite-card.component';
import { EventcardComponent } from '../../components/eventcard/eventcard.component';
import { EventDetailComponent } from '../event-detail/event-detail.component';
import {
  EventosService,
  Evento,
  TipoEvento,
} from '../../services/eventos.service';
import { WeatherSectionComponent } from '../weather-section/weather-section.component';
import {
  FavoriteAstroService,
  FavoriteCelestial,
} from '../../services/favorite-astro.service';
import { delay } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { EngineService } from '../../pages/facade-engine/facade-engine.service';
import { ToastService } from '../../services/toast.service';

const EVENTOS_POR_PAGINA = 5;
const LOADING_MIN_DURATION = 300; // ms

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [
    CommonModule,
    FavoriteCardComponent,
    EventcardComponent,
    EventDetailComponent,
    WeatherSectionComponent,
  ],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.css',
})
export class PanelComponent {
  eventos: Evento[] = [];
  /** Vista detalle: sustituye la lista hasta pulsar «Volver». */
  selectedEvento: Evento | null = null;
  favoritos: FavoriteCelestial[] = [];
  @Output() goToStar = new EventEmitter<string>();

  loadingFavoritos = true;
  loadingEventos = true;
  hasPanelBeenOpened = false;

  // Número de eventos visibles - Paginación
  eventosVisibles = EVENTOS_POR_PAGINA;
  readonly pageSize = EVENTOS_POR_PAGINA;

  // Filtros de eventos (vacío = todos)
  filtroTipo: TipoEvento | '' = '';
  filtroMes: string = '';

  readonly opcionesTipo: { value: TipoEvento | ''; label: string }[] = [
    { value: '', label: 'Todos los tipos' },
    { value: 'eclipse_solar', label: 'Eclipse solar' },
    { value: 'eclipse_lunar', label: 'Eclipse lunar' },
    { value: 'meteor_shower', label: 'Lluvia de meteoros' },
    { value: 'supermoon', label: 'Superluna' },
  ];

  readonly opcionesMes: { value: string; label: string }[] = [
    { value: '', label: 'Todos los meses' },
    ...[
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ].map((label, i) => ({ value: String(i + 1), label })),
  ];

  constructor(
    public uiService: UiService,
    private eventosService: EventosService,
    private favoriteService: FavoriteAstroService,
    private authService: AuthService,
    private engService: EngineService,
    private toastService: ToastService,
  ) {
    effect(
      () => {
        if (this.authService.authCheckComplete()) {
          this.loadFavoritos();
        }
      },
      { allowSignalWrites: true },
    );
  }

  togglePanel() {
    if (this.uiService['isOpenSubject'].value) {
      this.uiService.closePanel();
    } else {
      const key = this.uiService['activeContentSubject'].value;
      const title = this.uiService['titleSubject'].value;
      this.uiService.openPanel(key, title);
      this.hasPanelBeenOpened = true;
    }
  }

  ngOnInit() {
    this.uiService.isOpen$.subscribe((isOpen) => {
      if (isOpen) {
        this.hasPanelBeenOpened = true;
      }
    });

    this.cargarEventos();

    // Refresca la lista si se añade o elimina un favorito desde otra parte
    this.favoriteService.refreshChanges$.subscribe(() => this.loadFavoritos());

    // Cada vez que se limpia el panel, reseteamos hasPanelBeenOpened
    this.uiService.panelCleared$.subscribe(() => {
      this.hasPanelBeenOpened = false;
    });
  }

  private loadFavoritos() {
    if (!this.authService.isLoggedIn()) {
      this.favoritos = [];
      this.loadingFavoritos = false;
      return;
    }
    this.loadingFavoritos = true;
    this.favoriteService.getAll().subscribe({
      next: (res) => {
        this.favoritos = res;
        this.loadingFavoritos = false;
      },
      error: (err) => {
        this.favoritos = [];
        this.loadingFavoritos = false;
      },
    });
  }

  verLocation(eventName: string): void {
    this.goToStar.emit(eventName);
  }

  eliminarFavorito(id: string) {
    this.favoriteService.deleteById(id).subscribe({
      next: () =>
        this.toastService.success(
          'Eliminado',
          'Su favorito se ha eliminado correctamente',
        ),
      error: (err) =>
        this.toastService.error(
          'Error',
          'No se ha podido eliminar su favorito. Inténtelo de nuevo.',
        ),
    });
  }

  // Eventos a mostrar por paginación
  get eventosPaginados(): Evento[] {
    return this.eventos.slice(0, this.eventosVisibles);
  }

  // Hay más evenos que los actualmente visibles
  get hayMasEventos(): boolean {
    return this.eventos.length > this.eventosVisibles;
  }

  // Cargar 5 eventos más
  verMasEventos(): void {
    this.eventosVisibles += this.pageSize;
  }

  selectEvento(evento: Evento): void {
    this.selectedEvento = evento;
  }

  clearSelection(): void {
    this.selectedEvento = null;
  }

  trackEventoById(_index: number, ev: Evento): string {
    return ev._id;
  }

  // Aplica los filtros y recarga los eventos
  cargarEventos(): void {
    this.selectedEvento = null;
    this.loadingEventos = true;
    this.eventosVisibles = this.pageSize;

    const tipo = this.filtroTipo || undefined;
    const mes = this.filtroMes ? Number(this.filtroMes) : undefined;

    this.eventosService
      .getEventos(tipo, mes)
      .pipe(delay(LOADING_MIN_DURATION))
      .subscribe({
        next: (res) => {
          this.eventos = res.data ?? [];
          this.loadingEventos = false;
        },
        error: () => {
          this.eventos = [];
          this.loadingEventos = false;
        },
      });
  }

  onFiltroTipoChange(value: string): void {
    this.filtroTipo = value as TipoEvento | '';
    this.eventosVisibles = this.pageSize;
    this.cargarEventos();
  }

  onFiltroMesChange(value: string): void {
    this.filtroMes = value;
    this.eventosVisibles = this.pageSize;
    this.cargarEventos();
  }
}
