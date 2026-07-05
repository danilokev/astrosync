import { Component, EventEmitter, Input, Output, effect } from '@angular/core';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-toggle-buttons-group',
  standalone: true,
  imports: [],
  templateUrl: './toggle-buttons-group.component.html',
  styleUrl: './toggle-buttons-group.component.css',
})
export class ToggleButtonsGroupComponent {
  @Input() toggleTierra!: () => void;
  @Output() toggleFavoritePanel = new EventEmitter<boolean>();
  @Output() toggleUserLocation = new EventEmitter<boolean>();

  btn1Active = false;
  btn2Active = false;
  btn3Active = false;

  constructor(private uiService: UiService) {}

  toggleEffect = effect(
      () => {
        const index = this.uiService.toggleButtonRequest();
        if (index != null) {
          this.activate(index);
          this.uiService.toggleButtonRequest.set(null); // ✅ ahora permitido
        }
      },
      { allowSignalWrites: true }
    );

  activate(btn: number) {
    if (btn === 1) {
      this.btn1Active = !this.btn1Active;
      if (this.toggleTierra) this.toggleTierra();
    }

    if (btn === 2) {
      this.btn2Active = !this.btn2Active;
      this.toggleFavoritePanel.emit(this.btn2Active);
    }

    if (btn === 3) {
      this.btn3Active = !this.btn3Active;
      this.toggleUserLocation.emit(this.btn3Active);
    }
  }
}