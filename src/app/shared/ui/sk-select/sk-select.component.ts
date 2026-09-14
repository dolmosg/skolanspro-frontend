import { ChangeDetectionStrategy, Component, computed, inject, input, ViewChild } from '@angular/core';
import { ControlContainer, FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule, NgSelectComponent } from '@ng-select/ng-select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

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
  private readonly translate = inject(TranslateService);

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
  protected readonly searchTranslatedLabel = (term: string, item: Record<string, unknown>): boolean => {
    const translationKey = item[this.bindLabel()];
    const label = this.translate.instant(String(translationKey ?? ''));

    return this.normalizeSearchValue(label).includes(this.normalizeSearchValue(term));
  };

  @ViewChild(NgSelectComponent) private ngSelect?: NgSelectComponent;

  focus(): void {
    this.ngSelect?.focus();
  }

  private normalizeSearchValue(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
  }
}
