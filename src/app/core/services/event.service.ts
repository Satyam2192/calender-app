import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarEvent } from '../models/event.model';
import { v4 as uuidv4 } from 'uuid';

const LOCAL_STORAGE_KEY = 'angularCalendarEvents';

const INITIAL_EVENTS_DATA: Omit<CalendarEvent, 'id'>[] = [
    { "title": "My Task 1", "type": "TASK", "start": 1745901600000, "end": 1745905200000 },
    { "title": "My Task 2", "type": "TASK", "start": 1745988000000, "end": 1745991600000 },
    { "title": "My Task 3", "type": "TASK", "start": 1746074400000, "end": 1746078000000 },
    { "title": "My Task 4", "type": "TASK", "start": 1746160800000, "end": 1746164400000 },
    { "title": "My Task 5", "type": "TASK", "start": 1746247200000, "end": 1746250800000 },
    { "title": "My Task 6", "type": "TASK", "start": 1746333600000, "end": 1746337200000 },
    { "title": "My Task 7", "type": "TASK", "start": 1746420000000, "end": 1746423600000 },
    { "title": "My Task 8", "type": "TASK", "start": 1746506400000, "end": 1746510000000 },
    { "title": "My Task 9", "type": "TASK", "start": 1746592800000, "end": 1746596400000 },
    { "title": "My Task 10", "type": "TASK", "start": 1746679200000, "end": 1746682800000 },
    { "title": "My Task 11", "type": "TASK", "start": 1746765600000, "end": 1746769200000 },
    { "title": "My Task 12", "type": "TASK", "start": 1746852000000, "end": 1746855600000 },
    { "title": "My Task 13", "type": "HOLIDAY", "start": 1746506400000, "end": 1746513600000 },
    { "title": "My Task 14", "type": "TASK", "start": 1746938400000, "end": 1746942000000 },
    { "title": "My Task 15", "type": "HOLIDAY", "start": 1746765600000, "end": 1746772800000 }
];

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private eventsSubject: BehaviorSubject<CalendarEvent[]> = new BehaviorSubject<CalendarEvent[]>([]);
  public events$: Observable<CalendarEvent[]> = this.eventsSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.loadEvents();
  }

  private loadEvents(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedEvents = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedEvents) {
        this.eventsSubject.next(JSON.parse(storedEvents));
      } else {
        const initialEventsWithIds = INITIAL_EVENTS_DATA.map(event => ({
          ...event,
          id: uuidv4()
        }));
        this.eventsSubject.next(initialEventsWithIds);
        this.saveEvents(initialEventsWithIds);
      }
    } else {
      const initialEventsWithIds = INITIAL_EVENTS_DATA.map(event => ({
        ...event,
        id: uuidv4()
      }));
      this.eventsSubject.next(initialEventsWithIds);
    }
  }

  private saveEvents(events: CalendarEvent[]): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
    }
    this.eventsSubject.next([...events]);
  }

  getEvents(): Observable<CalendarEvent[]> {
    return this.events$;
  }

  addEvent(eventData: Omit<CalendarEvent, 'id'>): void {
    const currentEvents = this.eventsSubject.getValue();
    const newEvent: CalendarEvent = {
      ...eventData,
      id: uuidv4(),
    };
    const newEvents = [...currentEvents, newEvent];
    this.saveEvents(newEvents);
  }

  updateEvent(updatedEvent: CalendarEvent): void {
    const currentEvents = this.eventsSubject.getValue();
    const index = currentEvents.findIndex(e => e.id === updatedEvent.id);
    if (index !== -1) {
      const newEvents = [...currentEvents];
      newEvents[index] = updatedEvent;
      this.saveEvents(newEvents);
    }
  }

  deleteEvent(eventId: string): void {
    const currentEvents = this.eventsSubject.getValue();
    const filteredEvents = currentEvents.filter(e => e.id !== eventId);
    this.saveEvents(filteredEvents);
  }
}
