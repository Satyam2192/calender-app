import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CalendarEvent, EventModalData, EventType } from '../../core/models/event.model';
import { format, parseISO, startOfDay, endOfDay, isValid } from 'date-fns';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-event-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-modal.component.html',
  styleUrls: ['./event-modal.component.css']
})
export class EventModalComponent implements OnInit, OnChanges {
  @Input() modalData: EventModalData | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveEvent = new EventEmitter<Omit<CalendarEvent, 'id'> | CalendarEvent>();
  @Output() deleteEventRequest = new EventEmitter<string>();

  private internalEventState: Pick<CalendarEvent, 'id'> | {} = {};
  isEditMode = false;
  eventTypes: EventType[] = ['TASK', 'HOLIDAY'];

  title: string = '';
  type: EventType = 'TASK';
  startDate: string = '';
  startTime: string = '';
  endDate: string = '';
  endTime: string = '';
  isAllDayEvent: boolean = false;

  constructor() { }

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modalData'] && changes['modalData'].currentValue !== changes['modalData'].previousValue) {
      this.initializeForm();
    }
  }

  initializeForm(): void {
    if (this.modalData && this.modalData.event) {
      this.isEditMode = true;
      this.internalEventState = { id: this.modalData.event.id };
      const eventToEdit = this.modalData.event;
      this.title = eventToEdit.title;
      this.type = eventToEdit.type;
      const startDateObj = new Date(eventToEdit.start);
      const endDateObj = new Date(eventToEdit.end);
      this.startDate = format(startDateObj, 'yyyy-MM-dd');
      this.startTime = format(startDateObj, 'HH:mm');
      this.endDate = format(endDateObj, 'yyyy-MM-dd');
      this.endTime = format(endDateObj, 'HH:mm');
      this.isAllDayEvent = this.modalData.isAllDay || false;
    } else if (this.modalData && this.modalData.defaultStartTime && this.modalData.defaultEndTime) {
      this.isEditMode = false;
      this.internalEventState = {};
      const defaultStartDate = new Date(this.modalData.defaultStartTime);
      const defaultEndDate = new Date(this.modalData.defaultEndTime);
      this.title = '';
      this.type = 'TASK';
      this.startDate = format(defaultStartDate, 'yyyy-MM-dd');
      this.startTime = format(defaultStartDate, 'HH:mm');
      this.endDate = format(defaultEndDate, 'yyyy-MM-dd');
      this.endTime = format(defaultEndDate, 'HH:mm');
      this.isAllDayEvent = this.modalData.isAllDay || false;
    } else {
      this.isEditMode = false;
      this.internalEventState = {};
      const now = new Date();
      const defaultStart = startOfDay(now);
      const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);
      this.title = '';
      this.type = 'TASK';
      this.startDate = format(defaultStart, 'yyyy-MM-dd');
      this.startTime = format(defaultStart, 'HH:mm');
      this.endDate = format(defaultEnd, 'yyyy-MM-dd');
      this.endTime = format(defaultEnd, 'HH:mm');
      this.isAllDayEvent = false;
    }

    if (this.isAllDayEvent) {
      if (this.modalData?.isAllDay) {
          this.startTime = '00:00';
          const endDateObj = parseISO(this.endDate);
          if(isValid(endDateObj) && format(endOfDay(endDateObj), 'HH:mm') === this.endTime || this.modalData.event?.end === endOfDay(endDateObj).getTime()){
            this.endTime = '23:59';
          } else if (this.modalData.event && new Date(this.modalData.event.end).getTime() === startOfDay(new Date(this.modalData.event.end)).getTime()){
             this.endTime = '00:00';
          } else {
            this.endTime = '23:59';
          }
      }
    }
  }

  onSave(): void {
    if (!this.title.trim()) {
      alert('Event name is required.');
      return;
    }

    let startDateTime, endDateTime;

    if (this.isAllDayEvent) {
      startDateTime = startOfDay(parseISO(this.startDate));
      endDateTime = endOfDay(parseISO(this.endDate));
    } else {
      if (!this.startTime || !this.endTime) {
        alert('Start and End time are required for non-all-day events.');
        return;
      }
      startDateTime = parseISO(`${this.startDate}T${this.startTime}`);
      endDateTime = parseISO(`${this.endDate}T${this.endTime}`);
    }

    if (!isValid(startDateTime) || !isValid(endDateTime)) {
      alert('Invalid date or time format. Please use YYYY-MM-DD for dates and HH:mm for times.');
      return;
    }

    if (startDateTime.getTime() >= endDateTime.getTime()) {
      if (!this.isAllDayEvent || startDateTime.getTime() > endDateTime.getTime()) {
         alert('End date/time must be after start date/time.');
         return;
      }
    }

    const savedEventData: Omit<CalendarEvent, 'id'> = {
      title: this.title.trim(),
      type: this.type,
      start: startDateTime.getTime(),
      end: endDateTime.getTime(),
    };

    if (this.isEditMode && 'id' in this.internalEventState) {
      (savedEventData as CalendarEvent).id = this.internalEventState.id;
    }

    this.saveEvent.emit(savedEventData);
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onDelete(): void {
    if (this.isEditMode && 'id' in this.internalEventState) {
      this.deleteEventRequest.emit(this.internalEventState.id);
    }
  }
}
