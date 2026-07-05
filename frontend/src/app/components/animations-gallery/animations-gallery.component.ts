import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import { NebulaWebglComponent } from '../../pages/facade-engine/nebula-webgl/nebula-webgl.component';

export interface Animation {
  id: string;
  title: string;
  description: string;
  file: string;
  thumbnail: string;
}

@Component({
  selector: 'app-animations-gallery',
  standalone: true,
  imports: [CommonModule, SafeUrlPipe, NebulaWebglComponent],
  templateUrl: './animations-gallery.component.html',
  styleUrl: './animations-gallery.component.css',
})
export class AnimationsGalleryComponent {
  @Input() isOpen: boolean = false;
  @Output() closePanel = new EventEmitter<void>();

  selectedAnimation: Animation | null = null;

  animations: Animation[] = [
      {
      id: 'nebulosa',
      title: 'Nebulosa',
      description: 'Vuelo 3D a través de varias nebulosas.',
      file: 'assets/animations/nebulosa_3d.html',
      thumbnail: 'bi-cloud',
    },
    {
      id: 'nebula-webgl',
      title: 'Nebulosa WebGL',
      description: 'Sistema de partículas WebGL · Motor AstroSync',
      file: '',
      thumbnail: 'bi-cloud',
    },
    {
      id: 'bigbang',
      title: 'Big Bang',
      description:
        'Desde la singularidad hasta la formación de galaxias. 8 eras cosmológicas con datos científicos reales.',
      file: 'assets/animations/bigbang_3d.html',
      thumbnail: 'bi-lightning',
    },
     {
      id: 'supernova',
      title: 'Supernova Tipo II',
      description: 'Colapso estelar de 20 masas solares. Núcleo de hierro, shockwave y púlsar remanente.',
      file: 'assets/animations/supernova_tipo2.html',
      thumbnail: 'bi-stars',
    },
     {
      id: 'lluvia-estrellas',
      title: 'Lluvia de Estrellas',
      description: 'Perseidas, Leónidas, Gemínidas y Líridas con datos reales de velocidad y radiante.',
      file: 'assets/animations/lluvia_estrellas.html',
      thumbnail: 'bi-stars',
    },
    {
      id: 'wormhole',
      title: 'Agujero de Gusano',
      description: 'Regiones de espacio-tiempo. Viaje visual a través de un agujero de gusano basado en la métrica de Morris-Thorne.',
      file: 'assets/animations/agujero_gusano.html',
      thumbnail: 'bi-circle',
    },
    {
      id: 'cinturon-asteroides',
      title: 'Cinturón de Asteroides',
      description: 'Vuelo entre un millón de asteroides. Lagunas de Kirkwood y planeta enano Ceres',
      file: 'assets/animations/cinturon_asteroides.html',
      thumbnail: 'bi-circle-half',
    },
    {
      id: 'andromeda',
      title: 'Andrómeda M31',
      description: 'Vuelo a través de la galaxia de Andrómeda.',
      file: 'assets/animations/andromeda.html',
      thumbnail: 'bi-hurricane',
    },

      
  
    

  ];

  openAnimation(anim: Animation): void {
    this.selectedAnimation = anim;
  }

  close(): void {
    this.selectedAnimation = null;
    this.closePanel.emit();
  }
}
