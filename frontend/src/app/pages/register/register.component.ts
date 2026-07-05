import { Component, inject, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule, HeaderAuthComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  public registerForm!: FormGroup;
  public errorMessage: string | null = null;
  public isLoading = false;
  public showPassword = false;

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
        ],
      ],
      apellidos: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(128),
        ],
      ],
      acceptTerms: [false, [Validators.requiredTrue]],
    });
  }

  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  register() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Por favor completa todos los campos correctamente';
      return;
    }

    const registerData = {
      nombre: this.registerForm.get('nombre')?.value?.trim(),
      apellidos: this.registerForm.get('apellidos')?.value?.trim(),
      email: this.registerForm.get('email')?.value?.trim().toLowerCase(),
      password: this.registerForm.get('password')?.value,
    };

    this.isLoading = true;
    this.errorMessage = null;

    this.authService.register(registerData).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login'], {
          queryParams: { registered: true },
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          typeof err === 'string'
            ? err
            : err?.message || 'Error al registrarse. Intenta de nuevo.';
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
