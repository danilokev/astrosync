import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConstellationstateService {

  private _showConstellations = new BehaviorSubject<boolean>(false);
  showConstellations$ = this._showConstellations.asObservable();
  private _showConstellationsArt = new BehaviorSubject<boolean>(false);
  showConstellationsArt$ = this._showConstellationsArt.asObservable();
  // private showSkybox = false;
  private _showSkybox = new BehaviorSubject<boolean>(false);
  showSkybox$ = this._showSkybox.asObservable();

  setShowConstellations(value: boolean) {
    this._showConstellations.next(value);
  }

  setShowConstellationsArt(value: boolean) {
    this._showConstellationsArt.next(value);
  }
  
  /*setShowSkybox(active: boolean) {
    this.showSkybox = active;
  }*/
  setShowSkybox(value: boolean) {
    this._showSkybox.next(value);
  }



  getShowConstellations(): boolean {
    return this._showConstellations.value;
  }

  getShowConstellationsArt(): boolean {
    return this._showConstellationsArt.value;
  }

  /*getShowSkybox(): boolean {
    return this.showSkybox;
  }*/

  getShowSkybox(): boolean {
    return this._showSkybox.value;
  }
}
