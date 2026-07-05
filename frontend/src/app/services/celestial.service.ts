import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CelestialService {
  private apiUrl = environment.apiUrl + '/celestial/star';

  constructor(private http: HttpClient) {}

  getCelestialInfo(params: {
    hip?: string | number;
    hd?: string | number;
    hr?: string | number;
    gl?: string | number;
    name?: string;
  }): Observable<any> {
    const queryParams: any = {};

    if (params.hip) queryParams.hip = params.hip;
    if (params.hd) queryParams.hd = params.hd;
    if (params.hr) queryParams.hr = params.hr;
    if (params.gl) queryParams.gl = params.gl;
    if (params.name) queryParams.name = params.name;

    return this.http.get<any>(this.apiUrl, { params: queryParams });
  }

  getConstellationByCode(code: string) {
    const constUrl = `${environment.apiUrl}/constelaciones/${code}`;
    return this.http.get(constUrl);
  }

  searchConstellations(term: string) {
    return this.http.get<any>(`${environment.apiUrl}/constelaciones/search`, {
      params: { term },
    });
  }
}
