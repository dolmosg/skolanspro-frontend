import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

import { SkolansTable } from './skolans-table';

describe('SkolansTable', () => {
  let fixture: ComponentFixture<SkolansTable>;

  beforeAll(() => {
    ModuleRegistry.registerModules([AllCommunityModule]);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkolansTable, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(SkolansTable);
  });

  function grid(): AgGridAngular {
    fixture.detectChanges();

    return fixture.debugElement.query(By.directive(AgGridAngular)).componentInstance;
  }

  function gridElement(): HTMLElement {
    fixture.detectChanges();

    return fixture.debugElement.query(By.directive(AgGridAngular)).nativeElement;
  }

  it('passes the requested page size to AG Grid', () => {
    fixture.componentRef.setInput('pageSize', 5);

    expect(grid().paginationPageSize).toBe(5);
  });

  it('adds a custom active page size to valid sorted selector options', () => {
    fixture.componentRef.setInput('pageSize', 7);
    fixture.componentRef.setInput('pageSizeOptions', [20, 10, 7, 10, 0, -1, 2.5]);

    expect(grid().paginationPageSizeSelector).toEqual([7, 10, 20]);
  });

  it('preserves an explicit fixed height', () => {
    fixture.componentRef.setInput('height', '420px');
    fixture.componentRef.setInput('heightMode', 'fixed');

    const element = gridElement();

    expect(fixture.nativeElement.classList).toContain('skolans-table-host--fixed');
    expect(element.style.height).toBe('420px');
  });

  it('supports fill mode without calculating a viewport height', () => {
    fixture.componentRef.setInput('heightMode', 'fill');

    const element = gridElement();

    expect(fixture.nativeElement.classList).toContain('skolans-table-host--fill');
    expect(element.style.height).toBe('100%');
  });

  it('keeps the pagination panel hidden when pagination is disabled', () => {
    fixture.componentRef.setInput('pagination', false);

    expect(grid().suppressPaginationPanel).toBeTrue();
  });
});
