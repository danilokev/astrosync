import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoDeleteModalComponent } from './photo-delete-modal.component';

describe('PhotoDeleteModalComponent', () => {
  let component: PhotoDeleteModalComponent;
  let fixture: ComponentFixture<PhotoDeleteModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoDeleteModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PhotoDeleteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
