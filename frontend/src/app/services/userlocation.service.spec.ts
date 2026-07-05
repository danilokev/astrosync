import { TestBed } from '@angular/core/testing';

import { UserlocationService } from './userlocation.service';

describe('UserlocationService', () => {
  let service: UserlocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserlocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
