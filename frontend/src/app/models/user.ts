export interface User {
  uid: string;
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  googleId?: string;
  avatarUrl?: string | null;
  cuerposCelestesFav: string[];
  lugaresFav: string[];
  baneado: boolean;
  rol: string;
}
