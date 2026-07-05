import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

export interface AuthSessionUser {
  uid: string;
  nombre: string;
  apellidos: string;
  rol: string;
  email?: string;
  googleId?: string;
  avatarUrl?: string | null;
}

import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import {
  catchError,
  finalize,
  map,
  Observable,
  of,
  tap,
  throwError,
} from 'rxjs';

interface LoginForm {
  email: string;
  password?: string;
}

interface RegisterForm {
  nombre: string;
  apellidos: string;
  email: string;
  password?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public isAuthenticated = signal<boolean>(false);
  public currentUser = signal<AuthSessionUser | null>(null);
  public authCheckComplete = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.checkAuthentication().subscribe();
  }

  checkAuthentication(): Observable<boolean> {
    return this.http.get<any>(`${environment.apiUrl}/auth/check`).pipe(
      map((response) => {
        this.isAuthenticated.set(true);
        this.currentUser.set(response);
        this.authCheckComplete.set(true);
        return true;
      }),
      catchError((err) => {
        this.isAuthenticated.set(false);
        this.currentUser.set(null);
        this.authCheckComplete.set(true);
        return of(false);
      }),
    );
  }

  login(formData: LoginForm): Observable<boolean> {
    return this.http
      .post<any>(`${environment.apiUrl}/auth/login`, formData)
      .pipe(
        tap((response) => {
          this.isAuthenticated.set(true);
          this.currentUser.set(response);
        }),
        map(() => true),
        catchError((err) => {
          return throwError(() => err.error.msg);
        }),
      );
  }

  register(formData: RegisterForm): Observable<boolean> {
    return this.http
      .post<any>(`${environment.apiUrl}/auth/register`, formData)
      .pipe(
        tap(() => {
          this.router.navigate(['/login']);
        }),
        catchError((err) => {
          return throwError(() => err.error.error || err.error.msg);
        }),
      );
  }

  // Redirige al endpoint de Google OAuth
  loginWithGoogle(): void {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  logout(): void {
    const clearLocalSession = () => {
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
    };

    this.http
      .post(`${environment.apiUrl}/auth/logout`, {})
      .pipe(
        tap({
          next: clearLocalSession,
          error: clearLocalSession,
        }),
        finalize(() => {
          this.router.navigate(['/app']);
        }),
      )
      .subscribe();
  }
}
