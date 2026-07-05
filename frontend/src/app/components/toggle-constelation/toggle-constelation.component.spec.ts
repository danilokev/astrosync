import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToggleConstelationComponent } from './toggle-constelation.component';

describe('ToggleConstelationComponent', () => {
  let component: ToggleConstelationComponent;
  let fixture: ComponentFixture<ToggleConstelationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleConstelationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ToggleConstelationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
