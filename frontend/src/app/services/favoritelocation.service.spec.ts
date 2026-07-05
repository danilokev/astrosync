import { TestBed } from '@angular/core/testing';

import { FavoritelocationService } from './favoritelocation.service';

describe('FavoritelocationService', () => {
  let service: FavoritelocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FavoritelocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
