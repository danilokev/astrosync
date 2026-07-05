import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IconBtnComponent } from '../icon-btn/icon-btn.component';
import { CommonModule } from '@angular/common';
import { SimpleChanges, OnChanges } from '@angular/core';
import { constellations } from '../../../assets/data/NamesDiccionary';

//const abbrev = "Ori";
//console.log(constellations[abbrev]); // "Orión"

@Component({
  selector: 'app-info-table',
  standalone: true,
  imports: [IconBtnComponent, CommonModule],
  templateUrl: './info-table.component.html',
  styleUrl: './info-table.component.css',
})
export class InfoTableComponent implements OnChanges {
  @Input() type: string | null = null;
  @Input() data: any = {};
  @Output() constellationClick = new EventEmitter<string>();

  public normalizedData: any = null;
  private PARSECS_TO_LIGHT_YEARS_MULTIPLY_FACTOR = 3.262;

  // Detectar llegada de datos
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.type = this.data.type;
      this.normalizeStarData();
    }
  }

  // Mostrar información al clicar sobre el botón con información
  showInfo(url: string) {
    // window.location.href = url;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Normalizar datos de estrellas
  normalizeStarData() {
    if (this.type === 'star') {
      this.normalizedData = { ...this.data };

      this.normalizedData.ci = this.ciToRGB(this.data.ci); // color legible
      this.normalizedData.con = constellations[this.data.con]; // constelación

      // distancia
      if (!this.data.dist || this.data.dist >= 100000 || this.data.dist <= 0)
        this.normalizedData.dist = '-';
      else {
        const ly = this.data.dist * this.PARSECS_TO_LIGHT_YEARS_MULTIPLY_FACTOR;
        this.normalizedData.dist = `${ly.toFixed(2)} años de luz`;
      }
    }
  }

  onConstellationClick(name: string) {
    this.constellationClick.emit(name);
  }

  // Color de estrella
  public ciToRGB(ci: number): string {
    let color = '';

    if (ci < 0) color = 'azul';
    else if (ci < 0.3) color = 'azul claro';
    else if (ci < 0.6) color = 'blanco';
    else if (ci < 1.0) color = 'amarillo';
    else if (ci < 1.5) color = 'naranja';
    else color = 'rojo';

    return color;
  }
}
