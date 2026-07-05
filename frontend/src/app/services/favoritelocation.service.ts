import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FavoritelocationService {
  private baseUrl = environment.apiUrl + '/localizaciones';

  private refresh$ = new BehaviorSubject<void>(undefined);
  refreshChanges$ = this.refresh$.asObservable()

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any[]>(this.baseUrl, {
    });
  }

  create(latitud: number, longitud: number, usuarioId: string) {
    return this.http.post<any>(this.baseUrl, {
      latitud,
      longitud,
      usuarioId
    }).pipe(
      tap(() => this.refresh$.next())
    );
  }

  deleteById(id: string) {
    return this.http.delete(
      `${this.baseUrl}/${id}`,
      { withCredentials: true }
    ).pipe(
      tap(() => this.refresh$.next())
    );
  }
}
