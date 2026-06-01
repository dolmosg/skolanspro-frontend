import { Routes } from '@angular/router';

export const ACADEMIC_CATALOGS_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        data: {
          breadcrumb: 'controllers.academic-catalogs',
          title: 'controllers.academic-catalogs',
          api: {
            route: 'configuration/academic-catalogs',
          },
        },
        loadComponent: () =>
          import('../../../shared/navigation/controller-navigation/controller-navigation.component').then(
            (m) => m.ControllerNavigationComponent,
          ),
      },
      {
        path: 'block-types',
        data: {
          breadcrumb: 'controllers.block-types',
          title: 'controllers.block-types',
          collectionKey: 'block-types',
          itemKey: 'block-type',
          api: {
            route: 'configuration/block-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'term-types',
        data: {
          breadcrumb: 'controllers.term-types',
          title: 'controllers.term-types',
          collectionKey: 'term-types',
          itemKey: 'term-type',
          api: {
            route: 'configuration/term-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'schedule-types',
        data: {
          breadcrumb: 'controllers.schedule-types',
          title: 'controllers.schedule-types',
          collectionKey: 'schedule-types',
          itemKey: 'schedule-type',
          api: {
            route: 'configuration/schedule-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'attendance-types',
        data: {
          breadcrumb: 'controllers.attendance-types',
          title: 'controllers.attendance-types',
          collectionKey: 'attendance-types',
          itemKey: 'attendance-type',
          api: {
            route: 'configuration/attendance-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'survey-types',
        data: {
          breadcrumb: 'controllers.survey-types',
          title: 'controllers.survey-types',
          collectionKey: 'survey-types',
          itemKey: 'survey-type',
          api: {
            route: 'configuration/survey-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'diagnostic-types',
        data: {
          breadcrumb: 'controllers.diagnostic-types',
          title: 'controllers.diagnostic-types',
          collectionKey: 'diagnostic-types',
          itemKey: 'diagnostic-type',
          api: {
            route: 'configuration/diagnostic-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'comment-types',
        data: {
          breadcrumb: 'controllers.comment-types',
          title: 'controllers.comment-types',
          collectionKey: 'comment-types',
          itemKey: 'comment-type',
          api: {
            route: 'configuration/comment-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'feedback-types',
        data: {
          breadcrumb: 'controllers.feedback-types',
          title: 'controllers.feedback-types',
          collectionKey: 'feedback-types',
          itemKey: 'feedback-type',
          api: {
            route: 'configuration/feedback-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'project-types',
        data: {
          breadcrumb: 'controllers.project-types',
          title: 'controllers.project-types',
          collectionKey: 'project-types',
          itemKey: 'project-type',
          api: {
            route: 'configuration/project-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'rubric-types',
        data: {
          breadcrumb: 'controllers.rubric-types',
          title: 'controllers.rubric-types',
          collectionKey: 'rubric-types',
          itemKey: 'rubric-type',
          api: {
            route: 'configuration/rubric-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'evaluation-types',
        data: {
          breadcrumb: 'controllers.evaluation-types',
          title: 'controllers.evaluation-types',
          collectionKey: 'evaluation-types',
          itemKey: 'evaluation-type',
          api: {
            route: 'configuration/evaluation-types',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'studyplan-structures',
        data: {
          breadcrumb: 'controllers.studyplan-structures',
          title: 'controllers.studyplan-structures',
          collectionKey: 'studyplan-structures',
          itemKey: 'studyplan-structures',
          api: {
            route: 'configuration/studyplan-structures',
          },
        },
        loadComponent: () =>
          import('../academic-catalogs/studyplan-structures/studyplan-structures.component').then(
            (m) => m.StudyplanStructuresComponent,
          ),
      },
      {
        path: 'group-types',
        data: {
          breadcrumb: 'controllers.group-types',
          title: 'controllers.group-types',
          collectionKey: 'group-types',
          itemKey: 'group-type',
          api: {
            route: 'configuration/group-types',
          },
        },
        loadComponent: () =>
          import('../academic-catalogs/group-types/group-types.component').then(
            (m) => m.GroupTypesComponent,
          ),
      },
      {
        path: 'grade-policies',
        data: {
          breadcrumb: 'controllers.grade-policies',
          title: 'controllers.grade-policies',
          collectionKey: 'grade-policies',
          itemKey: 'grade-policies',
          api: {
            route: 'configuration/grade-policies',
          },
        },
        loadComponent: () =>
          import('../../../features/configuration/grade-policies/grade-policies.component').then(
            (m) => m.GradePoliciesComponent,
          ),
      },
      {
        path: 'grade-policies/grade-policy-items/:gradePolicyId',
        data: {
          breadcrumb: 'controllers.grade-policy-items',
          title: 'controllers.grade-policy-items',
          collectionKey: 'grade-policy-items',
          itemKey: 'grade-policy-item',
          access: {
            route: 'configuration/grade-policy-items',
          },
          api: {
            route: 'configuration/grade-policy-items',
          },
        },
        loadComponent: () =>
          import('../../../features/configuration/grade-policy-items/grade-policy-items.component').then(
            (m) => m.GradePolicyItemsComponent,
          ),
      },
      {
        path: 'gradebook-types',
        data: {
          breadcrumb: 'controllers.gradebook-types',
          title: 'controllers.gradebook-types',
          collectionKey: 'gradebook-types',
          itemKey: 'gradebook-type',
          api: {
            route: 'configuration/gradebook-types',
          },
        },
        loadComponent: () =>
          import('../../../features/configuration/gradebook-types/gradebook-types.component').then(
            (m) => m.GradebookTypesComponent,
          ),
      },
      {
        path: 'gradebook-options',
        data: {
          breadcrumb: 'controllers.gradebook-options',
          title: 'controllers.gradebook-options',
          collectionKey: 'gradebook-options',
          itemKey: 'gradebook-option',
          api: {
            route: 'configuration/gradebook-options',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'gradebook-actions',
        data: {
          breadcrumb: 'controllers.gradebook-actions',
          title: 'controllers.gradebook-actions',
          collectionKey: 'gradebook-actions',
          itemKey: 'gradebook-action',
          api: {
            route: 'configuration/gradebook-actions',
          },
        },
        loadComponent: () =>
          import('../academic-catalogs/gradebook-actions/gradebook-actions.component').then(
            (m) => m.GradebookActionsComponent,
          ),
      },
      {
        path: 'gradebook-section-types',
        data: {
          breadcrumb: 'controllers.gradebook-section-types',
          title: 'controllers.gradebook-section-types',
          collectionKey: 'gradebook-section-types',
          itemKey: 'gradebook-section-type',
          api: {
            route: 'configuration/gradebook-section-types',
          },
        },
        loadComponent: () =>
          import('../academic-catalogs/gradebook-section-types/gradebook-section-types.component').then(
            (m) => m.GradebookSectionTypesComponent,
          ),
      },
      {
        path: 'activity-types',
        data: {
          breadcrumb: 'controllers.activity-types',
          title: 'controllers.activity-types',
          collectionKey: 'activity-types',
          itemKey: 'activity-type',
          api: {
            route: 'configuration/activity-types',
          },
        },
        loadComponent: () =>
          import('../academic-catalogs/activity-types/activity-types.component').then(
            (m) => m.ActivityTypesComponent,
          ),
      },
      {
        path: 'question-types',
        data: {
          breadcrumb: 'controllers.question-types',
          title: 'controllers.question-types',
          collectionKey: 'question-types',
          itemKey: 'question-type',
          api: {
            route: 'configuration/question-types',
          },
        },
        loadComponent: () =>
          import('../academic-catalogs/question-types/question-types.component').then(
            (m) => m.QuestionTypesComponent,
          ),
      },
      {
        path: 'question-input-types',
        data: {
          breadcrumb: 'controllers.question-input-types',
          title: 'controllers.question-input-types',
          collectionKey: 'question-input-types',
          itemKey: 'question-input-type',
          api: {
            route: 'configuration/question-input-types',
          },
        },
        loadComponent: () =>
          import('../academic-catalogs/question-input-types/question-input-types.component').then(
            (m) => m.QuestionInputTypesComponent,
          ),
      },
      {
        path: 'subject-types',
        data: {
          breadcrumb: 'controllers.subject-types',
          title: 'controllers.subject-types',
          collectionKey: 'subject-types',
          itemKey: 'subject-type',
          api: {
            route: 'configuration/subject-types',
          },
        },
        loadComponent: () =>
          import('../academic-catalogs/subject-types/subject-types.component').then(
            (m) => m.SubjectTypesComponent,
          ),
      },
      {
        path: 'attendance-calculations',
        data: {
          breadcrumb: 'controllers.attendance-calculations',
          title: 'controllers.attendance-calculations',
          collectionKey: 'attendance-calculations',
          itemKey: 'attendance-calculation',
          api: {
            route: 'configuration/attendance-calculations',
          },
        },
        loadComponent: () =>
          import('@shared/components/catalog-crud/catalog-crud.component').then(
            (m) => m.CatalogCrudComponent,
          ),
      },
      {
        path: 'grading-scales',
        data: {
          breadcrumb: 'controllers.grading-scales',
          title: 'controllers.grading-scales',
          collectionKey: 'grading-scales',
          itemKey: 'grading-scale',
          api: {
            route: 'configuration/grading-scales',
          },
        },
        loadComponent: () =>
          import('../academic-catalogs/grading-scales/grading-scales.component').then(
            (m) => m.GradingScalesComponent,
          ),
      },
      {
        path: 'aspect-modes',
        data: {
          breadcrumb: 'controllers.aspect-modes',
          title: 'controllers.aspect-modes',
          collectionKey: 'aspect-modes',
          itemKey: 'aspect-mode',
          api: {
            route: 'configuration/aspect-modes',
          },
        },
        loadComponent: () =>
          import('../academic-catalogs/aspect-modes/aspect-modes.component').then(
            (m) => m.AspectModesComponent,
          ),
      },
    ],
  },
];
