import { Component, Input, Optional, Self } from '@angular/core';
import {
  ControlValueAccessor,
  NgControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input-type-text',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './input-type-text.component.html',
  styleUrl: './input-type-text.component.css',
})
export class InputTypeTextComponent implements ControlValueAccessor {
  @Input() label: string = ''; // Texto del label
  @Input() placeholder: string = ''; // Placeholder opcional
  @Input() type: 'text' | 'password' | 'email' = 'text'; // Tipo de input permitido
  @Input() name: string = '';

  private innerValue: string = ''; // Valor interno del componente

  // Callbacks
  private onChangeFn: (value: string) => void = () => {};
  private onTouchedFn: () => void = () => {};

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  // Obtiene el valor actual
  get value(): string {
    return this.innerValue;
  }

  // Notifica cambios al formulario
  set value(val: string) {
    if (val !== this.innerValue) {
      this.innerValue = val;
      this.onChangeFn(val);
    }
  }

  writeValue(value: string): void {
    this.innerValue = value || '';
  }

  // Se ejecuta cuando el valor cambia
  registerOnChange(fn: (value: string) => void): void {
    this.onChangeFn = fn;
  }

  // Se ejecuta cuando el campo es "tocado"
  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  // Maneja el evento input del campo
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
  }

  // Maneja el evento cuando el campo pierde el foco
  onBlur(): void {
    this.onTouchedFn();
  }
}
