import { Component, computed, inject, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

export interface QuestionInputTypePivot {
  is_default: boolean;
  active: boolean;
  order: number;
}

export interface QuestionInputTypeItem {
  id: number;
  name: string;
  translation: string | null;
  component: string | null;
  active: boolean;
  order: number;
  pivot?: QuestionInputTypePivot;
}

export interface QuestionTypeItem {
  id: number;
  name: string;
  translation: string | null;
  input_types?: QuestionInputTypeItem[];
}

export interface IQuestionTypeInputTypesConfigModalData {
  questionType: QuestionTypeItem;
  inputTypes: QuestionInputTypeItem[];
}

export interface QuestionTypeInputTypesConfigItem {
  id: number;
  name: string;
  translation: string | null;
  component: string | null;
  active: boolean;
  is_default: boolean;
  order: number;
}

export interface IQuestionTypeInputTypesConfigModalResult {
  saved: boolean;
  items: {
    question_input_type_id: number;
    active: boolean;
    is_default: boolean;
    order: number;
  }[];
}

@Component({
  selector: 'app-question-type-input-types-config-modal',
  standalone: true,
  imports: [TranslateModule, UiButtonComponent],
  templateUrl: './question-type-input-types-config-modal.component.html',
  styleUrl: './question-type-input-types-config-modal.component.scss',
})
export class QuestionTypeInputTypesConfigModalComponent {
  readonly data = input.required<IQuestionTypeInputTypesConfigModalData>();

  private readonly modal = inject(SklModalService);

  protected readonly items = signal<QuestionTypeInputTypesConfigItem[]>([]);

  protected readonly questionTypeName = computed((): string => {
    const questionType = this.data().questionType;

    return questionType.translation ?? questionType.name;
  });

  constructor() {
    queueMicrotask((): void => this.buildState());
  }

  private buildState(): void {
    const all = this.data().inputTypes;
    const assigned = this.data().questionType.input_types ?? [];

    const mapped: QuestionTypeInputTypesConfigItem[] = all.map(
      (input): QuestionTypeInputTypesConfigItem => {
        const match = assigned.find((assignedInput) => assignedInput.id === input.id);

        return {
          id: input.id,
          name: input.name,
          translation: input.translation,
          component: input.component,
          active: Boolean(match),
          is_default: Boolean(match?.pivot?.is_default),
          order: Number(match?.pivot?.order ?? input.order ?? 0),
        };
      },
    );

    this.items.set(mapped.sort((a, b) => a.order - b.order));
  }

  protected toggleActive(id: number): void {
    this.items.update((items: QuestionTypeInputTypesConfigItem[]): QuestionTypeInputTypesConfigItem[] =>
      items.map((item): QuestionTypeInputTypesConfigItem => {
        if (item.id !== id) {
          return item;
        }

        const nextActive = !item.active;

        return {
          ...item,
          active: nextActive,
          is_default: nextActive ? item.is_default : false,
        };
      }),
    );
  }

  protected setDefault(id: number): void {
    this.items.update((items: QuestionTypeInputTypesConfigItem[]): QuestionTypeInputTypesConfigItem[] =>
      items.map((item): QuestionTypeInputTypesConfigItem => ({
        ...item,
        active: item.id === id ? true : item.active,
        is_default: item.id === id,
      })),
    );
  }

  protected onSubmit(): void {
    const payload = this.items()
      .filter((item) => item.active)
      .map((item, index) => ({
        question_input_type_id: item.id,
        active: true,
        is_default: item.is_default,
        order: index,
      }));

    this.modal.close<IQuestionTypeInputTypesConfigModalResult>({
      saved: true,
      items: payload,
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }
}