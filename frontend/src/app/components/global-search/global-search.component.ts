import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchComponent } from '../search/search.component';
import { StarService } from '../../services/star.service';
import { CelestialService } from '../../services/celestial.service';
import { PlanetsService } from '../../services/planets.service';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  finalize,
  takeUntil,
} from 'rxjs/operators';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, SearchComponent],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.css'],
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  @Output() itemSelected = new EventEmitter<any>();

  results: any[] = [];
  isLoading = false;
  hasError = false;
  isOpen = false;

  // Paginación
  totalResults = 0;
  currentLimit = 5;
  currentSkip = 0;
  currentTerm = '';

  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    private starService: StarService,
    private planetService: PlanetsService,
    private constellationService: CelestialService,
  ) {}

  ngOnInit() {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string) => {
          if (!term || term.length < 2) {
            this.resetSearch();
            return of([]);
          }

          this.isLoading = true;

          return forkJoin({
            stars: this.starService.searchStars(term, 5, 0),
            planets: this.planetService.searchPlanets(term),
            constellations:
              this.constellationService.searchConstellations(term),
          }).pipe(
            map(({ stars, planets, constellations }) => {
              const starResults = (stars?.data || []).map((s: any) => ({
                ...s,
                type: 'star',
                displayName: s.proper || s.bf || 'Estrella',
              }));

              const planetResults = (planets?.data || []).map((p: any) => ({
                ...p,
                type: 'planet',
                displayName: p.label,
              }));

              const constellationResults = (constellations?.data || []).map(
                (c: any) => ({
                  ...c,
                  type: 'constellation',
                  displayName: c.label,
                }),
              );

              return [
                ...planetResults,
                ...constellationResults,
                ...starResults,
              ];
            }),
            catchError((error) => {
              this.hasError = true;
              return of([]);
            }),
            finalize(() => (this.isLoading = false)),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((results) => {
        this.results = results;
        this.totalResults = results.length;
        this.isOpen = results.length > 0 || this.currentTerm.length >= 2;
      });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(term: string) {
    this.hasError = false;
    this.results = [];
    this.totalResults = 0;
    this.currentSkip = 0;
    this.currentTerm = term;
    this.searchSubject.next(term);
  }

  trackByStarId(_index: number, result: any): string {
    return result._id;
  }

  loadMore() {
    if (this.isLoading || this.results.length >= this.totalResults) return;

    this.isLoading = true;
    this.currentSkip += this.currentLimit;

    this.starService
      .searchStars(this.currentTerm, this.currentLimit, this.currentSkip)
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            this.results = [...this.results, ...response.data];
            this.isLoading = false;
          }
        },
        error: () => {
          this.hasError = true;
          this.isLoading = false;
        },
      });
  }

  selectItem(item: any) {
    this.itemSelected.emit(item);
    this.closeDropdown();
  }

  resetSearch() {
    this.results = [];
    this.totalResults = 0;
    this.currentSkip = 0;
    this.isOpen = false;
    this.isLoading = false;
    this.hasError = false;
    this.currentTerm = '';
  }

  closeDropdown() {
    this.isOpen = false;
  }

  // Cierra el dropdown si se hace clic fuera del componente
  // @HostListener('document:click', ['$event'])
  // onClickOutside(event: Event) {
  //   if (!this.elementRef.nativeElement.contains(event.target)) {
  //     this.closeDropdown();
  //   }
  // }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: Event) {
    this.closeDropdown();
  }
}
