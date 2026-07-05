import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FavoriteCelestial {
  _id?: string;
  label: string;
  extract?: string;
  wikidataImage?: string;
  wikipediaUrl?: string;
  tipo?: 'star' | 'planet' | 'moon' | 'constellation';
}

@Injectable({ providedIn: 'root' })
export class FavoriteAstroService {
  private baseUrl = environment.apiUrl + '/favoritos';

  private refresh$ = new BehaviorSubject<void>(undefined);
  refreshChanges$ = this.refresh$.asObservable();

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any[]>(this.baseUrl, { withCredentials: true });
  }

  create(celestial: FavoriteCelestial) {
    return this.http
      .post<any>(this.baseUrl, celestial, { withCredentials: true })
      .pipe(tap(() => this.refresh$.next()));
  }

  deleteById(id: string) {
    return this.http
      .delete(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(tap(() => this.refresh$.next()));
  }
}
