import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraficMotorComponent } from './grafic-motor.component';

describe('GraficMotorComponent', () => {
  let component: GraficMotorComponent;
  let fixture: ComponentFixture<GraficMotorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraficMotorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GraficMotorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
