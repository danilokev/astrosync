import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { PhotoCardComponent } from '../photo-card/photo-card.component';
import { Subject, takeUntil } from 'rxjs';
import { Foto, FotosService } from '../../../services/fotos.service';
import { PhotoUploadModalComponent } from '../photo-upload-modal/photo-upload-modal.component';
import { PhotoDeleteModalComponent } from '../photo-delete-modal/photo-delete-modal.component';
import { PhotoEditModalComponent } from '../photo-edit-modal/photo-edit-modal.component';
import { PhotoDetailComponent } from '../photo-detail/photo-detail.component';

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [
    CommonModule,
    PhotoCardComponent,
    PhotoUploadModalComponent,
    PhotoDeleteModalComponent,
    PhotoEditModalComponent,
    PhotoDetailComponent,
  ],
  templateUrl: './photo-gallery.component.html',
  styleUrl: './photo-gallery.component.css',
})
export class PhotoGalleryComponent implements OnInit, OnDestroy {
  @Input() panelTitle: string = 'Mi galería';
  @Input() isOpen: boolean = false;

  @Output() closePanel = new EventEmitter<void>();

  isUploadModalOpen: boolean = false;
  isLoadingPhotos: boolean = false;

  isDeleteModalOpen: boolean = false;
  isDeletingPhoto: boolean = false;

  isEditModalOpen: boolean = false;
  photoToEditId: string | null = null;

  isDetailPanelOpen: boolean = false;
  photoToViewId: string | null = null;

  // Array de fotos mostradas en la galería
  photos: Foto[] = [];

  // ID de la foto a eliminar
  private photoToDeleteId: string | null = null;
  public photoToDeleteTitle: string = '';

  // Maneja desuscripción automática
  private destroy$ = new Subject<void>();

  constructor(private fotosService: FotosService) {}

  ngOnInit(): void {
    this.fotosService.fotos$
      .pipe(takeUntil(this.destroy$))
      .subscribe((fotos: Foto[]) => {
        this.photos = fotos;
      });

    this.fotosService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoading) => {
        this.isLoadingPhotos = isLoading;
      });

    this.cargarFotos();
  }

  // Carga las fotos desde el servicio
  cargarFotos(): void {
    this.fotosService.cargarFotos().subscribe({
      error: (error) => {
        console.error('Error al cargar fotos:', error);
      },
    });
  }

  // Abre el modal de carga de fotos
  handleAddPhoto(): void {
    this.isUploadModalOpen = true;
  }

  handleCloseUploadModal(): void {
    this.isUploadModalOpen = false;
  }

  // Maneja el evt de carga existosa del modal
  handleUploadSuccess(): void {}

  // Eliminación de una foto
  handleDeletePhoto(photoId: string): void {
    const photo = this.photos.find((p) => p._id === photoId);

    if (photo) {
      this.photoToDeleteId = photoId;
      this.photoToDeleteTitle = photo.titulo;
      this.isDeleteModalOpen = true;
    }
  }

  // Confirma la eliminación de la foto
  handleConfirmDelete(): void {
    if (!this.photoToDeleteId) return;

    this.isDeletingPhoto = true;

    this.fotosService.eliminarFoto(this.photoToDeleteId).subscribe({
      next: (response) => {
        if (response.ok) {
          this.isDeleteModalOpen = false;
          this.photoToDeleteId = null;
          this.photoToDeleteTitle = '';
          this.isDeletingPhoto = false;
        }
      },
      error: (error) => {
        this.isDeletingPhoto = false;
      },
    });
  }

  // Cancela la eliminación
  handleCancelDelete(): void {
    this.isDeleteModalOpen = false;
    this.photoToDeleteId = null;
    this.photoToDeleteTitle = '';
    this.isDeletingPhoto = false;
  }

  // Edición de una foto
  handleEditPhoto(photoId: string): void {
    const photo = this.photos.find((p) => p._id === photoId);

    if (photo) {
      this.photoToEditId = photoId;
      this.isEditModalOpen = true;
    }
  }

  // Cierra modal de edición
  handleCloseEditModal(): void {
    this.isEditModalOpen = false;
    this.photoToEditId = null;
  }

  // Visualizar detalles de una foto
  handleViewPhoto(photoId: string): void {
    const photo = this.photos.find((p) => p._id === photoId);

    if (photo) {
      this.photoToViewId = photoId;
      this.isDetailPanelOpen = true;
    }
  }

  // Cierra panel de detalle
  handleCloseDetailPanel(): void {
    this.isDetailPanelOpen = false;
    this.photoToViewId = null;
  }

  getUrlThumbnail(thumbnail: string): string {
    return this.fotosService.construirUrlArchivo(thumbnail);
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  trackByPhotoId(index: number, photo: Foto): string {
    return photo._id;
  }

  handleClosePanel(): void {
    this.closePanel.emit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
