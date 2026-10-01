export interface LiveClassroomSession {
  id: string;
  title: string;
  moduleCode: string;
  moduleTitle: string;
  instructorName: string;
  roomName: string;
  isLive: boolean;
  startTime: string;
  sessionMode: 'interactive_lab' | 'apostolic_lecture' | 'homiletics_workshop';
  activeAttendancePrompt: boolean;
  attendancePromptExpiresAt?: string | null;
  recordingUrl?: string | null;
  pinnedScripture?: string;
  pinnedHandoutUrl?: string;
}

export interface LiveChatMessage {
  id: string;
  senderName: string;
  senderRole: 'student' | 'teacher' | 'admin' | 'guest';
  senderPhoto?: string;
  text: string;
  timestamp: string;
  isPrayerRequest?: boolean;
}

export interface LiveParticipant {
  id: string;
  name: string;
  role: 'student' | 'teacher' | 'admin' | 'guest';
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  hasHandRaised?: boolean;
  joinedAt: string;
  checkedInAttendance?: boolean;
}
