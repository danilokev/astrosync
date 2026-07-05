import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputTypeFileComponent } from './input-type-file.component';

describe('InputTypeFileComponent', () => {
  let component: InputTypeFileComponent;
  let fixture: ComponentFixture<InputTypeFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputTypeFileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InputTypeFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
