import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-clock-panel',
  standalone: true,
  templateUrl: './clock-panel.component.html',
  styleUrls: ['./clock-panel.component.scss'],
})
export class ClockPanelComponent implements OnInit, OnDestroy {

  elapsedMs: number = 0;   // Tiempo transcurrido desde medianoche
  dateStr: string = '';     // Fecha actual
  intervalId: any = null;
  isPaused: boolean = false;

  ngOnInit(): void {
    this.updateDate();
    this.setInitialTime();
    this.startClock();
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  // --- Inicializa el cronómetro con la hora actual
  private setInitialTime() {
    const now = new Date();
    this.elapsedMs = now.getHours() * 3600 * 1000
                   + now.getMinutes() * 60 * 1000
                   + now.getSeconds() * 1000;
  }

  // --- Cronómetro independiente
  private startClock() {
    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        this.elapsedMs += 1000; // Sumar 1 segundo
      }
    }, 1000);
  }

  private updateDate() {
    const now = new Date();
    const d = now.getDate().toString().padStart(2, '0');
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear();
    this.dateStr = `${d}/${m}/${y}`;
  }

  pauseTime() {
    this.isPaused = true;
  }

  resumeTime() {
    this.isPaused = false;
  }

  resetTime() {
    this.setInitialTime(); // Volver a la hora actual
    this.isPaused = false;
    this.updateDate();
  }

  // --- Formato HH:MM:SS
  get timeString(): string {
    const totalSeconds = Math.floor(this.elapsedMs / 1000);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}
