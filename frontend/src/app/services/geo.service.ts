import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GeoService {
  constructor(private http: HttpClient) {}
  private apiUrl = environment.apiUrl + '/localizaciones';

  getPlaceName(lat: number, lon: number): Observable<string> {
    const url = `${this.apiUrl}/nombre-lugar?lat=${lat}&lon=${lon}`;
    return this.http.get<{ nombre: string }>(url).pipe(
      map(res => {
        // Extrae solo la primera parte antes de la primera coma
        const nombreCompleto = res.nombre || '';
        const primeraParte = nombreCompleto.split(',')[0].trim();
        return primeraParte;
      })
    );
  }
}