import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface UsuarioInfo {
  _id?: string;
  nombre?: string;
  apellidos?: string;
  email?: string;
}

export interface Foto {
  _id: string;
  titulo: string;
  url: string;
  thumbnail: string;
  referencias?: string | string[];
  localizacion?: {
    latitud?: number;
    longitud?: number;
    nombre?: string;
  };
  usuario: string | UsuarioInfo;
  fechaCreacion: Date;
  privada: boolean;
}

export interface Localizacion {
  nombre?: string;
  latitud?: number;
  longitud?: number;
}

interface FotosResponse {
  ok: boolean;
  fotos?: Foto[];
  foto?: Foto;
  msg?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FotosService {
  private readonly API_URL = `${environment.apiUrl}/fotos`;

  // Mantiene sincronizada la galería
  private fotosSubject = new BehaviorSubject<Foto[]>([]);
  public fotos$ = this.fotosSubject.asObservable();

  // Para las notificaciones de carga en progeso
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.cargarFotos().subscribe();
  }

  // Obtiene todas las fotos del usuario autenticado
  cargarFotos(): Observable<FotosResponse> {
    this.isLoadingSubject.next(true);

    return this.http.get<FotosResponse>(this.API_URL).pipe(
      tap((response) => {
        if (response.ok && response.fotos) {
          this.fotosSubject.next(response.fotos);
        }
        this.isLoadingSubject.next(false);
      }),
      catchError((error) => {
        // console.error('Error al cargar fotos:', error);
        this.isLoadingSubject.next(false);
        throw error;
      }),
    );
  }

  // Obtiene una foto específica por ID
  obtenerFoto(id: string): Observable<FotosResponse> {
    if (!id?.trim()) {
      throw new Error('ID de foto inválido');
    }

    this.isLoadingSubject.next(true);

    return this.http.get<FotosResponse>(`${this.API_URL}/${id}`).pipe(
      tap(() => {
        this.isLoadingSubject.next(false);
      }),
      catchError((error) => {
        // console.error(`Error al obtener foto con ID ${id}`, error);
        this.isLoadingSubject.next(false);
        throw error;
      }),
    );
  }

  // Sube una foto al servidor
  subirFoto(
    file: File,
    titulo: string,
    referencias?: string[],
    localizacion?: Localizacion,
    fechaCreacion?: Date,
  ): Observable<FotosResponse> {
    this.isLoadingSubject.next(true);

    const formData = new FormData();
    formData.append('foto', file);
    formData.append('titulo', titulo.trim());

    // Añade referencias si se proporcionan
    if (referencias?.length) {
      formData.append('referencias', JSON.stringify(referencias));
    }

    // Añade localización se se proporciona
    if (localizacion) {
      formData.append('localizacion', JSON.stringify(localizacion));
    }

    // Añade fecha de creación si se proporciona
    if (fechaCreacion) {
      formData.append('fechaCreacion', fechaCreacion.toISOString());
    }

    return this.http.post<FotosResponse>(this.API_URL, formData).pipe(
      tap((response) => {
        if (response.ok && response.foto) {
          const fotosActuales = this.fotosSubject.value;
          this.fotosSubject.next([response.foto, ...fotosActuales]);
        }
        this.isLoadingSubject.next(false);
      }),
      catchError((error) => {
        // console.error('Error al subir foto:', error);
        this.isLoadingSubject.next(false);
        throw error;
      }),
    );
  }

  // Actualiza los metadatos de una foto existente
  actualizarFoto(
    id: string,
    datos: Partial<Omit<Foto, '_id' | 'url' | 'thumbnail' | 'usuario'>>,
  ): Observable<FotosResponse> {
    if (!id?.trim()) {
      throw new Error('ID de foto inválido');
    }

    this.isLoadingSubject.next(true);

    return this.http.put<FotosResponse>(`${this.API_URL}/${id}`, datos).pipe(
      tap((response) => {
        if (response.ok && response.foto) {
          const fotos = this.fotosSubject.value.map((f) =>
            f._id === id ? response.foto! : f,
          );
          this.fotosSubject.next(fotos);
        }
        this.isLoadingSubject.next(false);
      }),
      catchError((error) => {
        // console.error(`Error al actualizar foto con ID ${id}:`, error);
        this.isLoadingSubject.next(false);
        throw error;
      }),
    );
  }

  // Elimina una foto del servidor y de la galería
  eliminarFoto(id: string): Observable<FotosResponse> {
    if (!id?.trim()) {
      throw new Error('ID de foto inválido');
    }

    this.isLoadingSubject.next(true);

    return this.http.delete<FotosResponse>(`${this.API_URL}/${id}`).pipe(
      tap((response) => {
        if (response.ok) {
          const fotos = this.fotosSubject.value.filter((f) => f._id !== id);
          this.fotosSubject.next(fotos);
        }
        this.isLoadingSubject.next(false);
      }),
      catchError((error) => {
        // console.error(`Error al eliminar foto con ID ${id}:`, error);
        this.isLoadingSubject.next(false);
        throw error;
      }),
    );
  }

  // Obtiene el array actual de fotos
  obtenerFotosActuales(): Foto[] {
    return this.fotosSubject.value;
  }

  // Obtiene la URL completa de un archivo (foto o thumbnail)
  construirUrlArchivo(nombreArchivo: string): string {
    return `${environment.imageUrl}/${nombreArchivo}`;
  }
}
