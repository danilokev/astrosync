import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputTypeDatetimeComponent } from './input-type-datetime.component';

describe('InputTypeDatetimeComponent', () => {
  let component: InputTypeDatetimeComponent;
  let fixture: ComponentFixture<InputTypeDatetimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputTypeDatetimeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InputTypeDatetimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
