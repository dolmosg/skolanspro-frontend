import { signal, type Signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideLucideIcons } from '@lucide/angular';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { type Observable, Subject, of } from 'rxjs';

import type { ApiResponse } from '@shared/interfaces/api-response.interface';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { ApiConfigService } from '@shared/services/api-config-service';
import { ApiService } from '@shared/services/api-service';
import { AssistantContextService } from '@shared/services/assistant-context-service';
import { RouteMetaService } from '@shared/services/route-meta-service';
import { SiteStateService } from '@shared/services/site-state';
import { SklModalService } from '@shared/services/skl-modal-service';
import { ToastService } from '@shared/services/toast-service';
import type { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { REGISTERED_ICONS } from '@shared/icons/icon-registry';

import { StudyPlanAspectConfigurationComponent } from './study-plan-aspect-configuration.component';
import type {
  StudyPlanAspectConfigurationResponse,
  StudyPlanAspectModeName,
  StudyPlanAspectSelectionContextResponse,
  StudyPlanConfiguredAspect,
} from './study-plan-aspect-configuration.interfaces';

interface ComponentHarness {
  activeEditor: WritableSignal<'add' | 'weight' | 'activities' | 'aspect' | null>;
  areAllAspectsSelected: Signal<boolean>;
  aspectTable: Signal<Pick<SkolansTable, 'clearSelection' | 'selectAll'> | undefined>;
  addSelectedAspects(): void;
  confirmConfigurationAction(action: 'automatic' | 'manual' | 'delete'): Promise<void>;
  aspectConfiguration: WritableSignal<StudyPlanAspectConfigurationResponse | null>;
  activitiesDraft: WritableSignal<string>;
  aspectActivitiesDraft: WritableSignal<string>;
  aspectAutomaticDraft: WritableSignal<boolean>;
  aspectWeightDraft: WritableSignal<string>;
  availableAspectSearch: WritableSignal<string>;
  lastConfigurationRequestKey: string | null;
  loading: WritableSignal<boolean>;
  normalizedActivitiesDraft: Signal<number | null>;
  normalizedWeightDraft: Signal<number | null>;
  normalizedAspectActivitiesDraft: Signal<number | null>;
  normalizedAspectWeightDraft: Signal<number | null>;
  onAction(action: ScreenOptionItem): void;
  openAspectEditor(aspect: StudyPlanConfiguredAspect): void;
  prepareActivitiesChange(): void;
  prepareWeightChange(): void;
  selectedAvailableAspectIds: WritableSignal<number[]>;
  selectedAspects: WritableSignal<StudyPlanConfiguredAspect[]>;
  editingAspect: WritableSignal<StudyPlanConfiguredAspect | null>;
  selectedStageSubjectId: FormControl<number | null>;
  selectedTermId: FormControl<number | null>;
  toggleAllAspects(): void;
  saveAspectEditor(): void;
  closeEditor(): void;
  weightDraft: WritableSignal<string>;
}

interface PostCall {
  route: string;
  body: unknown;
  succeed(data: StudyPlanAspectConfigurationResponse): void;
  fail(message: string): void;
}

const initialConfiguration: StudyPlanAspectConfigurationResponse = {
  aspect_mode: 'stage',
  context: {
    study_plan_stage_id: 20,
    study_plan_term_id: null,
    stage_subject_id: null,
  },
  configured_aspects: [],
  available_aspects: [{ id: 1, name: 'Aspect 1', description: null }],
};

class ApiServiceStub {
  mode: StudyPlanAspectModeName = 'stage';
  readonly getCalls: string[] = [];
  readonly postCalls: PostCall[] = [];

  get<T>(route: string): Observable<ApiResponse<T>> {
    this.getCalls.push(route);
    const data = route.endsWith('/20?grade_id=30')
      ? selectionContext(this.mode)
      : { ...initialConfiguration, aspect_mode: this.mode };

    return of(successResponse(data as T));
  }

  post<T>(route: string, body: unknown): Observable<ApiResponse<T>> {
    const response = new Subject<ApiResponse<T>>();
    this.postCalls.push({
      route,
      body,
      succeed: (data) => {
        response.next(successResponse(data as T));
        response.complete();
      },
      fail: (message) => {
        response.next({ success: false, data: null, message });
        response.complete();
      },
    });

    return response.asObservable();
  }
}

describe('StudyPlanAspectConfigurationComponent mutations', () => {
  let fixture: ComponentFixture<StudyPlanAspectConfigurationComponent>;
  let component: ComponentHarness;
  let api: ApiServiceStub;
  let modalResult: boolean | null | undefined;

  beforeEach(async () => {
    ModuleRegistry.registerModules([AllCommunityModule]);
    api = new ApiServiceStub();
    modalResult = true;

    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), StudyPlanAspectConfigurationComponent],
      providers: [
        { provide: ActivatedRoute, useValue: {} },
        { provide: ApiService, useValue: api },
        { provide: RouteMetaService, useValue: {} },
        { provide: SklModalService, useValue: { open: async () => modalResult } },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']),
        },
        { provide: SiteStateService, useValue: { nameCasing: signal('normal') } },
        {
          provide: AssistantContextService,
          useValue: jasmine.createSpyObj<AssistantContextService>('AssistantContextService', [
            'setLayer',
            'clearOwner',
          ]),
        },
        { provide: ApiConfigService, useValue: { routerPrefix: '/tenant' } },
        provideLucideIcons(...REGISTERED_ICONS),
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.addLangs(['en-US']);
    translate.setFallbackLang('en-US');
    translate.use('en-US');
  });

  afterEach(() => fixture?.destroy());

  it('does not request Add when no aspects are selected', () => {
    createComponent('stage');

    component.addSelectedAspects();

    expect(api.postCalls).toEqual([]);
  });

  [
    { mode: 'stage' as const, query: '?grade_id=30' },
    { mode: 'term' as const, query: '?grade_id=30&term_id=40' },
    { mode: 'subject' as const, query: '?grade_id=30&stage_subject_id=50' },
    {
      mode: 'full' as const,
      query: '?grade_id=30&term_id=40&stage_subject_id=50',
    },
  ].forEach(({ mode, query }) => {
    it(`posts the selected ids with the ${mode} context`, () => {
      createComponent(mode);
      component.selectedAvailableAspectIds.set([1, 2, 3]);

      component.addSelectedAspects();

      expect(api.postCalls.length).toBe(1);
      expect(api.postCalls[0].route).toBe(`/configuration/10/20/configuration${query}`);
      expect(api.postCalls[0].body).toEqual({ aspect_ids: [1, 2, 3] });
    });
  });

  it('replaces canonical state and clears the Add editor only after success', () => {
    createComponent('stage');
    const canonicalResponse: StudyPlanAspectConfigurationResponse = {
      ...initialConfiguration,
      configured_aspects: [
        {
          automatic: false,
          weight: '1.0000',
          activities: 2,
          order: 1,
          aspect: { id: 1, name: 'Aspect 1', description: null },
        },
      ],
      available_aspects: [],
    };
    component.activeEditor.set('add');
    component.availableAspectSearch.set('aspect');
    component.selectedAvailableAspectIds.set([1]);

    component.addSelectedAspects();
    api.postCalls[0].succeed(canonicalResponse);

    expect(component.aspectConfiguration()).toBe(canonicalResponse);
    expect(component.activeEditor()).toBeNull();
    expect(component.availableAspectSearch()).toBe('');
    expect(component.selectedAvailableAspectIds()).toEqual([]);
  });

  it('preserves canonical and editor state after a logical failure', () => {
    createComponent('stage');
    const previousConfiguration = component.aspectConfiguration();
    component.activeEditor.set('add');
    component.availableAspectSearch.set('aspect');
    component.selectedAvailableAspectIds.set([1]);

    component.addSelectedAspects();
    api.postCalls[0].fail('errors.invalid');

    expect(component.aspectConfiguration()).toBe(previousConfiguration);
    expect(component.activeEditor()).toBe('add');
    expect(component.availableAspectSearch()).toBe('aspect');
    expect(component.selectedAvailableAspectIds()).toEqual([1]);
  });

  it('ignores a successful response from a stale configuration context', () => {
    createComponent('stage');
    const currentConfiguration = component.aspectConfiguration();
    component.activeEditor.set('add');
    component.selectedAvailableAspectIds.set([1]);

    component.addSelectedAspects();
    component.lastConfigurationRequestKey = 'newer-context';
    api.postCalls[0].succeed({ ...initialConfiguration, available_aspects: [] });

    expect(component.aspectConfiguration()).toBe(currentConfiguration);
    expect(component.activeEditor()).toBe('add');
    expect(component.selectedAvailableAspectIds()).toEqual([1]);
  });

  [false, null, undefined].forEach((result) => {
    it(`does not delete when confirmation resolves to ${String(result)}`, async () => {
      createComponent('stage');
      component.selectedAspects.set([configuredAspect(1)]);
      modalResult = result;

      await component.confirmConfigurationAction('delete');

      expect(api.postCalls).toEqual([]);
    });
  });

  [
    { mode: 'stage' as const, query: '?grade_id=30' },
    { mode: 'term' as const, query: '?grade_id=30&term_id=40' },
    { mode: 'subject' as const, query: '?grade_id=30&stage_subject_id=50' },
    {
      mode: 'full' as const,
      query: '?grade_id=30&term_id=40&stage_subject_id=50',
    },
  ].forEach(({ mode, query }) => {
    it(`deletes unique selected ids with the ${mode} context after confirmation`, async () => {
      createComponent(mode);
      component.selectedAspects.set([
        configuredAspect(1),
        configuredAspect(2),
        configuredAspect(1),
      ]);

      await component.confirmConfigurationAction('delete');

      expect(api.postCalls.length).toBe(1);
      expect(api.postCalls[0].route).toBe(`/configuration/10/20/configuration/remove${query}`);
      expect(api.postCalls[0].body).toEqual({ aspect_ids: [1, 2] });
    });
  });

  it('replaces canonical state and clears drafts after a successful delete without another GET', async () => {
    createComponent('full');
    const termId = component.selectedTermId.value;
    const stageSubjectId = component.selectedStageSubjectId.value;
    const contextGetCount = api.getCalls.length;
    const canonicalResponse = { ...initialConfiguration, available_aspects: [] };
    component.activeEditor.set('weight');
    component.availableAspectSearch.set('aspect');
    component.selectedAvailableAspectIds.set([3]);
    component.weightDraft.set('30');
    component.activitiesDraft.set('4');
    component.selectedAspects.set([configuredAspect(1)]);

    await component.confirmConfigurationAction('delete');
    api.postCalls[0].succeed(canonicalResponse);

    expect(component.aspectConfiguration()).toBe(canonicalResponse);
    expect(component.selectedAspects()).toEqual([]);
    expect(component.activeEditor()).toBeNull();
    expect(component.availableAspectSearch()).toBe('');
    expect(component.selectedAvailableAspectIds()).toEqual([]);
    expect(component.weightDraft()).toBe('');
    expect(component.activitiesDraft()).toBe('');
    expect(component.selectedTermId.value).toBe(termId);
    expect(component.selectedStageSubjectId.value).toBe(stageSubjectId);
    expect(api.getCalls.length).toBe(contextGetCount);
  });

  it('preserves state after a logical delete failure', async () => {
    createComponent('stage');
    const previousConfiguration = component.aspectConfiguration();
    const selection = [configuredAspect(1)];
    component.selectedAspects.set(selection);

    await component.confirmConfigurationAction('delete');
    api.postCalls[0].fail('errors.invalid');

    expect(component.aspectConfiguration()).toBe(previousConfiguration);
    expect(component.selectedAspects()).toBe(selection);
  });

  it('ignores a successful delete response from a stale context', async () => {
    createComponent('stage');
    const previousConfiguration = component.aspectConfiguration();
    const selection = [configuredAspect(1)];
    component.selectedAspects.set(selection);

    await component.confirmConfigurationAction('delete');
    component.lastConfigurationRequestKey = 'newer-context';
    api.postCalls[0].succeed({ ...initialConfiguration, available_aspects: [] });

    expect(component.aspectConfiguration()).toBe(previousConfiguration);
    expect(component.selectedAspects()).toBe(selection);
  });

  [
    { action: 'automatic' as const, automatic: true },
    { action: 'manual' as const, automatic: false },
  ].forEach(({ action, automatic }) => {
    it(`posts one grouped ${action} mutation with unique logical ids`, async () => {
      createComponent('stage');
      component.selectedAspects.set([
        configuredAspect(1),
        configuredAspect(2),
        configuredAspect(1),
      ]);

      await component.confirmConfigurationAction(action);

      expect(api.postCalls.length).toBe(1);
      expect(api.postCalls[0].route).toBe(
        '/configuration/10/20/configuration/automatic?grade_id=30',
      );
      expect(api.postCalls[0].body).toEqual({ aspect_ids: [1, 2], automatic });
    });
  });

  [
    { mode: 'stage' as const, query: '?grade_id=30' },
    { mode: 'term' as const, query: '?grade_id=30&term_id=40' },
    { mode: 'subject' as const, query: '?grade_id=30&stage_subject_id=50' },
    {
      mode: 'full' as const,
      query: '?grade_id=30&term_id=40&stage_subject_id=50',
    },
  ].forEach(({ mode, query }) => {
    it(`uses the ${mode} context for automatic/manual mutations`, async () => {
      createComponent(mode);
      component.selectedAspects.set([configuredAspect(1)]);

      await component.confirmConfigurationAction('automatic');

      expect(api.postCalls[0].route).toBe(`/configuration/10/20/configuration/automatic${query}`);
    });
  });

  [false, null, undefined].forEach((result) => {
    it(`preserves automatic/manual state when confirmation resolves to ${String(result)}`, async () => {
      createComponent('stage');
      const previousConfiguration = component.aspectConfiguration();
      const selection = [configuredAspect(1)];
      component.selectedAspects.set(selection);
      modalResult = result;

      await component.confirmConfigurationAction('manual');

      expect(api.postCalls).toEqual([]);
      expect(component.aspectConfiguration()).toBe(previousConfiguration);
      expect(component.selectedAspects()).toBe(selection);
    });
  });

  it('replaces canonical state and clears drafts after automatic success without another GET', async () => {
    createComponent('full');
    const getCount = api.getCalls.length;
    const canonicalResponse: StudyPlanAspectConfigurationResponse = {
      ...initialConfiguration,
      configured_aspects: [{ ...configuredAspect(1), weight: '0.5000' }],
    };
    component.activeEditor.set('activities');
    component.availableAspectSearch.set('aspect');
    component.selectedAvailableAspectIds.set([3]);
    component.weightDraft.set('30');
    component.activitiesDraft.set('4');
    component.selectedAspects.set([configuredAspect(1)]);

    await component.confirmConfigurationAction('automatic');
    api.postCalls[0].succeed(canonicalResponse);

    expect(component.aspectConfiguration()).toBe(canonicalResponse);
    expect(component.selectedAspects()).toEqual([]);
    expect(component.activeEditor()).toBeNull();
    expect(component.availableAspectSearch()).toBe('');
    expect(component.selectedAvailableAspectIds()).toEqual([]);
    expect(component.weightDraft()).toBe('');
    expect(component.activitiesDraft()).toBe('');
    expect(component.selectedTermId.value).toBe(40);
    expect(component.selectedStageSubjectId.value).toBe(50);
    expect(api.getCalls.length).toBe(getCount);
  });

  it('preserves canonical state and selection after an automatic logical failure', async () => {
    createComponent('stage');
    const previousConfiguration = component.aspectConfiguration();
    const selection = [configuredAspect(1)];
    component.selectedAspects.set(selection);

    await component.confirmConfigurationAction('manual');
    api.postCalls[0].fail('errors.invalid');

    expect(component.aspectConfiguration()).toBe(previousConfiguration);
    expect(component.selectedAspects()).toBe(selection);
  });

  it('ignores an automatic response from a stale context', async () => {
    createComponent('stage');
    const previousConfiguration = component.aspectConfiguration();
    const selection = [configuredAspect(1)];
    component.selectedAspects.set(selection);

    await component.confirmConfigurationAction('automatic');
    component.lastConfigurationRequestKey = 'newer-context';
    api.postCalls[0].succeed({ ...initialConfiguration, configured_aspects: [] });

    expect(component.aspectConfiguration()).toBe(previousConfiguration);
    expect(component.selectedAspects()).toBe(selection);
  });

  it('does not send automatic/manual mutations while loading', async () => {
    createComponent('stage');
    component.selectedAspects.set([configuredAspect(1)]);
    component.loading.set(true);

    await component.confirmConfigurationAction('automatic');

    expect(api.postCalls).toEqual([]);
  });

  it('selects all aspects when no aspect is selected', () => {
    createComponent('stage');
    const rows = [configuredAspect(1), configuredAspect(2)];
    const selectAll = jasmine.createSpy('selectAll').and.callFake(() => {
      component.selectedAspects.set(rows);
    });
    component.aspectConfiguration.set({ ...initialConfiguration, configured_aspects: rows });
    component.aspectTable = signal({ selectAll, clearSelection: jasmine.createSpy() });

    component.toggleAllAspects();

    expect(selectAll).toHaveBeenCalledOnceWith();
    expect(component.selectedAspects()).toBe(rows);
    expect(component.areAllAspectsSelected()).toBeTrue();
  });

  it('opens the individual editor with canonical values without changing bulk selection', () => {
    createComponent('stage');
    const selected = configuredAspect(2);
    const editing = { ...configuredAspect(1), automatic: false, weight: '0.3333', activities: 4 };
    component.selectedAspects.set([selected]);

    component.openAspectEditor(editing);

    expect(component.activeEditor()).toBe('aspect');
    expect(component.editingAspect()).toBe(editing);
    expect(component.aspectAutomaticDraft()).toBeFalse();
    expect(component.aspectWeightDraft()).toBe('33.33');
    expect(component.aspectActivitiesDraft()).toBe('4');
    expect(component.selectedAspects()).toEqual([selected]);
  });

  it('preserves the individual weight draft when automatic is enabled and disabled', () => {
    createComponent('stage');
    component.openAspectEditor(configuredAspect(1));
    component.aspectWeightDraft.set('40');

    component.aspectAutomaticDraft.set(true);
    expect(component.aspectWeightDraft()).toBe('40');

    component.aspectAutomaticDraft.set(false);
    expect(component.aspectWeightDraft()).toBe('40');
  });

  it('disables and re-enables the individual weight input from the automatic checkbox', () => {
    createComponent('stage');
    component.openAspectEditor({ ...configuredAspect(1), automatic: false, weight: '0.2500' });
    component.aspectWeightDraft.set('25');
    fixture.detectChanges();

    const automaticInput = fixture.nativeElement.querySelector(
      '[data-testid="aspect-automatic-input"]',
    ) as HTMLInputElement;
    const weightInput = fixture.nativeElement.querySelector(
      '[data-testid="aspect-weight-input"]',
    ) as HTMLInputElement;

    expect(weightInput.disabled).toBeFalse();

    automaticInput.checked = true;
    automaticInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(weightInput.disabled).toBeTrue();
    expect(component.aspectWeightDraft()).toBe('25');

    automaticInput.checked = false;
    automaticInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(weightInput.disabled).toBeFalse();
    expect(weightInput.value).toBe('25');
    expect(component.aspectWeightDraft()).toBe('25');
  });

  it('keeps weight in the payload when saving an automatic aspect', () => {
    createComponent('stage');
    component.openAspectEditor(configuredAspect(1));
    component.aspectAutomaticDraft.set(true);
    component.aspectWeightDraft.set('25');
    component.aspectActivitiesDraft.set('2');

    component.saveAspectEditor();

    expect(api.postCalls[0].body).toEqual({
      aspect_id: 1,
      automatic: true,
      weight: 0.25,
      activities: 2,
    });
  });

  [
    { mode: 'stage' as const, query: '?grade_id=30' },
    { mode: 'term' as const, query: '?grade_id=30&term_id=40' },
    { mode: 'subject' as const, query: '?grade_id=30&stage_subject_id=50' },
    {
      mode: 'full' as const,
      query: '?grade_id=30&term_id=40&stage_subject_id=50',
    },
  ].forEach(({ mode, query }) => {
    it(`posts one individual aspect mutation with the ${mode} context`, () => {
      createComponent(mode);
      component.openAspectEditor(configuredAspect(1));
      component.aspectAutomaticDraft.set(false);
      component.aspectWeightDraft.set('25');
      component.aspectActivitiesDraft.set('4');

      component.saveAspectEditor();

      expect(api.postCalls.length).toBe(1);
      expect(api.postCalls[0].route).toBe(`/configuration/10/20/configuration/aspect${query}`);
      expect(api.postCalls[0].body).toEqual({
        aspect_id: 1,
        automatic: false,
        weight: 0.25,
        activities: 4,
      });
    });
  });

  ['0', '25', '33.33', '100'].forEach((draft) => {
    it(`accepts individual visual weight ${draft}`, () => {
      createComponent('stage');
      component.openAspectEditor(configuredAspect(1));
      component.aspectWeightDraft.set(draft);

      expect(component.normalizedAspectWeightDraft()).not.toBeNull();
    });
  });

  ['', 'text', '-1', '100.01'].forEach((draft) => {
    it(`rejects individual visual weight ${draft || 'empty'}`, () => {
      createComponent('stage');
      component.openAspectEditor(configuredAspect(1));
      component.aspectWeightDraft.set(draft);

      component.saveAspectEditor();

      expect(component.normalizedAspectWeightDraft()).toBeNull();
      expect(api.postCalls).toEqual([]);
    });
  });

  ['0', '4'].forEach((draft) => {
    it(`accepts individual activities ${draft}`, () => {
      createComponent('stage');
      component.openAspectEditor(configuredAspect(1));
      component.aspectActivitiesDraft.set(draft);

      expect(component.normalizedAspectActivitiesDraft()).not.toBeNull();
    });
  });

  ['', 'text', '-1', '1.5'].forEach((draft) => {
    it(`rejects individual activities ${draft || 'empty'}`, () => {
      createComponent('stage');
      component.openAspectEditor(configuredAspect(1));
      component.aspectActivitiesDraft.set(draft);

      component.saveAspectEditor();

      expect(component.normalizedAspectActivitiesDraft()).toBeNull();
      expect(api.postCalls).toEqual([]);
    });
  });

  it('replaces canonical state and clears only the individual editor after success', () => {
    createComponent('stage');
    const getCount = api.getCalls.length;
    const canonical = {
      ...initialConfiguration,
      configured_aspects: [{ ...configuredAspect(1), activities: 4 }],
    };
    component.openAspectEditor(configuredAspect(1));
    component.aspectActivitiesDraft.set('4');

    component.saveAspectEditor();
    api.postCalls[0].succeed(canonical);

    expect(component.aspectConfiguration()).toBe(canonical);
    expect(component.activeEditor()).toBeNull();
    expect(component.editingAspect()).toBeNull();
    expect(component.aspectWeightDraft()).toBe('');
    expect(component.aspectActivitiesDraft()).toBe('');
    expect(api.getCalls.length).toBe(getCount);
  });

  it('preserves the individual editor and canonical state after a logical failure', () => {
    createComponent('stage');
    const previous = component.aspectConfiguration();
    const editing = configuredAspect(1);
    component.openAspectEditor(editing);
    component.aspectWeightDraft.set('25');
    component.aspectActivitiesDraft.set('4');

    component.saveAspectEditor();
    api.postCalls[0].fail('invalid');

    expect(component.aspectConfiguration()).toBe(previous);
    expect(component.activeEditor()).toBe('aspect');
    expect(component.editingAspect()).toBe(editing);
    expect(component.aspectWeightDraft()).toBe('25');
    expect(component.aspectActivitiesDraft()).toBe('4');
  });

  it('ignores a stale individual mutation without clearing a newer editor', () => {
    createComponent('stage');
    const previous = component.aspectConfiguration();
    component.openAspectEditor(configuredAspect(1));
    component.saveAspectEditor();
    component.lastConfigurationRequestKey = 'new-context';
    component.loading.set(false);
    const newerEditing = configuredAspect(2);
    component.openAspectEditor(newerEditing);

    api.postCalls[0].succeed({ ...initialConfiguration, configured_aspects: [] });

    expect(component.aspectConfiguration()).toBe(previous);
    expect(component.activeEditor()).toBe('aspect');
    expect(component.editingAspect()).toBe(newerEditing);
  });

  it('does not send a second individual mutation while loading', () => {
    createComponent('stage');
    component.openAspectEditor(configuredAspect(1));

    component.saveAspectEditor();
    component.saveAspectEditor();

    expect(api.postCalls.length).toBe(1);
  });

  it('cancels the individual editor without changing canonical state or requesting data', () => {
    createComponent('stage');
    const previous = component.aspectConfiguration();
    const getCount = api.getCalls.length;
    component.openAspectEditor(configuredAspect(1));

    component.closeEditor();

    expect(component.aspectConfiguration()).toBe(previous);
    expect(component.activeEditor()).toBeNull();
    expect(component.editingAspect()).toBeNull();
    expect(api.postCalls).toEqual([]);
    expect(api.getCalls.length).toBe(getCount);
  });

  it('completes a partial selection instead of clearing it', () => {
    createComponent('stage');
    const rows = [configuredAspect(1), configuredAspect(2)];
    const selectAll = jasmine.createSpy('selectAll').and.callFake(() => {
      component.selectedAspects.set(rows);
    });
    component.aspectConfiguration.set({ ...initialConfiguration, configured_aspects: rows });
    component.selectedAspects.set([rows[0]]);
    component.aspectTable = signal({ selectAll, clearSelection: jasmine.createSpy() });

    component.toggleAllAspects();

    expect(selectAll).toHaveBeenCalledOnceWith();
    expect(component.areAllAspectsSelected()).toBeTrue();
  });

  it('clears visual and reactive selection when every aspect is selected', () => {
    createComponent('stage');
    const rows = [configuredAspect(1), configuredAspect(2)];
    const clearSelection = jasmine.createSpy('clearSelection');
    component.aspectConfiguration.set({ ...initialConfiguration, configured_aspects: rows });
    component.selectedAspects.set(rows);
    component.aspectTable = signal({ selectAll: jasmine.createSpy(), clearSelection });

    component.toggleAllAspects();

    expect(clearSelection).toHaveBeenCalledOnceWith();
    expect(component.selectedAspects()).toEqual([]);
    expect(component.areAllAspectsSelected()).toBeFalse();
  });

  [
    { draft: '25', expected: 0.25 },
    { draft: '33.33', expected: 0.3333 },
    { draft: '0', expected: 0 },
    { draft: '100', expected: 1 },
  ].forEach(({ draft, expected }) => {
    it(`normalizes visual weight ${draft} to backend weight ${expected}`, () => {
      createComponent('stage');
      component.selectedAspects.set([configuredAspect(1)]);
      component.weightDraft.set(draft);

      component.prepareWeightChange();

      expect(api.postCalls.length).toBe(1);
      expect(api.postCalls[0].body).toEqual({ aspect_ids: [1], weight: expected });
    });
  });

  ['', 'text', '-1', '100.01'].forEach((draft) => {
    it(`does not send invalid visual weight ${draft || 'empty'}`, () => {
      createComponent('stage');
      component.selectedAspects.set([configuredAspect(1)]);
      component.weightDraft.set(draft);

      component.prepareWeightChange();

      expect(component.normalizedWeightDraft()).toBeNull();
      expect(api.postCalls).toEqual([]);
    });
  });

  [
    { mode: 'stage' as const, query: '?grade_id=30' },
    { mode: 'term' as const, query: '?grade_id=30&term_id=40' },
    { mode: 'subject' as const, query: '?grade_id=30&stage_subject_id=50' },
    {
      mode: 'full' as const,
      query: '?grade_id=30&term_id=40&stage_subject_id=50',
    },
  ].forEach(({ mode, query }) => {
    it(`posts one weight mutation with unique ids and the ${mode} context`, () => {
      createComponent(mode);
      component.selectedAspects.set([
        configuredAspect(1),
        configuredAspect(2),
        configuredAspect(1),
      ]);
      component.weightDraft.set('20');

      component.prepareWeightChange();

      expect(api.postCalls.length).toBe(1);
      expect(api.postCalls[0].route).toBe(`/configuration/10/20/configuration/weight${query}`);
      expect(api.postCalls[0].body).toEqual({ aspect_ids: [1, 2], weight: 0.2 });
    });
  });

  it('replaces canonical state and clears the weight editor only after success', () => {
    createComponent('stage');
    const getCount = api.getCalls.length;
    const canonicalResponse: StudyPlanAspectConfigurationResponse = {
      ...initialConfiguration,
      configured_aspects: [{ ...configuredAspect(1), automatic: false, weight: '0.2500' }],
    };
    component.activeEditor.set('weight');
    component.weightDraft.set('25');
    component.selectedAspects.set([configuredAspect(1)]);

    component.prepareWeightChange();
    api.postCalls[0].succeed(canonicalResponse);

    expect(component.aspectConfiguration()).toBe(canonicalResponse);
    expect(component.activeEditor()).toBeNull();
    expect(component.weightDraft()).toBe('');
    expect(component.selectedAspects()).toEqual([]);
    expect(api.getCalls.length).toBe(getCount);
  });

  it('preserves canonical state, editor, draft, and selection after a weight domain failure', () => {
    createComponent('stage');
    const previousConfiguration = component.aspectConfiguration();
    const selection = [configuredAspect(1)];
    component.activeEditor.set('weight');
    component.weightDraft.set('60');
    component.selectedAspects.set(selection);

    component.prepareWeightChange();
    api.postCalls[0].fail('planning.study-plan-aspects.messages.manual-weight-exceeded');

    expect(component.aspectConfiguration()).toBe(previousConfiguration);
    expect(component.activeEditor()).toBe('weight');
    expect(component.weightDraft()).toBe('60');
    expect(component.selectedAspects()).toBe(selection);
  });

  it('ignores a successful weight response from a stale context', () => {
    createComponent('stage');
    const previousConfiguration = component.aspectConfiguration();
    const selection = [configuredAspect(1)];
    component.activeEditor.set('weight');
    component.weightDraft.set('25');
    component.selectedAspects.set(selection);

    component.prepareWeightChange();
    component.lastConfigurationRequestKey = 'newer-context';
    api.postCalls[0].succeed({ ...initialConfiguration, configured_aspects: [] });

    expect(component.aspectConfiguration()).toBe(previousConfiguration);
    expect(component.activeEditor()).toBe('weight');
    expect(component.weightDraft()).toBe('25');
    expect(component.selectedAspects()).toBe(selection);
  });

  it('does not send a weight mutation while loading', () => {
    createComponent('stage');
    component.selectedAspects.set([configuredAspect(1)]);
    component.weightDraft.set('25');
    component.loading.set(true);

    component.prepareWeightChange();

    expect(api.postCalls).toEqual([]);
  });

  [
    { mode: 'term' as const, clearTerm: true, clearSubject: false },
    { mode: 'subject' as const, clearTerm: false, clearSubject: true },
    { mode: 'full' as const, clearTerm: true, clearSubject: false },
    { mode: 'full' as const, clearTerm: false, clearSubject: true },
  ].forEach(({ mode, clearTerm, clearSubject }) => {
    it(`does not send a weight mutation with incomplete ${mode} context`, () => {
      createComponent(mode);

      if (clearTerm) {
        component.selectedTermId.setValue(null);
      }

      if (clearSubject) {
        component.selectedStageSubjectId.setValue(null);
      }

      fixture.detectChanges();
      component.selectedAspects.set([configuredAspect(1)]);
      component.weightDraft.set('25');

      component.prepareWeightChange();

      expect(api.postCalls).toEqual([]);
    });
  });

  it('opens weight with the current percentage for one selected aspect', () => {
    createComponent('stage');
    component.selectedAspects.set([{ ...configuredAspect(1), weight: '0.3333' }]);

    component.onAction({ name: 'weight' } as ScreenOptionItem);

    expect(component.activeEditor()).toBe('weight');
    expect(component.weightDraft()).toBe('33.33');
    expect(component.selectedAspects().length).toBe(1);
  });

  it('opens weight with an empty draft and preserves multiple selection', () => {
    createComponent('stage');
    const selection = [configuredAspect(1), configuredAspect(2)];
    component.selectedAspects.set(selection);

    component.onAction({ name: 'weight' } as ScreenOptionItem);

    expect(component.activeEditor()).toBe('weight');
    expect(component.weightDraft()).toBe('');
    expect(component.selectedAspects()).toBe(selection);
  });

  [
    { draft: '4', expected: 4 },
    { draft: '0', expected: 0 },
  ].forEach(({ draft, expected }) => {
    it(`posts valid activities ${draft} without conversion`, () => {
      createComponent('stage');
      component.selectedAspects.set([configuredAspect(1)]);
      component.activitiesDraft.set(draft);

      component.prepareActivitiesChange();

      expect(api.postCalls.length).toBe(1);
      expect(api.postCalls[0].body).toEqual({ aspect_ids: [1], activities: expected });
    });
  });

  ['', '-1', 'text', '1.5'].forEach((draft) => {
    it(`does not send invalid activities ${draft || 'empty'}`, () => {
      createComponent('stage');
      component.selectedAspects.set([configuredAspect(1)]);
      component.activitiesDraft.set(draft);

      component.prepareActivitiesChange();

      expect(component.normalizedActivitiesDraft()).toBeNull();
      expect(api.postCalls).toEqual([]);
    });
  });

  [
    { mode: 'stage' as const, query: '?grade_id=30' },
    { mode: 'term' as const, query: '?grade_id=30&term_id=40' },
    { mode: 'subject' as const, query: '?grade_id=30&stage_subject_id=50' },
    {
      mode: 'full' as const,
      query: '?grade_id=30&term_id=40&stage_subject_id=50',
    },
  ].forEach(({ mode, query }) => {
    it(`posts one activities mutation with unique ids and the ${mode} context`, () => {
      createComponent(mode);
      component.selectedAspects.set([
        configuredAspect(1),
        configuredAspect(2),
        configuredAspect(1),
      ]);
      component.activitiesDraft.set('5');

      component.prepareActivitiesChange();

      expect(api.postCalls.length).toBe(1);
      expect(api.postCalls[0].route).toBe(`/configuration/10/20/configuration/activities${query}`);
      expect(api.postCalls[0].body).toEqual({ aspect_ids: [1, 2], activities: 5 });
    });
  });

  it('replaces canonical state and clears the activities editor only after success', () => {
    createComponent('stage');
    const getCount = api.getCalls.length;
    const canonicalResponse: StudyPlanAspectConfigurationResponse = {
      ...initialConfiguration,
      configured_aspects: [{ ...configuredAspect(1), activities: 4 }],
    };
    component.activeEditor.set('activities');
    component.activitiesDraft.set('4');
    component.selectedAspects.set([configuredAspect(1)]);

    component.prepareActivitiesChange();
    api.postCalls[0].succeed(canonicalResponse);

    expect(component.aspectConfiguration()).toBe(canonicalResponse);
    expect(component.activeEditor()).toBeNull();
    expect(component.activitiesDraft()).toBe('');
    expect(component.selectedAspects()).toEqual([]);
    expect(api.getCalls.length).toBe(getCount);
  });

  it('preserves canonical state, editor, draft, and selection after an activities failure', () => {
    createComponent('stage');
    const previousConfiguration = component.aspectConfiguration();
    const selection = [configuredAspect(1)];
    component.activeEditor.set('activities');
    component.activitiesDraft.set('4');
    component.selectedAspects.set(selection);

    component.prepareActivitiesChange();
    api.postCalls[0].fail('errors.invalid');

    expect(component.aspectConfiguration()).toBe(previousConfiguration);
    expect(component.activeEditor()).toBe('activities');
    expect(component.activitiesDraft()).toBe('4');
    expect(component.selectedAspects()).toBe(selection);
  });

  it('ignores a successful activities response from a stale context', () => {
    createComponent('stage');
    const previousConfiguration = component.aspectConfiguration();
    const selection = [configuredAspect(1)];
    component.activeEditor.set('activities');
    component.activitiesDraft.set('4');
    component.selectedAspects.set(selection);

    component.prepareActivitiesChange();
    component.lastConfigurationRequestKey = 'newer-context';
    api.postCalls[0].succeed({ ...initialConfiguration, configured_aspects: [] });

    expect(component.aspectConfiguration()).toBe(previousConfiguration);
    expect(component.activeEditor()).toBe('activities');
    expect(component.activitiesDraft()).toBe('4');
    expect(component.selectedAspects()).toBe(selection);
  });

  it('does not send an activities mutation while loading', () => {
    createComponent('stage');
    component.selectedAspects.set([configuredAspect(1)]);
    component.activitiesDraft.set('4');
    component.loading.set(true);

    component.prepareActivitiesChange();

    expect(api.postCalls).toEqual([]);
  });

  it('opens activities with the current value for one selected aspect', () => {
    createComponent('stage');
    component.selectedAspects.set([{ ...configuredAspect(1), activities: 7 }]);

    component.onAction({ name: 'activities' } as ScreenOptionItem);

    expect(component.activeEditor()).toBe('activities');
    expect(component.activitiesDraft()).toBe('7');
    expect(component.selectedAspects().length).toBe(1);
  });

  it('opens activities with an empty draft and preserves multiple selection', () => {
    createComponent('stage');
    const selection = [configuredAspect(1), configuredAspect(2)];
    component.selectedAspects.set(selection);

    component.onAction({ name: 'activities' } as ScreenOptionItem);

    expect(component.activeEditor()).toBe('activities');
    expect(component.activitiesDraft()).toBe('');
    expect(component.selectedAspects()).toBe(selection);
  });

  [
    { mode: 'term' as const, clearTerm: true, clearSubject: false },
    { mode: 'subject' as const, clearTerm: false, clearSubject: true },
    { mode: 'full' as const, clearTerm: true, clearSubject: false },
    { mode: 'full' as const, clearTerm: false, clearSubject: true },
  ].forEach(({ mode, clearTerm, clearSubject }) => {
    it(`does not send an activities mutation with incomplete ${mode} context`, () => {
      createComponent(mode);

      if (clearTerm) {
        component.selectedTermId.setValue(null);
      }

      if (clearSubject) {
        component.selectedStageSubjectId.setValue(null);
      }

      fixture.detectChanges();
      component.selectedAspects.set([configuredAspect(1)]);
      component.activitiesDraft.set('4');

      component.prepareActivitiesChange();

      expect(api.postCalls).toEqual([]);
    });
  });

  [
    { mode: 'term' as const, clearTerm: true, clearSubject: false },
    { mode: 'subject' as const, clearTerm: false, clearSubject: true },
    { mode: 'full' as const, clearTerm: true, clearSubject: false },
    { mode: 'full' as const, clearTerm: false, clearSubject: true },
  ].forEach(({ mode, clearTerm, clearSubject }) => {
    it(`does not send automatic/manual mutations with incomplete ${mode} context`, async () => {
      createComponent(mode);

      if (clearTerm) {
        component.selectedTermId.setValue(null);
      }

      if (clearSubject) {
        component.selectedStageSubjectId.setValue(null);
      }

      fixture.detectChanges();
      component.selectedAspects.set([configuredAspect(1)]);

      await component.confirmConfigurationAction('automatic');

      expect(api.postCalls).toEqual([]);
    });
  });

  function createComponent(mode: StudyPlanAspectModeName): void {
    api.mode = mode;
    fixture = TestBed.createComponent(StudyPlanAspectConfigurationComponent);
    fixture.componentRef.setInput('route', '/configuration');
    fixture.componentRef.setInput('studyPlanId', 10);
    fixture.componentRef.setInput('stageId', 20);
    fixture.componentRef.setInput('gradeId', 30);
    fixture.detectChanges();
    component = fixture.componentInstance as unknown as ComponentHarness;

    if (mode === 'term' || mode === 'full') {
      component.selectedTermId.setValue(40);
    }

    if (mode === 'subject' || mode === 'full') {
      component.selectedStageSubjectId.setValue(50);
    }

    fixture.detectChanges();
  }
});

function selectionContext(mode: StudyPlanAspectModeName): StudyPlanAspectSelectionContextResponse {
  return {
    aspect_mode: { id: 1, name: mode, translation: `modes.${mode}` },
    terms: [],
    subjects: [],
  };
}

function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data, message: 'common.saved' };
}

function configuredAspect(id: number): StudyPlanConfiguredAspect {
  return {
    automatic: true,
    weight: '1.0000',
    activities: 1,
    order: id,
    aspect: { id, name: `Aspect ${id}`, description: null },
  };
}
