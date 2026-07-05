import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ToastService, ToastOptions } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent implements OnInit, OnDestroy {
  @Input() type?: string = '';
  @Input() delay: number = 7000;

  title: string = 'Título';
  message: string = 'Texto de mensaje';
  show = false;

  private destroy$ = new Subject<void>();

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.toastService.toast$
      .pipe(takeUntil(this.destroy$))
      .subscribe((toast: ToastOptions | null) => {
        if (toast) {
          this.showToast(
            toast.title,
            toast.message,
            toast.type || this.type,
            toast.delay,
          );
        }
      });
  }

  showToast(title: string, message: string, type?: string, delay?: number) {
    this.title = title;
    this.message = message;
    if (type) this.type = type;
    this.show = true;

    setTimeout(() => {
      this.hide();
      this.toastService.reset();
    }, delay || this.delay);
  }

  hide() {
    this.show = false;
    this.toastService.reset();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
