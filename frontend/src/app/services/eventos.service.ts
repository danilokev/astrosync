import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Ubicacion {
  lat: number;
  lon: number;
  nombre?: string;
}

export type TipoEvento =
  | 'eclipse_solar'
  | 'eclipse_lunar'
  | 'meteor_shower'
  | 'supermoon';

export const EVENTO_TIPO_ETIQUETA: Record<TipoEvento, string> = {
  eclipse_solar: 'Eclipse solar',
  eclipse_lunar: 'Eclipse lunar',
  meteor_shower: 'Lluvia de meteoros',
  supermoon: 'Superluna',
};

// Función de utilidad para formatear fechas en formato corto español
export function formatEsFechaCorta(iso: string | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export interface Evento {
  _id: string;
  nombre: string;
  tipo: TipoEvento;
  ubicacion?: Ubicacion;
  fecha_pico: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  hora_pico_utc?: string;
  mejor_hora_local?: string;
  descripcion?: string;
  imagen_url?: string;
  fuente: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  msg?: string;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EventosService {
  private baseUrl = `${environment.apiUrl}/eventos`;
  private readonly tiposValidos: TipoEvento[] = [
    'eclipse_solar',
    'eclipse_lunar',
    'meteor_shower',
    'supermoon',
  ];

  constructor(private http: HttpClient) {}

  // Obtiene todos los eventos con filtrados opcionales (tipo, mes)
  getEventos(
    tipo?: TipoEvento,
    mes?: number,
  ): Observable<ApiResponse<Evento[]>> {
    let params = new HttpParams();

    if (tipo && !this.validarTipo(tipo)) {
      return throwError(() => new Error(`Tipo de evento inválido: ${tipo}`));
    }

    if (tipo) {
      params = params.set('tipo', tipo);
    }

    if (mes !== undefined) {
      if (!this.validarMes(mes)) {
        return throwError(
          () => new Error('El mes debe ser un número entre 1 y 12'),
        );
      }
      params = params.set('mes', mes.toString());
    }

    return this.http
      .get<ApiResponse<Evento[]>>(this.baseUrl, { params })
      .pipe(catchError(this.handleError));
  }

  // Obtiene un evento específico por ID
  getEvento(id: string): Observable<ApiResponse<Evento>> {
    if (!this.esObjectIdValido(id)) {
      return throwError(() => new Error('ID de evento inválido o mal formado'));
    }

    return this.http
      .get<ApiResponse<Evento>>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Obtiene los próximos 5 eventos
  getProximosEventos(): Observable<ApiResponse<Evento[]>> {
    return this.http
      .get<ApiResponse<Evento[]>>(`${this.baseUrl}/proximos`)
      .pipe(catchError(this.handleError));
  }

  // Métodos de validación
  private validarMes(mes: number): boolean {
    return Number.isInteger(mes) && mes >= 1 && mes <= 12;
  }

  private validarTipo(tipo: string): tipo is TipoEvento {
    return this.tiposValidos.includes(tipo as TipoEvento);
  }

  private esObjectIdValido(id: string): boolean {
    return !!id && /^[0-9a-fA-F]{24}$/.test(id);
  }

  // Manejo de Errores HTTP
  private handleError(
    error: HttpErrorResponse | ErrorEvent,
  ): Observable<never> {
    let errorMessage = 'Error al consultar eventos';

    if (error instanceof HttpErrorResponse) {
      if (error.error && typeof error.error === 'object') {
        errorMessage = error.error.msg || error.error.error || error.message;
      } else if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else {
        errorMessage = `Error ${error.status}: ${error.statusText || 'Error desconocido'}`;
      }
    } else if (error instanceof ErrorEvent) {
      errorMessage = error.message;
    }

    console.error('Error en EventosService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
