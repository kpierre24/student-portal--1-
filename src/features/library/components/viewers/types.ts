import { LearningResource } from '../../types';
import { LibraryResource } from '../../../../types';

export type AnyResource = LearningResource | LibraryResource;

export interface ViewerBaseProps {
  resource: AnyResource;
  onClose?: () => void;
  canDownload?: boolean;
  canPrint?: boolean;
  studentId?: string;
  initialPage?: number;
  className?: string;
  onComplete?: (completed: boolean) => void;
  onSave?: (saved: boolean) => void;
  onDownload?: (resource: AnyResource) => void;
  onProgressUpdate?: (progress: {
    currentPage?: number;
    totalPages?: number;
    currentTimeSeconds?: number;
    durationSeconds?: number;
    completed?: boolean;
  }) => void;
}

export type DetectedViewerKind =
  | 'pdf'
  | 'youtube'
  | 'vimeo'
  | 'video'
  | 'audio'
  | 'image'
  | 'website'
  | 'unsupported';
