import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Engine } from '../../../engine'
import { FacadeEngineServiceTAG } from '../../pages/facade-engine/facade-engine-TAG.service';

@Component({
  selector: 'app-grafic-motor',
  standalone: true,
  imports: [],
  templateUrl: './grafic-motor.component.html',
  styleUrl: './grafic-motor.component.css',
})
export class GraficMotorComponent implements AfterViewInit {
  @ViewChild('canvas')
  canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(private engine: FacadeEngineServiceTAG) {}

  async ngAfterViewInit() {
    await this.engine.init(this.canvasRef);
    this.engine.start();
  }
}
