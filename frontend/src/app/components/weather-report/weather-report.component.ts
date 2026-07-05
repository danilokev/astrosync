import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  Renderer2,
  Inject,
  HostListener,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { LoadingComponent } from '../shared/loading/loading.component';

@Component({
  selector: 'app-weather-report',
  standalone: true,
  imports: [CommonModule, LoadingComponent],
  templateUrl: './weather-report.component.html',
  styleUrls: ['./weather-report.component.css'],
})
export class WeatherReportComponent
  implements OnChanges, AfterViewInit, OnDestroy
{
  @Input() data: any;
  @Input() loading: boolean = false;
  @Input() visible: boolean = true;
  @Output() closeEvent = new EventEmitter<void>();

  hours: any[] = [];
  days: any[] = [];
  hourCarouselIndex = 0;
  visibleHoursCount = 5;
  private previousBodyOverflow = '';
  @ViewChild('closeButton') closeButton?: ElementRef<HTMLButtonElement>;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngAfterViewInit() {
    this.renderer.appendChild(this.document.body, this.el.nativeElement);
    this.updateVisibleHoursCount();
    if (this.visible) {
      this.lockBodyScroll();
      this.focusCloseButton();
    }
  }

  ngOnDestroy() {
    this.unlockBodyScroll();
    if (this.el.nativeElement.parentNode) {
      this.renderer.removeChild(
        this.el.nativeElement.parentNode,
        this.el.nativeElement,
      );
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.data) {
      this.processData();
    }

    if (changes['visible']) {
      if (this.visible) {
        this.lockBodyScroll();
        this.focusCloseButton();
      } else {
        this.unlockBodyScroll();
      }
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.updateVisibleHoursCount();
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    if (this.visible) {
      this.close();
    }
  }

  getWeatherIcon(code: number): string {
    switch (code) {
      case 0:
        return 'bi-sun'; // cielo despejado
      case 1:
      case 2:
        return 'bi-cloud-sun'; // pocas nubes / parcialmente nublado
      case 3:
        return 'bi-cloud'; // nublado
      case 45:
      case 48:
        return 'bi-cloud-fog'; // niebla
      case 51:
      case 53:
      case 55:
        return 'bi-cloud-drizzle'; // llovizna
      case 61:
      case 63:
      case 65:
        return 'bi-cloud-rain'; // lluvia
      case 66:
      case 67:
        return 'bi-cloud-hail'; // lluvia helada / granizo
      case 71:
      case 73:
      case 75:
        return 'bi-snow'; // nieve
      case 80:
      case 81:
      case 82:
        return 'bi-cloud-rain-heavy'; // lluvia fuerte
      case 95:
        return 'bi-cloud-lightning'; // tormenta
      case 96:
      case 99:
        return 'bi-cloud-lightning-rain'; // tormenta con lluvia
      default:
        return 'bi-question-circle'; // desconocido
    }
  }

  processData() {
    const h = this.data.hourly;

    // Previsión por horas (solo las próximas 24 horas)
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    this.hours = h.time
      .map((t: string, i: number) => {
        const dt = new Date(t);
        return {
          dt,
          time: t.split('T')[1],
          temp: h.temperature_2m[i],
          humidity: h.relativehumidity_2m[i],
          pressure: h.pressure_msl[i],
          wind: h.windspeed_10m[i],
          clouds: h.cloudcover[i],
          rain: h.precipitation[i],
          dew: h.dewpoint_2m[i],
          code: h.weathercode[i],
          icon: this.getWeatherIcon(h.weathercode[i]),
        };
      })
      .filter((h: { dt: Date }) => h.dt >= now && h.dt <= next24h);
    this.hourCarouselIndex = 0;

    // Previsión por días
    const byDay: any = {};
    h.time.forEach((t: string, i: number) => {
      const date = t.split('T')[0];
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(i);
    });

    this.days = Object.keys(byDay).map((date) => {
      const idxs: number[] = byDay[date];
      return {
        date,
        min: Math.min(...idxs.map((i) => h.temperature_2m[i])),
        max: Math.max(...idxs.map((i) => h.temperature_2m[i])),
        humidity: `${Math.min(...idxs.map((i) => h.relativehumidity_2m[i]))} - ${Math.max(...idxs.map((i) => h.relativehumidity_2m[i]))}`,
        pressure: `${Math.min(...idxs.map((i) => h.pressure_msl[i]))} - ${Math.max(...idxs.map((i) => h.pressure_msl[i]))}`,
        wind: `${Math.min(...idxs.map((i) => h.windspeed_10m[i]))} - ${Math.max(...idxs.map((i) => h.windspeed_10m[i]))}`,
        rain: Math.max(...idxs.map((i) => h.precipitation[i])),
        dew: Math.round(
          idxs.reduce((a, i) => a + h.dewpoint_2m[i], 0) / idxs.length,
        ),
        clouds: Math.round(
          idxs.reduce((a, i) => a + h.cloudcover[i], 0) / idxs.length,
        ),
        icon: this.getWeatherIcon(h.weathercode[idxs[0]]),
      };
    });
  }

  close() {
    this.visible = false;
    this.unlockBodyScroll();
    this.closeEvent.emit();
  }

  private lockBodyScroll() {
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
  }

  private unlockBodyScroll() {
    this.renderer.setStyle(
      this.document.body,
      'overflow',
      this.previousBodyOverflow,
    );
  }

  private focusCloseButton() {
    setTimeout(() => this.closeButton?.nativeElement.focus(), 0);
  }

  get displayedHours() {
    return this.hours.slice(
      this.hourCarouselIndex,
      this.hourCarouselIndex + this.visibleHoursCount,
    );
  }

  get canGoPrevHours() {
    return this.hourCarouselIndex > 0;
  }

  get canGoNextHours() {
    return this.hourCarouselIndex + this.visibleHoursCount < this.hours.length;
  }

  prevHours() {
    if (!this.canGoPrevHours) return;
    this.hourCarouselIndex = Math.max(
      0,
      this.hourCarouselIndex - this.visibleHoursCount,
    );
  }

  nextHours() {
    if (!this.canGoNextHours) return;
    this.hourCarouselIndex = Math.min(
      this.hours.length - this.visibleHoursCount,
      this.hourCarouselIndex + this.visibleHoursCount,
    );
  }

  private updateVisibleHoursCount() {
    const width = this.document.defaultView?.innerWidth ?? 1024;
    if (width <= 480) {
      this.visibleHoursCount = 2;
    } else if (width <= 768) {
      this.visibleHoursCount = 3;
    } else if (width <= 1024) {
      this.visibleHoursCount = 4;
    } else {
      this.visibleHoursCount = 5;
    }

    const maxIndex = Math.max(0, this.hours.length - this.visibleHoursCount);
    this.hourCarouselIndex = Math.min(this.hourCarouselIndex, maxIndex);
  }
}
