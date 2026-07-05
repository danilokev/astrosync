import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-icon-btn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './icon-btn.component.html',
  styleUrl: './icon-btn.component.css',
})
export class IconBtnComponent {
  @Input() icon: string = '';
  @Input() title: string = ''; // tooltip
  @Input() colorClass: string = 'text-white';

  @Output() action = new EventEmitter<void>();

  handleClick() {
    this.action.emit();
  }
}
