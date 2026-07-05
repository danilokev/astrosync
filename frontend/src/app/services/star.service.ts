import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StarService {
  private apiUrl = environment.apiUrl + '/stars';

  constructor(private http: HttpClient) {}

  // Obtener estrellas
  getStars(options: {
    ra?: number;
    dec?: number;
    radius?: number;
    magMax?: number;
  }) {
    let params: any = {};

    if (options.magMax !== undefined) params.magMax = options.magMax.toFixed(2);

    if (options.ra !== undefined) params.ra = options.ra.toString();

    if (options.dec !== undefined) params.dec = options.dec.toString();

    if (options.radius !== undefined) params.radius = options.radius.toString();

    return this.http.get<any[]>(this.apiUrl, { params });
  }

  // Cargar estrellas en la BD
  /*importStars(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(this.apiUrl+'/import', formData);
  }*/

  importStars(file: File): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(this.apiUrl + '/import', formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  // Búsqueda de estrellas y autocompletado
  searchStars(
    term: string,
    limit: number = 5,
    skip: number = 0,
  ): Observable<any> {
    const params = new HttpParams()
      .set('term', term)
      .set('limit', limit.toString())
      .set('skip', skip.toString());

    return this.http.get<any>(`${this.apiUrl}/search`, { params });
  }

  /* Prueba con progreso */
  /*importStars(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(this.apiUrl+'/import', formData);
  }

  getImportProgress() {
    return this.http.get<{ status: string; progress: number }>(this.apiUrl+'/import/progress');
  }*/
}
