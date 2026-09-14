import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-ui-drawer',
  imports: [UiButtonComponent, TranslatePipe],
  templateUrl: './ui-drawer.html',
  styleUrl: './ui-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiDrawerComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly busy = input(false);
  readonly close = output<void>();
  @HostListener('document:keydown.escape') onEscape(): void {
    this.requestClose();
  }
  protected requestClose(): void {
    if (this.open() && !this.busy()) this.close.emit();
  }
}
