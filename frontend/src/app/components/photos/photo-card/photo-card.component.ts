import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-photo-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-card.component.html',
  styleUrl: './photo-card.component.css',
})
export class PhotoCardComponent {
  @Input() imageUrl: string = '';
  @Input() photoName: string = 'Sin título';
  @Input() photoId?: string;
  @Input() photoDate?: string;
  @Input() location?: string;

  // Evt emitido cuando se pulsa el botón eliminar
  @Output() onDelete = new EventEmitter<string>();

  // Evt cuando se pulsa editar
  @Output() onEdit = new EventEmitter<string>();

  // Evt cuando se hace clic en la tarjeta para ver detalles
  @Output() onClick = new EventEmitter<string>();

  showActions: boolean = false; // Controla la visibilidad de los botones

  // Maneja el clic en el botón eliminar
  handleDelete(event: Event): void {
    event.stopPropagation(); // evita que se propague el evt
    if (this.photoId) {
      this.onDelete.emit(this.photoId);
    }
  }

  // Maneje el clic en el botón editar
  handleEdit(event: Event): void {
    event.stopPropagation();
    if (this.photoId) {
      this.onEdit.emit(this.photoId);
    }
  }

  // Clic en la tarjeta para ver detalles
  handleClick(): void {
    if (this.photoId) {
      this.onClick.emit(this.photoId);
    }
  }
}
