export interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM or "07:00 pm"
  endTime?: string; // HH:MM or "09:00 pm"
  courseCode?: string;
}

/**
  Formats YYYY-MM-DD + time string into iCal UTC format YYYYMMDDTHHMMSSZ or YYYYMMDD
*/
function parseToCalDateTime(dateStr: string, timeStr?: string): { start: string; end: string } {
  // Clean date YYYY-MM-DD
  const cleanDate = dateStr.replace(/-/g, '');

  if (!timeStr) {
    // Whole day event
    return {
      start: cleanDate,
      end: cleanDate
    };
  }

  // Parse times e.g. "07:00 - 09:00 pm EST" or "19:00"
  let startHour = 19;
  let startMin = 0;
  let endHour = 21;
  let endMin = 0;

  try {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3] ? match[3].toLowerCase() : null;

      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;

      startHour = h;
      startMin = m;
      endHour = h + 2;
      endMin = m;
    }
  } catch (e) {
    // fallback defaults
  }

  const sH = String(startHour).padStart(2, '0');
  const sM = String(startMin).padStart(2, '0');
  const eH = String(endHour).padStart(2, '0');
  const eM = String(endMin).padStart(2, '0');

  return {
    start: `${cleanDate}T${sH}${sM}00`,
    end: `${cleanDate}T${eH}${eM}00`
  };
}

/**
 * Builds a direct Google Calendar web URL to open template event creation.
 */
export function generateGoogleCalendarUrl(event: CalendarEventItem): string {
  const times = parseToCalDateTime(event.date, event.startTime);
  const title = encodeURIComponent(`${event.courseCode ? `[${event.courseCode}] ` : ''}${event.title}`);
  const details = encodeURIComponent(`${event.description || 'HTEIM School of Ministry Academic Lecture'}\n\nLocation: ${event.location || 'HTEIM Sanctuary / Zoom'}`);
  const location = encodeURIComponent(event.location || 'HTEIM Main Sanctuary / Zoom');
  const dates = `${times.start}/${times.end}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
}

/**
 * Generates an iCalendar (.ics) string for a list of events.
 */
export function generateICSContent(events: CalendarEventItem[], calendarName: string = 'HTEIM School of Ministry'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//HTEIM//${calendarName}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`
  ];

  events.forEach(evt => {
    const times = parseToCalDateTime(evt.date, evt.startTime);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:hteim-${evt.id}-${Date.now()}@hteim.edu`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
    lines.push(`DTSTART:${times.start}`);
    lines.push(`DTEND:${times.end}`);
    lines.push(`SUMMARY:${evt.courseCode ? `[${evt.courseCode}] ` : ''}${evt.title.replace(/\n/g, ' ')}`);
    lines.push(`DESCRIPTION:${(evt.description || 'HTEIM School of Ministry Lecture').replace(/\n/g, ' ')}`);
    lines.push(`LOCATION:${(evt.location || 'HTEIM Sanctuary / Zoom').replace(/\n/g, ' ')}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a file download in browser for .ics calendar file.
 */
export function downloadICSFile(events: CalendarEventItem[], filename: string = 'HTEIM_Ministry_Schedule.ics') {
  const icsText = generateICSContent(events);
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
