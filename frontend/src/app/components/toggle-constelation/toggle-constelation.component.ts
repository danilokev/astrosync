import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConstellationstateService } from '../../services/constellationstate.service';

@Component({
  selector: 'app-toggle-constelation',
  standalone: true,
  imports: [],
  templateUrl: './toggle-constelation.component.html',
  styleUrl: './toggle-constelation.component.css'
})
export class ToggleConstelationComponent {

  constructor(private constellationState: ConstellationstateService) {}
  // Estados independientes
  btn1Active = false;
  btn2Active = false;
  btn3Active = false;

  ngOnInit(){
    this.btn1Active = this.constellationState.getShowConstellations();
    this.btn2Active = this.constellationState.getShowConstellationsArt();
    this.btn3Active = this.constellationState.getShowSkybox();
  }

  activate(btn: number) {
    if (btn === 1) {
      this.btn1Active = !this.btn1Active;
      this.constellationState.setShowConstellations(this.btn1Active);
    }

    if (btn === 2) {
      this.btn2Active = !this.btn2Active;
      this.constellationState.setShowConstellationsArt(this.btn2Active);
    }

    if (btn === 3) {
      this.btn3Active = !this.btn3Active;
      this.constellationState.setShowSkybox(this.btn3Active);
    }
  }
}
