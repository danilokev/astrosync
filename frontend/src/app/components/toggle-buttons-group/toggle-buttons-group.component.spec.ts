import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToggleButtonsGroupComponent } from './toggle-buttons-group.component';

describe('ToggleButtonsGroupComponent', () => {
  let component: ToggleButtonsGroupComponent;
  let fixture: ComponentFixture<ToggleButtonsGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleButtonsGroupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ToggleButtonsGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
