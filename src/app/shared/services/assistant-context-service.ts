import { DestroyRef, computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type AssistantContextType =
  | 'route'
  | 'section'
  | 'component'
  | 'selection'
  | 'overlay'
  | 'editor';

export type AssistantContextLevel = AssistantContextType;

export type AssistantContextScope = 'central' | 'tenant';

export interface AssistantContextPayload {
  contextType?: AssistantContextType;
  level?: AssistantContextType;
  contextId: string;

  feature?: string;
  title?: string;
  subtitle?: string;
  entity?: string;
  mode?: string;
  data?: Record<string, unknown>;
}

interface AssistantContextLayer extends Omit<AssistantContextPayload, 'level'> {
  contextType: AssistantContextType;
  module?: string;
  scope?: AssistantContextScope;
  ownerId?: string;
  component?: string;
  route?: string;
}

export type AssistantMergedContext = Omit<AssistantContextLayer, 'data'> & {
  data: Record<string, unknown>;
};

@Injectable({
  providedIn: 'root',
})
export class AssistantContextService {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translationVersion = signal(0);
  private readonly contextTypeOrder: AssistantContextType[] = [
    'route',
    'section',
    'component',
    'selection',
    'overlay',
    'editor',
  ];

  private readonly stack = signal<AssistantContextLayer[]>([]);

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.bumpTranslationVersion());

    this.translate.onTranslationChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.bumpTranslationVersion());
  }

  readonly contextStack = this.stack.asReadonly();

  readonly currentContext = computed<AssistantContextLayer | null>(() => {
    const layers = this.stack();
    return layers.length ? layers[layers.length - 1] : null;
  });

  readonly headerTitle = computed(() => {
    this.translationVersion();
    const context = this.mergedContext();

    if (!context) {
      return 'Asistente Skolans';
    }

    return this.getModuleFeatureDisplayValue(context) ?? 'Asistente Skolans';
  });

  readonly contextLabel = this.headerTitle;

  readonly headerDescription = computed(() => {
    this.translationVersion();
    const context = this.mergedContext();

    if (!context?.subtitle) {
      return '';
    }

    return this.resolveOptionalDisplayValue(context.subtitle) ?? '';
  });

  readonly contextBreadcrumb = computed(() => {
    this.translationVersion();
    const context = this.mergedContext();

    if (!context) {
      return 'Asistente Skolans';
    }

    return this.getModuleFeatureDisplayValue(context) ?? 'Asistente Skolans';
  });

  /**
   * Builds the active assistant context by accumulating layers from the stack.
   *
   * This merge is intentional: higher-level layers such as route, selection and section
   * provide shared context, while deeper layers such as component or editor add their
   * own incremental data. Components must therefore publish only the data they own and
   * must not repeat data already provided by a parent layer.
   */
  readonly mergedContext = computed<AssistantMergedContext | null>(() => {
    const layers = this.stack();

    if (!layers.length) {
      return null;
    }

    return layers.reduce<AssistantMergedContext>(
      (context, layer) => {
        return {
          ...context,
          ...layer,
          // Keep data cumulative across layers. Do not replace this with `layer.data ?? {}`;
          // the assistant relies on the full route → selection → section → component → editor context.
          data: {
            ...context.data,
            ...(layer.data ?? {}),
          },
        };
      },
      {
        ...layers[0],
        data: layers[0].data ?? {},
      },
    );
  });

  setLayer(layer: AssistantContextPayload): void {
    const normalizedLayer = this.normalizeLayer(layer);

    this.stack.update((layers) => {
      const levelIndex = this.getContextTypeIndex(normalizedLayer.contextType);
      const existingLayerIndex = layers.findIndex(
        (item) => item.contextType === normalizedLayer.contextType,
      );

      const parentLayers = layers.filter(
        (item) => this.getContextTypeIndex(item.contextType) < levelIndex,
      );
      const sameLevelLayers = layers.filter(
        (item) => this.getContextTypeIndex(item.contextType) === levelIndex,
      );

      const nextSameLevelLayers =
        existingLayerIndex >= 0
          ? sameLevelLayers.map((item) =>
              item.contextType === normalizedLayer.contextType ? normalizedLayer : item,
            )
          : [...sameLevelLayers, normalizedLayer];

      return [...parentLayers, ...nextSameLevelLayers].sort(
        (a, b) => this.getContextTypeIndex(a.contextType) - this.getContextTypeIndex(b.contextType),
      );
    });
  }

  clearContextType(contextType: AssistantContextType): void {
    this.stack.update((layers) => layers.filter((layer) => layer.contextType !== contextType));
  }

  clearFromContextType(contextType: AssistantContextType): void {
    const levelIndex = this.getContextTypeIndex(contextType);

    this.stack.update((layers) => {
      return layers.filter((layer) => this.getContextTypeIndex(layer.contextType) < levelIndex);
    });
  }

  clearLevel(level: AssistantContextLevel): void {
    this.clearContextType(level);
  }

  clearFromLevel(level: AssistantContextLevel): void {
    this.clearFromContextType(level);
  }

  clearOwner(ownerId: string): void {
    this.stack.update((layers) => layers.filter((layer) => layer.ownerId !== ownerId));
  }

  reset(): void {
    this.stack.set([]);
  }

  private bumpTranslationVersion(): void {
    this.translationVersion.update((version) => version + 1);
  }

  private getContextTypeIndex(contextType: AssistantContextType): number {
    return this.contextTypeOrder.indexOf(contextType);
  }

  private getModuleFeatureDisplayValue(context: AssistantMergedContext): string | undefined {
    const values = [
      this.getModuleDisplayValue(context.module),
      this.getFeatureDisplayValue(context.feature),
    ].filter((value): value is string => Boolean(value));

    const uniqueValues = values.filter((value, index) => values.indexOf(value) === index);

    return uniqueValues.length ? uniqueValues.join(' > ') : undefined;
  }

  private getLayerTitleDisplayValue(layer: AssistantContextLayer): string | undefined {
    return (
      this.resolveOptionalDisplayValue(layer.title) ??
      this.resolveOptionalDisplayValue(layer.contextId)
    );
  }

  private getModuleDisplayValue(module: string | undefined): string | undefined {
    if (!module) {
      return undefined;
    }

    return (
      this.resolveOptionalDisplayValue(`modules.${module}`) ?? this.humanizeContextValue(module)
    );
  }

  private getFeatureDisplayValue(feature: string | undefined): string | undefined {
    if (!feature) {
      return undefined;
    }

    return (
      this.resolveOptionalDisplayValue(`controllers.${feature}`) ??
      this.humanizeContextValue(feature)
    );
  }

  private resolveOptionalDisplayValue(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const translatedValue = this.translate.instant(value);

    if (typeof translatedValue !== 'string') {
      return this.isTranslationKey(value) ? undefined : this.humanizeContextValue(value);
    }

    if (
      translatedValue &&
      translatedValue !== value &&
      !this.isGenericTranslationFallback(value, translatedValue)
    ) {
      return translatedValue;
    }

    if (this.isTranslationKey(value)) {
      return undefined;
    }

    return this.humanizeContextValue(value);
  }

  private isGenericTranslationFallback(key: string, translatedValue: unknown): boolean {
    if (typeof translatedValue !== 'string') {
      return true;
    }

    const normalizedTranslatedValue = translatedValue.trim().toLowerCase();
    const keySuffix = key.split('.').filter(Boolean).at(-1)?.toLowerCase();

    return (
      (keySuffix === 'title' && normalizedTranslatedValue === 'title') ||
      (keySuffix === 'description' && normalizedTranslatedValue === 'description')
    );
  }

  private isTranslationKey(value: string): boolean {
    return value.includes('.') && !value.includes(' ');
  }

  private humanizeContextValue(value: string): string {
    const normalizedValue = value.split('.').filter(Boolean).at(-1) ?? value;

    return normalizedValue
      .split('-')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private normalizeLayer(layer: AssistantContextPayload): AssistantContextLayer {
    const route = this.router.url;
    const routeContext = this.getRouteContext(route);
    const { level: _level, ...contextLayer } = layer;

    return {
      ...contextLayer,
      contextType: layer.contextType ?? layer.level ?? 'component',
      route,
      scope: routeContext.scope,
      module: routeContext.module,
    };
  }

  private getRouteContext(route: string): Pick<AssistantContextLayer, 'scope' | 'module'> {
    const cleanRoute = route.split('?')[0] ?? route;
    const segments = cleanRoute.split('/').filter(Boolean);
    const scope = this.getRouteScope(segments[0]);
    const module = scope ? this.getRouteModule(segments[1]) : this.getRouteModule(segments[0]);

    return {
      scope,
      module,
    };
  }

  private getRouteScope(value: string | undefined): AssistantContextScope | undefined {
    if (value === 'central' || value === 'tenant') {
      return value;
    }

    return undefined;
  }

  private getRouteModule(value: string | undefined): string | undefined {
    return value || undefined;
  }
}
