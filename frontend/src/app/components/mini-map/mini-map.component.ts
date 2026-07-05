import {
  Component,
  Input,
  OnChanges,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mini-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-map.component.html',
  styleUrls: ['./mini-map.component.css'],
})
export class MiniMapComponent implements OnChanges, AfterViewInit {

  @Input() lat!: number;
  @Input() lon!: number;
  @Output() miniMapClicked = new EventEmitter<void>();
  
  @ViewChild('mapImg') mapImg!: ElementRef<HTMLImageElement>;

  markerX = 0;
  markerY = 0;

  private mapWidth = 0;
  private mapHeight = 0;

  ngAfterViewInit(): void {
    // Esperamos a que la imagen tenga tamaño real
    setTimeout(() => {
      this.mapWidth = this.mapImg.nativeElement.clientWidth;
      this.mapHeight = this.mapImg.nativeElement.clientHeight;
      this.updateMarkerPosition();
    });
  }

  ngOnChanges(): void {
    this.updateMarkerPosition();
  }

  private updateMarkerPosition() {
    if (!this.mapWidth || !this.mapHeight) return;

    const lonOffset = -10; // prueba valores pequeños
    const latOffset = 30;

    this.markerX = ((this.lon + 180 + lonOffset) / 360) * this.mapWidth;
    this.markerY = ((90 - this.lat + latOffset) / 180) * this.mapHeight;
  }

  onClick() {
    this.miniMapClicked.emit();
  }
}