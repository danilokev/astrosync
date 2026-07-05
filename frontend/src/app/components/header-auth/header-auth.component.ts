import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-header-auth',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header-auth.component.html',
  styleUrl: './header-auth.component.css',
})
export class HeaderAuthComponent {
  constructor(
    private uiService: UiService,
    private router: Router,
  ) {}

  goToApp() {
    this.uiService.activeTabIndex.set(0);
    this.uiService.activeTabKey.set('sky');
    this.uiService.clearPanel();
    this.router.navigateByUrl('/app');
  }
}
