import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CoordinatesService {
  constructor() { }

  private coordsSource = new BehaviorSubject<{ lat: number, long: number }>({ lat: 40.42, long: -3.7 }); // por defecto Madrid
  coords$ = this.coordsSource.asObservable();

  // Cambiar coordenadas
  setCoordinates(lat: number, long: number) {
    this.coordsSource.next({ lat, long });
  }

  // Obtener coordenadas actuales
  getCoordinates() {
    return this.coordsSource.getValue();
  }
}
