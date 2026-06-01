import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { SidebarNavItemComponent } from '../sidebar-nav-item/sidebar-nav-item';
import { SidebarNavItem } from '../sidebar-nav-item.model';

@Component({
  selector: 'app-side-bar',
  standalone: true,
  imports: [CommonModule, SidebarNavItemComponent],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
})
export class SideBarComponent {
  readonly items = input<SidebarNavItem[]>([]);
  readonly collapsed = input(false);
  readonly loading = input(false);
  readonly emptyMessage = input('No hay navegación disponible.');
}