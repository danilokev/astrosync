import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  OnChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input-type-file',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './input-type-file.component.html',
  styleUrl: './input-type-file.component.css',
})
export class InputTypeFileComponent implements OnChanges {
  @Input() label: string = 'Archivo';
  @Input() acceptTypes?: string;
  @Input() reset: boolean = false;
  @Output() fileSelected = new EventEmitter<File | null>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isDragging = false;
  selected = false;
  fileName: string = '';
  fileSize: number = 0;

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileSelected.emit(file);
      this.selected = true;
      this.fileName = file.name;
      this.fileSize = file.size;
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
      this.selected = true;
      this.fileName = file.name;
      this.fileSize = file.size;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave() {
    this.isDragging = false;
  }

  clearFile(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.fileSelected.emit(null);
    this.selected = false;
    this.fileName = '';
    this.fileSize = 0;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);

    return `${size.toFixed(size < 10 ? 2 : 1)} ${units[i]}`;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reset'] && changes['reset'].currentValue && this.fileInput) {
      this.clearFile();
    }
  }
}
