import { Component, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { SidePannelComponent } from '../../components/side-pannel/side-pannel.component';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user';
import { TableComponent } from '../../components/table/table/table.component';
import { NavbarHorizontalComponent } from '../../components/navbar-horizontal/navbar-horizontal.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';
import { CommonModule } from '@angular/common';
import { SearchComponent } from '../../components/search/search.component';
import { ButtonComponent } from '../../components/button/button.component';
import { InputSelectComponent } from '../../components/input-select/input-select.component';
import { InputTypeFileComponent } from '../../components/input-type-file/input-type-file.component';
import { StarService } from '../../services/star.service';
import { ProgressbarComponent } from '../../components/progressbar/progressbar.component';
import { ToastService } from '../../services/toast.service';
import { UiService } from '../../services/ui.service';
import { MetricsService, RankingItem } from '../../services/metrics.service';
import { PeriodFilterComponent } from '../../components/period-filter/period-filter.component';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Subject, interval } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    InputSelectComponent,
    InputTypeFileComponent,
    SidePannelComponent,
    TableComponent,
    NavbarHorizontalComponent,
    PaginationComponent,
    SearchComponent,
    ButtonComponent,
    ProgressbarComponent,
    BaseChartDirective,
    PeriodFilterComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class AdminComponent implements OnInit, OnDestroy {
  activeTab = 0;
  userRols = '';
  totalPages = 1;
  currentPage = 1;
  search = '';
  selectedFile: File | null = null;
  butDisabled = true;
  importProgress = 0;
  showProgress = false;
  resetFile = false; // Controla el reseteo del input file después de la importación

  // Métricas del dashboard
  totalUsuarios = 0;
  usuariosActivos30d = 0;
  totalFotos = 0;
  fotosHasData = false;
  favoritosEstrellas = 0;
  favoritosPlanetas = 0;
  favoritosLunas = 0;
  metricsLoading = false;
  metricsError = '';
  lastUpdate: Date | null = null;
  selectedPeriod = 30;

  // Configuración de gráficos: usuarios registrados
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Usuarios registrados', tension: 0.3, fill: true },
    ],
  };
  public lineChartType: 'line' = 'line';
  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 7,
          color: 'rgba(255, 255, 255, 0.6)',
        },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          maxTicksLimit: 6,
        },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
      },
    },
  };

  // Configuración de gráficos: fotos subidas (barras)
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Fotos subidas',
        backgroundColor: 'rgba(122, 212, 255, 0.8)',
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 1.5,
        categoryPercentage: 1.5,
      },
    ],
  };
  public barChartType: 'bar' = 'bar';
  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(14, 18, 58, 0.95)',
        titleColor: '#fff',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 7,
          color: 'rgba(255, 255, 255, 0.6)',
          font: { size: 10 },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: { size: 11 },
          maxTicksLimit: 6,
        },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
      },
    },
  };

  // Gráfico de distribución de favoritos (doughnut)
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Estrellas', 'Planetas', 'Lunas'],
    datasets: [
      { data: [0, 0, 0], backgroundColor: ['#bc7aff', '#7ad4ff', '#ffbc7a'] },
    ],
  };
  public doughnutChartType: 'doughnut' = 'doughnut';
  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: 'rgba(255, 255, 255, 0.8)', padding: 16 },
      },
    },
  };

  rankingData: RankingItem[] = [];

  // Gráfico de ranking de cuerpos celestes más guardados (barras horizontales)
  public rankingChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Veces guardado',
        backgroundColor: ['#bc7aff', '#7ad4ff', '#ffbc7a', '#7affbc'],
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 1.2,
        categoryPercentage: 1.2,
      },
    ],
  };
  public rankingChartType: 'bar' = 'bar';
  public rankingChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y' as const, // Barras horizontales
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(14, 18, 58, 0.95)',
        titleColor: '#fff',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) =>
            ` ${ctx.parsed.x} ${ctx.parsed.x === 1 ? 'vez guardado' : 'veces guardado'}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          maxTicksLimit: 6,
          stepSize: 1,
          precision: 0,
        },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.85)',
          font: { size: 11 },
          callback: (val, idx) => {
            const label = (this.rankingChartData.labels?.[idx] as string) ?? '';
            return label.length > 18 ? label.slice(0, 16) + '…' : label;
          },
        },
        grid: { display: false },
      },
    },
  };

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  users: User[] = [];
  tableHeaders = [
    { key: 'email', label: 'Email' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellidos', label: 'Apellidos' },
    { key: 'rol', label: 'Rol' },
  ];

  constructor(
    private userService: UserService,
    private starService: StarService,
    private metricsService: MetricsService,
    public uiService: UiService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    // Búsqueda con debounce para evitar llamadas excesivas al backend
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((search) => {
        this.currentPage = 1;
        this.search = search;
        this.loadUsers();
      });

    this.loadUsers();
    if (this.activeTab === 0) {
      this.loadMetrics();
      this.startMetricsRefresh();
    }
  }

  // Refresca métricas cada 60 segundos si estamos en la pestaña de dashboard
  startMetricsRefresh(): void {
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.activeTab === 0) {
          this.loadMetrics();
        }
      });
  }

  onTabChange(tab: number): void {
    this.activeTab = tab;
    if (tab === 0) {
      this.loadMetrics(); // Al volver al dashboard recarga métricas
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
  }

  // Carga métricas del dashboard y actualiza gráficos
  loadMetrics(): void {
    this.metricsLoading = true;
    this.metricsError = '';

    this.metricsService.getOverview(this.selectedPeriod).subscribe({
      next: (response) => {
        this.totalUsuarios = response.data.totalUsuarios;
        this.usuariosActivos30d = response.data.usuariosActivosPeriodo;
        this.totalFotos = response.data.totalFotos;
        this.favoritosEstrellas = response.data.favoritos.estrellas;
        this.favoritosPlanetas = response.data.favoritos.planetas;
        this.favoritosLunas = response.data.favoritos.lunas;
        this.lastUpdate = new Date();
        const periodDays = response.data.periodDays;
        const labelSuffix = periodDays === 365 ? ' año' : ` ${periodDays}d`;

        // Configuración del gráfico de usuarios registrados
        this.lineChartData = {
          labels: response.data.registrosPeriodo.labels,
          datasets: [
            {
              data: response.data.registrosPeriodo.data,
              label: 'Usuarios registrados',
              tension: 0.3,
              fill: true,
              borderColor: '#bc7aff',
              backgroundColor: 'rgba(188, 122, 255, 0.1)',
              pointBackgroundColor: '#bc7aff',
              pointBorderColor: '#fff',
              pointRadius: 2,
              pointHoverRadius: 5,
            },
          ],
        };
        const fotosData = response.data.fotosPeriodo.data;
        const hasFotosData = fotosData.some((count: number) => count > 0);
        this.fotosHasData = hasFotosData;
        this.barChartData = {
          labels: response.data.fotosPeriodo.labels,
          datasets: [
            {
              data: fotosData,
              label: 'Fotos subidas',
              backgroundColor: 'rgba(122, 212, 255, 0.8)',
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 1.5,
              categoryPercentage: 1.5,
            },
          ],
        };
        this.doughnutChartData = {
          labels: ['Estrellas', 'Planetas', 'Lunas'],
          datasets: [
            {
              data: [
                this.favoritosEstrellas,
                this.favoritosPlanetas,
                this.favoritosLunas,
              ],
              backgroundColor: ['#bc7aff', '#7ad4ff', '#ffbc7a'],
              hoverOffset: 8,
            },
          ],
        };
        this.metricsLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar métricas', err);
        this.metricsError = 'No se pudieron cargar las métricas';
        this.metricsLoading = false;
      },
    });
    this.loadRanking();
  }

  onPeriodChange(days: number): void {
    this.selectedPeriod = days;
    this.loadMetrics();
  }

  // Carga ranking de cuerpos celestes más guardados y configura el gráfico de barras horizontales
  loadRanking(): void {
    this.metricsService.getRanking().subscribe({
      next: (response) => {
        this.rankingData = response.data;
        const typeColors: Record<string, string> = {
          star: '#bc7aff',
          planet: '#7ad4ff',
          moon: '#ffbc7a',
          constellation: '#7affbc',
        };

        const itemCount = response.data.length;
        // Ajustar variable CSS para controlar el número de barras mostradas y su tamaño
        document.documentElement.style.setProperty(
          '--ranking-items',
          String(Math.max(itemCount, 4)),
        );

        // Ajuste visual de ancho de barra según cantidad de elementos
        const barPct = itemCount <= 5 ? 0.55 : itemCount <= 8 ? 0.65 : 0.75;

        this.rankingChartData = {
          labels: response.data.map((item) => item.label),
          datasets: [
            {
              data: response.data.map((item) => item.count),
              label: 'Veces guardado',
              backgroundColor: response.data.map(
                (item) => typeColors[item.tipo] || '#bc7aff',
              ),
              borderRadius: 4,
              borderSkipped: false,
              barPercentage: barPct,
              categoryPercentage: 0.85,
            },
          ],
        };
      },
      error: (err) => {
        console.error('Error al cargar ranking', err);
      },
    });
  }

  // Cargar usuarios (con filtros)
  loadUsers(): void {
    this.userService
      .getUsers({
        page: this.currentPage,
        limit: 10,
        // nombre: this.searchName,
        // apellidos: this.searchApellidos,
        // email: this.searchEmail,
        search: this.search,
        rol: this.userRols,
      })
      .subscribe({
        next: (response: any) => {
          this.totalPages = response.pagination.totalPages;
          this.users = response.data;
        },
        error: (err) => {
          console.error('Error al cargar usuarios', err);
        },
      });
  }

  // Pasar a otra página
  onPageChanged(newPage: number) {
    this.currentPage = newPage;
    this.loadUsers();
  }

  reloadUsers() {
    this.loadUsers();
  }

  onSelectChange(value: string) {
    this.userRols = value;
    this.currentPage = 1;
    this.loadUsers();
  }

  onSearch(value: string) {
    this.searchSubject.next(value);
  }

  // Seleccionar fichero
  onFileSelected(file: File | null) {
    this.selectedFile = file;
    if (file && file.type === 'text/csv') this.butDisabled = false;
    else this.butDisabled = true;
  }

  importStars() {
    if (!this.selectedFile || this.butDisabled) return;

    this.butDisabled = true;
    this.importProgress = 0;
    this.showProgress = true;

    let fakeInterval: any = null;
    let serverResponded = false;

    this.starService.importStars(this.selectedFile).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const real = Math.round((100 * event.loaded) / event.total);
          this.importProgress = Math.min(Math.round(real * 0.8), 80);
        }

        if (event.type === HttpEventType.Response) {
          serverResponded = true;
          if (fakeInterval) clearInterval(fakeInterval);
          this.importProgress = 100;
          this.showToast(
            'Éxito',
            'El catálogo se ha importado correctamete',
            'success',
          );
        }
      },

      error: () => {
        if (fakeInterval) clearInterval(fakeInterval);
        this.showProgress = false;
        this.importProgress = 0;
        this.butDisabled = false;
        this.showToast(
          'Error',
          'Se ha producido un error al cargar el catálogo en la base de datos',
          'error',
        );
      },

      complete: () => {
        this.showProgress = false;
        this.selectedFile = null;
        this.butDisabled = true;
        this.resetFile = true;
        setTimeout(() => (this.resetFile = false), 0);
      },
    });

    fakeInterval = setInterval(() => {
      if (serverResponded) return;
      if (this.importProgress < 99) this.importProgress += 1;
    }, 3000);
  }

  // Mostrar toast para informar al usuario
  showToast(
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' | '' = 'info',
  ) {
    this.toastService.show({ title, message, type });
  }
}
