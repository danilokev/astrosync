import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

const DEFAULT_AVATAR = 'assets/logos/logo-profile.svg';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.css',
})
export class AvatarComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  profilePhoto = computed(() => {
    const user = this.authService.currentUser();
    if (user?.googleId && user?.avatarUrl) {
      return user.avatarUrl;
    }
    return DEFAULT_AVATAR;
  });

  redirectToLogin(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }
}
