import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { EngineComponent } from './pages/facade-engine/facade-engine.component';
import { LandingComponent } from './landing/landing.component';
import { RegisterComponent } from './pages/register/register.component';
import { AdminComponent } from './pages/admin/admin.component';
import { adminGuard } from './guards/admin.guard';
import { GraficMotorComponent } from './components/grafic-motor/grafic-motor.component';
import { logoutGuard } from './guards/logout.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    title: 'AstroSync - Explora el Universo en 3D',
  },
  {
    path: 'app',
    component: EngineComponent,
  },
  {
    path: 'login',
    component: LoginComponent,

  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [adminGuard],
  },
  {
    path: 'grafic-motor',
    component: GraficMotorComponent
  },
  {
    path: '**',
    redirectTo: '',
  },
];
