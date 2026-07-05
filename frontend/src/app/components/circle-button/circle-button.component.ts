import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-circle-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './circle-button.component.html',
  styleUrl: './circle-button.component.css',
})
export class CircleButtonComponent {
  // Define la clase del icono: bi-plus-circle, bi-arrow-left-circle
  @Input() icon: string = '';

  // Texto que se muestra como tooltip (título)
  @Input() title: string = '';

  @Input() colorClass: string = 'text-white';

  @Output() action = new EventEmitter<void>();

  handleClick() {
    this.action.emit();
  }
}
