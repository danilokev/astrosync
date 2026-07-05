import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LocalizationsService {
  private apiUrl = environment.apiUrl + '/localizaciones';

  constructor(private http: HttpClient) { }

  getLocalizations(){
    return this.http.get<any[]>(this.apiUrl);
  }

  // GET
  /*getLocalizaciones(favoritas?: boolean): Observable<any[]> {
    const params = favoritas ? { favoritas: 'true' } : {};
    return this.http.get<any[]>(this.apiUrl, { params });
  }*/

  // POST
  createLocalizacion(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  // POST /:id/favorita
  marcarFavorita(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/favorita`, {});
  }

  // DELETE
  deleteLocalizacion(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}





/*@Injectable({
  providedIn: 'root'
})
export class StarService {

  private apiUrl = environment.apiUrl + '/stars';

  constructor(private http: HttpClient) { }

  getStars(options: {
    ra?: number,
    dec?: number,
    radius?: number,
    magMax?: number
  }) {

    let params: any = {};

    if (options.magMax !== undefined)
      params.magMax = options.magMax.toString();

    if (options.ra !== undefined)
      params.ra = options.ra.toString();

    if (options.dec !== undefined)
      params.dec = options.dec.toString();

    if (options.radius !== undefined)
      params.radius = options.radius.toString();

    return this.http.get<any[]>(this.apiUrl, { params });
  }

}*/
