import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../core/models/event.model';
import { format } from 'date-fns';

@Component({
  selector: 'app-event-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-block.component.html',
  styleUrls: ['./event-block.component.css']
})
export class EventBlockComponent {
  @Input() event!: CalendarEvent;
  @Input() isAllDay: boolean = false;
  @Output() editEvent = new EventEmitter<CalendarEvent>();
  @Output() deleteEvent = new EventEmitter<string>();

  constructor() { }

  onEdit(): void {
    this.editEvent.emit(this.event);
  }

  onDelete(): void {
    this.deleteEvent.emit(this.event.id);
  }

  formatTime(timestamp: number): string {
    return format(new Date(timestamp), 'HH:mm');
  }
}
