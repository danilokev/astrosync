import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Foto,
  FotosService,
  Localizacion,
} from '../../../services/fotos.service';

@Component({
  selector: 'app-photo-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './photo-edit-modal.component.html',
  styleUrl: './photo-edit-modal.component.css',
})
export class PhotoEditModalComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() photoId: string | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() editSuccess = new EventEmitter<void>();

  // Propiedades del formulario
  titulo: string = '';
  referencias: string[] = [];
  nuevaReferencia: string = '';
  locNombre: string = '';
  locLat: number | null = null;
  locLng: number | null = null;
  fechaCreacion: string = '';

  // Estado de carga y validación
  isSaving: boolean = false;
  isLoadingPhoto: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Mensajes de validación en tiempo real
  tituloError: string = '';
  latError: string = '';
  lngError: string = '';
  referenciaError: string = '';

  // Foto actual
  currentPhoto: Foto | null = null;

  constructor(private fotosService: FotosService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.photoId) {
      this.cargarFoto();
    } else if (changes['isOpen'] && !this.isOpen) {
      this.resetForm();
    }
  }

  // Carga los datos de la foto
  cargarFoto(): void {
    if (!this.photoId) return;

    this.isLoadingPhoto = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.fotosService.obtenerFoto(this.photoId).subscribe({
      next: (response) => {
        if (response.ok && response.foto) {
          this.currentPhoto = response.foto;
          this.cargarDatosEnFormulario(response.foto);
          this.isLoadingPhoto = false;
        } else {
          this.errorMessage = response.error || 'Error al cargar la foto';
          this.isLoadingPhoto = false;
        }
      },
      error: (error) => {
        console.error('Error al cargar foto:', error);
        this.errorMessage =
          error.error?.error || 'Error al cargar la foto. Intenta nuevamente.';
        this.isLoadingPhoto = false;
      },
    });
  }

  // Carga los datos de la foto en el formulario
  cargarDatosEnFormulario(foto: Foto): void {
    this.titulo = foto.titulo || '';

    // Procesa referencias: si es string, lo convierte a array; si es array, lo usa directamente
    if (foto.referencias) {
      if (typeof foto.referencias === 'string') {
        this.referencias =
          foto.referencias.trim().length > 0 ? [foto.referencias] : [];
      } else if (Array.isArray(foto.referencias)) {
        this.referencias = [...foto.referencias];
      } else {
        this.referencias = [];
      }
    } else {
      this.referencias = [];
    }

    // Carga localización
    if (foto.localizacion) {
      this.locNombre = foto.localizacion.nombre || '';
      this.locLat = foto.localizacion.latitud ?? null;
      this.locLng = foto.localizacion.longitud ?? null;
    } else {
      this.locNombre = '';
      this.locLat = null;
      this.locLng = null;
    }

    // Carga fecha
    if (foto.fechaCreacion) {
      const fecha = new Date(foto.fechaCreacion);
      this.fechaCreacion = fecha.toISOString().split('T')[0];
    } else {
      this.fechaCreacion = new Date().toISOString().split('T')[0];
    }
  }

  // Validaciones en tiempo real
  validarTitulo(): void {
    // Limpia mensaje de éxito si el usuario vuelve a editar
    if (this.successMessage) {
      this.successMessage = '';
    }

    if (!this.titulo.trim()) {
      this.tituloError = 'El título es requerido';
    } else if (this.titulo.trim().length > 100) {
      this.tituloError = 'El título no debe superar 100 caracteres';
    } else {
      this.tituloError = '';
    }
  }

  validarLatitud(): void {
    if (this.successMessage) {
      this.successMessage = '';
    }

    if (this.locLat !== null && this.locLat !== undefined) {
      if (isNaN(this.locLat) || this.locLat < -90 || this.locLat > 90) {
        this.latError = 'La latitud debe estar entre -90 y 90';
      } else if (
        this.locLat !== null &&
        (this.locLng === null || this.locLng === undefined)
      ) {
        this.latError = 'Debes proporcionar la longitud junto con la latitud';
      } else {
        this.latError = '';
      }
    } else {
      this.latError = '';
    }
  }

  validarLongitud(): void {
    if (this.successMessage) {
      this.successMessage = '';
    }

    if (this.locLng !== null && this.locLng !== undefined) {
      if (isNaN(this.locLng) || this.locLng < -180 || this.locLng > 180) {
        this.lngError = 'La longitud debe estar entre -180 y 180';
      } else if (
        this.locLng !== null &&
        (this.locLat === null || this.locLat === undefined)
      ) {
        this.lngError = 'Debes proporcionar la latitud junto con la longitud';
      } else {
        this.lngError = '';
      }
    } else {
      this.lngError = '';
    }
  }

  validarReferencia(): void {
    if (
      this.nuevaReferencia.trim().length > 0 &&
      this.nuevaReferencia.trim().length > 50
    ) {
      this.referenciaError = 'La referencia no debe superar 50 caracteres';
    } else {
      this.referenciaError = '';
    }
  }

  // Validación general del formulario
  validarFormulario(): boolean {
    this.validarTitulo();
    this.validarLatitud();
    this.validarLongitud();

    if (this.tituloError || this.latError || this.lngError) {
      return false;
    }

    if (!this.titulo.trim()) {
      this.errorMessage = 'El título es requerido';
      return false;
    }

    if (this.titulo.trim().length > 100) {
      this.errorMessage = 'El título no debe superar 100 caracteres';
      return false;
    }

    // Valida coordenadas: si una está presente, la otra también debe estar
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

    if (tieneLatitud && (this.locLat! < -90 || this.locLat! > 90)) {
      this.errorMessage = 'La latitud debe estar entre -90 y 90';
      return false;
    }

    if (tieneLongitud && (this.locLng! < -180 || this.locLng! > 180)) {
      this.errorMessage = 'La longitud debe estar entre -180 y 180';
      return false;
    }

    return true;
  }

  // Agrega una nueva referencia
  agregarReferencia(): void {
    if (this.successMessage) {
      this.successMessage = '';
    }

    this.validarReferencia();
    if (this.referenciaError) {
      return;
    }

    const referenciaTrim = this.nuevaReferencia.trim();
    if (referenciaTrim.length === 0) {
      return;
    }

    // Verifica que no exista una misma referencia
    if (this.referencias.includes(referenciaTrim)) {
      this.referenciaError = 'Esta referencia ya existe';
      return;
    }

    this.referencias.push(referenciaTrim);
    this.nuevaReferencia = '';
    this.referenciaError = '';
  }

  // Elimina una referencia
  eliminarReferencia(index: number): void {
    if (this.successMessage) {
      this.successMessage = '';
    }

    this.referencias.splice(index, 1);
  }

  // Limpia el mensaje de éxito cuando el usuario vuelve a editar
  limpiarMensajeExito(): void {
    if (this.successMessage) {
      this.successMessage = '';
    }
  }

  // Guarda los cambios
  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validarFormulario()) {
      return;
    }

    if (!this.photoId) {
      this.errorMessage = 'ID de foto no válido';
      return;
    }

    this.isSaving = true;

    // Prepara los datos para actualizar
    const datosActualizacion: Partial<
      Omit<Foto, '_id' | 'url' | 'thumbnail' | 'usuario'>
    > = {
      titulo: this.titulo.trim(),
      referencias: this.referencias.filter((r) => r.trim().length > 0),
      fechaCreacion: new Date(this.fechaCreacion),
    };

    // Procesa la localización
    const localizacionObj: Localizacion | undefined =
      this.locNombre || this.locLat !== null || this.locLng !== null
        ? {
            nombre: this.locNombre.trim() || undefined,
            latitud: this.locLat ?? undefined,
            longitud: this.locLng ?? undefined,
          }
        : undefined;

    if (localizacionObj) {
      datosActualizacion.localizacion = localizacionObj;
    }

    // Actualiza la foto
    this.fotosService
      .actualizarFoto(this.photoId, datosActualizacion)
      .subscribe({
        next: (response) => {
          if (response.ok) {
            this.successMessage = 'Foto actualizada correctamente';
            this.isSaving = false;

            this.editSuccess.emit();
          } else {
            this.errorMessage = response.error || 'Error desconocido';
            this.isSaving = false;
          }
        },
        error: (error) => {
          console.error('Error al actualizar foto:', error);
          this.errorMessage =
            error.error?.error ||
            'Error al actualizar la foto. Intenta nuevamente.';
          this.isSaving = false;
        },
      });
  }

  // Resetea el formulario
  private resetForm(): void {
    this.titulo = '';
    this.referencias = [];
    this.nuevaReferencia = '';
    this.locNombre = '';
    this.locLat = null;
    this.locLng = null;
    this.fechaCreacion = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.tituloError = '';
    this.latError = '';
    this.lngError = '';
    this.referenciaError = '';
    this.currentPhoto = null;
  }

  // Cierra el modal
  handleClose(): void {
    if (this.isSaving || this.isLoadingPhoto) {
      return;
    }

    this.isSaving = false;
    this.resetForm();
    this.successMessage = '';
    this.closeModal.emit();
  }
}
