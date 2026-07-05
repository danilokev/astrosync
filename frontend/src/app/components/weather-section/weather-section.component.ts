import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherService } from '../../services/weather.service';
import { WeatherReportComponent } from '../../components/weather-report/weather-report.component';
import { LoadingComponent } from '../shared/loading/loading.component';

interface EvaluationDetails {
  temperature: string;
  humidity: string;
  cloudcover: string;
  precipitation: string;
  weathercode: string;
  wind: string;
  pressure: string;
  moonPenalty: number;
}

interface Evaluation {
  date: string;
  score: number;
  category: 'good' | 'medium' | 'bad';
  moonPhase: number;
  interpretation: string[];
  details: EvaluationDetails;
  raw: any;
}

@Component({
  selector: 'app-weather-section',
  standalone: true,
  imports: [CommonModule, WeatherReportComponent, LoadingComponent],
  templateUrl: './weather-section.component.html',
  styleUrls: ['./weather-section.component.css'],
})
export class WeatherSectionComponent implements OnInit {
  @Input() visible = true;

  lat = 38.3452;
  lon = -0.481;

  weather: any = null;
  weatherFullData: any = null;
  reportVisible = false;
  reportLoading = false;

  evaluation: Evaluation | null = null;
  showEvaluationDetails = false;

  constructor(private ws: WeatherService) {}

  ngOnInit() {
    // Clima actual
    this.ws.getWeather(this.lat, this.lon).subscribe((data) => {
      this.weather = data;
    });

    // Evaluación astronómica
    this.loadEvaluation();
  }

  loadEvaluation() {
    this.ws
      .getObservationEvaluation(this.lat, this.lon)
      .subscribe((evals: Evaluation[]) => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Evaluación de hoy
        this.evaluation = evals.find((e) => e.date === todayStr) || null;
      });
  }

  openReport() {
    if (!navigator.geolocation) return;

    this.reportLoading = true;
    this.reportVisible = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.ws
          .getWeatherFull(pos.coords.latitude, pos.coords.longitude)
          .subscribe({
            next: (data) => {
              this.weatherFullData = data;
              this.reportLoading = false;
            },
            error: () => {
              this.weatherFullData = null;
              this.reportLoading = false;
            },
          });
      },
      () => {
        this.reportLoading = false;
      },
    );
  }

  togglePanel() {
    this.visible = !this.visible;
  }

  // Convierte las coordenadas en nombre de ubicación
  // NOTA: Seguramente sea necesario sacar el nombre de las coordenadas según la localización del usuario
  getLocationName(): string {
    const knownLocations: { [key: string]: string } = {
      '38.3452,-0.481': 'Alicante, España',
      '40.4168,-3.7038': 'Madrid, España',
      '41.3851,2.1734': 'Barcelona, España',
    };

    const key = `${this.lat},${this.lon}`;
    return (
      knownLocations[key] || `${this.lat.toFixed(4)}°, ${this.lon.toFixed(4)}°`
    );
  }

  getCategoryShortText(category: string): string {
    switch (category) {
      case 'good':
        return 'Excelente';
      case 'medium':
        return 'Aceptable';
      case 'bad':
        return 'Desfavorable';
      default:
        return 'Desconocido';
    }
  }

  // Resumen de calidad de observación
  // TODO: Refactorizar esta parte de código.
  getQualitySummary(evaluation: Evaluation): string {
    const goodCount = evaluation.interpretation.filter((i) =>
      i.startsWith('✅'),
    ).length;
    const warningCount = evaluation.interpretation.filter((i) =>
      i.startsWith('⚠️'),
    ).length;
    const badCount = evaluation.interpretation.filter((i) =>
      i.startsWith('❌'),
    ).length;

    const parts: string[] = [];
    if (goodCount > 0) parts.push(`${goodCount} condiciones favorables`);
    if (warningCount > 0) parts.push(`${warningCount} moderadas`);
    if (badCount > 0) parts.push(`${badCount} desfavorables`);

    return parts.join(', ') || 'Sin evaluación disponible';
  }

  getIconFromLine(line: string): string {
    if (line.startsWith('✅')) return 'bi-check-circle-fill text-success';
    if (line.startsWith('⚠️'))
      return 'bi-exclamation-triangle-fill text-warning';
    if (line.startsWith('❌')) return 'bi-x-circle-fill text-danger';
    return 'bi-info-circle-fill text-secondary';
  }

  cleanLine(line: string): string {
    return line.replace(/^([✅⚠️❌]\s*)/, '');
  }
}
