import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  Output,
  EventEmitter,
  input,
} from '@angular/core';
import { SimpleChanges } from '@angular/core';
import { Input } from '@angular/core';
import * as maplibregl from 'maplibre-gl';
import * as maptilersdk from '@maptiler/sdk';
import { IMarker } from './IMarker';
import type { StyleSpecification } from 'maplibre-gl';

@Component({
  selector: 'app-map-libre',
  standalone: true,
  imports: [],
  templateUrl: './map-libre.component.html',
  styleUrl: './map-libre.component.css',
})
export class MapLibreComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  map!: maplibregl.Map;

  @Input() currentStyle: string = 'day';
  @Input() zoom: number = 1;
  @Input() flyToZoom: number = 0;
  @Input() markers: IMarker[] = [];
  @Output() mapClick = new EventEmitter<any>();
  @Output() markerClick = new EventEmitter<any>();
  @Input() currentLocation: IMarker | null = null;
  @Input() favouriteLocations: IMarker[] = [];
  @Input() current: boolean = true;
  @Input() favourites: boolean = false;

  markersOnMap: any[] = [];
  currentOnMap: any = null;
  clickedOnMap: any = null;

  dayUrl = 'https://api.maptiler.com/maps/019ce39d-539e-79b7-bf2a-37048c360195/style.json?key=uBYcMf2tGQcWOWwCbzmh';
  nightUrl = 'https://api.maptiler.com/maps/019ce381-7e05-7306-a69f-8134afce2224/style.json?key=uBYcMf2tGQcWOWwCbzmh';

  styles: {
    day: StyleSpecification | null;
    night: StyleSpecification | null;
  } = {
    day: null,
    night: null
  };

  async ngOnInit() {
    
  }

  async ngAfterViewInit() {
    this.styles.day = await fetch(this.dayUrl).then(r => r.json());
    this.styles.night = await fetch(this.nightUrl).then(r => r.json());

    if(this.styles.day){
      this.styles.day.terrain = undefined;
    }

    if(this.styles.night){
      this.styles.night.terrain = undefined;
    }

    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: this.styles[this.currentStyle],
      center: [0, 0],
      zoom: this.zoom,
    });

    this.map.on('load', () => {
      this.map.setTerrain(null);
      this.showCurrent();
      this.showFavourites();
    });

    this.map.on('click', (e) => {
      this.mapClick.emit({
        lat: e.lngLat.lat,
        long: e.lngLat.lng,
      });

      this.showClickedMarker(e.lngLat.lat, e.lngLat.lng);
    });
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  // Visualizar marcadores
  addMarker(marker: IMarker, color: string, flyTo: boolean = false) {
    if (flyTo) {
      if (this.flyToZoom !== 0) {
        this.map.flyTo({
          center: [marker.longitud, marker.latitud],
          zoom: this.flyToZoom,
          essential: true,
        });
      } else {
        this.map.flyTo({
          center: [marker.longitud, marker.latitud],
          essential: true,
        });
      }
    }

    const m = new maplibregl.Marker({ color: color })
      .setLngLat([marker.longitud, marker.latitud])
      .addTo(this.map);

    // Escuchamos click
    m.getElement().addEventListener('click', (e) => {
      const lngLat = m.getLngLat();
      e.stopPropagation();
      this.markerClick.emit({
        lat: lngLat.lat,
        long: lngLat.lng,
      });
    });

    return m;
  }

  // Escuchamos los cambios para actualizar los marcadores en el mapa
  ngOnChanges(changes: SimpleChanges) {
    /*if (changes['markers'] && this.map) {
      this.addMarkers();
    }*/
    if (changes['currentLocation'] && this.map && this.current) {
      this.showCurrent();
    }
    if (changes['current'] && this.map) {
      this.showCurrent();
    }
    if (changes['favourites'] && this.map) {
      this.showFavourites();
    }
    if (changes['markers'] && this.map) {
      this.showFavourites();
    }
    if (changes['currentStyle'] && this.map) {
      this.changeStyle();
    }
  }

  // Visulización de la ubicación actual
  showCurrent() {
    // Limpiar el marcador anterior
    this.currentOnMap?.remove();

    if (this.current && this.currentLocation != null) {
      // Añadir marcador rojo
      const m = this.addMarker(this.currentLocation, 'red', true);
      this.currentOnMap = m;
    }
  }

  // Visualización de los marcadores de lugares favoritos
  showFavourites() {
    // Limpiar marcadores en el mapa para evitar duplicados
    this.markersOnMap.forEach((m) => m.remove());
    this.markersOnMap = [];

    if (this.favourites) {
      // Añadir marcadores blancos
      this.markers.forEach((marker) => {
        const m = this.addMarker(marker, '#ffcd28');
        this.markersOnMap.push(m);
      });
    }
  }

  // Marker al hacer el click
  showClickedMarker(lat: number, long: number) {
    // Borrar el anterior
    if (this.clickedOnMap) this.clickedOnMap.remove();

    // Crear el nuevo
    const marker = {
      latitud: lat,
      longitud: long,
    };
    const m = this.addMarker(marker as IMarker, '#005eff');
    this.clickedOnMap = m;
  }

  // Borrar el marcador generado al clicar sobre el mapa
  deleteClickedMarker() {
    if (this.clickedOnMap) this.clickedOnMap.remove();
    this.clickedOnMap = null;
  }

  // Cambiar el estilo del mapa
  changeStyle() {
    this.map.setStyle(this.styles[this.currentStyle]);
  }

  
}
