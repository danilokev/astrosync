import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherSectionComponent } from './weather-section.component';

describe('WeatherSectionComponent', () => {
  let component: WeatherSectionComponent;
  let fixture: ComponentFixture<WeatherSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherSectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WeatherSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
