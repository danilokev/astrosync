import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoEditModalComponent } from './photo-edit-modal.component';

describe('PhotoEditModalComponent', () => {
  let component: PhotoEditModalComponent;
  let fixture: ComponentFixture<PhotoEditModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoEditModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PhotoEditModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
