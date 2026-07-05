import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Output } from '@angular/core';
import { EventEmitter } from '@angular/core';

interface TabConfig {
  id: number;
  title: string;
  action: () => void;
}

@Component({
  selector: 'app-navbar-horizontal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar-horizontal.component.html',
  styleUrl: './navbar-horizontal.component.css',
})
export class NavbarHorizontalComponent {
  @Output() activeTabChange = new EventEmitter<number>();

  tabs: TabConfig[] = [
    {
      id: 0,
      title: 'Dashboard',
      action: () => this.openTab(0),
    },
    {
      id: 1,
      title: 'Gestión de usuarios',
      action: () => this.openTab(1),
    },
    {
      id: 2,
      title: 'Cargar catálogos',
      action: () => this.openTab(2),
    },
  ];

  activeTab = 0;

  /*openDashboard() {
    this.activeTab = 0;
    this.activeTabChange.emit(0);
  }

  openUsers() {
    this.activeTab = 1;
    this.activeTabChange.emit(1);
  }

  openCatalog() {
    this.activeTab = 2;
    this.activeTabChange.emit(2);
  }*/

  openTab(tab: number) {
    this.activeTab = tab;
    this.activeTabChange.emit(tab);
  }

  onTabClick(tab: TabConfig) {
    tab.action();
  }
}
