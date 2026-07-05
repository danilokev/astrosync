import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | '';
  delay?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastOptions | null>(null);
  toast$ = this.toastSubject.asObservable();

  show(options: ToastOptions) {
    this.toastSubject.next({ ...options });
  }

  reset() {
    this.toastSubject.next(null);
  }

  success(title: string, message: string, delay?: number) {
    this.show({ title, message, type: 'success', delay });
  }

  error(title: string, message: string, delay?: number) {
    this.show({ title, message, type: 'error', delay });
  }

  warning(title: string, message: string, delay?: number) {
    this.show({ title, message, type: 'warning', delay });
  }

  info(title: string, message: string, delay?: number) {
    this.show({ title, message, type: 'info', delay });
  }

  hide() {
    this.toastSubject.next(null);
  }
}
