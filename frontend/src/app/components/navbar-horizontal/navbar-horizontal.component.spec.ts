import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarHorizontalComponent } from './navbar-horizontal.component';

describe('NavbarHorizontalComponent', () => {
  let component: NavbarHorizontalComponent;
  let fixture: ComponentFixture<NavbarHorizontalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarHorizontalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NavbarHorizontalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
