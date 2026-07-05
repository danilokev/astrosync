import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
})
export class SearchComponent {
  searchText = '';

  @Input() showFilter = true;
  @Input() placeholder = 'Buscar...';

  @Output() toggle = new EventEmitter<void>();
  @Output() valueChange = new EventEmitter<string>();
  @Output() cleared = new EventEmitter<void>();

  // Notifica cambios al padre
  onChange(value: string) {
    this.searchText = value;
    this.valueChange.emit(value);
  }

  // Limpia el input y notifica
  onClear() {
    this.searchText = '';
    this.valueChange.emit('');
    this.cleared.emit();
  }
}
