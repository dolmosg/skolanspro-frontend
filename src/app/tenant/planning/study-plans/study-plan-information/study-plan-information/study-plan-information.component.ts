import { Component, input, OnInit } from '@angular/core';
import { StudyPlanConfigurationItem } from '../../study-plan-configuration/study-plan-configuration.component';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { StudyPlanGeneralComponent } from '../study-plan-general/study-plan-general.component';
import { StudyPlanGradingComponent } from '../study-plan-grading/study-plan-grading.component';
import { StudyPlanAttendanceComponent } from '../study-plan-attendance/study-plan-attendance.component';

@Component({
  selector: 'app-study-plan-information',
  imports: [StudyPlanGeneralComponent, StudyPlanGradingComponent, StudyPlanAttendanceComponent],
  templateUrl: './study-plan-information.component.html',
  styleUrl: './study-plan-information.component.scss',
})
export class StudyPlanInformationComponent extends SkolansBaseComponent implements OnInit {
  readonly studyPlan = input<StudyPlanConfigurationItem | null>(null);
  readonly route = input<string | null>(null);

  ngOnInit(): void {
    this.loadInformationChildren();
  }

  private loadInformationChildren(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest<{ children?: any[] }>(this.api.get(route), (res) => {
      this.setScreenChildren(res.data?.children ?? []);
    });
  }

  protected childRoute(name: string): string | null {
    const route = this.route();
    const studyPlanId = this.studyPlan()?.id;

    if (!route || !studyPlanId) {
      return null;
    }

    const segments = route.split('/');

    // quitar los últimos dos: information + id
    const base = segments.slice(0, -2);

    return `${[...base, name, studyPlanId].join('/')}`;
  }
}
