import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlanetsService {

  private apiUrl = environment.apiUrl + '/cuerposCelestes';

    constructor(private http: HttpClient) {}

    getPlanetById(id: string): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/${id}`);
    }

    getPlanets(): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}`);
    }

    searchPlanets(term: string) {
      return this.http.get<any>(`${this.apiUrl}/search`, {
        params: { term }
      });
    }
}
