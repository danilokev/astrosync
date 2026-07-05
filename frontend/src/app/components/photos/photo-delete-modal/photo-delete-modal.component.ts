import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-photo-delete-modal',
  standalone: true,
  imports: [],
  templateUrl: './photo-delete-modal.component.html',
  styleUrl: './photo-delete-modal.component.css',
})
export class PhotoDeleteModalComponent {
  @Input() isOpen: boolean = false;
  @Input() photoTitle: string = '';
  @Input() isDeleting: boolean = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  handleConfirm(): void {
    this.confirm.emit();
  }

  handleCancel(): void {
    this.cancel.emit();
  }
}
