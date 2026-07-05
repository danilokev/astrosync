import { TestBed } from '@angular/core/testing';

import { FavoriteAstroService } from './favorite-astro.service';

describe('FavoriteAstroService', () => {
  let service: FavoriteAstroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FavoriteAstroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
