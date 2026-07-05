import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MetricsOverview {
  ok: boolean;
  data: {
    totalUsuarios: number;
    usuariosActivosPeriodo: number;
    totalFotos: number;
    favoritos: {
      estrellas: number;
      planetas: number;
      lunas: number;
    };
    registrosPeriodo: {
      labels: string[];
      data: number[];
    };
    fotosPeriodo: {
      labels: string[];
      data: number[];
    };
    periodDays: number;
  };
}

export interface RankingItem {
  label: string;
  tipo: 'star' | 'planet' | 'moon' | 'constellation';
  count: number;
}

export interface MetricsRanking {
  ok: boolean;
  data: RankingItem[];
}

@Injectable({
  providedIn: 'root',
})
export class MetricsService {
  private apiUrl = environment.apiUrl + '/metrics';

  constructor(private http: HttpClient) {}

  getOverview(days = 30): Observable<MetricsOverview> {
    return this.http.get<MetricsOverview>(
      `${this.apiUrl}/overview?days=${days}`,
    );
  }

  getRanking(): Observable<MetricsRanking> {
    return this.http.get<MetricsRanking>(`${this.apiUrl}/ranking`);
  }
}
