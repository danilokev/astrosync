import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="loading-state"
      [class.text-center]="textCenter"
      [class]="sizeClass"
    >
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p *ngIf="text" class="loading-text">{{ text }}</p>
    </div>
  `,
  styleUrls: ['./loading.component.css'],
})
export class LoadingComponent {
  @Input() text?: string;
  @Input() textCenter = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get sizeClass(): string {
    return `loading-${this.size}`;
  }
}
