import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input() variant: string = 'primary';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  @Input() dataToggle?: string;
  @Input() dataTarget?: string;

  @Input() disabled?: boolean = false;
}
