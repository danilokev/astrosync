import { TestBed } from '@angular/core/testing';

import { ConstellationstateService } from './constellationstate.service';

describe('ConstellationstateService', () => {
  let service: ConstellationstateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConstellationstateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
