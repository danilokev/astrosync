import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  Evento,
  EVENTO_TIPO_ETIQUETA,
  formatEsFechaCorta,
} from '../../services/eventos.service';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [NgClass],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css',
})
export class EventDetailComponent {
  @Input({ required: true }) evento!: Evento;
  @Output() cerrar = new EventEmitter<void>();

  get etiquetaTipo(): string {
    return EVENTO_TIPO_ETIQUETA[this.evento.tipo] ?? this.evento.tipo;
  }

  get badgeClasses(): Record<string, boolean> {
    return {
      'event-detail__badge': true,
      [`event-detail__badge--${this.evento.tipo}`]: true,
    };
  }

  get fechaLargaPico(): string {
    const d = this.evento.fecha_pico;
    if (!d) return '';
    const s = new Date(d).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  get ventanaActividad(): boolean {
    return !!(this.evento.fecha_inicio && this.evento.fecha_fin);
  }

  get rangoActividad(): string {
    if (!this.ventanaActividad) return '';
    return `${formatEsFechaCorta(this.evento.fecha_inicio)} – ${formatEsFechaCorta(this.evento.fecha_fin)}`;
  }

  get textoUbicacion(): string {
    const u = this.evento.ubicacion;
    if (!u) return '';
    const nombre = u.nombre?.trim();
    if (nombre) {
      const coords =
        u.lat != null && u.lon != null
          ? ` (${u.lat.toFixed(2)}°, ${u.lon.toFixed(2)}°)`
          : '';
      return nombre + coords;
    }
    if (u.lat != null && u.lon != null) {
      return `${u.lat.toFixed(2)}°, ${u.lon.toFixed(2)}°`;
    }
    return '';
  }
}
