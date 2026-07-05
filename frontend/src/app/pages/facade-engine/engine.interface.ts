import { ElementRef } from '@angular/core';
import { EventEmitter } from '@angular/core';

export interface IEngine {
  showStars(stars: any[], lat: number, long: number, date: Date): void;
  removeFavoriteMarker(id: string): void;
  createFavoriteMarker(
    id: string,
    lat: number,
    lon: number,
    visible: boolean,
    offset: number,
  ): void;
  clearFavoriteMarkers(): void;
  createUserLocationMarker(
    lat: number,
    lon: number,
    visible: boolean,
    offset: number,
  ): void;
  setUserLocationMarkerVisible(
    visible: boolean,
    lat?: number,
    lon?: number,
  ): void;

  clearScene(): void;
  createScene(canvas: ElementRef<HTMLCanvasElement>): void;
  loadModel(
    name: string,
    distance: number,
    modelPath: string,
    position: [number, number, number],
    scale: number,
    rotation?: [number, number, number],
    visible?: boolean,
    onLoaded?: () => void,
  ): void;
  setModelVisible(name: string, visible: boolean): void;
  disableObjectClickDetection(): void;
  enableEarthClickDetection(): void;
  disableEarthClickDetection(): void;
  enableObjectClickDetection(): void;
  focusObject(obj: any): void;
  resetZoom(): void;
  animate(): void;
  dispose(): void;
  drawConstellationsFromData(data: string): void;
  showPlanet(lat: number, long: number, date: Date): void;
  addSkybox(): void;
  addHorizonLine(): void;
  removeClickMarker(): void;
  resizeRenderer(width: number, height: number): void;
  searchAndFocusByName(name: string): Promise<void>;
  showMoon(): void;
  updateCelestialPositions?(date: Date, lat: number, lon: number): void;

  onObjectHover:EventEmitter<any>;

  onObjectClick: EventEmitter<any>;
  onEarthClick: EventEmitter<{
    lat: number;
    lon: number;
    pos2D: { x: number; y: number };
  }>;
}
