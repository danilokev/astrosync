import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoritelocationService } from '../../services/favoritelocation.service';
import { UiService } from '../../services/ui.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EngineService } from '../../pages/facade-engine/facade-engine.service';

@Component({
  selector: 'app-marker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marker.component.html',
  styleUrl: './marker.component.css',
})
export class MarkerComponent implements OnChanges {
  @Input() title: string = '';
  @Input() lat!: number;
  @Input() lon!: number;
  @Input() visible: boolean = false;
  @Input() pos2D!: { x: number; y: number };

  @Output() useAsCurrentLocation = new EventEmitter<{
    lat: number;
    lon: number;
  }>();
  @Output() toggleUserLocation = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();

  isBookmarked = false;
  locationId: string | null = null;

  constructor(
    private favoriteService: FavoritelocationService,
    private authService: AuthService,
    private router: Router,
    private uiService: UiService,
    private engServ: EngineService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambian lat o lon → es un nuevo punto
    if (changes['lat'] || changes['lon']) {
      this.resetBookmarkState();
    }
  }

  // Método unificado para toggle de bookmark
  toggleBookmark() {
    // Validar autenticación
    if (!this.authService.isAuthenticated()) {
      this.isBookmarked = false;
      window.location.href = environment.loginUrl;
      return;
    }

    // Toggle: si está guardado, quitar; si no, guardar
    this.isBookmarked ? this.removeLocation() : this.saveLocation();
  }

  private saveLocation() {
    // Validar inputs
    if (this.lat == null || this.lon == null) {
      this.isBookmarked = false;
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser?.uid) return;
    this.favoriteService.create(this.lat, this.lon, currentUser.uid).subscribe({
      next: (loc) => {
        this.isBookmarked = true;
        this.locationId = loc._id;
      },
      error: (err) => {
        this.isBookmarked = false;
      },
    });
  }

  private removeLocation() {
    if (!this.locationId) return;

    this.favoriteService.deleteById(this.locationId).subscribe({
      next: () => {
        this.locationId = null;
        this.isBookmarked = false;
      },
      error: () => {
        this.isBookmarked = true;
      },
    });
  }

  private resetBookmarkState() {
    this.isBookmarked = false;
    this.locationId = null;
  }

  setAsCurrentLocation() {
    if (this.lat == null || this.lon == null) return;

    this.useAsCurrentLocation.emit({ lat: this.lat, lon: this.lon });

    // Cambiar al tab de explorar el cielo
    this.uiService.activeTabIndex.set(0);
    this.uiService.activeTabKey.set('sky');

    // Ocultar marcador de usuario
    this.toggleUserLocation.emit(false);
  }

  closeMarker() {
    this.closed.emit();
  }

  onMarkerClosed() {
    this.closed.emit();
    this.engServ.removeClickMarker();
  }
}
