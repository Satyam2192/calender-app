import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { EventService } from '../../core/services/event.service';
import { CalendarEvent, EventModalData, EventType } from '../../core/models/event.model';
import {
  startOfWeek, endOfWeek, addDays, eachDayOfInterval, format, getDay,
  addWeeks, subWeeks, isSameDay, isWithinInterval, setHours, setMinutes,
  getHours, getMinutes, differenceInMinutes, startOfDay, endOfDay
} from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { EventModalComponent } from '../event-modal/event-modal.component';
import { EventBlockComponent } from '../event-block/event-block.component';

interface PositionedEvent extends CalendarEvent {
  isAllDayEvent: boolean;
  top?: number;
  height?: number;
  left: number;
  width: number;
  zIndex: number;
  columnIndex?: number;

}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, EventModalComponent, EventBlockComponent]
})
export class CalendarComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  weekDates: Date[] = [];
  allEvents: CalendarEvent[] = [];
  timedEventsForWeek: PositionedEvent[] = [];
  allDayEventsForWeek: PositionedEvent[] = [];
  hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: format(setHours(new Date(), i), 'h a') }));

  showModal = false;
  modalData: EventModalData | null = null;

  private destroy$ = new Subject<void>();

  readonly TASK_COLOR = '#195957';
  readonly HOLIDAY_COLOR = '#a33737';
  readonly HOUR_ROW_HEIGHT_VH = 4;

  constructor(
    private eventService: EventService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateWeek();

    this.eventService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(events => {
        this.allEvents = events;
        this.filterAndPositionEventsForWeek();
        this.cd.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateWeek(): void {
    const start = startOfWeek(this.currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(this.currentDate, { weekStartsOn: 0 });
    this.weekDates = eachDayOfInterval({ start, end });
    this.filterAndPositionEventsForWeek();
  }

  filterAndPositionEventsForWeek(): void {
    const weekStart = startOfDay(this.weekDates[0]);
    const weekEnd = endOfDay(this.weekDates[this.weekDates.length - 1]);

    this.timedEventsForWeek = [];
    this.allDayEventsForWeek = [];

    const eventsInView = this.allEvents.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return eventStart < weekEnd && eventEnd > weekStart;
    });

    const allDayEventsInView = eventsInView.filter(event => this.isStrictlyAllDay(event));
    const timedEventsInView = eventsInView.filter(event => !this.isStrictlyAllDay(event));

    allDayEventsInView.forEach(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      const startDayIndex = this.weekDates.findIndex(date => isSameDay(date, eventStart) || (eventStart < date && !isSameDay(eventStart, date)));
      let startIndex = (startDayIndex === -1 && eventStart < this.weekDates[0]) ? 0 : startDayIndex;
      if (startIndex === -1) startIndex = 0;

      let endIndex;
      const actualEventEndDayIndexInWeek = this.weekDates.findIndex(date => isSameDay(date, eventEnd));

      if (actualEventEndDayIndexInWeek !== -1) {
        endIndex = actualEventEndDayIndexInWeek + 1;
      } else if (eventEnd > this.weekDates[this.weekDates.length - 1]) {
        endIndex = this.weekDates.length;
      } else {
        endIndex = 0;
      }

      if (startIndex > endIndex) {
        startIndex = endIndex;
      }

      let span = endIndex - startIndex;
      if (span < 0) span = 0;

      const left = (startIndex / this.weekDates.length) * 100;
      const width = (span / this.weekDates.length) * 100;

      this.allDayEventsForWeek.push({
        ...event,
        isAllDayEvent: true,
        left: left,
        width: width,
        zIndex: 1,
      });
    });

    timedEventsInView.forEach(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const dayIndex = this.weekDates.findIndex(d => isSameDay(d, eventStart));
      if (dayIndex === -1) return;

      const startHour = getHours(eventStart);
      const startMinute = getMinutes(eventStart);

      const dayStartTime = startOfDay(eventStart).getTime();
      const dayEndTime = endOfDay(eventStart).getTime();
      const clampedStart = Math.max(event.start, dayStartTime);
      const clampedEnd = Math.min(event.end, dayEndTime);
      const durationMinutes = Math.max(0, differenceInMinutes(clampedEnd, clampedStart));

      const top = ((startHour + startMinute / 60) / 24) * 100;
      let height = (durationMinutes / (24 * 60)) * 100;

      const minHeightPercentage = (15 / (24 * 60)) * 100;
      if (height < minHeightPercentage && height > 0) {
          height = minHeightPercentage;
      }
      if (height === 0 && durationMinutes > 0) {
          height = minHeightPercentage;
      }

      this.timedEventsForWeek.push({
        ...event,
        isAllDayEvent: false,
        top: top,
        height: height,
        left: 0,
        width: 95,
        zIndex: 1,
      });
    });

    this.cd.markForCheck();
  }

  calculateOverlapsForTimedEvents(): void {
    const eventsByDay: { [key: number]: PositionedEvent[] } = {};
    this.weekDates.forEach((_, index) => eventsByDay[index] = []);

    this.timedEventsForWeek.forEach(event => {
      const dayIndex = this.weekDates.findIndex(d => isSameDay(d, event.start));
      if (dayIndex !== -1) {
        eventsByDay[dayIndex].push(event);
      }
    });

    Object.values(eventsByDay).forEach(dayEvents => {
      if (dayEvents.length < 2) {
        dayEvents.forEach(ev => { ev.width = 95; ev.left = 0; });
      }
      dayEvents.sort((a, b) => a.start - b.start);

      const columns: PositionedEvent[][] = [];

      for (const event of dayEvents) {
        let placed = false;
        for (const column of columns) {
          const lastEventInColumn = column[column.length - 1];
          if (event.start >= lastEventInColumn.end) {
            column.push(event);
            event.columnIndex = columns.indexOf(column);
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([event]);
          event.columnIndex = columns.length - 1;
        }
      }

      const numColumns = columns.length;
      const totalAvailableWidth = 95;
      const gapPercentage = 1;

      if (numColumns > 0) {
        const totalGapWidth = (numColumns - 1) * gapPercentage;
        const eventWidth = (totalAvailableWidth - totalGapWidth) / numColumns;

        dayEvents.forEach(event => {
          if (event.columnIndex !== undefined) {
            event.width = eventWidth;
            event.left = event.columnIndex * (eventWidth + gapPercentage);
            event.zIndex = event.columnIndex + 1;
          } else {
            event.width = totalAvailableWidth;
            event.left = 0;
            event.zIndex = 1;
          }
        });
      }
    });
  }

  calculateOverlapsForAllDayEvents(): void {
    const allDayEventsByDate: { [key: string]: PositionedEvent[] } = {};
    this.allDayEventsForWeek.forEach(event => {
        const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
        if (!allDayEventsByDate[dateKey]) {
            allDayEventsByDate[dateKey] = [];
        }
        allDayEventsByDate[dateKey].push(event);
    });

    Object.values(allDayEventsByDate).forEach(dayEvents => {
        dayEvents.forEach((event, index) => {
            event.left = 0;
            event.width = 95;
            event.zIndex = index + 1;
        });
    });
  }

  previousWeek(): void {
    this.currentDate = subWeeks(this.currentDate, 1);
    this.updateWeek();
  }

  nextWeek(): void {
    this.currentDate = addWeeks(this.currentDate, 1);
    this.updateWeek();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.updateWeek();
  }

  isToday(date: Date): boolean {
    return isSameDay(date, new Date());
  }

  isSunday(date: Date): boolean {
    return getDay(date) === 0;
  }

  openAddModal(date: Date, hour: number): void {
    if (this.isSunday(date)) {
      return;
    }
    const defaultStart = setMinutes(setHours(startOfDay(date), hour), 0);
    this.modalData = {
      defaultStartTime: defaultStart.getTime(),
      defaultEndTime: defaultStart.getTime() + 60 * 60 * 1000,
      isAllDay: false
    };
    this.showModal = true;
    this.cd.markForCheck();
  }

  openAddModalForAllday(date: Date): void {
    if (this.isSunday(date)) {
      return;
    }
    this.modalData = {
      defaultStartTime: startOfDay(date).getTime(),
      defaultEndTime: endOfDay(date).getTime(),
      isAllDay: true
    };
    this.showModal = true;
    this.cd.markForCheck();
  }

  openEditModal(event: CalendarEvent): void {
    const isAllDay = this.isStrictlyAllDay(event);
    this.modalData = {
        event: { ...event },
        isAllDay
    };
    this.showModal = true;
    this.cd.markForCheck();
  }

  closeModal(): void {
    this.showModal = false;
    this.modalData = null;
    this.cd.markForCheck();
  }

  handleSaveEvent(eventData: Omit<CalendarEvent, 'id'> | CalendarEvent): void {
    if ('id' in eventData) {
      this.eventService.updateEvent(eventData);
    } else {
      this.eventService.addEvent(eventData);
    }
    this.closeModal();
  }

  handleDeleteEventRequest(eventId: string): void {
      if (confirm('Are you sure you want to delete this event?')) {
        this.eventService.deleteEvent(eventId);
        this.cd.markForCheck();
      }
  }
  private isStrictlyAllDay(event: CalendarEvent): boolean {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    const durationIsFullDayOrMore = (eventEnd.getTime() - eventStart.getTime()) >= (24 * 60 * 60 * 1000 - 1000);
    const startsAtDayBoundary = eventStart.getTime() === startOfDay(eventStart).getTime();
    const endsAtDayBoundary = eventEnd.getTime() === endOfDay(eventEnd).getTime();

    return durationIsFullDayOrMore || (startsAtDayBoundary && endsAtDayBoundary);
  }

  trackByDate(index: number, date: Date): number {
    return date.getTime();
  }

  trackByHour(index: number, hour: {hour: number, label: string}): number {
      return hour.hour;
  }

  trackByEventId(index: number, event: PositionedEvent): string {
    return event.id;
  }

  getEventBackgroundColor(type: EventType): string {
      return type === 'TASK' ? this.TASK_COLOR : this.HOLIDAY_COLOR;
  }

  getAllDayEventsForDate(date: Date): PositionedEvent[] {
    return this.allDayEventsForWeek.filter(event =>
      isSameDay(new Date(event.start), date) ||
      (new Date(event.start) < date && new Date(event.end) > date)
    );
  }

  getTimedEventsForHour(targetDate: Date, hour: number): PositionedEvent[] {
    return this.timedEventsForWeek.filter(event => {
      if (event.isAllDayEvent) return false;

      const eventStartDate = new Date(event.start);
      if (!isSameDay(eventStartDate, targetDate)) return false;

      const eventStartHour = getHours(eventStartDate);
      const eventStartMinute = getMinutes(eventStartDate);
      const eventEnd = new Date(event.end);
      const eventEndHour = getHours(eventEnd);
      const eventEndMinute = getMinutes(eventEnd);

      const eventStartFractional = eventStartHour + eventStartMinute / 60;
      const eventEndIsSameDay = isSameDay(eventStartDate, eventEnd);
      
      let eventEndFractional = eventEndHour + eventEndMinute / 60;
      if (!eventEndIsSameDay) {
        
        eventEndFractional += 24 * differenceInMinutes(endOfDay(eventEnd), startOfDay(eventStartDate)) / (24*60) ; 
        const daysDifference = Math.floor((eventEnd.getTime() - startOfDay(eventStartDate).getTime()) / (24 * 60 * 60 * 1000));
        eventEndFractional = getHours(eventEnd) + getMinutes(eventEnd) / 60 + daysDifference * 24;
      }


      const slotStartFractional = hour;
      const slotEndFractional = hour + 1;

      return (eventStartFractional >= slotStartFractional && eventStartFractional < slotEndFractional) || 
             (eventEndFractional > slotStartFractional && eventEndFractional <= slotEndFractional) ||   
             (eventStartFractional < slotStartFractional && eventEndFractional > slotEndFractional);    
    });
  }
}
