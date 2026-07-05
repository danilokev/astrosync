import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-favorite-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './favorite-card.component.html',
  styleUrl: './favorite-card.component.css',
})
export class FavoriteCardComponent {
  @Input() title: string = '';
  @Input() imageUrl: string = '';
  @Input() tipo: 'star' | 'planet' | 'moon' | 'constellation' | undefined =
    undefined;

  @Output() location = new EventEmitter<string>();
  @Output() delete = new EventEmitter<void>();

  get tipoIcon(): string {
    if (this.tipo === 'moon') return 'bi-moon-fill';
    if (this.tipo === 'planet') return 'bi-globe-americas-fill';
    if (this.tipo === 'constellation') return 'bi-stars';
    return 'bi-star-fill';
  }

  get tipoLabel(): string {
    if (this.tipo === 'moon') return 'Satélite natural';
    if (this.tipo === 'planet') return 'Planeta';
    if (this.tipo === 'constellation') return 'Constelación';
    return 'Estrella';
  }

  onLocation() {
    this.location.emit(this.title);
  }
  onDelete() {
    this.delete.emit();
  }
}
