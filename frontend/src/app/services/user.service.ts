import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user';
import { HttpParams } from '@angular/common/http';


interface UsersQuery {
  page?: number;
  limit?: number;
  nombre?: string;
  apellidos?: string;
  email?: string;
  rol?: string;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl+'/users';

  constructor(private http: HttpClient) { }

  // Obtener todos los usuarios
  /*getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }*/

  getUsers(query: UsersQuery = {}): Observable<any> {
    let params = new HttpParams();

    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    if (query.nombre) params = params.set('nombre', query.nombre);
    if (query.apellidos) params = params.set('apellidos', query.apellidos);
    if (query.email) params = params.set('email', query.email);
    if (query.rol) params = params.set('rol', query.rol);
    if (query.search) params = params.set('search', query.search);

    return this.http.get<any>(this.apiUrl, { params });
  }

  // Modificar el usuario
  updateUser(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  // Eliminar el usuario
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
