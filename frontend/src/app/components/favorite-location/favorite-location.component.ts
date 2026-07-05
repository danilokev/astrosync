import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  effect,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Subject, filter, takeUntil } from 'rxjs';
import { IconBtnComponent } from '../icon-btn/icon-btn.component';
import { UiService } from '../../services/ui.service';
import { FavoritelocationService } from '../../services/favoritelocation.service';
import { AuthService } from '../../services/auth.service';

interface FavoriteLocation {
  _id: string;
  nombre: string;
  latitud: number;
  longitud: number;
}

@Component({
  selector: 'app-favorite-location',
  standalone: true,
  imports: [CommonModule, IconBtnComponent],
  templateUrl: './favorite-location.component.html',
  styleUrl: './favorite-location.component.css',
})
export class FavoriteLocationComponent implements OnInit, OnDestroy {
  @Input() isOpen: boolean = false;

  @Output() closePanel = new EventEmitter<void>();
  @Output() goToLocation = new EventEmitter<{
    id: string;
    lat: number;
    lon: number;
  }>();
  @Output() removeLocationMarker = new EventEmitter<string>();
  @Output() useAsCurrentLocation = new EventEmitter<{
    lat: number;
    lon: number;
  }>();
  @Output() toggleUserLocation = new EventEmitter<boolean>();

  favoriteLocations: FavoriteLocation[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private uiService: UiService,
    private favoriteService: FavoritelocationService,
    private destroyRef: DestroyRef,
    public authService: AuthService,
  ) {
    effect(
      () => {
        if (this.authService.authCheckComplete()) {
          this.loadFavoriteLocations();
        }
      },
      { allowSignalWrites: true },
    );

    this.destroyRef.onDestroy(() => {
      this.destroy$.next();
      this.destroy$.complete();
    });
  }

  ngOnInit(): void {
    this.favoriteService.refreshChanges$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadFavoriteLocations());

    this.uiService.panelOpened$
      .pipe(
        filter(
          (openedPanelKey: string) =>
            Boolean(openedPanelKey) && openedPanelKey !== 'favorite',
        ),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        if (this.isOpen) {
          this.handleClosePanel();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFavoriteLocations(): void {
    if (!this.authService.isLoggedIn()) {
      this.favoriteLocations = [];
      return;
    }
    this.favoriteService.getAll().subscribe({
      next: (locations) => {
        this.favoriteLocations = locations;
      },
      error: (err) => {
        // console.error('Error cargando localizaciones', err);
      },
    });
  }

  // Maneja la navegación a una ubicación
  navigateToLocation(location: FavoriteLocation): void {
    if (location.latitud == null || location.longitud == null) return;

    this.useAsCurrentLocation.emit({
      lat: location.latitud,
      lon: location.longitud,
    });

    // Cambiar al tab principal (index 0)
    this.uiService.activeTabIndex.set(0);
    this.uiService.activeTabKey.set('sky');
    // Emitimos false para ocultar el marcador de usuario
    this.toggleUserLocation.emit(false);
  }

  // Elimina una ubicación de la lista de favoritos
  deleteFavoriteLocation(id: string): void {
    this.favoriteService.deleteById(id).subscribe({
      next: () => {
        this.favoriteLocations = this.favoriteLocations.filter(
          (loc) => loc._id !== id,
        );

        this.removeLocationMarker.emit(id);
      },
      error: (err) => {
        // console.error('Error eliminando localización', err);
      },
    });
  }

  // Cierra el panel de ubicaciones favs
  handleClosePanel(): void {
    this.isOpen = false;
    this.closePanel.emit();
  }
}
