import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { EngineService } from './facade-engine.service'; // Motor Three.js
import { FacadeEngineServiceTAG } from './facade-engine-TAG.service'; // Motor propio\
import { ENGINE_CONFIG } from './engine-config'; // Fichero de configuración
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { StarService } from '../../services/star.service';
import { PlanetsService } from '../../services/planets.service';
import { CelestialService } from '../../services/celestial.service';
import { ToggleButtonsGroupComponent } from '../../components/toggle-buttons-group/toggle-buttons-group.component';
import { ToggleConstelationComponent } from '../../components/toggle-constelation/toggle-constelation.component';
import { SidePannelComponent } from '../../components/side-pannel/side-pannel.component';
import { PanelModule } from '../../components/panel/panel.module';
import { RangoFechaComponent } from '../../components/rango-fecha/rango-fecha.component';
import { IconBtnComponent } from '../../components/icon-btn/icon-btn.component';
import { MarkerComponent } from '../../components/marker/marker.component';
import { CelestialCardComponent } from '../../components/celestial-card/celestial-card.component';
import { FavoriteLocationComponent } from '../../components/favorite-location/favorite-location.component';
import { LocationStateService } from '../../services/userlocation.service';
import { FavoritelocationService } from '../../services/favoritelocation.service';
import { UiService } from '../../services/ui.service';
import { GeoService } from '../../services/geo.service';
import { ToastService } from '../../services/toast.service';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { GlobalSearchComponent } from '../../components/global-search/global-search.component';
import { IEngine } from './engine.interface';
import { MapLibreComponent } from '../../components/map-libre/map-libre.component';
import { IMarker } from '../../components/map-libre/IMarker';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-engine',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    ToggleButtonsGroupComponent,
    SidePannelComponent,
    PanelModule,
    RangoFechaComponent,
    IconBtnComponent,
    MarkerComponent,
    CelestialCardComponent,
    FavoriteLocationComponent,
    ToggleConstelationComponent,
    GlobalSearchComponent,
    MapLibreComponent,
    FormsModule,
  ],
  templateUrl: './facade-engine.component.html',
  styleUrls: ['./facade-engine.component.css'],
})
export class EngineComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rendererCanvas', { static: true })
  public rendererCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sidePanel') sidePanel!: SidePannelComponent;

  @ViewChild(MapLibreComponent) mapLibre!: MapLibreComponent;

  // Para seleccionar el motor
  private engServ!: IEngine;

  isFavoritePanelOpen: boolean = false;
  isPanelOpen = false; // controla el panel lateral
  isClockOpen = false;
  isSearchOpen = false;
  isUiHidden = false;

  public showingDay = true; // Estado del toggle
  public selectedCelestial: any | null = null;
  public showCelestialCard = false;
  public celestialLoading = false;
  private celestialLoadingTimeout: any = null;

  private destroy$ = new Subject<void>();
  private celestialRequestVersion = 0;

  userLat: number = 40.42; // latitud
  userLon: number = -3.7; // longitud
  currentTime!: Date; // fecha-tiempo

  // Para guardar datos recibidos de la BD
  stars: any[] = [];
  loading = true;
  error: string = '';
  marker = {
    visible: false,
    title: '',
    lat: 0,
    lon: 0,
    pos2D: { x: 0, y: 0 },
  };

  currentLocation: IMarker = {
    nombre: '',
    latitud: this.userLat,
    longitud: this.userLon,
  };
  markers: IMarker[] = [];
  mapStyle: string = 'day';
  mapNight: boolean = false;
  showCurrent: boolean = false;
  isFavouriteLocationsVisible = false;

  motorThree: boolean = false;

  public undoZoomFn: (() => void) | null = null;

  selectedHoverObject: any = null;
  labelPosition = { x: 0, y: 0 };

  public constructor(
    private http: HttpClient,
    private engServThreeJS: EngineService,
    private engServTag: FacadeEngineServiceTAG,
    private starService: StarService,
    private celestialService: CelestialService,
    private planetsService: PlanetsService,
    private locationState: LocationStateService,
    private favoriteService: FavoritelocationService,
    private toastService: ToastService,
    public uiService: UiService,
    public geoService: GeoService,
  ) {}

  private lastActiveIndex: number = -1;
  useMarker: boolean = false;

  toggleTierraProxy = () => this.toggleTierra();

  toggleUi(): void {
    this.isUiHidden = !this.isUiHidden;
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  onRemoveFavoriteMarker(id: string) {
    // console.log('Quitando marcador 3D con id:', id);
    this.engServ.removeFavoriteMarker(id);
  }

  handleToggleFavoritePanel(isOpen: boolean): void {
    this.isFavoritePanelOpen = isOpen;
    if (isOpen) {
      this.favoriteService.getAll().subscribe((locations) => {
        // console.log(locations);
        this.markers = locations;
        this.isFavouriteLocationsVisible = true;
      });
    } else {
      // this.engServ.clearFavoriteMarkers();
      this.isFavouriteLocationsVisible = false;
    }
  }

  handleCloseFavoritePanel(): void {
    this.isFavoritePanelOpen = false;
  }

  isUserLocationVisible = false;

  handleToggleUserLocation(isVisible: boolean): void {
    // console.log('EVENTO RECIBIDO EN ENGINE:', isVisible);
    this.isUserLocationVisible = isVisible;
    // Pasamos la lat/lon al EngineService
    this.engServ.setUserLocationMarkerVisible(
      isVisible,
      this.userLat,
      this.userLon,
    );
  }

  onPanelToggled(open: boolean) {
    this.isPanelOpen = open;

    // opcional: cerrar el search al abrir el panel
    if (open) this.isSearchOpen = false;
  }

  public currentTabIndex: number = -1;
  private starsSceneCreated: boolean = false; // La escena de estrellas se ha creado alguna vez
  private starsSceneVisible: boolean = false; // La escena de estrellas está visible actualmente

  private onTabChanged(index: number): void {
    if (!this.sceneReady) return;
    // console.log('TAB CAMBIADO A:', index);

    // Si no cambia de tab, no hacemos nada
    if (this.currentTabIndex === index) {
      // console.log('Mismo tab, no se redibuja la escena');
      return;
    }

    this.currentTabIndex = index;

    // Siempre ocultamos el marker al cambiar de tab
    this.marker = { ...this.marker, visible: false };
    this.useMarker = false;

    if (index === 1) {
      /*// Tab de la Tierra: limpiamos todo y creamos la escena de Tierra
      this.engServ.clearScene();
      this.engServ.createScene(this.rendererCanvas);

      // Ocultamos la escena de estrellas si estaba visible
      this.starsSceneVisible = false;

      this.engServ.loadModel(
        'tierra-dia',
        'assets/models/Tierra.glb',
        [0, 0, 0],
        2.1,
        [0, Math.PI / 2, 0],
        true,
        () => {
          const loc = this.locationState.getLocation();
          if (loc) {
            this.userLat = loc.lat;
            this.userLon = loc.lon;
          }

          this.engServ.createUserLocationMarker(
            this.userLat,
            this.userLon,
            this.isUserLocationVisible,
            200,
          );

          // Si el botón ya estaba activo, lo mostramos
          this.engServ.setUserLocationMarkerVisible(this.isUserLocationVisible);
        },
      );
      this.engServ.loadModel(
        'tierra-noche',
        'assets/models/Tierra_Nocturna.glb',
        [0, 0, 0],
        2.9,
        [0, Math.PI / 2, 0],
        false,
        () => this.engServ.setModelVisible('tierra-noche', false),
      );

      // Configurar detección de clicks en la Tierra
      this.engServ.disableObjectClickDetection();
      this.engServ.enableEarthClickDetection();

      this.engServ.onEarthClick.subscribe((data) => {
        this.geoService
          .getPlaceName(data.lat, data.lon)
          .subscribe((placeName) => {
            this.marker = {
              visible: true,
              title: placeName, // Aquí el nombre del lugar antes de la primera coma
              lat: data.lat,
              lon: data.lon,
              pos2D: data.pos2D,
            };
          });
      });*/
    } else {
      // Cualquier otro tab (estrellas u otros)

      // Cerramos panel de favoritos
      this.resetMapSettings();

      // Desactivamos detección de Tierra, activamos detección de objetos
      this.engServ.disableEarthClickDetection();
      this.engServ.enableObjectClickDetection();

      // Si la escena de estrellas no está visible, la recreamos
      if (!this.starsSceneVisible) {
        this.engServ.clearScene();
        this.engServ.createScene(this.rendererCanvas);
        if (!this.starsSceneCreated) {
          // Primera vez que se crean las estrellas
          this.getData();
          this.starsSceneCreated = true;
        } else {
          // Ya existían, solo hay que volver a mostrarlas

          this.starsVisualization();
        }
        this.starsSceneVisible = true;
      }
    }
  }

  resetMapSettings() {
    // Cerrar panel de favoritos
    this.handleCloseFavoritePanel();

    // Reestablecer apariencia y marcadores
    this.mapStyle = 'day';
    this.isUserLocationVisible = false;
    this.isFavouriteLocationsVisible = false;
  }

  ngDoCheck(): void {
    if (!this.sidePanel) return;

    const current = this.sidePanel.activeTabIndex;

    if (current !== this.lastActiveIndex) {
      this.lastActiveIndex = current;
      this.onTabChanged(current);
    }
  }

  isPlacesTabActive(): boolean {
    try {
      const idx = this.sidePanel?.activeTabIndex;
      const tabs = this.sidePanel?.visibleTabs;
      if (!tabs || typeof idx !== 'number') return false;
      const key = tabs[idx]?.key ?? null;
      return key === 'map';
    } catch (err) {
      return false;
    }
  }

  ngOnInit(): void {
    let motor = localStorage.getItem('motor');

    if (!motor) {
      localStorage.setItem('motor', ENGINE_CONFIG.THREE_JS);
      this.motorThree = false;
    } else {
      if (motor === ENGINE_CONFIG.THREE_JS) {
        this.motorThree = false;
      } else {
        this.motorThree = true;
      }
    }
    if (!this.motorThree) this.engServ = this.engServThreeJS;
    else this.engServ = this.engServTag;

    document.body.style.overflow = 'hidden'; // deshabilita scroll del body

    this.uiService.activeTabChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tabIndex) => {
        if (tabIndex !== null && tabIndex !== 1 && this.isFavoritePanelOpen) {
          this.handleCloseFavoritePanel();
        }
      });

    this.favoriteService.refreshChanges$.subscribe(() => {
      // Solo si el toggle de favoritos está activo
      if (!this.isFavoritePanelOpen) return;

      // console.log('Nuevo favorito detectado, creando marcador...');

      this.favoriteService.getAll().subscribe((locations) => {
        /*this.engServ.clearFavoriteMarkers();

        locations.forEach((loc) => {
          this.engServ.createFavoriteMarker(
            loc._id,
            loc.latitud,
            loc.longitud,
            true,
            200,
          );
        });*/
        this.markers = locations;
      });
    });
    this.registerEngineEventHandlers();
  }

  private sceneReady = false;
  async ngAfterViewInit(): Promise<void> {
    // Crear la escena con el canvas
    await this.engServ.createScene(this.rendererCanvas);

    this.sceneReady = true;

    // Animación
    this.engServ.animate();

    const initialTab = this.uiService.activeTabIndex();
    this.lastActiveIndex = initialTab;
    this.onTabChanged(initialTab);

    // Ajuste fullscreen al redimensionar
    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
    document.body.style.overflow = 'auto'; // restaura scroll del body

    this.engServ.dispose();

    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTierra(): void {
    if (this.mapStyle === 'day') {
      this.mapStyle = 'night';
      this.mapNight = true;
    } else {
      this.mapStyle = 'day';
      this.mapNight = false;
    }
  }

  // Obtener localización, fecha, tiempo y visualizar estrellas
  getData(): void {
    this.currentTime = new Date();

    const savedLocation = this.locationState.getLocation();

    // Si el usuario ya eligió una ubicación manualmente
    if (savedLocation) {
      this.userLat = savedLocation.lat;
      this.userLon = savedLocation.lon;
      this.currentLocation = {
        ...this.currentLocation,
        longitud: this.userLon,
        latitud: this.userLat,
      };

      // console.log('Usando ubicación guardada:', this.userLat, this.userLon);
      this.loadStars();
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLat = pos.coords.latitude;
          this.userLon = pos.coords.longitude;
          this.currentLocation = {
            ...this.currentLocation,
            longitud: this.userLon,
            latitud: this.userLat,
          };

          // Guardamos como ubicación inicial
          this.locationState.setLocation(this.userLat, this.userLon);

          // console.log(
          //   'Usando ubicación inicial:',
          //   this.userLat,
          //   this.userLon,
          // );
          this.loadStars();
        },
        () => {
          // Fallback Madrid
          this.userLat = 40.42;
          this.userLon = -3.7;
          this.locationState.setLocation(this.userLat, this.userLon);
          this.currentLocation = {
            ...this.currentLocation,
            longitud: this.userLon,
            latitud: this.userLat,
          };

          this.loadStars();
        },
      );
    }
  }

  // Obtener estrellas de la BD
  loadStars(): void {
    // Buscar estrellas visibles
    const mag = 5.95; // magnitud máxima
    this.starService.getStars({ magMax: mag }).subscribe({
      next: (res) => {
        this.stars = res;
        this.loading = false;
        this.starsVisualization();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al cargar datos';
        this.loading = false;
      },
    });
    //this.starsVisualization(); // Movido a la función de callback de la carga de estrellas para asegurar que se cargan antes de intentar visualizarlas
  }

  // Visualizar estrellas
  starsVisualization(): void {
    // console.log('Cambiando a localización: ', this.userLat, ', ', this.userLon);
    this.engServ.showStars(
      this.stars,
      this.userLat,
      this.userLon,
      this.currentTime,
    );
    this.http
      .get('assets/data/ConstellationLines.dat', { responseType: 'text' })
      .subscribe((data) => {
        this.engServ.drawConstellationsFromData(data);
      });
    this.engServ.showPlanet(this.userLat, this.userLon, this.currentTime);
    this.engServ.addSkybox();
    this.engServ.addHorizonLine();
    // Datos para probar
    /*const estrellas = [
      {
        "_id": "6912709c9182b547b8729909",
        "proper": "Arcturus",
        "ra": 14.26103,
        "dec": 19.18241,
        "mag": -0.05,
        "ci": 1.239,
        "bayer": "Alp",
        "con": "Boo"
      },
      {
        "_id": "691270fb9182b547b87305f9",
        "proper": "Altair",
        "ra": 19.846388,
        "dec": 8.868322,
        "mag": 0.76,
        "ci": 0.221,
        "bayer": "Alp",
        "con": "Aql"
      },
      {
        "_id": "6912708c9182b547b87288b6",
        "proper": "Spica",
        "ra": 13.419883,
        "dec": -11.161322,
        "mag": 0.98,
        "ci": -0.235,
        "bayer": "Alp",
        "con": "Vir"
      },
      {
        "_id": "691270479182b547b8724b3a",
        "proper": "Regulus",
        "ra": 10.139532,
        "dec": 11.967207,
        "mag": 1.36,
        "ci": -0.087,
        "bayer": "Alp",
        "con": "Leo"
      },
      {
        "_id": "6912704c9182b547b8724ec7",
        "proper": "Algieba",
        "ra": 10.332873,
        "dec": 19.841489,
        "mag": 2.01,
        "ci": 1.128,
        "bayer": "Gam-1",
        "con": "Leo"
      },
    ]

    this.engServ.showStars(estrellas, this.userLat, this.userLon, this.currentTime);*/
  }

  private onWindowResize = () => {
    this.engServ.resizeRenderer(window.innerWidth, window.innerHeight);
  };

  closeCelestialCard(): void {
    this.clearCelestialLoadingTimeout();
    this.celestialRequestVersion++;
    this.showCelestialCard = false;
    this.selectedCelestial = null;
    this.celestialLoading = false;

    // quitar zoom
    if (this.undoZoomFn) {
      this.undoZoomFn();
      this.undoZoomFn = null;
      this.engServThreeJS.sendCloseZoom(true);
    }
  }

  private clearCelestialLoadingTimeout(): void {
    if (this.celestialLoadingTimeout) {
      clearTimeout(this.celestialLoadingTimeout);
      this.celestialLoadingTimeout = null;
    }
  }

  private startCelestialLoadingTimeout(): void {
    this.clearCelestialLoadingTimeout();
    this.celestialLoadingTimeout = setTimeout(() => {
      if (this.celestialLoading) {
        this.closeCelestialCard();
      }
    }, 30000);
  }

  // Busca la estrella en la escena 3D
  onSearchItemSelected(star: any): void {
    if (!star) return;

    if (this.sidePanel.activeTabIndex === 1) {
      this.sidePanel.setActiveTab(0);
    }
    if (star.hr) {
      this.handleSearchStarSelection(star);
    } else {
      this.engServ.searchAndFocusByName(star.label);
    }
  }

  // Busca y enfoca una estrella seleccionada de la búsqueda
  private handleSearchStarSelection(star: any): void {
    try {
      const requestVersion = ++this.celestialRequestVersion;
      const query: any = {};
      if (star.hip) query.hip = star.hip;
      if (star.hd) query.hd = star.hd;
      if (star.hr) query.hr = star.hr;
      if (star.gl) query.gl = star.gl;
      if (star.proper) query.name = star.proper;
      if (star._id) query._id = star._id;

      if (Object.keys(query).length === 0) {
        return;
      }

      this.celestialLoading = true;
      this.showCelestialCard = true;
      this.startCelestialLoadingTimeout();
      this.celestialService.getCelestialInfo(query).subscribe({
        next: (info) => {
          if (requestVersion !== this.celestialRequestVersion) return;
          this.celestialLoading = false;
          this.clearCelestialLoadingTimeout();
          let celestialData = { ...info, type: 'star' };
          celestialData.download = query;
          this.selectedCelestial = celestialData;
          this.showCelestialCard = true;
        },
        error: (err) => {
          this.celestialLoading = false;
          //console.error('Error cargando información de la estrella:', err);
        },
      });

      if (star.proper) {
        this.engServ
          .searchAndFocusByName(star.proper)
          .then(() => {
            this.undoZoomFn = () => this.engServ.resetZoom();
          })
          .catch((err) => {
            //console.warn('No se pudo enfocar la estrella:', err);
          });
      }
    } catch (err) {
      /*console.error(
        'Error procesando selección de estrella desde búsqueda:',
        err,
      );*/
    }
  }

  private registerEngineEventHandlers(): void {
    this.engServ.onObjectClick
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (data: any) => {
        // console.log('OBJETO CLICADO:', data);
        if (!data?.object) return;

        const requestVersion = ++this.celestialRequestVersion;
        this.undoZoomFn = () => this.engServ.resetZoom();

        this.celestialLoading = true;
        this.showCelestialCard = true;
        this.startCelestialLoadingTimeout();

        try {
          const isStar =
            !!data.object.userData?.hip ||
            !!data.object.userData?.hd ||
            !!data.object.userData?.hr ||
            !!data.object.userData?.gl;

          if (isStar) {
            const query: any = {};
            if (data.object.userData.hip) query.hip = data.object.userData.hip;
            if (data.object.userData.hd) query.hd = data.object.userData.hd;
            if (data.object.userData.hr) query.hr = data.object.userData.hr;
            if (data.object.userData.gl) query.gl = data.object.userData.gl;
            if (data.name) query.name = data.name;

            if (Object.keys(query).length === 0) return;

            const info = await firstValueFrom(
              this.celestialService.getCelestialInfo(query),
            );
            if (requestVersion !== this.celestialRequestVersion) return;

            this.celestialLoading = false;
            this.clearCelestialLoadingTimeout();

            if (info.wikidataImage === null) {
              info.wikidataImage = '../../assets/images/star_without_image.png';
            }

            const allInfo = { ...info, ...data.object.userData, type: 'star' };

            // console.log(allInfo);

            const descargableInfo = allInfo;
            descargableInfo.download = query;
            this.selectedCelestial = descargableInfo;
            this.showCelestialCard = true;
            return;
          } else if (data.object.userData.constellation) {
            const constellationCode = data.object.userData.constellation; // ejemplo: 'For'

            try {
              const info: any = await firstValueFrom(
                this.celestialService.getConstellationByCode(constellationCode),
              );

              if (requestVersion !== this.celestialRequestVersion) return;

              this.celestialLoading = false;
              this.clearCelestialLoadingTimeout();

              // Manejo de imagen por defecto si no existe
              if (!info.wikidataImage) {
                info.wikidataImage =
                  '../../assets/images/constellation_without_image.png';
              }

              const allInfo = {
                ...info,
                ...data.object.userData,
                type: 'constellation',
              };

              // Añadimos el query para poder descargar si aplica
              const descargableInfo = {
                ...allInfo,
                download: { code: constellationCode },
              };

              this.selectedCelestial = descargableInfo;
              this.showCelestialCard = true;
              return;
            } catch (err) {
              console.error(
                `Error cargando constelación ${constellationCode}:`,
                err,
              );
              this.toastService.error(
                'Error al cargar información',
                'No se pudo obtener la información de la constelación seleccionada. Intenta de nuevo más tarde.',
              );
            }
          }

          const planetId = data.object.userData._id;
          if (!planetId) {
            //console.warn('No se encontró el _id del planeta para:', data.name);
            return;
          }

          const MOON_ID = '69b3d9774754f62acf8da8f8';
          const SUN_ID = '69b3d98b4754f62acf8da8fa';
          let tipoObjeto: 'star' | 'planet' | 'moon' = 'planet';
          if (planetId === MOON_ID) {
            tipoObjeto = 'moon';
          } else if (planetId === SUN_ID) {
            tipoObjeto = 'star';
          }

          this.planetsService
            .getPlanetById(planetId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (res) => {
                if (requestVersion !== this.celestialRequestVersion) return;
                this.celestialLoading = false;
                this.clearCelestialLoadingTimeout();
                this.selectedCelestial = {
                  ...res,
                  type: tipoObjeto,
                  download: { _id: res._id },
                };
                this.showCelestialCard = true;
              },
              error: (err) => {
                console.error('Error cargando info del planeta:', err);
                this.celestialLoading = false;
                this.clearCelestialLoadingTimeout();
                this.toastService.error(
                  'Error al cargar información',
                  'No se pudo obtener la información del planeta seleccionado. Intenta de nuevo más tarde.',
                );
              },
            });
        } catch (err) {
          console.error('Error cargando datos del objeto clicado:', err);
          this.celestialLoading = false;
          this.clearCelestialLoadingTimeout();
          this.toastService.error(
            'Error al cargar información',
            'No se pudo obtener la información del objeto seleccionado. Intenta de nuevo más tarde.',
          );
        }
      });

    const engineService = this.engServ;
    this.engServ.onObjectHover
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (!data) {
          this.selectedHoverObject = null;
          this.marker.visible = false;
          return;
        }

        let screenPos: { x: number; y: number };

        if (this.engServ instanceof EngineService) {
          // Three.js: point es vec3 del mundo, hay que proyectar
          screenPos = (this.engServ as EngineService).worldToScreen(data.point);
        } else {
          // WebGL: point ya viene en coordenadas de pantalla
          screenPos = data.point;
        }
        this.labelPosition = {
          x: screenPos.x + 10,
          y: screenPos.y - 25,
        };
        this.selectedHoverObject = data.name != 'Planet' ? data.name : null;

        if (this.useMarker) {
          this.marker = {
            visible: true,
            title: data.name,
            lat: 0,
            lon: 0,
            pos2D: { x: screenPos.x, y: screenPos.y },
          };
        } else {
          this.marker.visible = false;
        }
      });
  }

  onChatbotStarRequested(name: string): void {
    if (!name || name.length < 2) return;

    this.engServ.searchAndFocusByName(name);
  }

  updateCurrentLocation(coords: { lat: number; lon: number }) {
    // console.log('Update to: ', coords);
    this.starsSceneVisible = false;
    // Guardar como ubicación oficial
    this.locationState.setLocation(coords.lat, coords.lon);

    // Actualizar variables locales
    this.userLat = coords.lat;
    this.userLon = coords.lon;

    // Mover marcador en la Tierra
    // this.engServ.createUserLocationMarker(coords.lat, coords.lon, true, 200);
    this.currentLocation.latitud = coords.lat;
    this.currentLocation.longitud = coords.lon;
  }

  // Al cambiar la fecha, actualiza la posición de los objetos celestes
  onDateChanged(dateStr: string): void {
    const [year, month, day] = dateStr.split('-').map(Number);
    const newDate = new Date(this.currentTime);
    newDate.setFullYear(year, month - 1, day);
    this.currentTime = newDate;
    this.updateScenePositions();
  }

  changePosition(valor: string): void {
    const parts = valor.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    const seconds = parts[2] || 0;

    if (isNaN(hours) || isNaN(minutes)) {
      //console.warn('Formato de hora inválido:', valor);
      return;
    }

    const newTime = new Date(this.currentTime);
    newTime.setHours(hours, minutes, seconds, 0);
    this.currentTime = newTime;

    this.updateScenePositions();

    // console.log('Hora simulada:', this.currentTime.toLocaleTimeString());
  }

  private updateScenePositions(): void {
    // Usar método ligero si existe, sino fallback a rebuild
    if (this.engServ.updateCelestialPositions) {
      this.engServ.updateCelestialPositions(
        this.currentTime,
        this.userLat,
        this.userLon,
      );
    } else {
      // Fallback: reconstruir (solo si no existe método ligero)
      this.engServ.clearScene();
      this.engServ.createScene(this.rendererCanvas);

      this.engServ.showStars(
        this.stars,
        this.userLat,
        this.userLon,
        this.currentTime,
      );
      this.http
        .get('assets/data/ConstellationLines.dat', { responseType: 'text' })
        .subscribe((data) => {
          this.engServ.drawConstellationsFromData(data);
        });
      this.engServ.showPlanet(this.userLat, this.userLon, this.currentTime);
      this.engServ.addHorizonLine();
    }
  }

  onMarkerClosed() {
    this.marker.visible = false;
    // this.engServ.removeClickMarker();
    this.mapLibre.deleteClickedMarker();
  }

  // Escuchar clicks sobre el mapa
  onMapClick(coords: any) {
    this.useMarker = true;
    if (this.currentTabIndex !== 1) {
      // Caso minimapa - cambiar de tab
      this.sidePanel.setActiveTab(1);
    } else {
      // Caso mapa normal - poner marcador
      // console.log('Clicked:', coords);

      this.geoService
        .getPlaceName(coords.lat, coords.long)
        .subscribe((placeName) => {
          // console.log(placeName);
          this.marker = {
            visible: true,
            title: placeName, // Aquí el nombre del lugar antes de la primera coma
            lat: coords.lat,
            lon: coords.long,
            pos2D: { x: 0, y: 0 },
            // color: 'secondary'
          };
          // this.markers = [...this.markers, marker];
        });
    }
  }

  // Escuchar clicks sobre los marcadores
  onMarkerClick(coords: any) {
    this.geoService
      .getPlaceName(coords.lat, coords.long)
      .subscribe((placeName) => {
        // console.log(placeName);
        this.marker = {
          visible: true,
          title: placeName, // Aquí el nombre del lugar antes de la primera coma
          lat: coords.lat,
          lon: coords.long,
          pos2D: { x: 0, y: 0 },
          // color: 'secondary'
        };
        // this.markers = [...this.markers, marker];
      });
  }

  onSwitchChange(valor: boolean) {
    let motor = valor ? ENGINE_CONFIG.WeblGL : ENGINE_CONFIG.THREE_JS;
    localStorage.setItem('motor', motor);
    window.location.reload();
  }
}
