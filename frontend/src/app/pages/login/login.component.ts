import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderAuthComponent } from '../../components/header-auth/header-auth.component';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule, HeaderAuthComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  
  // Estado del componente
  public loginForm!: FormGroup;
  public errorMessage: string | null = null;
  public isLoading = false;
  public showPassword = false;

  constructor(private uiService: UiService) {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
  this.uiService.activeTabKey.set(null);
    this.uiService.activeTabIndex.set(0);
    this.uiService.clearPanel();
  }

  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  public login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage = 'Por favor completa todos los campos correctamente';
      return;
    }

    const loginData = {
      email: this.loginForm.get('email')?.value?.trim().toLowerCase(),
      password: this.loginForm.get('password')?.value,
    };

    // Mostrar estado de carga
    this.isLoading = true;
    this.errorMessage = null;

    this.authService.login(loginData).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/app']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          typeof err === 'string'
            ? err
            : err?.message || 'Error al iniciar sesión. Intenta de nuevo.';
      },
    });
  }

  public loginWithGoogle(): void {
    try {
      this.authService.loginWithGoogle();
    } catch (error) {
      this.errorMessage = 'No se pudo iniciar sesión con Google';
    }
  }
}
