import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem } from '@shared/interfaces/access.interfaces';
import type { IBlockType } from '@shared/interfaces/configuration.interfaces';
import type { IStudyPlanScheduleBlock } from '@shared/interfaces/study-plan-interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

interface ScheduleBlockPayload {
  block_type_id: number;
  code: string;
  name: string;
  start: string;
  end: string;
}

interface ScheduleBlockMutationResponse {
  block: IStudyPlanScheduleBlock;
}

export type ScheduleBlockChangeEvent =
  | { type: 'created'; block: IStudyPlanScheduleBlock }
  | { type: 'updated'; block: IStudyPlanScheduleBlock }
  | { type: 'deleted'; blockId: number };

@Component({
  selector: 'app-schedule-segment-blocks',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    FormErrorComponent,
    SkSelectComponent,
    UiButtonComponent,
    UiIconComponent,
  ],
  templateUrl: './schedule-segment-blocks.component.html',
  styleUrl: './schedule-segment-blocks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleSegmentBlocksComponent extends SkolansBaseComponent {
  private readonly fb = inject(FormBuilder);

  /**
   * State ownership
   * ---------------
   * The parent segment detail owns the canonical segment payload and passes the
   * current block collection to this component. This component owns only local
   * block UI state: selected row, pending action mode, form state, and saving
   * state.
   *
   * Parent synchronization
   * ----------------------
   * Successful block mutations emit the mutation result so the parent can patch
   * its canonical segment payload and metrics. Inputs must not be mutated
   * locally.
   */
  readonly segmentId = input<number | null>(null);
  readonly blocks = input<IStudyPlanScheduleBlock[]>([]);
  readonly blockTypes = input<IBlockType[]>([]);
  readonly screenChildren = input<ScreenChildItem[]>([], { alias: 'children' });

  readonly changed = output<ScheduleBlockChangeEvent>();

  protected readonly blockActionMode = signal<'create' | 'edit' | 'delete' | 'reorder' | null>(
    null,
  );
  protected readonly selectedBlockId = signal<number | null>(null);
  protected readonly savingBlock = signal(false);

  protected readonly blockForm = this.fb.group(
    {
      block_type_id: this.fb.control<number | null>(null, [Validators.required]),
      code: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(10)]),
      name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
      start: this.fb.nonNullable.control('', [Validators.required]),
      end: this.fb.nonNullable.control('', [Validators.required]),
    },
    {
      validators: [this.endAfterStartValidator.bind(this)],
    },
  );

  protected readonly sortedBlocks = computed(() =>
    [...this.blocks()].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.id - b.id;
    }),
  );

  protected readonly selectedBlock = computed(() => {
    const selectedBlockId = this.selectedBlockId();

    if (!selectedBlockId) {
      return null;
    }

    return this.sortedBlocks().find((block) => block.id === selectedBlockId) ?? null;
  });
  protected readonly hasSelectedBlock = computed(() => !!this.selectedBlock());
  protected readonly canReorderBlocks = computed(() => this.sortedBlocks().length >= 2);
  protected readonly isBlockFormOpen = computed(
    () => this.blockActionMode() === 'create' || this.blockActionMode() === 'edit',
  );
  protected readonly blockFormTitle = computed(() =>
    this.blockActionMode() === 'edit'
      ? 'planning.study-plan-schedule-segments.detail.blocks.form.edit-title'
      : 'planning.study-plan-schedule-segments.detail.blocks.form.create-title',
  );

  protected readonly addBlockOption = computed(() =>
    this.getScreenChildOption('study-plan-schedule-blocks', 'add'),
  );
  protected readonly updateBlockOption = computed(() =>
    this.getScreenChildOption('study-plan-schedule-blocks', 'update'),
  );
  protected readonly deleteBlockOption = computed(() =>
    this.getScreenChildOption('study-plan-schedule-blocks', 'delete'),
  );
  protected readonly reorderBlockOption = computed(() =>
    this.getScreenChildOption('study-plan-schedule-blocks', 'reorder'),
  );
  protected readonly blocksRoute = computed(() =>
    this.getScreenChildRoute('study-plan-schedule-blocks'),
  );

  constructor() {
    super();

    effect(() => {
      this.setScreenChildren(this.screenChildren());
    });

    effect(() => {
      const selectedBlockId = this.selectedBlockId();

      if (!selectedBlockId) {
        return;
      }

      const stillExists = this.sortedBlocks().some((block) => block.id === selectedBlockId);

      if (!stillExists) {
        this.selectedBlockId.set(null);
        this.blockActionMode.set(null);
        this.resetBlockForm();
      }
    });
  }

  protected selectBlock(blockId: number): void {
    if (this.isBlockFormOpen() || this.savingBlock()) {
      return;
    }

    if (this.selectedBlockId() === blockId) {
      this.selectedBlockId.set(null);
      this.blockActionMode.set(null);
      return;
    }

    this.selectedBlockId.set(blockId);
    this.blockActionMode.set(null);
  }

  protected isBlockSelected(blockId: number): boolean {
    return this.selectedBlockId() === blockId;
  }

  protected startCreateBlock(): void {
    if (!this.segmentId() || !this.addBlockOption() || this.selectedBlock() || this.savingBlock()) {
      return;
    }

    this.selectedBlockId.set(null);
    this.resetBlockForm();
    this.blockActionMode.set('create');
  }

  protected startEditSelectedBlock(): void {
    const block = this.selectedBlock();

    if (!this.updateBlockOption() || !block || this.savingBlock()) {
      return;
    }

    this.blockForm.reset({
      block_type_id: block.block_type_id,
      code: block.code,
      name: block.name,
      start: this.toTimeInputValue(block.start),
      end: this.toTimeInputValue(block.end),
    });
    this.blockActionMode.set('edit');
  }

  protected async confirmDeleteSelectedBlock(): Promise<void> {
    const route = this.blocksRoute();
    const segmentId = this.segmentId();
    const block = this.selectedBlock();

    if (
      !this.deleteBlockOption() ||
      !route ||
      !segmentId ||
      !block ||
      this.isBlockFormOpen() ||
      this.savingBlock()
    ) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.study-plan-schedule-segments.detail.blocks.messages.delete-title',
      'planning.study-plan-schedule-segments.detail.blocks.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.savingBlock.set(true);

    this.executeMutationRequest<{ block_id?: number | null }>(
      this.api.delete<{ block_id?: number | null }>(`${route}/${segmentId}/${block.id}`),
      (res) => {
        this.selectedBlockId.set(null);
        this.blockActionMode.set(null);
        this.resetBlockForm();
        this.changed.emit({
          type: 'deleted',
          blockId: res.data.block_id ?? block.id,
        });
      },
      () => {
        this.savingBlock.set(false);
      },
    );
  }

  protected startReorderBlocks(): void {
    if (!this.reorderBlockOption() || !this.canReorderBlocks()) {
      return;
    }

    this.blockActionMode.set('reorder');
  }

  protected cancelBlockForm(): void {
    if (this.savingBlock()) {
      return;
    }

    this.blockActionMode.set(null);
    this.resetBlockForm();
  }

  protected saveBlock(): void {
    const segmentId = this.segmentId();
    const route = this.blocksRoute();
    const mode = this.blockActionMode();

    this.blockForm.markAllAsTouched();
    this.blockForm.updateValueAndValidity();

    if (!segmentId || !route || this.blockForm.invalid || this.savingBlock()) {
      return;
    }

    const payload = this.blockPayload();

    if (!payload) {
      return;
    }

    if (mode === 'create') {
      this.saveCreatedBlock(route, segmentId, payload);
      return;
    }

    if (mode === 'edit') {
      const block = this.selectedBlock();

      if (!block) {
        return;
      }

      this.saveUpdatedBlock(route, segmentId, block.id, payload);
    }
  }

  protected hasEndAfterStartError(): boolean {
    const endControl = this.blockForm.controls.end;

    return this.blockForm.hasError('endAfterStart') && (endControl.touched || endControl.dirty);
  }

  protected blockTypeTranslation(block: IStudyPlanScheduleBlock): string {
    const blockType = this.blockTypes().find((type) => type.id === block.block_type_id);

    return (
      block.type?.translation ||
      block.type?.name ||
      blockType?.translation ||
      blockType?.name ||
      String(block.block_type_id)
    );
  }

  protected formatTime(value: string | null | undefined): string {
    if (!value) {
      return '--:--';
    }

    return value.slice(0, 5);
  }

  protected durationMinutes(block: IStudyPlanScheduleBlock): number {
    if (typeof block.duration === 'number') {
      return block.duration;
    }

    return this.calculateDuration(block.start, block.end);
  }

  private calculateDuration(
    start: string | null | undefined,
    end: string | null | undefined,
  ): number {
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);

    if (startMinutes === null || endMinutes === null || endMinutes < startMinutes) {
      return 0;
    }

    return endMinutes - startMinutes;
  }

  private saveCreatedBlock(route: string, segmentId: number, payload: ScheduleBlockPayload): void {
    this.savingBlock.set(true);

    this.executeMutationRequest<ScheduleBlockMutationResponse>(
      this.api.post<ScheduleBlockMutationResponse>(`${route}/${segmentId}`, payload),
      (res) => {
        this.blockActionMode.set(null);
        this.selectedBlockId.set(null);
        this.resetBlockForm();
        this.changed.emit({
          type: 'created',
          block: res.data.block,
        });
      },
      () => {
        this.savingBlock.set(false);
      },
    );
  }

  private saveUpdatedBlock(
    route: string,
    segmentId: number,
    blockId: number,
    payload: ScheduleBlockPayload,
  ): void {
    this.savingBlock.set(true);

    this.executeMutationRequest<ScheduleBlockMutationResponse>(
      this.api.put<ScheduleBlockMutationResponse>(`${route}/${segmentId}/${blockId}`, payload),
      (res) => {
        this.blockActionMode.set(null);
        this.resetBlockForm();
        this.changed.emit({
          type: 'updated',
          block: res.data.block,
        });
      },
      () => {
        this.savingBlock.set(false);
      },
    );
  }

  private blockPayload(): ScheduleBlockPayload | null {
    const value = this.blockForm.getRawValue();

    if (value.block_type_id === null) {
      return null;
    }

    return {
      block_type_id: value.block_type_id,
      code: value.code,
      name: value.name,
      start: value.start,
      end: value.end,
    };
  }

  private resetBlockForm(): void {
    this.blockForm.reset({
      block_type_id: null,
      code: '',
      name: '',
      start: '',
      end: '',
    });
  }

  private endAfterStartValidator(control: AbstractControl): ValidationErrors | null {
    const start = control.get('start')?.value;
    const end = control.get('end')?.value;
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);

    if (startMinutes === null || endMinutes === null) {
      return null;
    }

    return endMinutes > startMinutes ? null : { endAfterStart: true };
  }

  private toTimeInputValue(value: string | null | undefined): string {
    return value ? value.slice(0, 5) : '';
  }

  private timeToMinutes(value: string | null | undefined): number | null {
    if (!value) {
      return null;
    }

    const [hours, minutes] = value.split(':').map((part) => Number(part));

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }

    return hours * 60 + minutes;
  }
}
