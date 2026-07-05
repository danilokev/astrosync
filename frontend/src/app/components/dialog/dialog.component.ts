import {
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.css',
})
export class DialogComponent {
  @Input() dialogMessage!: string;
  @Input() dialogMessageObj!: { [key: string]: boolean };
  @Input() dialogTitle!: string;
  @Input() closeButtonText!: string;
  @Input() confirmButtonText!: string;

  @Output() confirmed = new EventEmitter<string>();
  @Output() canceled = new EventEmitter<void>();

  @ViewChild('dialogContent') dialogContent!: TemplateRef<any>;

  private modalRef: NgbModalRef | null = null;

  constructor(private modalService: NgbModal) {}

  open() {
    if (this.dialogContent) {
      this.modalRef = this.modalService.open(this.dialogContent, {
        centered: true,
        backdrop: 'static',
        keyboard: false,
      });
    }
  }

  confirm() {
    this.confirmed.emit();
    this.close();
  }

  close() {
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
  }

  onCancel() {
    this.canceled.emit();
    this.close();
  }

  get keysReversed(): string[] {
    return this.dialogMessageObj ? Object.keys(this.dialogMessageObj) : [];
  }
}
