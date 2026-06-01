import { ChangeDetectionStrategy, Component, computed, input, ViewChild } from '@angular/core';
import { ControlContainer, FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule, NgSelectComponent } from '@ng-select/ng-select';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-sk-select',
  standalone: true,
  imports: [ReactiveFormsModule, NgSelectModule, TranslatePipe],
  templateUrl: './sk-select.component.html',
  styleUrl: './sk-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => null,
    },
  ],
})
export class SkSelectComponent {
  public readonly items = input<any[]>([]);
  public readonly bindLabel = input<string>('label');
  public readonly bindValue = input<string>('id');
  public readonly placeholder = input<string>('');
  public readonly searchable = input<boolean>(true);
  public readonly clearable = input<boolean>(true);
  public readonly translateLabel = input<boolean>(false);
  public readonly disabled = input<boolean>(false);
  public readonly control = input.required<FormControl>();

  protected readonly resolvedItems = computed(() => this.items() ?? []);
  protected readonly resolvedPlaceholder = computed(() => this.placeholder());

  @ViewChild(NgSelectComponent) private ngSelect?: NgSelectComponent;

  focus(): void {
    this.ngSelect?.focus();
  }
}
