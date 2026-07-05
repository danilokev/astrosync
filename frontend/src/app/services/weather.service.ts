import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  constructor(private http: HttpClient) {}

  getWeather(lat: number, lon: number, timezone: string = 'Europe/Madrid'): Observable<any> {
    return this.http
      .get<any>(`${environment.apiUrl}/weather?lat=${lat}&lon=${lon}&timezone=${timezone}`)
      .pipe(map(data => this.parseWeather(data)));
  }

  getWeatherFull(lat: number, lon: number, timezone: string = 'Europe/Madrid'): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/weather?lat=${lat}&lon=${lon}&timezone=${timezone}`
    );
  }

  // Método nuevo para evaluación
  getObservationEvaluation(lat: number, lon: number): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/weather/evaluate?lat=${lat}&lon=${lon}`
    );
  }

  private parseWeather(raw: any) {
    const i = 0;
    return {
      date: new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      lat: raw.latitude,
      lon: raw.longitude,
      location: "Ubicación actual",
      temp: `${raw.hourly.temperature_2m[i]}°C`,
      humidity: `${raw.hourly.relativehumidity_2m[i]}%`,
      pressure: `${raw.hourly.pressure_msl[i]} hPa`,
      wind: `${raw.hourly.windspeed_10m[i]} km/h`,
      rain: `${raw.hourly.precipitation[i]}%`,
      dewPoint: `${raw.hourly.dewpoint_2m[i]}°C`,
      clouds: raw.hourly.cloudcover[i],
      weathercode: raw.hourly.weathercode[i],
      ...this.mapWeatherCode(raw.hourly.weathercode[i])
    };
  }

  private mapWeatherCode(code: number) {
    const table: any = {
      0: { text: "Cielo despejado", icon: "sun" },
      1: { text: "Mayormente despejado", icon: "sun" },
      2: { text: "Parcialmente nublado", icon: "cloud-sun" },
      3: { text: "Nublado", icon: "cloud" },
      45: { text: "Niebla", icon: "cloud-fog" },
      48: { text: "Niebla con escarcha", icon: "cloud-fog" },
      51: { text: "Llovizna ligera", icon: "cloud-drizzle" },
      53: { text: "Llovizna moderada", icon: "cloud-drizzle" },
      55: { text: "Llovizna intensa", icon: "cloud-drizzle" },
      56: { text: "Llovizna helada ligera", icon: "cloud-snow" },
      57: { text: "Llovizna helada intensa", icon: "cloud-snow" },
      61: { text: "Lluvia ligera", icon: "cloud-rain" },
      63: { text: "Lluvia moderada", icon: "cloud-rain" },
      65: { text: "Lluvia intensa", icon: "cloud-rain" },
      66: { text: "Lluvia helada ligera", icon: "cloud-snow" },
      67: { text: "Lluvia helada intensa", icon: "cloud-snow" },
      71: { text: "Nieve ligera", icon: "cloud-snow" },
      73: { text: "Nieve moderada", icon: "cloud-snow" },
      75: { text: "Nieve intensa", icon: "cloud-snow" },
      77: { text: "Granos de nieve", icon: "cloud-snow" },
      80: { text: "Chubascos ligeros", icon: "cloud-rain" },
      81: { text: "Chubascos moderados", icon: "cloud-rain" },
      82: { text: "Chubascos fuertes", icon: "cloud-rain" },
      85: { text: "Chubascos de nieve ligeros", icon: "cloud-snow" },
      86: { text: "Chubascos de nieve fuertes", icon: "cloud-snow" },
      95: { text: "Tormenta eléctrica ligera/moderada", icon: "cloud-lightning" },
      96: { text: "Tormenta con granizo ligero", icon: "cloud-hail" },
      99: { text: "Tormenta con granizo intenso", icon: "cloud-hail" }
    };
    return table[code] ?? { text: "Desconocido", icon: "cloud" };
  }
}