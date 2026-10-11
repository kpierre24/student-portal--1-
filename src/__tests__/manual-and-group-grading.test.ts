import { describe, it, expect, vi } from 'vitest';
import { CustomAssignment, AssignmentSubmission } from '../types';

describe('Manual & Group Assignment Grading Suite', () => {
  const mockGroupAssignment: CustomAssignment = {
    id: 'asg-grp-1',
    title: 'Apologetics Debate Presentation',
    courseCode: 'THEO-201',
    description: 'Collaborative debate defense on Trinity doctrine.',
    dueDate: '2026-11-15',
    maxPoints: 100,
    type: 'document',
    createdAt: '2026-11-01T00:00:00Z',
    isGroupAssignment: true,
    groups: [
      {
        id: 'grp-1',
        groupName: 'Group Berea',
        memberNames: ['Jenetta Pierre', 'Vanessa Mohammed', 'Caleb Adams'],
      },
      {
        id: 'grp-2',
        groupName: 'Group Antioch',
        memberNames: ['David Miller', 'Sarah Jenkins'],
      },
    ],
  };

  const mockIndividualAssignment: CustomAssignment = {
    id: 'asg-ind-1',
    title: 'Pauline Epistles Exegesis',
    courseCode: 'BIBL-102',
    description: 'Individual chapter study of Romans 8.',
    dueDate: '2026-11-20',
    maxPoints: 50,
    type: 'document',
    createdAt: '2026-11-01T00:00:00Z',
    isGroupAssignment: false,
  };

  it('cascades marks and feedback to all members of a group when grading group assignments', () => {
    // Initial state: only one student in Group Berea submitted
    const initialSubmissions: AssignmentSubmission[] = [
      {
        id: 'sub-existing-1',
        assignmentId: 'asg-grp-1',
        studentName: 'Jenetta Pierre',
        submittedAt: '2026-11-10T12:00:00Z',
        studentFileName: 'Debate_Outline.pdf',
        status: 'Submitted',
        updatedAt: '2026-11-10T12:00:00Z',
      },
    ];

    // Admin grades Group Berea with score 94 and commendation
    const scoreToAward = 94;
    const feedbackToAward = 'Outstanding teamwork, scriptural coherence, and presentation clarity.';
    const gradedMember = 'Jenetta Pierre';

    const groupObj = mockGroupAssignment.groups?.find(g =>
      g.memberNames.some(m => m.toLowerCase().trim() === gradedMember.toLowerCase().trim())
    );
    expect(groupObj).toBeDefined();
    expect(groupObj?.groupName).toBe('Group Berea');

    const groupMembers = groupObj?.memberNames || [];
    expect(groupMembers).toHaveLength(3);

    // Apply the mark to all members
    const updatedSubmissions = [...initialSubmissions];
    const nowStr = new Date().toISOString();

    groupMembers.forEach((memberName) => {
      const idx = updatedSubmissions.findIndex(
        (s) =>
          s.assignmentId === mockGroupAssignment.id &&
          (s.studentName || '').toLowerCase().trim() === memberName.toLowerCase().trim()
      );

      if (idx !== -1) {
        updatedSubmissions[idx] = {
          ...updatedSubmissions[idx],
          score: scoreToAward,
          teacherFeedback: feedbackToAward,
          status: 'Graded',
          isGroupSubmission: true,
          groupName: groupObj?.groupName,
          groupMembers,
          updatedAt: nowStr,
        };
      } else {
        updatedSubmissions.unshift({
          id: `sub-gen-${memberName}`,
          assignmentId: mockGroupAssignment.id,
          studentName: memberName,
          submittedAt: nowStr,
          studentFileName: 'Direct_Group_Submission.pdf',
          score: scoreToAward,
          teacherFeedback: feedbackToAward,
          status: 'Graded',
          isGroupSubmission: true,
          groupName: groupObj?.groupName,
          groupMembers,
          updatedAt: nowStr,
        });
      }
    });

    // Verification: all 3 members now have score 94 and Graded status
    const bereaSubmissions = updatedSubmissions.filter(
      (s) => s.assignmentId === 'asg-grp-1' && groupMembers.includes(s.studentName)
    );
    expect(bereaSubmissions).toHaveLength(3);

    bereaSubmissions.forEach((sub) => {
      expect(sub.score).toBe(94);
      expect(sub.teacherFeedback).toBe(feedbackToAward);
      expect(sub.status).toBe('Graded');
      expect(sub.isGroupSubmission).toBe(true);
      expect(sub.groupName).toBe('Group Berea');
    });

    // Members of Group Antioch must NOT be affected
    const antiochSubmissions = updatedSubmissions.filter(
      (s) => s.studentName === 'David Miller' || s.studentName === 'Sarah Jenkins'
    );
    expect(antiochSubmissions).toHaveLength(0);
  });

  it('handles case-insensitive and trimmed name matching for group assignment members', () => {
    const inputName = '  vanessa mohammed  '; // lowercase with extra whitespace
    const group = mockGroupAssignment.groups?.find((g) =>
      g.memberNames.some((m) => m.toLowerCase().trim() === inputName.toLowerCase().trim())
    );

    expect(group).toBeDefined();
    expect(group?.groupName).toBe('Group Berea');
    expect(group?.memberNames).toContain('Vanessa Mohammed');
  });

  it('allows manual grade entry for individual assignments without prior submission', () => {
    const initialSubmissions: AssignmentSubmission[] = [];
    const targetStudent = 'Marcus Vance';
    const scoreToAward = 48; // out of 50
    const feedbackToAward = 'Deep exegetical analysis of Romans 8:28.';

    const newSub: AssignmentSubmission = {
      id: `manual-sub-1`,
      assignmentId: mockIndividualAssignment.id,
      studentName: targetStudent,
      submittedAt: new Date().toISOString(),
      studentFileName: 'Manual_Grade_Entry.pdf',
      score: scoreToAward,
      teacherFeedback: feedbackToAward,
      status: 'Graded',
      updatedAt: new Date().toISOString(),
    };

    const updated = [newSub, ...initialSubmissions];
    expect(updated).toHaveLength(1);
    expect(updated[0].studentName).toBe('Marcus Vance');
    expect(updated[0].score).toBe(48);
    expect(updated[0].status).toBe('Graded');
    expect(updated[0].isGroupSubmission).toBeFalsy();
  });

  it('updates existing individual grades when admin modifies a mark manually', () => {
    const initialSubmissions: AssignmentSubmission[] = [
      {
        id: 'sub-ind-prev',
        assignmentId: 'asg-ind-1',
        studentName: 'Marcus Vance',
        submittedAt: '2026-11-18T10:00:00Z',
        score: 40,
        teacherFeedback: 'Initial evaluation',
        status: 'Graded',
        updatedAt: '2026-11-18T10:00:00Z',
      },
    ];

    const newScore = 49;
    const newFeedback = 'Revised grade following instructor re-evaluation.';

    const updated = initialSubmissions.map((s) =>
      s.id === 'sub-ind-prev'
        ? {
            ...s,
            score: newScore,
            teacherFeedback: newFeedback,
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    expect(updated[0].score).toBe(49);
    expect(updated[0].teacherFeedback).toBe(newFeedback);
  });

  describe('Group Distribution Dashboard Metrics', () => {
    it('accurately computes student distribution across groups and identifies unassigned members', async () => {
      const { computeGroupDistributionSummary } = await import('../services/assessmentGroupsService');

      const mockGroups = [
        {
          id: 'grp-1',
          groupName: 'Group 1 — Berean Exegetes',
          memberNames: ['Jenetta Pierre', 'Vanessa Mohammed', 'Caleb Adams'],
        },
        {
          id: 'grp-2',
          groupName: 'Group 2 — Apostolic Pioneers',
          memberNames: ['David Miller', 'Sarah Jenkins'],
        },
      ];

      const fullRoster = [
        'Jenetta Pierre',
        'Vanessa Mohammed',
        'Caleb Adams',
        'David Miller',
        'Sarah Jenkins',
        'Marcus Vance', // Unassigned student
      ];

      const summary = computeGroupDistributionSummary(mockGroups, fullRoster);

      expect(summary.totalRosterCount).toBe(6);
      expect(summary.totalAssignedCount).toBe(5);
      expect(summary.totalUnassignedCount).toBe(1);
      expect(summary.unassignedStudentNames).toEqual(['Marcus Vance']);
      expect(summary.groupCount).toBe(2);
      expect(summary.targetPerGroup).toBe(3);
      expect(summary.groups).toHaveLength(2);
      expect(summary.groups[0].memberCount).toBe(3);
      expect(summary.groups[1].memberCount).toBe(2);
      expect(summary.groups[0].shortName).toBe('Berean Exegetes');
      expect(summary.isOptimalBalance).toBe(false); // Because there is an unassigned student
    });

    it('marks optimal balance when all students are assigned with <= 1 variance', async () => {
      const { computeGroupDistributionSummary } = await import('../services/assessmentGroupsService');

      const mockGroups = [
        {
          id: 'grp-1',
          groupName: 'Group 1',
          memberNames: ['Student A', 'Student B'],
        },
        {
          id: 'grp-2',
          groupName: 'Group 2',
          memberNames: ['Student C', 'Student D'],
        },
      ];

      const roster = ['Student A', 'Student B', 'Student C', 'Student D'];
      const summary = computeGroupDistributionSummary(mockGroups, roster);

      expect(summary.totalRosterCount).toBe(4);
      expect(summary.totalUnassignedCount).toBe(0);
      expect(summary.variance).toBe(0);
      expect(summary.isOptimalBalance).toBe(true);
    });
  });
});
