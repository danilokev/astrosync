import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CookieBannerComponent } from '../components/cookie-banner/cookie-banner.component';
import { PrivacyPolicyComponent } from '../pages/privacy-policy/privacy-policy.component';

interface Star {
  x: number;
  y: number;
  z: number;
  pz: number;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    CookieBannerComponent,
    PrivacyPolicyComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Estado modales legales ──
  showPolicy      = false;
  showCookiePrefs = false;

  private stars: Star[] = [];
  private speed = 3;
  private starCount = 1000;
  private animationFrameId: number = 0;
  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initStarfield();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupCanvasSize();
    }
  }

  private initStarfield() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvasSize();

    for (let i = 0; i < this.starCount; i++) {
      this.stars.push(this.createStar());
    }

    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private setupCanvasSize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvasRef.nativeElement.width = this.width;
    this.canvasRef.nativeElement.height = this.height;
  }

  private createStar(): Star {
    return {
      x: Math.random() * 2000 - 1000,
      y: Math.random() * 2000 - 1000,
      z: Math.random() * 2000,
      pz: 0,
    };
  }

  private animate() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];

      star.z -= this.speed;

      if (star.z <= 0) {
        star.z = this.width;
        star.x = Math.random() * 2000 - 1000;
        star.y = Math.random() * 2000 - 1000;
        star.pz = star.z;
      }

      const x = (star.x / star.z) * this.width + cx;
      const y = (star.y / star.z) * this.height + cy;

      const radius = Math.max(0.05, 1.5 * (1 - star.z / this.width));

      this.ctx.beginPath();
      const alpha = 1 - star.z / this.width;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      const px = (star.x / (star.z + this.speed * 3)) * this.width + cx;
      const py = (star.y / (star.z + this.speed * 3)) * this.height + cy;

      this.ctx.beginPath();
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.lineWidth = radius;
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(px, py);
      this.ctx.stroke();

      star.pz = star.z;
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
}