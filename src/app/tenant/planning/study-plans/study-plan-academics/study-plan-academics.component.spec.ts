import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideLucideIcons } from '@lucide/angular';
import { of } from 'rxjs';

import { REGISTERED_ICONS } from '@shared/icons/icon-registry';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { ApiConfigService } from '@shared/services/api-config-service';
import { ApiService } from '@shared/services/api-service';
import { AssistantContextService } from '@shared/services/assistant-context-service';
import { RouteMetaService } from '@shared/services/route-meta-service';
import { SiteStateService } from '@shared/services/site-state';
import { SklModalService } from '@shared/services/skl-modal-service';
import { ToastService } from '@shared/services/toast-service';

import { StudyPlanAcademicsComponent } from './study-plan-academics.component';
import { StudyPlanStagesSummaryComponent } from './components/study-plan-stages-summary/study-plan-stages-summary.component';

describe('StudyPlanAcademicsComponent restore stages permission', () => {
  it('passes only the study-plans restore-stages option to the stages summary', async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), StudyPlanAcademicsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: {} },
        {
          provide: ApiService,
          useValue: {
            get: () =>
              of({
                success: true,
                data: {
                  'study-plan': { id: 10, name: 'Plan', stages: [] },
                  options: [{ id: 398, name: 'add-stage', translation: 'legacy.add-stage' }],
                  children: [],
                },
                message: '',
              }),
          },
        },
        { provide: RouteMetaService, useValue: { getApiRoute: () => null } },
        { provide: SklModalService, useValue: {} },
        { provide: ToastService, useValue: {} },
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

    const fixture = TestBed.createComponent(StudyPlanAcademicsComponent);
    const restoreStagesOption: ScreenOptionItem = {
      id: 460,
      name: 'restore-stages',
      translation: 'planning.study-plans.restore-stages',
      icon: 'reset',
      color: 'secondary',
      controller_id: 125,
    };

    fixture.componentRef.setInput('route', 'planning/study-plan-academics/10');
    fixture.componentRef.setInput('restoreStagesOption', restoreStagesOption);
    fixture.detectChanges();

    const summary = fixture.debugElement.query(By.directive(StudyPlanStagesSummaryComponent))
      .componentInstance as StudyPlanStagesSummaryComponent;

    expect(summary.addStageOption()).toEqual(restoreStagesOption);
    expect(summary.addStageOption()?.name).not.toBe('add-stage');

    fixture.destroy();
  });
});
