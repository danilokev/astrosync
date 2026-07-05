import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CelestialCardComponent } from './celestial-card.component';

describe('CelestialCardComponent', () => {
  let component: CelestialCardComponent;
  let fixture: ComponentFixture<CelestialCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CelestialCardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CelestialCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
