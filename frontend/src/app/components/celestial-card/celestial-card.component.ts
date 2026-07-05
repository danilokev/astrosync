import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookmarkComponent } from '../bookmark/bookmark.component';
import { InputSelectComponent } from '../input-select/input-select.component';
import { IconBtnComponent } from '../icon-btn/icon-btn.component';
import { LoadingComponent } from '../shared/loading/loading.component';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { EngineService } from '../../pages/facade-engine/facade-engine.service';
import { FacadeEngineServiceTAG } from '../../pages/facade-engine/facade-engine-TAG.service';
import { FavoriteAstroService } from '../../services/favorite-astro.service';
import { InfoTableComponent } from '../info-table/info-table.component';
import { constellationsReverse } from '../../../assets/data/NamesDiccionary';

@Component({
  selector: 'app-celestial-card',
  standalone: true,
  imports: [
    CommonModule,
    BookmarkComponent,
    InputSelectComponent,
    IconBtnComponent,
    InfoTableComponent,
    LoadingComponent,
  ],
  templateUrl: './celestial-card.component.html',
  styleUrl: './celestial-card.component.scss',
})
export class CelestialCardComponent {
  selectedValue: string = 'pdf'; // formato seleccionado para la descarga
  celestialData: any;

  isBookmarked = false;
  favoriteId: string | null = null;
  constructor(
    private authService: AuthService,
    private favoriteAstroService: FavoriteAstroService,
    private EngineService: EngineService,
    private FacadeEngineServiceTAG: FacadeEngineServiceTAG,
  ) {}

  onBookmarkToggled(active: boolean) {
    if (!this.authService.isAuthenticated()) {
      this.isBookmarked = false;
      // Redirección al login externo
      window.location.href = environment.loginUrl;
      return;
    }

    if (active) {
      this.saveCelestial();
    } else {
      this.removeCelestial();
    }
  }

  private saveCelestial() {
    const celestial = this.celestial();
    if (!celestial || !celestial.label) {
      console.error('Celestial inválido o sin label');
      return;
    }

    // Payload limpio para el backend
    const payload = {
      label: celestial.label,
      extract: celestial.extract || '',
      wikidataImage: celestial.wikidataImage || '',
      wikipediaUrl: celestial.wikipediaUrl || '',
      tipo: celestial.type || 'star',
    };

    this.favoriteAstroService.create(payload).subscribe({
      next: (res) => {
        this.isBookmarked = true;
        this.favoriteId = res._id;
      },
      error: (err) => {
        if (err.status === 400) {
          //console.warn(
          //  'Posible favorito duplicado o datos inválidos',
          //  err.error,
          //);
        } else {
          //console.error('Error guardando favorito:', err);
        }
        this.isBookmarked = false;
      },
    });
  }

  private removeCelestial() {
    if (!this.favoriteId) return;

    this.favoriteAstroService.deleteById(this.favoriteId).subscribe({
      next: () => {
        this.isBookmarked = false;
        this.favoriteId = null;
      },
      error: () => {
        this.isBookmarked = true;
      },
    });
  }

  // Actualizar formato seleccionado
  onSelectChange(value: string) {
    this.selectedValue = value;
  }

  // Iniciar descarga de info en formato elegido
  generateFormat(parameters: any) {
    parameters.format = this.selectedValue;

    let url: string;

    if (parameters._id) {
      // Es planeta/Luna/Sol
      url = `${environment.apiUrl}/celestial/cuerpo?_id=${parameters._id}&format=${this.selectedValue}`;
    } else if (parameters.code) {
      // Es constelación
      url = `${environment.apiUrl}/constelaciones/${parameters.code}?format=${this.selectedValue}`;
    } else {
      // Es estrella
      const params = new URLSearchParams(parameters);
      url = `${environment.apiUrl}/celestial/star?${params.toString()}`;
    }

    window.open(url, '_blank');
  }

  celestial = input<any | null>(null);
  loading = input<boolean>(false);
  undoZoom = input<(() => void) | null>(null);
  public onClose = output<void>();

  public handleCloseClick(): void {
    const undoFn = this.undoZoom();
    if (undoFn) {
      undoFn();
    }
    this.onClose.emit();
  }

  normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  onConstellationSelected(fullName: string) {
    if (!fullName) return;

    const normalized = this.normalize(fullName);

    const abbrev = constellationsReverse[normalized];

    if (!abbrev) {
      //console.warn('No se encontró constelación:', fullName);
      return;
    }

    // Llamamos a ambos servicios para asegurar que el enfoque funcione en todas las vistas
    this.EngineService.searchAndFocusByConstellation(abbrev);
    this.FacadeEngineServiceTAG.searchAndFocusByName(abbrev);
  }
}
