import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FotosService, Localizacion } from '../../../services/fotos.service';
import { InputTypeFileComponent } from '../../input-type-file/input-type-file.component';

@Component({
  selector: 'app-photo-upload-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTypeFileComponent],
  templateUrl: './photo-upload-modal.component.html',
  styleUrl: './photo-upload-modal.component.css',
})
export class PhotoUploadModalComponent {
  @Input() isOpen: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() uploadSuccess = new EventEmitter<void>();

  selectedFile: File | null = null;
  resetFile: boolean = false;
  titulo: string = '';
  referencias: string = '';
  locNombre: string = '';
  locLat: number | null = null;
  locLng: number | null = null;
  fechaCreacion: string = new Date().toISOString().split('T')[0];

  isUploading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private fotosService: FotosService) {}

  // Maneja la selección de archivo desde el componente InputTypeFileComponent
  onFileSelected(file: File | null): void {
    if (!file) {
      this.selectedFile = null;
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Por favor, selecciona una imagen válida';
      this.selectedFile = null;
      return;
    }

    // Valida tamaño máximo
    const MAX_SIZE = 5 * 1024 * 1024; // Máximo 5MB
    if (file.size > MAX_SIZE) {
      this.errorMessage = 'La imagen no debe superar 5 MB';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
    this.errorMessage = '';
  }

  // Valida los datos del formulario
  validarFormulario(): boolean {
    if (!this.selectedFile) {
      this.errorMessage = 'Debes seleccionar una imagen';
      return false;
    }

    if (!this.titulo.trim()) {
      this.errorMessage = 'El título es requerido';
      return false;
    }

    if (this.titulo.trim().length > 100) {
      this.errorMessage = 'El título no debe superar 100 caracteres.';
      return false;
    }

    // Valida si se proporcionan coordenadas, ambas deben estar presentes
    const tieneLatitud = this.locLat !== null && this.locLat !== undefined;
    const tieneLongitud = this.locLng !== null && this.locLng !== undefined;

    if (tieneLatitud && !tieneLongitud) {
      this.errorMessage = 'Debes proporcionar la longitud junto con la latitud';
      return false;
    }

    if (tieneLongitud && !tieneLatitud) {
      this.errorMessage = 'Debes proporcionar la latitud junto con la longitud';
      return false;
    }

    return true;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validarFormulario()) {
      return;
    }

    this.isUploading = true;

    // Procesa las referencias
    const referenciasArray = this.referencias
      .split(',')
      .map((ref) => ref.trim())
      .filter((ref) => ref.length > 0);

    // Procesa la localización
    const localizacionObj: Localizacion | undefined =
      this.locNombre || this.locLat !== null || this.locLng !== null
        ? {
            nombre: this.locNombre.trim(),
            latitud: this.locLat ?? undefined,
            longitud: this.locLng ?? undefined,
          }
        : undefined;

    // Crea la fecha de creación
    const fecha = this.fechaCreacion
      ? new Date(this.fechaCreacion)
      : new Date();

    // Proceso de subida de foto
    this.fotosService
      .subirFoto(
        this.selectedFile!,
        this.titulo.trim(),
        referenciasArray,
        localizacionObj,
        fecha,
      )
      .subscribe({
        next: (response) => {
          if (response.ok) {
            this.successMessage = 'Foto subida correctamente';

            this.isUploading = false;
            this.resetForm();

            // Emite evento de éxito y cierra después de 1.5s
            setTimeout(() => {
              this.uploadSuccess.emit();
              this.handleClose();
            }, 1500);
          } else {
            this.errorMessage = response.error || 'Error desconocido';
            this.isUploading = false;
          }
        },
        error: (error) => {
          console.error('Error al subir foto: ', error);
          this.errorMessage =
            error.error?.error || 'Error al subir la foto. Intenta nuevamente.';
          this.isUploading = false;
        },
      });
  }

  // Resetea los valores del formulario
  private resetForm(): void {
    this.selectedFile = null;
    this.titulo = '';
    this.referencias = '';
    this.locNombre = '';
    this.locLat = null;
    this.locLng = null;
    this.fechaCreacion = new Date().toISOString().split('T')[0];
    this.errorMessage = '';
    this.resetFile = true;
    setTimeout(() => (this.resetFile = false), 100);
  }

  // Cierra el modal
  handleClose(): void {
    this.isUploading = false;
    this.resetForm();
    this.successMessage = '';
    this.closeModal.emit();
  }

  // Obtiene el nombre del archivo seleccionado
  get nombreArchivo(): string {
    return this.selectedFile?.name || 'No se ha seleccionado archivo';
  }
}
