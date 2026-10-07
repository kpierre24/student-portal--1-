import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  parseCurrencyAmount, 
  isTuitionSheetTab, 
  normalizePaymentMethod, 
  normalizePaymentStatus, 
  parseTuitionSheetRows, 
  mergeTuitionRecords 
} from '../lib/tuitionSheets';
import { PaymentRecord } from '../types';

// Mock logger to keep test output clean
vi.mock('../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Tuition & Fees Google Sheets Connector', () => {
  describe('parseCurrencyAmount', () => {
    it('correctly parses standard numbers and string currencies', () => {
      expect(parseCurrencyAmount(1500)).toBe(1500);
      expect(parseCurrencyAmount('$1,500.00')).toBe(1500);
      expect(parseCurrencyAmount('TT$ 1,250.50')).toBe(1250.5);
      expect(parseCurrencyAmount('USD 750')).toBe(750);
      expect(parseCurrencyAmount('$0.00')).toBe(0);
      expect(parseCurrencyAmount(null, 1500)).toBe(1500);
      expect(parseCurrencyAmount(undefined, 1000)).toBe(1000);
      expect(parseCurrencyAmount('', 500)).toBe(500);
    });

    it('correctly handles negative values and accounting parentheses format', () => {
      expect(parseCurrencyAmount('-150.00')).toBe(-150);
      expect(parseCurrencyAmount('($200.00)')).toBe(-200);
    });
  });

  describe('isTuitionSheetTab', () => {
    it('detects tuition sheets by tab name', () => {
      expect(isTuitionSheetTab('Tuition & Fees')).toBe(true);
      expect(isTuitionSheetTab('Student Tuition 2025')).toBe(true);
      expect(isTuitionSheetTab('Payment Ledger')).toBe(true);
      expect(isTuitionSheetTab('Financials')).toBe(true);
      expect(isTuitionSheetTab('Fee Statements')).toBe(true);
      expect(isTuitionSheetTab('School of the Pastors Lesson 16')).toBe(false);
      expect(isTuitionSheetTab('Introduction')).toBe(false);
    });

    it('detects tuition sheets by column headers when tab name is generic', () => {
      const genericTab = 'Sheet1';
      const tuitionHeaders = ['Student Name', 'Total Tuition', 'Amount Paid', 'Balance Due', 'Status'];
      const attendanceHeaders = ['Timestamp', 'First and Last Name', 'Score', 'Email'];

      expect(isTuitionSheetTab(genericTab, tuitionHeaders)).toBe(true);
      expect(isTuitionSheetTab(genericTab, attendanceHeaders)).toBe(false);
    });
  });

  describe('normalizePaymentStatus', () => {
    it('returns Paid In Full when fully paid or status indicates full payment', () => {
      expect(normalizePaymentStatus('Paid', 1500, 1500)).toBe('Paid In Full');
      expect(normalizePaymentStatus('Paid in Full', 1500, 1500)).toBe('Paid In Full');
      expect(normalizePaymentStatus(undefined, 1500, 1500)).toBe('Paid In Full');
      expect(normalizePaymentStatus(undefined, 2000, 1500)).toBe('Paid In Full');
    });

    it('returns Partial when partially paid', () => {
      expect(normalizePaymentStatus('Partial', 500, 1500)).toBe('Partial');
      expect(normalizePaymentStatus(undefined, 500, 1500)).toBe('Partial');
    });

    it('returns Pending Review or Past Due when uncollected', () => {
      expect(normalizePaymentStatus('Past Due', 0, 1500)).toBe('Past Due');
      expect(normalizePaymentStatus(undefined, 0, 1500)).toBe('Pending Review');
    });
  });

  describe('parseTuitionSheetRows', () => {
    it('parses tabular Google Sheet rows into valid PaymentRecord objects', () => {
      const headers = ['Student Name', 'Student ID', 'Total Tuition', 'Amount Paid', 'Balance', 'Status', 'Payment Method'];
      const rows = [
        ['Danielle Clarke', 'HTEIM-2025-001', '$1,500.00', '$1,500.00', '$0.00', 'Paid In Full', 'Bank Transfer'],
        ['Joshua Selkridge', 'HTEIM-2025-002', '$1,500.00', '$750.00', '$750.00', 'Partial', 'Credit Card'],
        ['Shellon Liddel', 'HTEIM-2025-003', '$1,500.00', '$0.00', '$1,500.00', 'Pending Review', 'Cash'],
      ];

      const records = parseTuitionSheetRows('Tuition 2025', headers, rows);

      expect(records).toHaveLength(3);

      // Student 1: Danielle Clarke
      expect(records[0].studentName).toBe('Danielle Clarke');
      expect(records[0].studentId).toBe('HTEIM-2025-001');
      expect(records[0].totalTuition).toBe(1500);
      expect(records[0].amountPaid).toBe(1500);
      expect(records[0].status).toBe('Paid In Full');
      expect(records[0].paymentMethod).toBe('Bank Transfer');

      // Student 2: Joshua Selkridge
      expect(records[1].studentName).toBe('Joshua Selkridge');
      expect(records[1].amountPaid).toBe(750);
      expect(records[1].status).toBe('Partial');
      expect(records[1].paymentMethod).toBe('Credit Card');

      // Student 3: Shellon Liddel -> mapped to canonical alias Shellon Liddell
      expect(records[2].studentName).toBe('Shellon Liddell');
      expect(records[2].amountPaid).toBe(0);
      expect(records[2].status).toBe('Pending Review');
    });

    it('calculates total tuition if balance and amount paid are provided', () => {
      const headers = ['Student Name', 'Amount Paid', 'Balance Due'];
      const rows = [
        ['Test Student', '$400', '$600'],
      ];

      const records = parseTuitionSheetRows('Sheet1', headers, rows);
      expect(records).toHaveLength(1);
      expect(records[0].totalTuition).toBe(1000);
      expect(records[0].amountPaid).toBe(400);
    });
  });

  describe('mergeTuitionRecords', () => {
    it('intelligently merges incoming sheet records while preserving existing local notes and receipt attachments', () => {
      const existing: PaymentRecord[] = [
        {
          id: 'pay-1',
          studentId: 'HTEIM-2025-001',
          studentName: 'Danielle Clarke',
          moduleTrack: 'School of Ministry 2025-2026',
          totalTuition: 1500,
          amountPaid: 1000,
          status: 'Partial',
          lastPaymentDate: '2026-03-01',
          paymentMethod: 'Bank Transfer',
          notes: 'Special local note from financial officer',
          receiptUrl: 'https://storage.example.test/receipt1.pdf',
        }
      ];

      const incoming: PaymentRecord[] = [
        {
          id: 'pay-sheet-1',
          studentId: 'HTEIM-2025-001',
          studentName: 'Danielle Clarke',
          moduleTrack: 'School of Ministry 2025-2026',
          totalTuition: 1500,
          amountPaid: 1500, // Updated on sheet
          status: 'Paid In Full',
          lastPaymentDate: '2026-04-01',
          paymentMethod: 'Bank Transfer',
        },
        {
          id: 'pay-sheet-2',
          studentId: 'HTEIM-2025-002',
          studentName: 'Joshua Selkridge',
          moduleTrack: 'School of Ministry 2025-2026',
          totalTuition: 1500,
          amountPaid: 750,
          status: 'Partial',
          lastPaymentDate: '2026-04-01',
          paymentMethod: 'Credit Card',
        }
      ];

      const merged = mergeTuitionRecords(existing, incoming, 'manual');

      expect(merged).toHaveLength(2);
      const student1 = merged.find(m => m.studentName === 'Danielle Clarke');
      expect(student1).toBeDefined();
      expect(student1?.amountPaid).toBe(1500);
      expect(student1?.status).toBe('Paid In Full');
      // Preserved local overrides
      expect(student1?.notes).toBe('Special local note from financial officer');
      expect(student1?.receiptUrl).toBe('https://storage.example.test/receipt1.pdf');

      const student2 = merged.find(m => m.studentName === 'Joshua Selkridge');
      expect(student2).toBeDefined();
      expect(student2?.amountPaid).toBe(750);
    });
  });

  describe('User Attached Google Sheet Parsing Evaluation', () => {
    const userCSV = `NOS., Name,Email ,Total Tuition,Total Paid,Balance Owed,Paid in full,Last Payment Date,Status,Blast Off Payment,Total Payment Due,Number of Guests Sunday Brunch,Meal Preferance,Role,Country,ATTENDANCE,NAME ON CERTIFICATE 
,,,,400,,,8th June 2026,,,,,,,,,
,,,,200,,,8th april 2026,,,,,,,,,
1,Afeshia  Burke,afeshiajones16@gmail.com,1200,,600,Payment Pending,,Active,,,,,Student,Trinidad,,
2,Afi Thompson,Afireforestation2016@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Tobago,,
,,,,400,,,20/05/2026,,,,,,,,,
,,,,200,,,22/03/2026,,,,,,,,,
3,ANNE-MARIE  DAVIS,annejazz2014@gmail.com,1200,,600,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,1200,0,Paid in Full,,,,,,,,,,
4,Atiya  Williams ,atiyaw79@gmail.com,1200,,0,Paid in Full,,Active,,,,,Student,Trinidad,,
,,,,700,,Paid in Full,19/04/2026,,,,,,,,,
5,Beverly Selkridge ,marilynmitchell603@gmail.com,1200,,500,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,1000,,,April 13th 2026,,,,,,,,,
6,Candy Webb,candywebb4321@gmail.com,1200,,200,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,500,,,September 12th 2026,,,,,,,,,
,,,,200,,Paid in Full,April 12 2026,,,,,,,,,
7,Claudia Cashe,claudiacashe@gmail.com,1200,,500,Payment Pending,,Active,,,,,Student,Trinidad,,
8,Denise  Edwards ,Deniseedwards6561@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Tobago,,
9,Dessel  Williams ,desselwill@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
,,,,1200,,,,,,,,,,,,
10,Felicia  Williams ,wfelicia399@gmail.com,1200,,0,Paid in Full,,Active,,,,,Student,Trinidad,,
,,,,300,,,,,,,,,,,,
,,,,300,,,03/05/2026,,,,,,,,,
,,,,200,,,26/05/2026,,,,,,,,,
11,Ingrid Bonval-Butcher,hbonval@gmail.com,1200,,400,Payment Pending,,Active,,,,,Student,Trinidad,,
13,Javier  Marks ,Michael.marix@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Guyana,,
,,,,200,,,,,,,,,,,,
14,Jerzelle  Whiteman ,Jerzellewhiteman@gmail.com,1200,,1000,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,100,,,30/05/2026,,,,,,,,,
,,,,100,,,26/04/2026,,,,,,,,,
15,JESSICA  FIDDLER ,Jessicafiddler76@gmail.com,1200,,1000,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,200,,,19th April 2026,,,,,,,,,
16,Josanne Pompey,Josieorrpompey1@gmail.com,1200,,1000,Payment Pending,,Active,,,,,Student,Trinidad,,
17,Jovanka Williams,jovankaw@yahoo.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Guyana,,
,,,,200,,,April 8th 2026,,,,,,,,,
18,Julie-Ann Fernandes-Charles,juliefernandes866@gmail.com,1200,,1000,Payment Pending,,Active,,,,,Student,Trinidad,,
19,Kadijah Daniel,kadijahbenjamin82@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
,,,,500,,,8th June 2026,,,,,,,,,
,,,,200,,Payment Pending,6th April 2026,,,,,,,,,
20,Kristy Alexander,Kryssi2010@hotmail.com,1200,,500,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,500,,Paid in Full,April 12th 2026,,,,,,,,,
21,Leslie  Inniss,Leslie.inniss.serv@gmail.com,1200,,700,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,200,,Paid in Full,19/04/2026,,,,,,,,,
22,Lynton  Pompey ,mr.lpompey@gmail.com,1200,,1000,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,200,,,14th April 2026,,,,,,,,,
23,Marlene  Walker-Castle ,info. mercedessolutions@gmail.com ,1200,,1000,Payment Pending,,Active,,,,,Student,Trinidad,,
25,Mishael  Daniel,Mishaeldaniel06@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
26,Natalie  Webb Lewis ,Nwl317@yahoo.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,United States ,,
27,Natasha  Williams ,tashmcfash12@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
28,Paula  Massiah Blount ,Blountpaula@rocketmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Guyana,,
,,,,400,,,19th April 2026,,,,,,,,,
29,Regina  Joseph- Gonzales ,profesoragonzales91@gmail.com ,1200,,800,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,200,,Paid in Full,April 12th 2026,,,,,,,,,
30,Rennie Bowles,Parenz_360@yahoo.com,1200,,1000,Payment Pending,,Active,,,,,Student,Tobago,,
31,Richard Roberts,rrobertslionheart@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
,,,,1000,,,April 14th 2026,,,,,,,,,
32,Roxanne Sealey,roxannesealey1971@gmail.com,1200,,200,Payment Pending,,Active,,,,,Student,Trinidad,,
33,Shellon  Liddell ,uvanie@yahoo.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Guyana,,
,,,,1200,,,April 8th 2026,,,,,,,,,
34,Stacey Waithe,educatingintruth@gmail.com,1200,,0,Paid in Full,,Active,,,,,Student,Trinidad,,
,,,,500,,,8/6/2026,,,,,,,,,
,,,,200,,,26/4/2026,,,,,,,,,
35,Susan  Spark ,Susane.spark999@gmail.com ,1200,,500,Payment Pending,,Active,,,,,Student,Trinidad,,
36,Sybris Walker-Castle,Info.mercedessolutions@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
,,,,1200,,,,,,,,,,,,
37,Tricia  Worrell,triciarhworrell@gmail.com,1200,,1200,Paid in Full,,Active,,,,,Student,Barbados,,
,,,,1200,,,,,,,,,,,,
38,Whitney Tracey Seelochan,Whitneytrace@live.com,1200,,0,Paid in Full,,Active,,,,,Student,Trinidad,,
39,Zahra Andrews,zahra.andrews21@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
40,Ruth Vernon,ruthvernon829@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Guyana,,
,,,,500,,,30/05/2026,,,,,,,,,
,,,,200,,,25/04/2026,,,,,,,,,
41,Catherine Olivia Vidale-Lewis,Vidalecathrine@gmail.com,1200,,500,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,200,,,22/04/2026,,,,,,,,,
42,Jennylyn Dickson,divajenny@yahoo.com,1200,,1000,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,400,,,24.06.2026,,,,,,,,,
,,,,200,,,03/05/2026,,,,,,,,,
,,,,200,,,26/04/2026,,,,,,,,,
43,Niomi. Laverne Joseph Marksman,lovernejosephempress@gmail.com,1200,,400,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,200,,,23/04/2026,,,,,,,,,
44,Kathleen Joseph-Sandy,akilsandy09@gmail.com,1200,,1000,Payment Pending,,Active,,,,,Student,Trinidad,,
45,Kabrina Morris-Jack,Kabrinamo@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
46,Tessa Phipps ,tcoggins218@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,St. Kitts,,
,,,,200,,,14th April 2026,,,,,,,,,
47,Wendy Woodruffe,woodruffe23saftey@gmail.com,1200,,1000,Payment Pending,,Active,,,,,Student,Trinidad,,
48,Quacy Marecheau,Marecheauq@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
49,RACQUEL GUMBS,redeemedrh1976@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,St. Kitts,,
,,,,1200,,,,,,,,,,,,
50,Colette Blackburne Joseph,cbburne@gmail.com,1200,,0,Paid in Full,,Active,,,,,Student,Trinidad,,
51,Kemrolene Opadeyi,K_bowens@hotmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
52,Jovanka Williams,jovanwilliams@hotmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Guyana,,
53,Paula Massiah Blount ,Blountpaula@rocketmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Guyana,,
,,,,200,,,12th April 2026,,,,,,,,,
54,Jenetta Pierre,jenetta.pierre04@gmail.com,1200,,1000,Payment Pending,,Active,0,0,0,,Student,Trinidad,,
55,Keyshana Gomes,keyshanagomes14@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Guyana,,
56,Shellon Massiah ,massiahshellon@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Guyana,,
57,Diana Selkridge,diana.selkridge@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
58,Krystal Mohammed,krystalmoh02@gmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
59,Vikash Ramnarace,houseofmorax@hotmail.com,1200,,1200,Payment Pending,,Inactive,,,,,Student,Trinidad,,
,,,,700,,,,,,,,,,,,
,,,,500,,,30/05/2026,,,,,,,,,
60,Francisca Swift,,1200,,0,Paid in Full,,Active,,,,,Student,Trinidad,,
,,,,500,,,26/4/2026,,,,,,,,,
61,Racine Roy,,1200,,700,Payment Pending,,Active,,,,,Student,Trinidad,,
,,,,20300,51700,,,,,,,,,,,`;

    it('correctly parses user sheet and evaluates amounts paid and balance owed', async () => {
      const { parseTuitionCSV } = await import('../lib/tuitionSheets');
      const records = parseTuitionCSV(userCSV);

      expect(records.length).toBe(59);

      // Total collected across students must strictly equal $20,300
      const totalCollected = records.reduce((s, r) => s + r.amountPaid, 0);
      expect(totalCollected).toBe(20300);

      // Total balance owed across students must strictly equal $51,700
      const totalBalanceOwed = records.reduce((s, r) => s + (r.balanceOwed ?? (r.totalTuition - r.amountPaid)), 0);
      expect(totalBalanceOwed).toBe(51700);

      // Total billed for the 59 students is 59 * $1,200 = $70,800
      const totalBilled = records.reduce((s, r) => s + r.totalTuition, 0);
      expect(totalBilled).toBe(70800);

      // 1. Afeshia Burke: 400 + 200 = 600 paid, 600 balance owed
      const afeshia = records.find(r => r.studentName.toLowerCase().includes('afeshia'));
      expect(afeshia).toBeDefined();
      expect(afeshia?.amountPaid).toBe(600);
      expect(afeshia?.balanceOwed).toBe(600);
      expect(afeshia?.status).toBe('Partial');

      // 2. Afi Thompson: unpaid ($0 paid, $1200 owed)
      const afi = records.find(r => r.studentName.toLowerCase().includes('afi thompson'));
      expect(afi).toBeDefined();
      expect(afi?.amountPaid).toBe(0);
      expect(afi?.balanceOwed).toBe(1200);

      // 3. Atiya Williams: 1200 paid, 0 balance owed, Paid In Full
      const atiya = records.find(r => r.studentName.toLowerCase().includes('atiya'));
      expect(atiya).toBeDefined();
      expect(atiya?.amountPaid).toBe(1200);
      expect(atiya?.balanceOwed).toBe(0);
      expect(atiya?.status).toBe('Paid In Full');

      // 4. Beverly Selkridge: 700 paid, 500 balance owed
      const beverly = records.find(r => r.studentName.toLowerCase().includes('beverly'));
      expect(beverly).toBeDefined();
      expect(beverly?.amountPaid).toBe(700);
      expect(beverly?.balanceOwed).toBe(500);
      expect(beverly?.status).toBe('Partial');

      // 5. Candy Webb: 1000 paid, 200 balance owed
      const candy = records.find(r => r.studentName.toLowerCase().includes('candy webb'));
      expect(candy).toBeDefined();
      expect(candy?.amountPaid).toBe(1000);
      expect(candy?.balanceOwed).toBe(200);
      expect(candy?.status).toBe('Partial');

      // 6. Claudia Cashe: 500 + 200 = 700 paid, 500 balance owed
      const claudia = records.find(r => r.studentName.toLowerCase().includes('claudia cashe'));
      expect(claudia).toBeDefined();
      expect(claudia?.amountPaid).toBe(700);
      expect(claudia?.balanceOwed).toBe(500);

      // 7. Ingrid Bonval-Butcher: 300 + 300 + 200 = 800 paid, 400 balance owed
      const ingrid = records.find(r => r.studentName.toLowerCase().includes('ingrid'));
      expect(ingrid).toBeDefined();
      expect(ingrid?.amountPaid).toBe(800);
      expect(ingrid?.balanceOwed).toBe(400);

      // 8. Leslie Inniss: 500 paid, 700 balance owed
      const leslie = records.find(r => r.studentName.toLowerCase().includes('leslie inniss'));
      expect(leslie).toBeDefined();
      expect(leslie?.amountPaid).toBe(500);
      expect(leslie?.balanceOwed).toBe(700);

      // 9. Tricia Worrell: 1200 paid, 1200 balance owed (from sheet Balance Owed column)
      const tricia = records.find(r => r.studentName.toLowerCase().includes('tricia worrell'));
      expect(tricia).toBeDefined();
      expect(tricia?.amountPaid).toBe(1200);
      expect(tricia?.balanceOwed).toBe(1200);

      // 10. Francisca Swift: 700 + 500 = 1200 paid, 0 balance owed, Paid In Full
      const francisca = records.find(r => r.studentName.toLowerCase().includes('francisca swift'));
      expect(francisca).toBeDefined();
      expect(francisca?.amountPaid).toBe(1200);
      expect(francisca?.balanceOwed).toBe(0);
      expect(francisca?.status).toBe('Paid In Full');

      // 11. Racine Roy: 500 paid, 700 balance owed
      const racine = records.find(r => r.studentName.toLowerCase().includes('racine roy'));
      expect(racine).toBeDefined();
      expect(racine?.amountPaid).toBe(500);
      expect(racine?.balanceOwed).toBe(700);
    });
  });
});
