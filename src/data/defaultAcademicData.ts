/**
 * ============================================================================
 * DEFAULT ACADEMIC STRUCTURE DATA
 * HTEIM School of Ministry
 * ============================================================================
 * Establishes the authoritative Academic Hierarchy:
 * Academic Year -> Semester/Term -> Master Course -> Course Offering
 * Demonstrating course definition reuse across terms and years with
 * full support for:
 *   - Lecturer
 *   - Enrolled Students
 *   - Attendance
 *   - Assignments
 *   - Exams
 *   - Grades
 */

import { 
  AcademicYear, 
  Term, 
  MasterCourse, 
  CourseOffering, 
  AcademicStructureData 
} from '../types/academicEngine';

export const DEFAULT_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 'ay_2025_2026',
    code: 'AY-2025-2026',
    name: '2025–2026 Academic Year',
    startDate: '2025-09-01',
    endDate: '2026-06-30',
    status: 'active',
    theme: 'Equipping the Saints for Apostolic Impact & Kingdom Commission',
    description: 'Current ministerial training academic cycle covering foundational, ministerial, and apostolic leadership tracks.'
  },
  {
    id: 'ay_2026_2027',
    code: 'AY-2026-2027',
    name: '2026–2027 Academic Year',
    startDate: '2026-09-01',
    endDate: '2027-06-30',
    status: 'upcoming',
    theme: 'Deepening Theological Foundations & International Church Planting',
    description: 'Upcoming academic year featuring expanded five-fold governance and pastoral licensing practicums.'
  }
];

export const DEFAULT_TERMS: Term[] = [
  {
    id: 'term_2026_s1',
    academicYearId: 'ay_2025_2026',
    code: '2026-SEM-1',
    name: 'Semester 1 (April – July)',
    sequenceOrder: 1,
    startDate: '2026-04-01',
    endDate: '2026-07-31',
    status: 'active',
    weeksCount: 16,
    description: 'First Semester running from April to July.'
  },
  {
    id: 'term_2026_s2',
    academicYearId: 'ay_2025_2026',
    code: '2026-SEM-2',
    name: 'Semester 2 (August – November)',
    sequenceOrder: 2,
    startDate: '2026-08-01',
    endDate: '2026-11-30',
    status: 'upcoming',
    weeksCount: 16,
    description: 'Second Semester running from August to November.'
  }
];

/**
 * 6 CORE CURRICULUM MODULES (Master Course Catalog)
 * These definitions are eternal and reusable across all academic years and semesters.
 */
export const DEFAULT_MASTER_COURSES: MasterCourse[] = [
  {
    id: 'mod_intro',
    code: 'SOM-MOD-1',
    title: 'Introduction',
    coreModuleNumber: 1,
    credits: 5.0,
    department: 'Biblical Studies',
    level: 'Foundation',
    description: 'Foundational orientation to ministerial training, spiritual disciplines, biblical interpretation, and the holy calling of leadership within the Kingdom of God.',
    learningOutcomes: [
      'Understand the biblical call, consecration, and spiritual formation for Christian ministry',
      'Master fundamental hermeneutics and faithful scriptural exegesis',
      'Develop regular personal spiritual disciplines including intercession and fasting',
      'Articulate the foundational doctrine of Christ with clarity and reverence'
    ],
    prerequisites: ['SOM-099 Ministerial Orientation'],
    teachers: ['Pastor Samuel Selkridge', 'Apostle Gillian Selkridge'],
    instructors: ['Pastor Samuel Selkridge', 'Apostle Gillian Selkridge'],
    syllabusOutline: [
      { week: 1, topic: 'The Call & Consecration to Holy Office', description: 'Examining the biblical call to ministry, motive purity, and holy separation.', scriptureReferences: ['1 Timothy 1:12-14', 'Galatians 1:15-16'] },
      { week: 2, topic: 'Foundations of Biblical Hermeneutics', description: 'Sound scriptural exegesis, historical context, and avoiding eisegesis.', scriptureReferences: ['2 Timothy 2:15', 'Nehemiah 8:8'] },
      { week: 3, topic: 'Spiritual Disciplines of the Minister', description: 'Developing a secret place of prayer, fasting, and biblical meditation.', scriptureReferences: ['Matthew 6:5-18', 'Psalm 91:1-2'] },
      { week: 4, topic: 'The Word, Faith, and Kingdom Authority', description: 'Walking in spiritual authority grounded in the finished work of the Cross.', scriptureReferences: ['Luke 10:19', 'Mark 11:22-24'] }
    ],
    isActive: true
  },
  {
    id: 'mod_evangelism',
    code: 'SOM-MOD-2',
    title: 'School of Evangelism',
    coreModuleNumber: 2,
    credits: 5.0,
    department: 'Practical Ministry',
    level: 'Foundation',
    description: 'Practical soul-winning strategies, personal witnessing, the Matthew 28 Great Commission mandate, overcoming objections in outreach, and new convert discipleship.',
    learningOutcomes: [
      'Articulate the Gospel message with conviction, simplicity, and biblical fidelity',
      'Execute street outreach, altar ministry, and one-on-one evangelistic counseling',
      'Overcome common spiritual objections to faith using apologetics and compassion',
      'Establish new convert follow-up and local church assimilation pipelines'
    ],
    prerequisites: ['SOM-MOD-1 Introduction'],
    teachers: ['Pastor Christy Arthur'],
    instructors: ['Pastor Christy Arthur'],
    syllabusOutline: [
      { week: 1, topic: 'The Great Commission Mandate', description: 'Exegetical study of Matthew 28:18-20, Mark 16:15-18, and the urgency of harvest.', scriptureReferences: ['Matthew 28:18-20', 'Acts 1:8'] },
      { week: 2, topic: 'Personal Testimony & The Power of Witnessing', description: 'Crafting and sharing your redemption testimony like Paul before Agrippa.', scriptureReferences: ['Acts 26:1-23', 'Revelation 12:11'] },
      { week: 3, topic: 'Overcoming Objections in Soul Winning', description: 'Addressing skepticism, other world religions, and moral objections with grace.', scriptureReferences: ['1 Peter 3:15', 'Colossians 4:5-6'] },
      { week: 4, topic: 'Outreach Field Practicum & Discipleship Retention', description: 'Direct field evangelism and systematic retention of new believers.', scriptureReferences: ['Luke 10:1-12', '2 Timothy 2:2'] }
    ],
    isActive: true
  },
  {
    id: 'mod_apostles',
    code: 'SOM-MOD-3',
    title: 'School of the Apostles',
    coreModuleNumber: 3,
    credits: 5.0,
    department: 'Leadership & Governance',
    level: 'Degree',
    description: 'Apostolic governance, Ephesians 4:11 five-fold ministry alignment, church planting, spiritual fathers and sons, and distinguishing true apostolic order from authoritarianism.',
    learningOutcomes: [
      'Grasp the biblical role of the apostolic office as church foundation builders',
      'Align the five-fold ministry offices for corporate spiritual equipping',
      'Implement apostolic models of church multiplication and elder ordination',
      'Identify and dismantle spiritual manipulation and false apostolic practices'
    ],
    prerequisites: ['SOM-MOD-1 Introduction', 'SOM-MOD-2 School of Evangelism'],
    teachers: ['Apostle Gillian Selkridge'],
    instructors: ['Apostle Gillian Selkridge'],
    syllabusOutline: [
      { week: 1, topic: 'The Apostolic Foundation & Architecture', description: 'Ephesians 2:20 & 4:11 foundational principles in the New Covenant church.', scriptureReferences: ['Ephesians 2:20', 'Ephesians 4:11-16'] },
      { week: 2, topic: 'Marks, Signs, and Character of an Apostle', description: 'Patience, perseverance, suffering, signs, and spiritual fatherhood.', scriptureReferences: ['2 Corinthians 12:12', '1 Corinthians 4:14-16'] },
      { week: 3, topic: 'Five-Fold Synergy & Apostolic Order', description: 'How Apostles, Prophets, Evangelists, Pastors, and Teachers work in harmony.', scriptureReferences: ['1 Corinthians 12:28', 'Acts 13:1-3'] },
      { week: 4, topic: 'Translocal Oversight & Church Planting', description: 'Birthing kingdom assemblies, elder ordination, and territorial impact.', scriptureReferences: ['Titus 1:5', 'Acts 14:21-23'] }
    ],
    isActive: true
  },
  {
    id: 'mod_ethics',
    code: 'SOM-MOD-4',
    title: 'Ministerial Ethics',
    coreModuleNumber: 4,
    credits: 5.0,
    department: 'Theology & Ethics',
    level: 'Diploma',
    description: 'High standards of spiritual, moral, financial, and fiduciary integrity for leaders. Covers pastoral counseling boundaries, conflict resolution (Matthew 18), and ministerial accountability.',
    learningOutcomes: [
      'Maintain unblemished moral and counseling boundaries in pastoral practice',
      'Exercise fiduciary responsibility, church financial auditing, and stewardship',
      'Execute Matthew 18 conflict reconciliation protocols with restorative love',
      'Prevent leader burnout, disqualification, and institutional scandal'
    ],
    prerequisites: ['SOM-MOD-1 Introduction'],
    teachers: ['Pastor Gale Grant'],
    instructors: ['Pastor Gale Grant'],
    syllabusOutline: [
      { week: 1, topic: 'The Character Standards of Leaders', description: 'In-depth study of 1 Timothy 3 and Titus 1 overseer requirements.', scriptureReferences: ['1 Timothy 3:1-13', 'Titus 1:5-9'] },
      { week: 2, topic: 'Pastoral Counseling & Confidentiality', description: 'Privileged communication, counseling ethics, and protective boundaries.', scriptureReferences: ['Proverbs 11:13', 'Galatians 6:1-2'] },
      { week: 3, topic: 'Financial Stewardship & Church Integrity', description: 'Handling tithes, offerings, budgets, and transparent reporting.', scriptureReferences: ['2 Corinthians 8:20-21', 'Malachi 3:10'] },
      { week: 4, topic: 'Conflict Resolution & Matthew 18 Protocol', description: 'Biblical peacemaking, restorative discipline, and team reconciliation.', scriptureReferences: ['Matthew 18:15-20', 'Romans 12:18'] }
    ],
    isActive: true
  },
  {
    id: 'mod_pastor_hs',
    code: 'SOM-MOD-5',
    title: 'School of the Pastor and Holy Spirit',
    coreModuleNumber: 5,
    credits: 5.0,
    department: 'Practical Ministry',
    level: 'Executive',
    description: 'Shepherding the flock under the guidance and empowerment of the Holy Spirit. Covers pastoral care, sermon delivery, gifts of the Holy Spirit, and spiritual formation.',
    learningOutcomes: [
      'Shepherd the flock of God with compassion, wisdom, and spiritual oversight',
      'Flow in the gifts, fruit, and leading of the Holy Spirit in ministry',
      'Prepare and deliver Spirit-led expository sermons and teachings',
      'Provide crisis pastoral counseling and bereavement care to families'
    ],
    prerequisites: ['SOM-MOD-1 Introduction', 'SOM-MOD-4 Ministerial Ethics'],
    teachers: ['Pastor Samuel Selkridge', 'Pastor Gale Grant'],
    instructors: ['Pastor Samuel Selkridge', 'Pastor Gale Grant'],
    syllabusOutline: [
      { week: 1, topic: 'The Heart of the Shepherd & Holy Spirit Empowerment', description: 'Feeding and guarding the flock under the mantle of the Chief Shepherd.', scriptureReferences: ['1 Peter 5:1-4', 'John 21:15-17', 'Acts 20:28'] },
      { week: 2, topic: 'Operating in the Gifts of the Holy Spirit', description: 'The nine gifts of the Spirit in pastoral oversight and counseling.', scriptureReferences: ['1 Corinthians 12:4-11', 'Romans 8:14'] },
      { week: 3, topic: 'Expository Preaching & Homiletics Practicum', description: 'Crafting Spirit-inspired messages that nourish and edify believers.', scriptureReferences: ['2 Timothy 4:1-5', '1 Corinthians 2:4-5'] },
      { week: 4, topic: 'Pastoral Care in Crisis & Hospital Visitation', description: 'Ministering comfort in grief, family crises, and Christian ceremonies.', scriptureReferences: ['James 5:14-16', 'Romans 12:15'] }
    ],
    isActive: true
  },
  {
    id: 'mod_prophets',
    code: 'SOM-MOD-6',
    title: 'School of the Prophets',
    coreModuleNumber: 6,
    credits: 5.0,
    department: 'Practical Ministry',
    level: 'Degree',
    description: 'The nature, function, and biblical testing of prophetic ministry in the New Covenant church. Cultivating spiritual sensitivity, prophetic protocol, and spiritual discernment.',
    learningOutcomes: [
      'Discern the voice of God in accordance with Scripture and the Spirit',
      'Apply biblical rules for judging and testing prophetic utterances',
      'Deliver prophetic words with humility, love, and assembly order (1 Cor 14)',
      'Engage in prophetic intercession and spiritual warfare for breakthrough'
    ],
    prerequisites: ['SOM-MOD-1 Introduction'],
    teachers: ['Prophet Garod Andrews', 'Apostle Gillian Selkridge'],
    instructors: ['Prophet Garod Andrews', 'Apostle Gillian Selkridge'],
    syllabusOutline: [
      { week: 1, topic: 'The New Testament Prophetic Ministry', description: 'Gift of prophecy vs prophetic office; edification, exhortation, and comfort.', scriptureReferences: ['1 Corinthians 14:1-4', 'Acts 21:8-14'] },
      { week: 2, topic: 'Testing and Judging Prophecy', description: 'Scriptural alignment, Christological confession, and fruit testing.', scriptureReferences: ['1 Thessalonians 5:19-22', '1 John 4:1-3'] },
      { week: 3, topic: 'Prophetic Protocol & Decency in the Assembly', description: 'The spirits of prophets subject to prophets (1 Cor 14:32).', scriptureReferences: ['1 Corinthians 14:29-33', '1 Corinthians 14:40'] },
      { week: 4, topic: 'Prophetic Intercession & Spiritual Discernment', description: 'Discerning spirits, watchmen on the wall, and spiritual breakthrough.', scriptureReferences: ['Habakkuk 2:1-3', 'Hebrews 5:14'] }
    ],
    isActive: true
  }
];

/**
 * DEFAULT COURSE OFFERINGS
 * Here is the exact realization of the user's requirement:
 * Course: Biblical Hermeneutics
 * Course Offering: Biblical Hermeneutics - 2026 Semester 1, Lecturer: Pastor Samuel Selkridge
 * AND
 * Course Offering: Biblical Hermeneutics - 2026 Semester 2, Lecturer: Rev. Samuel Selkridge
 *
 * This allows reusing the same course every year without duplicating the entire course definition!
 */
export const DEFAULT_COURSE_OFFERINGS: CourseOffering[] = [
  // 1. OFFERING: School of Ministry in Semester 1 (April – July)
  {
    id: 'offering_som_2026_s1',
    courseId: 'crs_school_of_ministry',
    courseCode: 'SOM-CORE',
    courseTitle: 'School of Ministry',
    academicYearId: 'ay_2025_2026',
    academicYearName: '2025–2026 Academic Year',
    termId: 'term_2026_s1',
    termName: 'Semester 1 (April – July)',
    section: 'Section 01 (Sanctuary & Online Stream)',
    scheduleDays: 'Tuesdays & Thursdays (7:00 PM - 9:00 PM EST)',
    location: 'HTEIM Main Sanctuary & Zoom Live',
    zoomLink: 'https://zoom.us/j/hteim-school-of-ministry',
    capacity: 60,
    status: 'active',
    credits: 30.0,
    
    // ├── Primary Lecturer & Faculty Team
    lecturer: {
      id: 't_gillian',
      name: 'Apostle Gillian Selkridge',
      title: 'Apostle & Academic Overseer',
      email: 'apostle.gillian@hteim.edu',
      bio: 'Presiding Apostle with apostolic oversight across ministerial networks, spiritual governance, and five-fold leadership training.',
      officeHours: 'Tuesdays 5:00 PM - 6:30 PM EST via Zoom or Campus Study',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    },
    teachers: [
      'Apostle Gillian Selkridge',
      'Pastor Samuel Selkridge',
      'Pastor Gale Grant',
      'Pastor Christy Arthur',
      'Prophet Garod Andrews'
    ],

    // ├── Enrolled Students
    enrolledStudents: [
      {
        studentId: 'st_1',
        studentName: 'Candice Pierre',
        studentNumber: 'HTEIM-2026-001',
        email: 'candice.pierre@hteim.edu',
        cohortLevel: 'Level 1 Foundation',
        enrolledAt: '2026-01-10',
        status: 'enrolled',
        attendanceRate: 94.1,
        assignmentsScore: 92.0,
        examsScore: 95.0,
        finalGrade: 93.8,
        letterGrade: 'A',
        standing: 'high_distinction',
        notes: 'Outstanding exegetical precision in Pauline Epistle studies.'
      },
      {
        studentId: 'st_2',
        studentName: 'Akeem Pierre',
        studentNumber: 'HTEIM-2026-002',
        email: 'akeem.pierre@hteim.edu',
        cohortLevel: 'Level 1 Foundation',
        enrolledAt: '2026-01-10',
        status: 'enrolled',
        attendanceRate: 88.2,
        assignmentsScore: 86.5,
        examsScore: 89.0,
        finalGrade: 87.8,
        letterGrade: 'A',
        standing: 'high_distinction',
        notes: 'Strong participation and deep theological reflections.'
      },
      {
        studentId: 'st_3',
        studentName: 'Shellon Liddell',
        studentNumber: 'HTEIM-2026-003',
        email: 'shellon.liddell@hteim.edu',
        cohortLevel: 'Level 1 Foundation',
        enrolledAt: '2026-01-10',
        status: 'enrolled',
        attendanceRate: 82.4,
        assignmentsScore: 80.0,
        examsScore: 81.5,
        finalGrade: 81.4,
        letterGrade: 'B',
        standing: 'satisfactory',
        notes: 'Consistent attendance and good grasp of historical context.'
      },
      {
        studentId: 'st_4',
        studentName: 'David Marshall',
        studentNumber: 'HTEIM-2026-004',
        email: 'david.marshall@hteim.edu',
        cohortLevel: 'Level 1 Foundation',
        enrolledAt: '2026-01-10',
        status: 'at_risk',
        attendanceRate: 64.7, // Below 75% at-risk trigger
        assignmentsScore: 68.0,
        examsScore: 65.0,
        finalGrade: 66.2,
        letterGrade: 'D',
        standing: 'at_risk',
        notes: 'At-risk attendance trigger active (< 75%). Pastoral contact initiated.'
      },
      {
        studentId: 'st_5',
        studentName: 'Esther George',
        studentNumber: 'HTEIM-2026-005',
        email: 'esther.george@hteim.edu',
        cohortLevel: 'Level 1 Foundation',
        enrolledAt: '2026-01-10',
        status: 'enrolled',
        attendanceRate: 91.2,
        assignmentsScore: 90.0,
        examsScore: 88.0,
        finalGrade: 89.8,
        letterGrade: 'A',
        standing: 'high_distinction'
      },
      {
        studentId: 'st_6',
        studentName: 'Michael Browne',
        studentNumber: 'HTEIM-2026-006',
        email: 'michael.browne@hteim.edu',
        cohortLevel: 'Level 1 Foundation',
        enrolledAt: '2026-01-10',
        status: 'enrolled',
        attendanceRate: 76.5,
        assignmentsScore: 78.0,
        examsScore: 75.0,
        finalGrade: 76.6,
        letterGrade: 'C',
        standing: 'satisfactory'
      }
    ],

    // ├── Attendance
    attendance: [
      {
        id: 'att_som101_s1',
        sessionNumber: 1,
        date: '2026-01-13',
        topic: 'Session 1: Divine Inspiration & The Canon of Scripture',
        records: [
          { studentName: 'Candice Pierre', status: 'Present' },
          { studentName: 'Akeem Pierre', status: 'Present' },
          { studentName: 'Shellon Liddell', status: 'Present' },
          { studentName: 'David Marshall', status: 'Absent', notes: 'Unexcused work conflict' },
          { studentName: 'Esther George', status: 'Present' },
          { studentName: 'Michael Browne', status: 'Present' }
        ],
        presentCount: 5,
        absentCount: 1,
        excusedCount: 0,
        attendanceRate: 83.3
      },
      {
        id: 'att_som101_s2',
        sessionNumber: 2,
        date: '2026-01-15',
        topic: 'Session 2: Historical-Grammatical Method & Avoiding Eisegesis',
        records: [
          { studentName: 'Candice Pierre', status: 'Present' },
          { studentName: 'Akeem Pierre', status: 'Present' },
          { studentName: 'Shellon Liddell', status: 'Present' },
          { studentName: 'David Marshall', status: 'Present' },
          { studentName: 'Esther George', status: 'Present' },
          { studentName: 'Michael Browne', status: 'Present' }
        ],
        presentCount: 6,
        absentCount: 0,
        excusedCount: 0,
        attendanceRate: 100.0
      },
      {
        id: 'att_som101_s3',
        sessionNumber: 3,
        date: '2026-01-20',
        topic: 'Session 3: Old Testament Types, Shadows, and Covenantal Law',
        records: [
          { studentName: 'Candice Pierre', status: 'Present' },
          { studentName: 'Akeem Pierre', status: 'Present' },
          { studentName: 'Shellon Liddell', status: 'Excused', notes: 'Medical appointment' },
          { studentName: 'David Marshall', status: 'Absent' },
          { studentName: 'Esther George', status: 'Present' },
          { studentName: 'Michael Browne', status: 'Present' }
        ],
        presentCount: 4,
        absentCount: 1,
        excusedCount: 1,
        attendanceRate: 83.3
      },
      {
        id: 'att_som101_s4',
        sessionNumber: 4,
        date: '2026-01-22',
        topic: 'Session 4: Exegesis of Romans 8: Christological Center',
        records: [
          { studentName: 'Candice Pierre', status: 'Present' },
          { studentName: 'Akeem Pierre', status: 'Present' },
          { studentName: 'Shellon Liddell', status: 'Present' },
          { studentName: 'David Marshall', status: 'Absent' },
          { studentName: 'Esther George', status: 'Present' },
          { studentName: 'Michael Browne', status: 'Present' }
        ],
        presentCount: 5,
        absentCount: 1,
        excusedCount: 0,
        attendanceRate: 83.3
      }
    ],

    // ├── Assignments
    assignments: [
      {
        id: 'asg_som101_1',
        title: 'Exegetical Paper: Romans 8:28-30 Contextual Analysis',
        description: 'Conduct a thorough historical-grammatical exegesis of Romans 8:28-30. Identify rhetorical flow, key Greek word origins (prognosis, proorizo), and avoid Calvinist/Arminian eisegesis.',
        type: 'exegesis',
        maxPoints: 100,
        weight: 25,
        dueDate: '2026-02-15',
        submissionsCount: 6,
        gradedCount: 6,
        avgScore: 84.5,
        rubricCriteria: [
          { name: 'Historical & Literary Context', maxPoints: 30, description: 'Correctly identifies audience, occasion, and surrounding chapter flow' },
          { name: 'Word & Syntax Analysis', maxPoints: 40, description: 'Examines Greek root nuances and biblical cross-references' },
          { name: 'Ministerial Application', maxPoints: 30, description: 'Sound pastoral and practical application without twisting Scripture' }
        ]
      },
      {
        id: 'asg_som101_2',
        title: 'Sermon Outline: The Christocentric Principle in Genesis 22',
        description: 'Develop an expository sermon outline showing how Abraham offering Isaac in Genesis 22 prefigures God offering His only begotten Son at Calvary.',
        type: 'essay',
        maxPoints: 100,
        weight: 20,
        dueDate: '2026-03-10',
        submissionsCount: 6,
        gradedCount: 5,
        avgScore: 88.0
      }
    ],

    // ├── Exams
    exams: [
      {
        id: 'exam_som101_mid',
        title: 'Midterm Examination: Hermeneutical Rules & Textual Criticism',
        description: 'Comprehensive mid-term evaluation of canonization, translation methodologies, hermeneutical axioms, and fallacy identification.',
        examType: 'midterm',
        totalPoints: 100,
        weight: 25,
        examDate: '2026-03-24',
        durationMinutes: 90,
        status: 'graded',
        avgScore: 85.2,
        passingScore: 75.0
      },
      {
        id: 'exam_som101_final',
        title: 'Final Examination: Comprehensive Biblical Exegesis Defense',
        description: 'End-of-term oral and written defense demonstrating mastery of Hermeneutics across both Testaments.',
        examType: 'final',
        totalPoints: 100,
        weight: 30,
        examDate: '2026-05-19',
        durationMinutes: 120,
        status: 'scheduled',
        avgScore: 0,
        passingScore: 75.0
      }
    ],

    // ├── Grades
    grades: [
      {
        studentName: 'Candice Pierre',
        studentNumber: 'HTEIM-2026-001',
        assignmentGrades: { asg_som101_1: 96, asg_som101_2: 98 },
        examGrades: { exam_som101_mid: 95 },
        attendancePercentage: 94.1,
        weightedScore: 95.2,
        letterGrade: 'A',
        standing: 'high_distinction',
        isPublished: true,
        facultyFeedback: 'Exceptional depth of scholarship and clear pastoral communication.'
      },
      {
        studentName: 'Akeem Pierre',
        studentNumber: 'HTEIM-2026-002',
        assignmentGrades: { asg_som101_1: 88, asg_som101_2: 90 },
        examGrades: { exam_som101_mid: 89 },
        attendancePercentage: 88.2,
        weightedScore: 88.6,
        letterGrade: 'A',
        standing: 'high_distinction',
        isPublished: true,
        facultyFeedback: 'Consistent high effort with great theological insight.'
      },
      {
        studentName: 'Shellon Liddell',
        studentNumber: 'HTEIM-2026-003',
        assignmentGrades: { asg_som101_1: 82, asg_som101_2: 84 },
        examGrades: { exam_som101_mid: 80 },
        attendancePercentage: 82.4,
        weightedScore: 81.9,
        letterGrade: 'B',
        standing: 'satisfactory',
        isPublished: true,
        facultyFeedback: 'Good solid work. Ensure cross-references to original Greek are expanded.'
      },
      {
        studentName: 'David Marshall',
        studentNumber: 'HTEIM-2026-004',
        assignmentGrades: { asg_som101_1: 68, asg_som101_2: 65 },
        examGrades: { exam_som101_mid: 64 },
        attendancePercentage: 64.7,
        weightedScore: 65.4,
        letterGrade: 'D',
        standing: 'at_risk',
        isPublished: true,
        facultyFeedback: 'At-risk warning: Attendance is currently below 75% policy. Please meet with the Dean of Students.'
      },
      {
        studentName: 'Esther George',
        studentNumber: 'HTEIM-2026-005',
        assignmentGrades: { asg_som101_1: 91, asg_som101_2: 92 },
        examGrades: { exam_som101_mid: 88 },
        attendancePercentage: 91.2,
        weightedScore: 90.1,
        letterGrade: 'A',
        standing: 'high_distinction',
        isPublished: true
      },
      {
        studentName: 'Michael Browne',
        studentNumber: 'HTEIM-2026-006',
        assignmentGrades: { asg_som101_1: 76, asg_som101_2: 80 },
        examGrades: { exam_som101_mid: 75 },
        attendancePercentage: 76.5,
        weightedScore: 76.8,
        letterGrade: 'C',
        standing: 'satisfactory',
        isPublished: true
      }
    ]
  },

  // 2. OFFERING: School of Ministry in Semester 2 (August – November)
  {
    id: 'offering_som_2026_s2',
    courseId: 'crs_school_of_ministry',
    courseCode: 'SOM-CORE',
    courseTitle: 'School of Ministry',
    academicYearId: 'ay_2025_2026',
    academicYearName: '2025–2026 Academic Year',
    termId: 'term_2026_s2',
    termName: 'Semester 2 (August – November)',
    section: 'Section 02 (Weekend Intensive & Global Stream)',
    scheduleDays: 'Saturdays (9:00 AM - 1:00 PM EST)',
    location: 'HTEIM Main Sanctuary & Zoom Live',
    zoomLink: 'https://zoom.us/j/hteim-school-of-ministry-s2',
    capacity: 60,
    status: 'upcoming',
    credits: 30.0,
    
    // ├── Primary Lecturer & Faculty Team
    lecturer: {
      id: 't_samuel',
      name: 'Pastor Samuel Selkridge',
      title: 'Dean of Ministry & Senior Pastor',
      email: 'pastor.samuel@hteim.edu',
      bio: 'Dean of the School of Ministry with over 25 years of pastoral counseling, hermeneutical instruction, and ministry development.',
      officeHours: 'Thursdays 2:00 PM - 4:00 PM EST via Zoom',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    teachers: [
      'Apostle Gillian Selkridge',
      'Pastor Samuel Selkridge',
      'Pastor Gale Grant',
      'Pastor Christy Arthur',
      'Prophet Garod Andrews'
    ],

    enrolledStudents: [],
    attendance: [],
    assignments: [
      {
        id: 'asg_som_s2_1',
        title: 'Module 1: Foundations of Divine Calling & Separation (Introduction)',
        description: 'Opening research paper on personal calling, holy consecration, and spiritual formation.',
        type: 'essay',
        maxPoints: 100,
        weight: 20,
        dueDate: '2026-08-30',
        submissionsCount: 0,
        gradedCount: 0,
        avgScore: 0
      },
      {
        id: 'asg_som_s2_2',
        title: 'Module 2: Great Commission Evangelistic Campaign & Altar Ministry',
        description: 'Field outreach documentation and soul winning report.',
        type: 'practicum',
        maxPoints: 100,
        weight: 20,
        dueDate: '2026-09-25',
        submissionsCount: 0,
        gradedCount: 0,
        avgScore: 0
      }
    ],
    exams: [
      {
        id: 'exam_som_s2_final',
        title: 'Final Comprehensive Ministerial Examination (All 6 Modules)',
        description: 'Comprehensive written and oral defense across Introduction, Evangelism, Apostles, Ethics, Pastor & Holy Spirit, and Prophets.',
        examType: 'final',
        totalPoints: 100,
        weight: 35,
        examDate: '2026-11-21',
        durationMinutes: 120,
        status: 'scheduled',
        avgScore: 0,
        passingScore: 75.0
      }
    ],
    grades: []
  }
];

export const INITIAL_ACADEMIC_STRUCTURE: AcademicStructureData = {
  academicYears: DEFAULT_ACADEMIC_YEARS,
  terms: DEFAULT_TERMS,
  masterCourses: DEFAULT_MASTER_COURSES,
  courseOfferings: DEFAULT_COURSE_OFFERINGS,
  activeAcademicYearId: 'ay_2025_2026',
  activeTermId: 'term_2026_s1',
  policyThresholds: {
    atRiskAttendance: 75,
    criticalAttendance: 50,
    highDistinctionGrade: 85,
    satisfactoryGrade: 75
  }
};
