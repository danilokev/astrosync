import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputTypeTextComponent } from './input-type-text.component';

describe('InputTypeTextComponent', () => {
  let component: InputTypeTextComponent;
  let fixture: ComponentFixture<InputTypeTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputTypeTextComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InputTypeTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
