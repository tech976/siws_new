import type { ListEntry } from './lexical'
import { loadEnv } from '@/utilities/load-env'

loadEnv()

// Deferred so `loadEnv()` runs before the Payload config reads DATABASE_URI.
const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { orderedList, para, richText, richTextNodes } = await import('./lexical')

/**
 * Seeds the institution-wide scholarship register.
 *
 * WHY THIS IS NOT A PRIMARY PAGE
 * ------------------------------
 * SIWS supplied this list inside the Primary section's requirement document,
 * but the funds themselves are not Primary's. They are awarded from the K.G.
 * and Nursery Section through to the S.S.C. Examination and the Arts, Fine Arts
 * & Philosophical Centre — several name Standards V, VIII, IX and X explicitly.
 * Publishing them under Primary would hide them from the families of every
 * other unit and would give a Primary content manager editorial control over
 * awards their section does not administer.
 *
 * So the register lives at the institution level (no unit), and each unit page
 * links to it. That also means it is maintained once: an endowment added next
 * year is added in one place rather than four.
 *
 * PROVENANCE
 * ----------
 * Every fund name and purpose below is SIWS's own wording, transcribed from
 * the register they supplied. Nothing is summarised, reworded for flow, or
 * invented — with one substitution: the register says "pupil" where the site
 * says "student" (SIWS, 2026-08-29). A fund's condition reads the same either
 * way, and the fund NAMES are untouched. Two transcription decisions are recorded at their entries:
 * the source's numbering had one fund split across two numbers, and one fund
 * repeated its own number for a second sub-award.
 *
 * Fee concessions: SIWS's document heads this section "Scholarship / fee
 * concession schemes" but supplies no concession scheme details, so the page
 * makes no claim about fee concessions.
 *
 * TWO SOURCES, TWO CONFLICTS
 * --------------------------
 * The register was supplied twice — a long list with the Primary Wadala
 * document and a shorter one with Primary Matunga. The short list adds seven
 * funds the long one omits (appended to `OPEN`, marked there), and repeats the
 * rest. On two funds the two documents disagree outright, and the disagreement
 * is not a wording difference:
 *
 *   Shri. Sankara Mattham Scholarship Fund
 *     Wadala:  "To three VIII & IX Standard students who obtain highest marks
 *               in Sanskrit in VII, VIII & IX Standard."
 *     Matunga: "To five financially weak and deserving students."
 *
 *   Smt. Mangalam Ramachandran Endowment Scholarship Fund
 *     Wadala:  "To a student scoring highest marks in Hindi in the S.S.C.
 *               Examination in school."
 *     Matunga: "To a financially weak and deserving students."
 *
 * One is a merit award and the other a needs award — they cannot both describe
 * the same fund, and picking one would publish a criterion that may send the
 * wrong families away. The Wadala wording is kept because it is the more
 * specific of the two and comes from the fuller register, and the conflict is
 * reported at the end of every run until SIWS confirms which is right.
 *
 * Also unresolved: the Matunga list contains a line reading only "Fund: To a
 * deserving student." with the fund's name lost, and an entry "Scholarship
 * initiated by Mr. Dinkar." with no purpose given. Neither is published.
 *
 * Run with:  npm run seed:scholarships
 */

/** Reported after each run so these do not quietly become permanent. */
const OPEN_QUESTIONS = [
  'Mr. Vachan Giri Endowment Scholarship Fund — listed twice, once on the merit list ("To a meritorious and financially weak student.") and once on the open list ("For two meritorious and poor students of Standard X."). Both wordings name merit AND need, which is why it landed in both. Published once, on the merit list, with the first wording. Is it one fund or two, and if one, which wording and how many students?',
  'Shri. Sankara Mattham Scholarship Fund — Wadala’s document calls it a Sanskrit merit award for three students in Standards VIII & IX; Matunga’s calls it a needs award for five students. The Wadala wording is published. Which is correct?',
  'Smt. Mangalam Ramachandran Endowment Scholarship Fund — Wadala’s document calls it a Hindi S.S.C. merit award; Matunga’s calls it a needs award. The Wadala wording is published. Which is correct?',
  'The Matunga list has a line reading only "Fund: To a deserving student." — the fund’s name is missing. Not published.',
  '"Scholarship initiated by Mr. Dinkar." appears with no award criterion. Not published — please send the fund’s full name and purpose.',
]

/** Awarded on academic or co-curricular achievement. */
const MERIT: ListEntry[] = [
  {
    term: 'Silver Jubilee Scholarship Fund',
    detail: 'To the boy and girl who stand first in the S.S.C. Examination.',
  },
  {
    term: 'Master R.P. Subramaniam Memorial Scholarship Fund',
    detail: 'To the boy and girl who stand first in V Standard.',
  },
  {
    term: 'Mrs. Lakshmi Ammal Commemoration Scholarship Fund',
    detail: 'To be awarded to the student who stands first in each standard.',
  },
  {
    term: 'Smt. Thirumalai Narasimha Iyengar Commemoration Scholarship Fund',
    detail: 'To be awarded to the student who stands first in each standard.',
  },
  {
    term: 'Khadi Bhandar Matunga Scholarship Fund',
    detail: 'To the best student passing out of IX Standard and continuing studies in our school.',
  },
  {
    term: 'Thirumalai Charity Scholarship Fund (R. Narasimha Iyengar Memorial)',
    detail:
      'To two Standard X students who get the highest marks in English and Mathematics and secure Distinction in the S.S.C. Examination and continue their studies in Standard XI.',
  },
  {
    term: 'Shri P.K. Parasurama Iyer Endowment Scholarship Fund',
    detail: 'To the student who comes first in Standard X.',
  },
  {
    term: 'Smt. Rajan Narayanaswamy Memorial Fund',
    detail: 'To the girl securing the highest marks in Standard IX.',
  },
  {
    term: 'Suhas Ramanathan Memorial Scholarship Fund',
    detail:
      'To one student each in Standards VIII, IX and X who scores the highest marks in Mathematics in the annual examination.',
  },
  {
    term: 'Shri S. Balaraman Memorial Endowment Scholarship Fund',
    detail: 'To the student who scores the highest marks in English in Standard X.',
  },
  {
    term: 'Mrs. K.S. Lakshmi Devi Endowment Scholarship Fund',
    detail:
      'To the student in Standard VIII for getting the highest aggregate marks in Mathematics for the year.',
  },
  {
    term: 'Late Shri H. Devaraja Iyer Merit Scholarship Fund',
    detail: 'To the student who scores the highest marks in Mathematics in Standard VII.',
  },
  {
    term: 'Miss. N. Kamalam Scholarship Fund',
    detail: 'To the student who comes first in the S.S.C. Examination.',
  },
  {
    term: 'Mr. S. N. Desai Arts Scholarship Fund',
    detail:
      'To the students in VI & VII Standard for securing the highest marks in Drawing in the annual examination.',
  },
  {
    term: 'Mr. V. Murugan Nair Scholarship Fund',
    detail: 'To the student who stands first in V ‘E’ Section.',
  },
  {
    term: 'Mrs. K. Radha Prabhakaran Endowment Scholarship Fund',
    detail: 'To the student who comes first in English from Standard V to X.',
  },
  {
    term: 'Mr. N. Mahadev Memorial Scholarship Fund',
    detail: 'For one girl and one boy on merit-cum-means.',
  },
  {
    term: 'Dr. Sita Laxmi Endowment Scholarship Fund',
    detail:
      'To students of VIII & IX Standards who secure the highest marks in Mathematics & Science in the annual examination.',
  },
  {
    term: 'Mr. P. V. Ramachandran Endowment Scholarship Fund',
    detail:
      'To the student who secures the highest in Mathematics and highest in Science in S.S.C.',
  },
  {
    term: 'Mr. V. Sundaresan Endowment Scholarship Fund',
    detail:
      'For obtaining maximum aggregate marks in Mathematics & Science in the S.S.C. Examination.',
  },
  {
    term: 'S. Venkataraman Scholarship Fund',
    detail: 'An annual scholarship for an outstanding student of the K.G./Nursery Section.',
  },
  {
    term: 'Late Mr. T. Narayana Iyer & Late Mrs. S. Rajam Narayana Iyer Memorial Scholarship Fund',
    detail: 'To a boy & girl student for standing first in Standard IX.',
  },
  {
    term: 'Smt. Mangalam Ramachandran Endowment Scholarship Fund',
    detail: 'To a student scoring highest marks in Hindi in the S.S.C. Examination in school.',
  },
  {
    term: 'Shri. Sankara Mattham Scholarship Fund',
    detail:
      'To three VIII & IX Standard students who obtain highest marks in Sanskrit in VII, VIII & IX Standard.',
  },
  {
    term: 'Mr. M. N. Ramachandran Endowment Scholarship Fund',
    detail:
      'To the first two students who score the highest marks in Sanskrit in the S.S.C. Examination.',
  },
  {
    term: 'Mr. Rajam Narayanan Memorial Scholarship Fund',
    detail: 'To the outstanding boy & girl student of X Standard.',
  },
  {
    term: 'Miss Veena Memorial Scholarship Fund',
    detail:
      'To students: (a) preferably to a female student (not compulsory); (b) of average intelligence; (c) who has taken active part in extracurricular activities such as sports, scouts and guides, etc.; (d) who has secured at least 60% of marks in the S.S.C. Examination.',
  },
  {
    term: 'Late K. P. Subramanian Endowment Scholarship Fund',
    detail: 'To a student who secures the highest in English at X Standard Board Examination.',
  },
  {
    /**
     * The source lists number 29 twice — once carrying sub-award (a) and again
     * carrying (b) and (c). It is one fund with three awards, so the three are
     * joined here rather than published as two funds of the same name.
     */
    term: 'Shri. R. V. Subramanian Iyer Memorial Scholarship Fund',
    detail:
      '(a) The best outgoing girl guide of the year. (b) The best outgoing boy scout of the year. (c) The best outgoing R.S.P. of the year.',
  },
  {
    term: 'Late Mrs. Rajan Narayan Memorial Scholarship Fund',
    detail: 'To the most outstanding boy and girl student of VIII Standard.',
  },
  { term: 'Late D. V. Narayanan Scholarship Fund', detail: 'To a suitable meritorious student.' },
  {
    term: 'Mr. S. Kandaswamy (BTS) Endowment Scholarship Fund',
    detail: 'For a boy student of the school securing highest marks in the S.S.C. Examination.',
  },
  {
    term: 'Shri. Srinivasa Iyengar Scholarship Fund',
    detail:
      'To one boy and one girl student who secured the highest marks in the S.S.C. every academic year.',
  },
  {
    term: 'Late Shri. N. V. Nathan Scholarship Fund',
    detail:
      'To a boy and girl student each in Standard V & VIII of the school who secure the highest aggregate marks in English subject during an academic year.',
  },
  {
    term: 'Mrs. Bhavani Varuchinathan Scholarship Fund',
    detail:
      'To a student who secures highest marks in S.S.C. Tamil Examination (or) to the student who secures highest marks in the S.S.C. Examination.',
  },
  {
    term: 'Mr. P. K. Krishnamoorthy Endowment Scholarship Fund',
    detail:
      'For the student who secures the highest marks in Mathematics in the S.S.C. Examination.',
  },
  {
    term: 'Rashtrabhasha Prachar Sabha Scholarship Fund',
    detail:
      'For standing first in Hindi in the S.S.C. Examination and standing first in Hindi Competition in X Standard.',
  },
  {
    term: 'Ms. G. Radha Head Teacher Primary School, Wadala Endowment Scholarship Fund',
    detail: 'For standing first in each standard, i.e., from I to IV.',
  },
  {
    term: 'Kum. Shalini Sivaram Endowment Scholarship Fund',
    detail: 'Two students who come first & second in the S.S.C. Examination.',
  },
  {
    term: 'Shri. M. R. K. Murthy and K. Sundarambal Memorial Scholarship Fund',
    detail:
      'To be awarded to the girl student obtaining the highest aggregate marks in the S.S.C. Board Examination.',
  },
  {
    term: 'Mrs. B. Sarasa Mani – Head Teacher, Wadala Primary Section Endowment Scholarship Fund',
    detail:
      'Awarded to the student who secures the highest marks in Mathematics in Standard IV (one from each of the three divisions).',
  },
  {
    term: 'Late Mrs. T. S. Swaminathan Merit Scholarship Fund',
    detail: 'To students from K.G. to Secondary.',
  },
  {
    term: 'Late Smt. Vijayalakshmi Memorial Scholarship Fund',
    detail: 'To a girl standing first in Mathematics in Class X.',
  },
  {
    term: 'Late A. Bhagawatheeswara Iyer Endowment Scholarship Fund',
    detail: 'For students who excel in Sanskrit Language.',
  },
  {
    term: 'Shri. R. Ramaswamy Endowment Scholarship Fund',
    detail: 'To a meritorious needy child.',
  },
  {
    term: 'Mr. Vachan Giri Endowment Scholarship Fund',
    detail: 'To a meritorious and financially weak student.',
  },
  {
    term: 'Thirumalai Smt. Vedavalli and Shri. N. S. Iyengar Corpus Fund',
    detail: 'To the best Science student of all classes.',
  },
  {
    term: 'Mr. K. Raman Memorial Scholarship Fund',
    detail: 'To 4th Standard students scoring highest marks in Mathematics.',
  },
  {
    term: 'Former Principal V. Krishnamurthy Memorial Scholarship',
    detail:
      'For the best students in English, Science and Mathematics from Standards VI, VII and VIII separately, comprising 9 prizes.',
  },
  { term: 'Essakimuthu Merit Scholarship Fund', detail: 'For the Rank holder in 8th Standard.' },
  {
    term: 'Smt. Rajalakshmi Ramachandran Merit Scholarship Fund',
    detail: 'Merit Scholarship to students from IX Standard.',
  },
  {
    term: 'Late Pujya Shri K. Rama Iyer Merit Scholarship Fund',
    detail: 'For the best student in Standard VIII.',
  },
  {
    term: 'Shri. M. Ramakrishnan Endowment Scholarship Fund',
    detail:
      'Student coming first in Mathematics and Science in 9th Standard. (50% for Mathematics and 50% for Science.)',
  },
  {
    term: 'Mrs. Sakuntala Nair Head Teacher Wadala Primary Section Merit Scholarship Fund',
    detail: 'For the rank holder of Standard IV.',
  },
  {
    term: 'Rt. Head Master Mr. Sasikumar Nair Merit Scholarship Fund',
    detail: 'The topper in the S.S.C. Examination.',
  },
  {
    term: 'Late Mrs. Vellakat Kalliankutty Amma Endowment Scholarship Fund',
    detail: 'To be given to topper girl of S.S.C.',
  },
  {
    term: 'Late Mr. Thanjil Govindan Kutty Nair Endowment Scholarship Fund',
    detail: 'To be given to topper male students of S.S.C.',
  },
]

/** Awarded on need and deservingness rather than rank. */
const OPEN: ListEntry[] = [
  {
    term: 'Shri. S. Ramanathan Endowment Scholarship Fund',
    detail: 'To a financially weak deserving student in the Primary or Secondary Section.',
  },
  {
    term: 'Shri. K. A. Subramaniam Memorial Scholarship Fund',
    detail: 'To a financially weak and deserving student of Standard V.',
  },
  {
    term: 'Shri. A. S. Mani Scholarship Fund (S. Raju Memorial)',
    detail: 'To any deserving student in the school.',
  },
  {
    term: 'Manavar Kalai Arangam Scholarship Fund',
    detail:
      'To be awarded to a boy or girl of Standard X and continuing to study in XI, who is good in curricular and extracurricular activities.',
  },
  {
    term: 'Mrs. Mani Thankam Scholarship Fund (S. Mani Memorial)',
    detail: 'To any financially weak deserving student.',
  },
  {
    term: 'Smt. Sharada Ramalingam Memorial Scholarship Fund',
    detail: 'To a deserving girl student.',
  },
  { term: 'Shri. M. K. Ramasubramaniam Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Shri. V. Shivram Endowment Scholarship Fund',
    detail: 'To a financially weak and deserving student of the school.',
  },
  {
    term: 'Mrs. Pattammal Narayanaswamy Scholarship Fund',
    detail: 'To a financially weak and deserving student of the school.',
  },
  { term: 'Mrs. Rukmani Ammal Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Shri. R. M. Sundaram Scholarship Fund',
    detail: 'To a needy and deserving student (preferably a Higher Secondary student).',
  },
  { term: 'Miss. V. Saraswathi Ammal Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Keraleeya Mahila Samaj Scholarship Fund',
    detail:
      'To a deserving girl student of Standard VIII until she completes Standard X from the school.',
  },
  {
    term: 'Shri. K. N. Parameswaran Memorial Scholarship Fund',
    detail: 'For any deserving student.',
  },
  {
    term: 'S.I.W.S. Staff Endowment Scholarship Fund',
    detail: 'To two deserving students, preferably a boy and a girl.',
  },
  { term: 'Raju Memorial Scholarship Fund', detail: 'To a deserving student of the school.' },
  {
    term: 'Kumar Jayanthi Memorial Scholarship Fund',
    detail: 'To a deserving and needy student of Standard VII.',
  },
  { term: 'Shri. Murugaiah Endowment Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Miss. S. Jaya Scholarship Fund',
    detail: 'To a deserving girl student good at studies.',
  },
  { term: 'Ramanuja Bhakta Sabha Endowment Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Shri. N. Ramanurthy (Ex-student) Memorial Scholarship Fund',
    detail: 'To two deserving students.',
  },
  {
    term: 'Kumarapuram Subramania Iyer and Kaveri Ammal Scholarship Fund',
    detail: 'To a deserving student of the High School.',
  },
  {
    term: 'Smt. Laxmi Rajagopalan Endowment Scholarship Fund',
    detail: 'For any deserving student of High School.',
  },
  {
    term: 'Late S. Krishnan Iyer & Dharma Samvardhini Ammal Scholarship Fund',
    detail: 'To a deserving student.',
  },
  { term: 'Mrs. Chandramukhi Ammal Memorial Scholarship Fund', detail: 'To a deserving student.' },
  { term: 'Late Shri. N. Ganapathy Iyer Scholarship Fund', detail: 'To a deserving student.' },
  { term: 'Shri. R. S. L. Narasimhan Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Viju Vishwanathan Memorial Scholarship Fund',
    detail: 'To a deserving boy of Standard X.',
  },
  { term: 'Mrs. S. Parvathy Commemoration Scholarship Fund', detail: 'To a deserving student.' },
  { term: 'Shri. K. S. Anantharama Iyer Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Shri. H. S. Ramaswamy Memorial Scholarship and Smt. Leela Ramaswamy Memorial Scholarship Fund',
    detail: 'To be awarded to an economically backward and deserving boy and girl good in studies.',
  },
  {
    term: 'Shri. L. N. Bhandarkar Memorial Endowment Scholarship Fund',
    detail: 'To a deserving student.',
  },
  { term: 'Smt. Padmavathy Endowment Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Shri. N. Ramamurthy (Ex-president) Endowment Scholarship Fund',
    detail: 'To a deserving student.',
  },
  {
    term: 'Late Shri. V. Subramanian Endowment Scholarship Fund',
    detail: 'To financially weak and deserving children.',
  },
  {
    term: 'Late Shri. K. Kandaswamy Endowment Scholarship Fund (Tuition Fee)',
    detail: 'To financially weak and deserving girl students.',
  },
  {
    term: 'Shri. Ramakoti Memorial Scholarship Fund',
    detail: 'To a deserving student of any class.',
  },
  {
    term: 'Smt. Padmaswamy Endowment Scholarship Fund',
    detail:
      'To financially weak and deserving students of K.G. Section, one from Wadala and one from Matunga.',
  },
  {
    term: 'Shri. P. K. Sivasankaran Endowment Scholarship Fund',
    detail: 'To a deserving and economically weak student.',
  },
  { term: 'Mrs. K. Rajalakshmi Memorial Scholarship Fund', detail: 'To a deserving girl student.' },
  {
    term: 'Late Shri. N. S. Ramaswamy Scholarship Fund',
    detail: 'To a deserving student of the school.',
  },
  {
    term: 'Smt. T. Janaki Ammal Scholarship Fund',
    detail: 'To a deserving student from the Primary Section.',
  },
  {
    term: 'Shri. P. Gopalakrishnan Memorial Scholarship Fund',
    detail: 'To a deserving student of Standard X.',
  },
  {
    term: 'Mrs. K. Meenakshi Endowment Scholarship Fund',
    detail: 'To a deserving and financially weak student.',
  },
  { term: 'Late Shri. V. Krishnaswamy Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Shri. M. R. Radhakrishnan Memorial Scholarship Fund',
    detail: 'To a deserving student of the High School Section.',
  },
  { term: 'Smt. Lalitha Subramanian Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Shri. T. K. Narayanan Memorial Scholarship Fund',
    detail: 'To a deserving student of the school.',
  },
  {
    term: 'Mrs. Alamelu Ramaswamy Endowment Scholarship Fund',
    detail: 'To a deserving and needy student.',
  },
  { term: 'Late Shri. V. Venkataraman Scholarship Fund', detail: 'To a deserving student.' },
  { term: 'Smt. Gomathi Krishnan Memorial Scholarship Fund', detail: 'To a deserving student.' },
  { term: 'Shri. R. Rajagopalan Scholarship Fund', detail: 'To a deserving student.' },
  { term: 'Late Shri. P. Narayanan Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Smt. Saraswathi Narayanan Endowment Scholarship Fund',
    detail: 'To a deserving girl student.',
  },
  { term: 'Shri. K. Balakrishnan Memorial Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Mrs. P. Rukmini Scholarship Fund',
    detail: 'To a financially weak and deserving student.',
  },
  {
    term: 'Late Shri. V. Krishnamurthy Memorial Scholarship Fund',
    detail: 'To a deserving student.',
  },
  { term: 'Shri. R. Srinivasan Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Smt. Bhagirathi Srinivasan Endowment Scholarship Fund',
    detail: 'To a deserving student.',
  },
  {
    term: 'Late Shri. M. Ramachandran Scholarship Fund',
    detail: 'To a deserving and needy student.',
  },
  { term: 'Mrs. K. Vijayalakshmi Memorial Scholarship Fund', detail: 'To a deserving student.' },
  { term: 'Shri. K. Gopalakrishnan Endowment Scholarship Fund', detail: 'To a deserving student.' },
  {
    term: 'Shri. Rajalakshmi Rama Iyer Endowment Scholarship Fund',
    detail: 'To a deserving student of the school.',
  },
  {
    term: 'Shri. C.V. Ramaswamy Iyer Family Endowment Saradambal Scholarship Fund',
    detail: 'To be awarded to two students from Standards VII, VIII, IX & X.',
  },
  {
    term: 'Late Mrs. Meenakshi Swaminathan Scholarship Fund',
    detail: 'To the needy student from K.G. to Secondary.',
  },
  {
    term: 'Shri. V.A. Venugopal Endowment Scholarship Fund',
    detail: 'To a financially weak and deserving boy or girl of Standards I to X.',
  },
  {
    term: 'Late Shri. Raman Memorial Scholarship Fund',
    detail: 'May be awarded to any deserving student in the Institution.',
  },
  {
    term: 'Late Smt. Bhagavathi Manian Memorial Scholarship Fund',
    detail: 'To a financially weak and deserving student of SIWS High School.',
  },
  {
    term: 'Late Shri. S. Rajan Memorial Endowment Scholarship Fund',
    detail: 'To a deserving academically good boy of Class X.',
  },
  {
    term: 'Late Mr. Narayanaswami Endowment Scholarship Fund',
    detail: 'To a deserving student of Secondary School.',
  },
  {
    term: 'Late Mr. V. Parameshwaran Endowment Scholarship Fund',
    detail: 'To a deserving student of Secondary School.',
  },
  {
    term: 'Dr. K.M. Venkatesh & Family Endowment Fund',
    detail: 'To financially weak and deserving students of Standards VIII, IX & X.',
  },
  {
    /**
     * The source numbers this fund 73 and its purpose 74, as though the purpose
     * were a fund of its own. Rejoined here — publishing 74 alone would produce
     * an entry with a criterion and no fund name.
     */
    term: 'Late Raju Narayanan Endowment Scholarship Fund',
    detail:
      'The award is to be given to an economically backward student in Standard V, scoring a minimum of 60% in Standard IV and continuing studies up to Standard X (for the next six years).',
  },
  {
    term: 'Major Paramveer Parameshwaran Ramaswamy Scholarship',
    detail: 'For a financially weak and needy student.',
  },
  {
    term: 'Shri. S. Ramaswamy Endowment Scholarship Fund',
    detail: 'To meritorious needy school children.',
  },
  {
    term: 'Smt. Meenakshi & Shri. Kuppuswamy Trust Endowment Scholarship Fund',
    detail: 'To meritorious needy school children.',
  },
  {
    term: 'Shri. T.R. Iyengar & Late Smt. Alamelu R. Iyengar Scholarship Fund',
    detail:
      'For a financially weak student (boy or girl) who gets the highest marks in the S.S.C. Examination every year.',
  },
  {
    term: 'Mrs. & Mr. R. Subramanian Endowment Scholarship Fund',
    detail: 'To a deserving student.',
  },
  { term: 'Mrs. V.J. Lalitha Endowment Scholarship Fund', detail: 'Any deserving student.' },
  { term: 'Late V. Ramaswamy Endowment Scholarship Fund', detail: 'Any deserving student.' },
  {
    term: 'Mr. Veera Raghavan Endowment Scholarship Fund',
    detail: 'To the student of Class VII who scores 100% (full marks) in Mathematics.',
  },
  {
    term: 'Mr. Mohan Krishna Murthy Thangammal Endowment Scholarship',
    detail: 'In memory of his late mother, for a deserving girl studying in Standard VII.',
  },
  {
    term: 'Mr. Mohan Krishna Murthy Thangammal Endowment Scholarship',
    detail: 'In memory of his late father, for a deserving boy studying in Standard VII.',
  },

  /**
   * ADDED FROM THE MATUNGA DOCUMENT.
   *
   * SIWS's second requirement document lists a shorter register that mostly
   * overlaps the first, but contains these funds the Wadala document does not.
   * They are appended rather than merged into the numbering above so it stays
   * obvious which source each entry came from. All are need-based, so they sit
   * with the open scholarships.
   */
  {
    term: 'Shri. T.N. Venkatachalam Memorial Scholarship Fund',
    detail: 'To three financially weak and deserving students.',
  },
  {
    term: 'Smt. A. Rajammal Memorial Endowment Scholarship Fund',
    detail: 'To a financially weak and deserving student.',
  },
  {
    term: 'Mrs. Saraswathi Gangadharan Endowment Scholarship Fund',
    detail: 'To four financially weak and intelligent girl students studying in IV standard.',
  },
  {
    term: 'Late Mr. Stanley T. John Endowment Scholarship Fund',
    detail:
      'To three financially weak and deserving students from the K.G. Section, Wadala, and one financially weak and deserving student from the K.G. Section, Matunga.',
  },
  {
    term: 'Mrs. Bhagirathi Ammal Scholarship Fund',
    detail: 'To financially weak and deserving students.',
  },
  {
    term: 'Silver Jubilee Re-union of Students 1970 S.I.W.S. Scholarship Fund',
    detail: 'To a deserving student of the school.',
  },
  {
    term: 'Late Smt. Rajalakshmi Mani Memorial Scholarship Fund',
    detail: 'To a deserving student.',
  },
]

/** S.I.W.S. Arts, Fine Arts & Philosophical Centre. */
const ARTS: ListEntry[] = [
  {
    term: 'Mr. A.S. Varadarajan / Ms. N. Kamalam Endowment Scholarship Fund',
    detail: 'To be given to the best talented student of S.I.W.S. Schools.',
  },
  {
    term: 'Lakshmi Ammal Memorial Scholarship Fund',
    detail: 'To be awarded to any talented student, preferably in playing musical instruments.',
  },
  {
    term: 'Shri N.V. Nathan Memorial Scholarship Fund',
    detail: 'For the students of Arts, Fine Arts & Philosophical Centre.',
  },
]

const TOTAL = MERIT.length + OPEN.length + ARTS.length

const main = async () => {
  const payload = await getPayload({ config })

  const slug = 'scholarships'

  const layout = [
    {
      blockType: 'hero',
      eyebrow: 'SIWS Group of Institutions',
      title: 'Scholarships and endowment funds',
      accentWord: 'Scholarships',
      // Plain string: the hero's `intro` is a textarea, not rich text.
      intro: `SIWS administers ${TOTAL} scholarship and endowment funds, given by well-wishers of the institution over more than nine decades. Together they reach students from the Kindergarten and Nursery Section right through to the S.S.C. Examination.`,
    },
    {
      blockType: 'richText',
      heading: 'How our scholarships work',
      accentWord: 'scholarships',
      headingLevel: 'h2',
      width: 'narrow',
      background: 'white',
      content: richText([
        'Each fund below was endowed by a family, an ex-student, a staff member or a well-wisher, and carries the purpose its donor set — a subject, a standard, a particular achievement, or simply a deserving student in need.',
        'Merit scholarships recognise academic and co-curricular achievement. Open scholarships are awarded on need. Every year, students who achieve outstanding academic performance and demonstrate excellence in extracurricular activities are awarded merit scholarships, and their names are published in the school’s annual calendar in recognition of their achievement.',
        'Families do not need to apply fund by fund. If you would like to know which awards your child may be considered for, please speak to the school office.',
      ]),
    },
    {
      blockType: 'statistics',
      heading: 'The register at a glance',
      background: 'sea',
      stats: [
        { value: String(TOTAL), label: 'Scholarship and endowment funds' },
        { value: String(MERIT.length), label: 'Merit scholarships' },
        { value: String(OPEN.length), label: 'Open scholarships' },
        { value: String(ARTS.length), label: 'Arts, Fine Arts & Philosophical Centre' },
      ],
    },
    {
      blockType: 'accordion',
      heading: 'The full register of funds',
      accentWord: 'full register',
      headingLevel: 'h2',
      background: 'white',
      // Each group is long, so opening one must not close the one a parent has
      // just been reading — they are likely comparing across categories.
      allowMultipleOpen: true,
      items: [
        {
          question: `Merit scholarships (${MERIT.length} funds)`,
          answer: richTextNodes([
            para(
              'Awarded on academic or co-curricular achievement, in the terms set by each donor.',
            ),
            orderedList(MERIT),
          ]),
        },
        {
          question: `Open scholarships (${OPEN.length} funds)`,
          answer: richTextNodes([
            para('Awarded to deserving students, most often on financial need.'),
            orderedList(OPEN),
          ]),
        },
        {
          question: `S.I.W.S. Arts, Fine Arts & Philosophical Centre (${ARTS.length} funds)`,
          answer: richTextNodes([
            para('For talent in the arts, across the SIWS schools.'),
            orderedList(ARTS),
          ]),
        },
      ],
    },
    {
      blockType: 'callToAction',
      heading: 'Questions about a scholarship?',
      background: 'brand',
      text: richText([
        'The school office can tell you which awards apply to your child’s class and what is taken into account.',
      ]),
      links: [
        {
          link: {
            label: 'Contact the school office',
            type: 'external',
            url: 'mailto:info@siwsschool.edu.in',
            appearance: 'primary',
          },
        },
      ],
    },
  ]

  const page = {
    slug,
    title: 'Scholarships',
    intro: `${TOTAL} endowed scholarship funds, awarded across the SIWS Group of Institutions from Kindergarten to S.S.C.`,
    showInNav: true,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription: `SIWS administers ${TOTAL} scholarship and endowment funds — ${MERIT.length} merit, ${OPEN.length} open and ${ARTS.length} for the Arts, Fine Arts & Philosophical Centre — awarded from the Kindergarten Section through to the S.S.C. Examination.`,
    layout,
  }

  const existing = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: slug } }, { unit: { exists: false } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    await payload.update({
      collection: 'pages',
      id: existing.docs[0].id,
      data: page as never,
      overrideAccess: true,
    })
    payload.logger.info(`Updated page: ${page.title}`)
  } else {
    await payload.create({ collection: 'pages', data: page as never, overrideAccess: true })
    payload.logger.info(`Created page: ${page.title}`)
  }

  payload.logger.info(
    `Scholarships seeded — ${MERIT.length} merit, ${OPEN.length} open, ${ARTS.length} arts (${TOTAL} funds).`,
  )
  payload.logger.info(
    'NOTE: SIWS headed this section "Scholarship / fee concession schemes" but supplied no fee concession details. The page therefore makes no claim about fee concessions — ask SIWS for those separately.',
  )

  payload.logger.warn('TO CONFIRM WITH SIWS:')
  for (const question of OPEN_QUESTIONS) payload.logger.warn(`  • ${question}`)

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('Scholarship seed failed:', error)
  process.exit(1)
})
