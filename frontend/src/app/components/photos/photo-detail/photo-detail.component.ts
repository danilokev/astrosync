import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  Foto,
  FotosService,
  UsuarioInfo,
} from '../../../services/fotos.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-photo-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-detail.component.html',
  styleUrl: './photo-detail.component.css',
})
export class PhotoDetailComponent implements OnInit, OnChanges, OnDestroy {
  @Input() photoId: string | null = null;
  @Input() isOpen: boolean = false;

  @Output() closePanel = new EventEmitter<void>();

  photo: Foto | null = null;
  isLoading: boolean = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private fotosService: FotosService) {}

  ngOnInit(): void {
    if (this.photoId) {
      this.cargarFoto();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['photoId'] || changes['isOpen']) &&
      this.photoId &&
      this.isOpen
    ) {
      this.cargarFoto();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarFoto(): void {
    if (!this.photoId) return;

    this.isLoading = true;
    this.error = null;

    this.fotosService
      .obtenerFoto(this.photoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.ok && response.foto) {
            this.photo = response.foto;
          } else {
            this.error = response.error || 'Error al cargar la foto';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar foto:', error);
          this.error = 'Error al cargar la foto';
          this.isLoading = false;
        },
      });
  }

  getPhotoUrl(): string {
    if (!this.photo?.url) return '';
    return this.fotosService.construirUrlArchivo(this.photo.url);
  }

  getAuthorName(): string {
    if (!this.photo?.usuario) return 'Desconocido';

    if (typeof this.photo.usuario === 'string') {
      return 'Usuario';
    }

    const usuario = this.photo.usuario as UsuarioInfo;
    const nombre = usuario.nombre || '';
    const apellidos = usuario.apellidos || '';

    if (nombre || apellidos) {
      return `${nombre} ${apellidos}`.trim();
    }

    return usuario.email || 'Usuario';
  }

  getFormattedDate(): string {
    if (!this.photo?.fechaCreacion) return 'No especificada';

    const fecha = new Date(this.photo.fechaCreacion);
    return fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getReferencias(): string[] {
    if (!this.photo?.referencias) return [];

    if (Array.isArray(this.photo.referencias)) {
      return this.photo.referencias.filter((ref) => ref && ref.trim());
    }

    return [];
  }

  hasLocation(): boolean {
    return !!(
      this.photo?.localizacion &&
      (this.photo.localizacion.latitud !== undefined ||
        this.photo.localizacion.longitud !== undefined ||
        this.photo.localizacion.nombre)
    );
  }

  handleClose(): void {
    this.closePanel.emit();
  }

  handleBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.handleClose();
    }
  }
}
