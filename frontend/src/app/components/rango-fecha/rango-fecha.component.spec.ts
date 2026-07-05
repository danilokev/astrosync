import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RangoFechaComponent } from './rango-fecha.component';

describe('RangoFechaComponent', () => {
  let component: RangoFechaComponent;
  let fixture: ComponentFixture<RangoFechaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RangoFechaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RangoFechaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
