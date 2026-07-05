import { TestBed } from '@angular/core/testing';

import { LocalizationsService } from './localizations.service';

describe('LocalizationsService', () => {
  let service: LocalizationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalizationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
