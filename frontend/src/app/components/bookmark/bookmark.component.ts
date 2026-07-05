import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bookmark',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bookmark.component.html',
  styleUrl: './bookmark.component.css',
})
export class BookmarkComponent {
  @Input() isActive: boolean = false;
  @Input() size: string = '28px';
  @Input() color: string = '#f8f0f8';
  @Input() activeColor: string = '#FFD500';
  @Input() strokeWidth: number = 2;

  @Output() bookmarkToggled = new EventEmitter<boolean>();

  toggleBookmark() {
    this.isActive = !this.isActive;
    this.bookmarkToggled.emit(this.isActive);
  }
}
