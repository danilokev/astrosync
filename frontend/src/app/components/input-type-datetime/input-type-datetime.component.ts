import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-type-datetime',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './input-type-datetime.component.html',
  styleUrls: ['./input-type-datetime.component.scss']
})
export class InputTypeDatetimeComponent {
  @Input() label: string = 'Fecha'; 
  @Input() value: string = '';         // <── NECESARIO
  @Output() valueChange = new EventEmitter<string>(); // <── NECESARIO

  get dateForInput(): string {
    if (!this.value) return '';
    const [day, month, year] = this.value.split('/');
    return `${year}-${month}-${day}`;
  }

  onDateChange(event: any) {
    const dateStr = event.target.value;
    if (!dateStr) {
      this.valueChange.emit('');
      return;
    }
    const [year, month, day] = dateStr.split('-');
    this.valueChange.emit(`${day}/${month}/${year}`);
  }
}
