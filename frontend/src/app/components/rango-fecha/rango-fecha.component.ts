import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  inject,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import dayjs from 'dayjs';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

type PanelType = 'date' | 'time' | 'speed' | null;
type TimePreset = 'dawn' | 'noon' | 'dusk' | 'midnight';

@Component({
  selector: 'ngbd-modal-content',
  template: `
    <div class="modal-header">
      <h4 class="modal-title">Desarrollando..</h4>
      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        (click)="activeModal.dismiss('Cross click')"
      ></button>
    </div>
    <div class="modal-body">
      <p>Funcionalidad en desarrollo</p>
    </div>
    <div class="modal-footer">
      <button
        type="button"
        class="btn btn-outline-danger"
        (click)="activeModal.close('Close click')"
      >
        Cerrar
      </button>
    </div>
  `,
})
export class NgbdModalContent {
  activeModal = inject(NgbActiveModal);
}

@Component({
  selector: 'app-rango-fecha',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rango-fecha.component.html',
  styleUrl: './rango-fecha.component.css',
})
export class RangoFechaComponent
  implements OnInit, AfterViewChecked, OnDestroy
{
  @Output() horaElegida = new EventEmitter<string>();
  @Output() fechaElegida = new EventEmitter<string>();
  @Output() motorCambiado = new EventEmitter<boolean>();
  @Input() motorThree: boolean = false;

  private modalService = inject(NgbModal);

  elapsedSeconds: number = 0; // Segundos desde el inicio del día
  isPaused: boolean = false; // Si la simulación del tiempo está pausada

  private intervalId: ReturnType<typeof setInterval> | null = null;

  selectedDate: dayjs.Dayjs = dayjs();

  @ViewChild('dateInput') dateInput?: ElementRef<HTMLInputElement>;
  private datepickerInstance: {
    destroy: () => void;
    setDate: Function;
  } | null = null;

  openPanel: PanelType = null;

  // Velocidad de simulación
  readonly speedOptions: number[] = [200, 100, 10, 2, 1];
  currentSpeed: number = 1;

  ngOnInit(): void {
    const now = dayjs();
    this.elapsedSeconds = now.hour() * 3600 + now.minute() * 60 + now.second();
    this.startClock();
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.destroyDatepicker();
  }

  // Cierra paneles al pulsar fuera de la barra
  // @HostListener('document:click')
  // onDocumentClick(): void {
  //   this.openPanel = null;
  // }

  // onBarClick(event: MouseEvent): void {
  //   event.stopPropagation();
  // }

  ngAfterViewChecked(): void {
    if (this.openPanel === 'date') {
      this.initDatepickerIfNeeded();
    } else if (this.datepickerInstance) {
      this.destroyDatepicker();
    }
  }

  // Inicializa flatpickr sobre el input referenciado si no existe ya
  private initDatepickerIfNeeded(): void {
    if (this.datepickerInstance) return;
    if (!this.dateInput?.nativeElement) return;

    this.datepickerInstance = flatpickr(this.dateInput.nativeElement, {
      defaultDate: this.selectedDate.toDate(),
      dateFormat: 'Y-m-d',
      inline: true,
      locale: Spanish,
      onChange: (selectedDates: Date[]) => {
        if (!selectedDates.length) return;

        this.selectedDate = dayjs(selectedDates[0]);
        this.openPanel = null;
        this.fechaElegida.emit(this.selectedDate.format('YYYY-MM-DD'));
      },
    }) as any;
  }

  private destroyDatepicker(): void {
    if (!this.datepickerInstance) return;
    try {
      this.datepickerInstance.destroy();
    } finally {
      this.datepickerInstance = null;
    }
  }

  // Comienza un intervalo que incrementa elapsedSeconds cada segundo
  private startClock(): void {
    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        this.elapsedSeconds = (this.elapsedSeconds + this.currentSpeed) % 86400;
        this.horaElegida.emit(this.timeString);
      }
    }, 1000);
  }

  // Devuelve la hora actual formateada como HH:mm:ss
  get timeString(): string {
    const h = Math.floor(this.elapsedSeconds / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((this.elapsedSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (this.elapsedSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Devuelve la fecha seleccionada formateada
  get fechaStr(): string {
    return this.selectedDate.format('D MMM YYYY').toLowerCase();
  }

  // Abre o cierra un panel
  togglePanel(panel: PanelType, event?: Event): void {
    event?.stopPropagation();
    this.openPanel = this.openPanel === panel ? null : panel;
  }

  // Controles de tiempo
  togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  resetTime(): void {
    const now = dayjs();
    this.elapsedSeconds = now.hour() * 3600 + now.minute() * 60 + now.second();
    this.selectedDate = now;
    this.isPaused = false;
    this.currentSpeed = 1;

    if (this.datepickerInstance) {
      this.datepickerInstance.setDate(this.selectedDate.toDate(), false);
    }

    this.fechaElegida.emit(this.selectedDate.format('YYYY-MM-DD'));
    this.horaElegida.emit(this.timeString);
  }

  onSliderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.elapsedSeconds = Number(input.value);
  }

  onSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.elapsedSeconds = Number(input.value);
    this.horaElegida.emit(this.timeString);
  }

  // Aplica una hora predefinida (amanecer, mediodía, atardecer, medianoche)
  setPreset(preset: TimePreset): void {
    const presetMap: Record<TimePreset, number> = {
      dawn: 6 * 3600,
      noon: 12 * 3600,
      dusk: 20 * 3600,
      midnight: 0,
    };
    this.elapsedSeconds = presetMap[preset];
    this.horaElegida.emit(this.timeString);
  }

  // Cambia la velocidad de simulación y cierra el panel de velocidad
  setSpeed(speed: number): void {
    this.currentSpeed = speed;
    this.openPanel = null;
  }

  open() {
    const modalRef = this.modalService.open(NgbdModalContent);
  }

  toggleMotor(): void {
    this.motorThree = !this.motorThree;
    this.motorCambiado.emit(this.motorThree);
  }
}
