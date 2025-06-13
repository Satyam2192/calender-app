import { Component } from '@angular/core';
import { CalendarComponent } from './features/calendar/calendar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CalendarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'calendar-app';
}
