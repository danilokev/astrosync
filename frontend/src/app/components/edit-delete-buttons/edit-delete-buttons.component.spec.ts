import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDeleteButtonsComponent } from './edit-delete-buttons.component';

describe('EditDeleteButtonsComponent', () => {
  let component: EditDeleteButtonsComponent;
  let fixture: ComponentFixture<EditDeleteButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDeleteButtonsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditDeleteButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
