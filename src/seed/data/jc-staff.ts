/**
 * The Junior College's teachers, from the college's own printed staff list
 * (N.R. Swamy College of Commerce & Economics / Smt. Thirumalai College of
 * Science, "Junior College Staff List"), sent by SIWS on 2026-10-21 with the
 * qualifications written in by hand.
 *
 * Read by `src/seed/junior-college.ts` and by
 * `src/scripts/update-jc-staff-list.ts`, which brings the live roster to it.
 *
 * AS THE SHEET HAS IT:
 *   - `order` is the sheet's own number, so the page lists them as the
 *     college does — by subject, English first. Two numbers are missing
 *     because two names are struck through on the sheet (8, Commerce, and
 *     17, Physical Education); 4 and 5 are blank lines on it.
 *   - names are turned from the sheet's surname-first form into the order the
 *     other schools' rosters use ("CHANDANI GIRISH MURLIDHAR" → "Girish
 *     Murlidhar Chandani"), with the title the sheet gives.
 *   - where the sheet and the list SIWS sent in September spell a name
 *     differently (Mahadik/Mhadik, Kumavat/Komavat, Juwatkar/Juvatkar,
 *     Bharati/Bharti, Abhisek/Abhishek, Biswala/Rath), the printed sheet is
 *     followed: it is the college's own document.
 *   - a qualification is set only where the sheet gives one. Where it gives
 *     none and September's list did, September's is kept.
 *
 * `was` is the name the record has carried since the site was set up, so the
 * script can find it. `doubt` marks handwriting that could not be read with
 * certainty; what is set is only the part that could.
 */
export interface JcTeacher {
  order: number
  name: string
  subject: string
  qualifications?: string
  was?: string
  doubt?: string
}

export const JC_STAFF: JcTeacher[] = [
  // English
  { order: 1, name: 'Ms. Manjari Govil', subject: 'English', qualifications: 'M.A. (English), B.Ed.', was: 'Manjari' },
  {
    order: 2,
    name: 'Mr. Anil Arya',
    subject: 'English',
    qualifications: 'M.A. (English), B.Ed.',
    was: 'Anil Arya',
    doubt: 'a small note above the M.A. may read “M.Com” — not added',
  },
  {
    order: 3,
    name: 'Mr. Umesh Ingole',
    subject: 'English',
    qualifications: 'M.A. (English), B.Ed., M.Phil., SET',
    was: 'Umesh Ingole',
  },
  // Hindi
  { order: 6, name: 'Ms. Bharati Pandey', subject: 'Hindi', qualifications: 'M.A. (Hindi), B.Ed.', was: 'Bharti Pandey' },
  { order: 7, name: 'Mr. Ramjanam Kedarnath Yadav', subject: 'Hindi', qualifications: 'M.A., B.Ed.' },
  // Commerce
  { order: 9, name: 'Ms. Sheela Krishnan', subject: 'Commerce', qualifications: 'M.Com., B.Ed.', was: 'Sheela Krishnan' },
  {
    order: 10,
    name: 'Mrs. Ishwari Kandasamy',
    subject: 'Commerce',
    qualifications: 'M.Com. (Accountancy), B.Ed.',
    was: 'Ishwari K',
    doubt: '“Acc” is written small above the M.Com — read as Accountancy',
  },
  { order: 11, name: 'Mrs. Uma Maheshwari', subject: 'Commerce', qualifications: 'M.Com., B.Ed.', was: 'Uma' },
  {
    order: 12,
    name: 'Mr. Girish Murlidhar Chandani',
    subject: 'Commerce',
    qualifications: 'M.Com., B.Ed., PGDFM, NET, SET',
    was: 'Girish',
  },
  { order: 13, name: 'Ms. Anjali Raju Vaidya', subject: 'Commerce', qualifications: 'M.Com., B.Ed.', was: 'Anjali' },
  // Economics
  { order: 14, name: 'Ms. Priyanka Sawant', subject: 'Economics', qualifications: 'M.A., B.Ed., LL.B.', was: 'Priyanka Sawant' },
  { order: 15, name: 'Mr. Nilesh A. Karbhari', subject: 'Economics', qualifications: 'M.A., B.Ed., M.Phil.', was: 'Nilesh Karbhari' },
  { order: 16, name: 'Mr. Sanjaya Ramnaresh Gupta', subject: 'Economics', was: 'Sanjaya' },
  // Physical Education
  { order: 18, name: 'Mr. Suraj R. Bhosale', subject: 'Physical Education', qualifications: 'M.A., M.P.Ed.', was: 'Suraj Bhosale' },
  // Environment Education
  { order: 19, name: 'Ms. Pratima Tiwari', subject: 'Environment Education', qualifications: 'M.Sc., B.Ed.', was: 'Pratima Tiwari' },
  // Tamil
  { order: 20, name: 'Mr. P. Karthik', subject: 'Tamil', qualifications: 'M.A., M.Ed., M.Phil.', was: 'Karthik' },
  // Marathi
  { order: 21, name: 'Ms. Sangeeta Kashid', subject: 'Marathi', qualifications: 'Ph.D., M.A., B.Ed.', was: 'Sangeeta Kashid' },
  { order: 22, name: 'Ms. Trupti Sawant', subject: 'Marathi', qualifications: 'M.A., B.Ed.', was: 'Trupti Sawant' },
  // Physics
  { order: 23, name: 'Ms. Kalyani Deshpande', subject: 'Physics', qualifications: 'M.Sc. (Physics), B.Ed.', was: 'Kalyani Deshpande' },
  { order: 24, name: 'Ms. Shilpa Raje', subject: 'Physics', qualifications: 'M.Sc. (Physics), B.Ed.', was: 'Shilpa Raje' },
  { order: 25, name: 'Mrs. Smita Bhole', subject: 'Physics', qualifications: 'M.Sc. (Physics), B.Ed., PGDIT', was: 'Smita Bhole' },
  // Chemistry
  { order: 26, name: 'Ms. Jinsy Thomas', subject: 'Chemistry', qualifications: 'M.Sc. (Chemistry), B.Ed.', was: 'Jinsy Thomas' },
  { order: 27, name: 'Ms. Kalmashi Dholakia', subject: 'Chemistry', was: 'Kalmashi Dholakia' },
  {
    order: 28,
    name: 'Mr. Sandeep Pandit',
    subject: 'Chemistry',
    qualifications: 'M.Sc. (Inorganic Chemistry), B.Ed.',
    was: 'Sandeep Pandit',
    doubt: '“Inorganic Chem” is written small above the M.Sc',
  },
  {
    order: 29,
    name: 'Ms. Hema Sachinam Patil',
    subject: 'Chemistry',
    was: 'Hema Patil',
    doubt: 'the sheet prints the middle name “SACHINAM” — kept as printed',
  },
  {
    order: 30,
    name: 'Mr. Abhisek Vinayak Madhav',
    subject: 'Chemistry',
    was: 'Abhishek Madhav',
    doubt: 'the sheet prints “ABHISEK”; September’s list had “Abhishek”',
  },
  // Biology
  {
    order: 31,
    name: 'Ms. Anamika Biswala',
    subject: 'Biology',
    qualifications: 'M.Sc., B.Ed.',
    was: 'Anamika Rath',
    doubt: 'the sheet’s surname is “Biswala”; September’s list had “Rath”',
  },
  { order: 32, name: 'Mrs. Komal Kumavat', subject: 'Biology', qualifications: 'M.Sc., B.Ed.', was: 'Komal Komavat' },
  { order: 33, name: 'Ms. Gauri Sunil Sawant', subject: 'Biology', was: 'Gauri Sawant' },
  { order: 34, name: 'Mr. Pranay Deepak Juwatkar', subject: 'Biology', was: 'Pranay Juvatkar' },
  // Mathematics
  { order: 35, name: 'Mr. Sunil Mahadik', subject: 'Mathematics', qualifications: 'M.Sc. (Maths), B.Ed.', was: 'Sunil Mhadik' },
  { order: 36, name: 'Ms. Jagruti Joshi', subject: 'Mathematics', qualifications: 'M.Sc. (Maths), B.Ed.', was: 'Jagruti Joshi' },
  {
    order: 37,
    name: 'Mr. Bhoopesh Singh',
    subject: 'Mathematics',
    qualifications: 'M.Sc., B.Ed.',
    was: 'Bhoopesh',
    doubt: 'a small note above the B.Ed is not legible',
  },
  {
    order: 38,
    name: 'Mr. Mangesh Tiwari',
    subject: 'Mathematics',
    qualifications: 'M.Sc., B.Ed.',
    was: 'Mangesh',
    doubt: 'the line runs off the page after the B.Ed',
  },
  {
    order: 39,
    name: 'Ms. Gayathri Sridhar',
    subject: 'Mathematics',
    qualifications: 'M.Sc., M.Phil.',
    was: 'Gayathri Sridhar',
    doubt: 'the line runs off the page after the M.Phil',
  },
  {
    order: 40,
    name: 'Mr. Dilip Singh',
    subject: 'Mathematics',
    qualifications: 'M.Sc., B.Ed.',
    was: 'Dilip Singh',
    doubt: 'the line runs off the page after the B.Ed',
  },
  { order: 41, name: 'Mr. Sateesh Vasant Sawant', subject: 'Mathematics', qualifications: 'M.Sc., B.Ed.', was: 'Sateesh Sawant' },
  { order: 42, name: 'Ms. Aditi Dayanand Mandekar', subject: 'Mathematics', qualifications: 'M.Sc., B.Ed.', was: 'Aditi' },
]

/** How a teacher's role reads on the page: the role the others use, and the subject. */
export const designationOf = (teacher: JcTeacher) => `Assistant Teacher, ${teacher.subject}`
