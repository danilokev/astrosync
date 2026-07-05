import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PeriodPreset {
  label: string;
  days: number;
}

@Component({
  selector: 'app-period-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './period-filter.component.html',
  styleUrl: './period-filter.component.css',
})
export class PeriodFilterComponent {
  @Input() selectedDays = 30;
  @Output() periodChange = new EventEmitter<number>();

  readonly presets: PeriodPreset[] = [
    { label: '7 días', days: 7 },
    { label: '30 días', days: 30 },
    { label: '90 días', days: 90 },
    { label: '1 año', days: 365 },
  ];

  select(days: number): void {
    this.selectedDays = days;
    this.periodChange.emit(days);
  }
}
