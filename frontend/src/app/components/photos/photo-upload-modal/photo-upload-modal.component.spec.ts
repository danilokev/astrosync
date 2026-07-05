import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoUploadModalComponent } from './photo-upload-modal.component';

describe('PhotoUploadModalComponent', () => {
  let component: PhotoUploadModalComponent;
  let fixture: ComponentFixture<PhotoUploadModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoUploadModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PhotoUploadModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
