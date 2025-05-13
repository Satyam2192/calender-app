export type EventType = 'TASK' | 'HOLIDAY';

export interface CalendarEvent {
  id: string; 
  title: string;
  type: EventType;
  start: number;
  end: number;  
}

export interface EventModalData {
  event?: CalendarEvent; 
  defaultStartTime?: number;
  defaultEndTime?: number; 
  isAllDay?: boolean; 
}
