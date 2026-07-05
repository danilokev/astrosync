import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherReportComponent } from './weather-report.component';

describe('WeatherReport', () => {
  let component: WeatherReportComponent;
  let fixture: ComponentFixture<WeatherReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeatherReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
