import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [ButtonComponent, FormsModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css'
})
export class PaginationComponent {
  // totalPages = 250;
  // currentPage = 1;

  @Input() totalPages: number = 1;
  @Input() currentPage: number = 1;
  @Output() valueChange = new EventEmitter<number>();

  // Cambio de valor
  onChange(value: string | null) {
    const page = Number(value);

    if (!Number.isInteger(page) || page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.valueChange.emit(page);
  }

  // Enter pulsado
  onEnter(input: HTMLInputElement) {
    input.blur(); // quitar foco
    input.value = this.currentPage.toString();
  }

  previousPage(){
    if(this.currentPage>1){
      this.currentPage--;
      this.valueChange.emit(this.currentPage);
    }
  }

  nextPage(){
    if(this.currentPage<this.totalPages){
      this.currentPage++;
      this.valueChange.emit(this.currentPage);
    }
  }
}
