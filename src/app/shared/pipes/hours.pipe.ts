import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hours'
})
export class HoursPipe implements PipeTransform {
  transform(value?: any): { hour: number; label: string }[] {
    const hours = [];
    for (let i = 0; i < 24; i++) {
        let label: string;
        if (i === 0) {
            label = '12 AM';
        } else if (i < 12) {
            label = `${i} AM`;
        } else if (i === 12) {
            label = 'Noon'; // Or '12 PM'
        } else {
            label = `${i - 12} PM`;
        }
        hours.push({ hour: i, label: label });
    }
    return hours;
  }
}
