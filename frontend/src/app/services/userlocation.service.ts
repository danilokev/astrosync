import { Injectable } from '@angular/core';

export interface UserLocation {
  lat: number;
  lon: number;
}

@Injectable({ providedIn: 'root' })
export class LocationStateService {

  private currentLocation: UserLocation | null = null;

  setLocation(lat: number, lon: number) {
    this.currentLocation = { lat, lon };
    // localStorage.setItem('userSelectedLocation', JSON.stringify(this.currentLocation));
  }

  getLocation(): UserLocation | null {
    if (this.currentLocation) return this.currentLocation;

    /*const saved = localStorage.getItem('userSelectedLocation');
    if (saved) {
      this.currentLocation = JSON.parse(saved);
      return this.currentLocation;
    }*/

    return null;
  }

  hasLocation(): boolean {
    return this.getLocation() !== null;
  }
}