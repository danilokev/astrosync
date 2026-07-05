import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import {
  Evento,
  EVENTO_TIPO_ETIQUETA,
  formatEsFechaCorta,
} from '../../services/eventos.service';

@Component({
  selector: 'app-eventcard',
  standalone: true,
  imports: [DatePipe, NgClass],
  templateUrl: './eventcard.component.html',
  styleUrl: './eventcard.component.css',
})
export class EventcardComponent {
  @Input({ required: true }) evento!: Evento;
  @Output() selectEvento = new EventEmitter<Evento>();

  get etiquetaTipo(): string {
    return EVENTO_TIPO_ETIQUETA[this.evento.tipo] ?? this.evento.tipo;
  }

  get badgeClasses(): Record<string, boolean> {
    return {
      'event-card__badge': true,
      [`event-card__badge--${this.evento.tipo}`]: true,
    };
  }

  get ubicacionCorta(): string {
    return this.evento.ubicacion?.nombre?.trim() ?? '';
  }

  get rangoActividad(): string {
    const ini = this.evento.fecha_inicio;
    const fin = this.evento.fecha_fin;
    if (!ini || !fin) return '';
    return `${formatEsFechaCorta(ini)} – ${formatEsFechaCorta(fin)}`;
  }

  get mejorHoraLocal(): string {
    return this.evento.mejor_hora_local?.trim() ?? '';
  }

  onRowActivate(): void {
    this.selectEvento.emit(this.evento);
  }
}
