import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { TranslationService } from '../../services/translation.service';

interface CalendarDay {
  iso: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

function toIsoDate(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function parseIsoDate(value: string | null | undefined): Date | null {
  const normalized = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function todayAtMidday(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
}

@Component({
  selector: 'app-fancy-date-input',
  standalone: true,
  templateUrl: './fancy-date-input.html',
  styleUrl: './fancy-date-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'fancy-date-input-host',
    '[attr.data-variant]': 'variant()',
  },
})
export class FancyDateInput {
  readonly value = input<string>('');
  readonly placeholder = input('dd/mm/yyyy');
  readonly disabled = input(false);
  readonly variant = input<'default' | 'filter' | 'compact'>('default');
  readonly valueChange = output<string>();

  protected readonly ts = inject(TranslationService);
  protected readonly isOpen = signal(false);
  protected readonly draftValue = signal<string>('');
  protected readonly defaultViewDate = todayAtMidday();
  protected readonly viewDate = signal<Date>(this.defaultViewDate);
  protected readonly todayIso = toIsoDate(new Date());

  protected readonly lang = computed(() => this.ts.lang());
  protected readonly displayValue = computed(() => {
    const parsed = parseIsoDate(this.value());
    if (!parsed) return '';
    return parsed.toLocaleDateString(this.lang() === 'ru' ? 'ru-RU' : 'en-GB');
  });
  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.lang() === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'long',
      year: 'numeric',
    }).format(this.viewDate())
  );
  protected readonly weekdayLabels = computed(() => {
    const locale = this.lang() === 'ru' ? 'ru-RU' : 'en-US';
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(base);
      day.setDate(base.getDate() + index);
      return formatter.format(day);
    });
  });
  protected readonly yearOptions = computed(() => {
    const center = this.viewDate().getFullYear();
    return Array.from({ length: 9 }, (_, index) => center - 4 + index);
  });
  protected readonly calendarDays = computed(() => this.buildCalendarDays());

  constructor() {
    effect(() => {
      const parsed = parseIsoDate(this.value());
      this.draftValue.set(this.value());
      this.viewDate.set(parsed ?? this.defaultViewDate);
    });
  }

  toggleOpen(event?: Event) {
    event?.stopPropagation();
    if (this.disabled()) return;
    this.isOpen.update(open => !open);
  }

  close() {
    this.isOpen.set(false);
    this.draftValue.set(this.value());
  }

  prevMonth() {
    const current = this.viewDate();
    this.viewDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth() {
    const current = this.viewDate();
    this.viewDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  setYear(year: string) {
    const nextYear = Number(year);
    if (!Number.isFinite(nextYear)) return;
    const current = this.viewDate();
    this.viewDate.set(new Date(nextYear, current.getMonth(), 1));
  }

  pickDate(iso: string) {
    this.draftValue.set(iso);
  }

  clear() {
    this.draftValue.set('');
  }

  useToday() {
    const today = new Date();
    this.viewDate.set(today);
    this.draftValue.set(toIsoDate(today));
  }

  apply() {
    this.valueChange.emit(this.draftValue());
    this.isOpen.set(false);
  }

  @HostListener('document:click')
  handleDocumentClick() {
    if (!this.isOpen()) return;
    this.close();
  }

  protected stopPropagation(event: Event) {
    event.stopPropagation();
  }

  private buildCalendarDays(): CalendarDay[] {
    const view = this.viewDate();
    const monthStart = new Date(view.getFullYear(), view.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
    const selectedIso = this.draftValue();

    return Array.from({ length: 42 }, (_, index) => {
      const current = new Date(gridStart);
      current.setDate(gridStart.getDate() + index);
      const iso = toIsoDate(current);
      return {
        iso,
        dayNumber: current.getDate(),
        inMonth: sameMonth(current, monthStart),
        isToday: iso === this.todayIso,
        isSelected: iso === selectedIso,
      };
    });
  }
}
