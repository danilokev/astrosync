import {
  Component,
  EventEmitter,
  Output,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-select',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './input-select.component.html',
  styleUrl: './input-select.component.css',
})
export class InputSelectComponent implements OnChanges {
  selectedValue: string = '';

  @Output() selectionChange = new EventEmitter<string>();
  @Input() defaultValue: string = '';

  ngOnInit() {
    this.selectedValue = this.defaultValue;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['defaultValue'] && this.defaultValue) {
      this.selectedValue = this.defaultValue;
    }
  }

  onChange(value: string) {
    this.selectedValue = value;
    this.selectionChange.emit(value);
  }
}
