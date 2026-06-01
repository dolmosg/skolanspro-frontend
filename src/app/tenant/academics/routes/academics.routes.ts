import { Routes } from '@angular/router';

export const ACADEMICS_ROUTES: Routes = [
  {
    path: 'learning-areas',
    data: {
      breadcrumb: 'controllers.learning-areas',
      title: 'controllers.learning-areas',
      collectionKey: 'learning-areas',
      itemKey: 'learning-area',
      api: {
        route: 'academics/learning-areas',
      },
    },
    loadComponent: () =>
      import('../learning-areas/learning-areas.component').then((m) => m.LearningAreasComponent),
  },
  {
    path: 'subject-classifications',
    data: {
      breadcrumb: 'controllers.subject-classifications',
      title: 'controllers.subject-classifications',
      collectionKey: 'subject-classifications',
      itemKey: 'subject-classification',
      api: {
        route: 'academics/subject-classifications',
      },
    },
    loadComponent: () =>
      import('../subject-classifications/subject-classifications.component').then(
        (m) => m.SubjectClassificationsComponent,
      ),
  },
  {
    path: 'subject-classifications/subject-subcategories/:subjectClassificationId',
    data: {
      breadcrumb: 'controllers.subject-subcategories',
      title: 'controllers.subject-subcategories',
      collectionKey: 'subject-subcategories',
      itemKey: 'subject-subcategory',
      access: {
        route: 'academics/subject-subcategories',
      },
      api: {
        route: 'academics/subject-subcategories',
      },
    },
    loadComponent: () =>
      import('../subject-sub-categories/subject-sub-categories.component').then(
        (m) => m.SubjectSubCategoriesComponent,
      ),
  },
  {
    path: 'subjects',
    data: {
      breadcrumb: 'controllers.subjects',
      title: 'controllers.subjects',
      collectionKey: 'subjects',
      itemKey: 'subject',
      api: {
        route: 'academics/subjects',
      },
    },
    loadComponent: () => import('../subjects/subjects.component').then((m) => m.SubjectsComponent),
  },
];
