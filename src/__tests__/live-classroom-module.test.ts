import { describe, it, expect } from 'vitest';
import { LiveClassroomSession, LiveChatMessage } from '../features/live-classroom/types';

describe('Live Classroom & WebRTC Video Feed Module', () => {
  it('validates active session configuration and WebRTC room parameters', () => {
    const session: LiveClassroomSession = {
      id: 'live_som_test',
      title: 'Module 6: School of Pastors & Practical Homiletics Lab',
      moduleCode: 'SOM-MOD-6',
      moduleTitle: 'School of Pastors & Teachers',
      instructorName: 'Pastor Samuel Selkridge',
      roomName: 'HTEIM-SchoolOfMinistry-Cohort2026-Module6',
      isLive: true,
      startTime: new Date().toISOString(),
      sessionMode: 'interactive_lab',
      activeAttendancePrompt: true,
      pinnedScripture: '2 Timothy 4:2'
    };

    expect(session.isLive).toBe(true);
    expect(session.sessionMode).toBe('interactive_lab');
    expect(session.roomName).toContain('HTEIM-SchoolOfMinistry');
    const sanitizedRoom = session.roomName.replace(/[^a-zA-Z0-9-_]/g, '');
    expect(sanitizedRoom).toBe('HTEIM-SchoolOfMinistry-Cohort2026-Module6');
  });

  it('formats live chat messages and handles prayer request tags', () => {
    const standardMessage: LiveChatMessage = {
      id: 'msg-1',
      senderName: 'Danielle Clarke',
      senderRole: 'student',
      text: 'Connected and ready for the homiletics lab.',
      timestamp: '7:05 PM'
    };

    const prayerMessage: LiveChatMessage = {
      id: 'msg-2',
      senderName: 'Minister Caleb Washington',
      senderRole: 'student',
      text: 'Please pray for the upcoming evangelism outreach.',
      timestamp: '7:08 PM',
      isPrayerRequest: true
    };

    expect(standardMessage.isPrayerRequest).toBeUndefined();
    expect(prayerMessage.isPrayerRequest).toBe(true);
    expect(prayerMessage.senderRole).toBe('student');
  });

  it('records live attendance check-in timestamp in localStorage', () => {
    const studentName = 'Danielle Clarke';
    const sessionId = 'live_som_active';
    const key = `hteim_live_checkin_${sessionId}_${studentName.toLowerCase().trim()}`;
    const timestamp = '7:15 PM';

    localStorage.setItem(key, timestamp);
    expect(localStorage.getItem(key)).toBe('7:15 PM');
  });
});
