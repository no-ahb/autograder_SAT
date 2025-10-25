export const PRIORITY_LEVELS = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority'
};

export const WORKSHEET_PRIORITY = {
  'english-101-sentence-structure': 'high',
  'english-102-punctuation': 'high',
  'english-103-bullet-points': 'high',
  'english-106-verbs': 'high',
  'english-110-main-idea': 'high',
  'english-111-hypothesis': 'high',
  'english-112-completes-the-text': 'high',
  'math-203-polynomials': 'high',
  'math-204-lines': 'high',
  'math-205-parabolas-quadratics': 'high',
  'math-207-functions': 'high',
  'english-104-reading-analysis-specific-task': 'medium',
  'english-105-quote': 'medium',
  'english-107-pronouns-apostrophe-noun-number': 'medium',
  'english-109-misplaced-modifiers': 'medium',
  'english-115-transitions': 'medium',
  'math-202-algebra': 'medium',
  'math-208-percentages': 'medium',
  'math-209-conics': 'medium',
  'math-214-absolute-value-and-inequalities': 'medium',
  'math-215-plug-numbers-plug-and-scaling': 'medium',
  'math-217-exponential-equations': 'medium',
  'english-108-apostrophes': 'low',
  'english-114-fill-in-blank': 'low',
  'math-201-ratios': 'low',
  'math-206-exponents': 'low',
  'math-210-trigonometry': 'low',
  'math-211-geometry': 'low',
  'math-212-statistics': 'low',
  'math-213-data-collection': 'low',
  'math-216-probability-charts': 'low',
  'math-218-word-problems': 'low',
  'math-220-challenge-1': 'low',
  'math-221-challenge-2': 'low',
  'math-222-sat-challenge-3-scoretracker-version': 'low'
};

export const BLUEBOOK_TESTS = [
  { id: 'BB04', label: 'Bluebook 04' },
  { id: 'BB05', label: 'Bluebook 05' },
  { id: 'BB06', label: 'Bluebook 06' },
  { id: 'BB07', label: 'Bluebook 07' },
  { id: 'BB08', label: 'Bluebook 08' },
  { id: 'BB09', label: 'Bluebook 09' },
  { id: 'BB10', label: 'Bluebook 10' }
];

export const COURSE_GUIDELINES = [
  {
    title: 'Digital SAT Course Outline - 20 Hours (Over 7 Sessions)',
    paragraphs: [
      'Important Notes',
      'This course plan is structured for 20 hours across 7 sessions; however, use logical flexibility to adapt it to the course you are teaching.',
      'Structure is provided here; however, there is room for you to decide when to teach topics and for how long. After the first two lessons you choose the topics. You know what is in the best interest of your students, so feel empowered to make decisions that reflect the class needs and interests.',
      'Solicit student input about what their needs are. Share the agenda for the day, explain the rationale, and ask the class what they would like to add, remove, or prioritize.',
      'Make clear what the agenda and objectives are for each lesson and why the chosen agenda moves everyone closer to their goal score.'
    ],
    mustHaves: [
      'Full Digital SAT Test as the first homework assignment and a second full test later in the course.',
      'Students must watch the videos and input work in Scoretracker.',
      'The class is about relationships and shared effort.'
    ],
    priorityNotes: [
      'High Priority: 101 Sentence Structure, 102 Punctuation, 103 Bullet Points, 106 Verbs, 110 Main Idea, 111 Hypothesis, 112 Completes the Text, 203 Polynomials, 204 Lines, 205 Quadratics or Parabolas, 207 Functions.',
      'Medium Priority: 104 Specific Task Reading, 105 Quotes, 107 Pronouns, 109 Modifiers, 115 Transitions, 202 Algebra, 208 Percentages, 209 Conics, 214 Absolute Value and Inequalities, 215 Plug, 217 Exponentials.',
      'Low Priority: 108 Apostrophes, 114 Vocabulary, 201 Ratios, 206 Exponents, 210 Trigonometry, 211 Geometry, 212 Statistics, 213 Data Collection, 215 Probability Charts, 218 Word Problems, 220-222 Math Challenge packets.'
    ],
    sessions: [
      {
        heading: 'Lesson 1',
        items: [
          'Session 1a - Verbal: Intro to SAT and students\' goals; 101 Sentence Structure and 102 Punctuation. Homework: Digital SAT Practice Test #1.',
          'Session 1b - Math: 204 Lines and 207 Functions. Homework: Digital SAT Practice Test #1.'
        ]
      },
      {
        heading: 'Lesson 2',
        items: [
          'Session 2a - Verbal: Review Test #1 verbal mistakes; teach 106 Verbs, 107 Pronouns, 108 Apostrophes, 109 Modifiers. Homework: choose two grammar packets (from 101, 102, 106-109).',
          'Session 2b - Math: Review Test #1 math; cover Algebra 202, Polynomials 203, Parabolas 205, Percentages 208. Homework: one relevant math packet.'
        ]
      },
      {
        heading: 'Lesson 3',
        items: [
          'Session 3a - Verbal: Review packets; teach Specific Task, Main Idea, or Vocabulary. Homework: finish two packets and upload to Scoretracker.',
          'Session 3b - Math: Review homework; continue 201-208. Homework: one packet relevant to student needs.'
        ]
      },
      {
        heading: 'Lesson 4',
        items: [
          'Session 4a - Verbal: Review and continue Specific Task (103-105), Main Idea (110-113), Vocabulary (114-115). Homework: one long or two shorter packets.',
          'Session 4b - Math: Cover 209-212 (Conics, Trigonometry, Geometry, Statistics). Homework: one or two relevant packets.'
        ]
      },
      {
        heading: 'Lesson 5',
        items: ['Repeat the structure of Lesson 4 for both verbal and math.']
      },
      {
        heading: 'Lesson 6',
        items: [
          'Session 6a - Verbal: Continue remaining verbal topics. Homework: Digital SAT Practice Test #2.',
          'Session 6b - Math: Continue 209-216 topics. Homework: Digital SAT Practice Test #2.'
        ]
      },
      {
        heading: 'Lesson 7',
        items: [
          'Session 7a - Verbal: Review Test #2, final review, and a game. Homework: continue using Scoretracker.',
          'Session 7b - Math: Review, math game, final Q&A. Homework: continue using Scoretracker.'
        ]
      }
    ]
  },
  {
    title: 'Content Worksheets Light',
    paragraphs: [
      'Purpose: list the most difficult or key indicator problems from each worksheet.',
      'Use for students who are already comfortable with a concept to learn nuanced applications, test ability on the hardest problems, and validate mastery. Use when time is limited.',
      'Do not use with students who lack foundational proficiency.'
    ],
    worksheetHighlights: [
      '101 Sentence Structure - 2-4; 7-12; 18-21; 25-28; 31-40; 43-62',
      '102 Punctuation - 6-11; 13; 17; 19-21; 31-36; 43-47; 56-68',
      '103 Bullet Points - 5; 7; 9-11; 13-17; 23-25; 33-41',
      '104 Reading Analysis (Specific Task) - entire packet (1-19)',
      '105 Quotes - entire packet (1-13)',
      '106 Verbs - 1-6; 12-13; 17-21; 25-28; 32; 40; 47-59',
      '107 Pronouns - odd problems only',
      '108 Apostrophes - entire packet (1-18)',
      '109 Modifiers - 3-8; 12-17; 21-27',
      '110 Main Idea - 2; 7; 10-13; 16-19; 25-33; 39-53',
      '111 Hypothesis - 4-6; 10; 12-16; 18-19; 21-23; 25-29; 37-44',
      '112 Completes the Text - 2; 4-7; 10-12; 19-20; 32-34',
      '113 Poems - entire packet (1-10)',
      '114 Fill-in-the-Blank (Vocabulary) - 5-8; 13-20; 24-29; 34-39',
      '115 Transitions - entire packet (1-38)',
      '201 Ratios - 22-29; 39-49; 50-57',
      '202 Algebra - 32-46; 60-68',
      '203 Polynomials - 18-22; 34-43; 48-73',
      '204 Lines - 13-15; 27-41; 50; 57-68; 74-86',
      '205 Quadratics - 17-32',
      '206 Exponents - 11-35',
      '207 Functions - 16-30; 36-40; 50-68',
      '208 Percentages - 9-19; 39-61',
      '209 Conics - 5-17; 20-29',
      '210 Trigonometry - 5-12; 17-26',
      '211 Geometry - 17-33; 40-48; 58-72',
      '212 Statistics - 16-22; 25-36; 38-54',
      '213 Data Collection and Analysis - 5-7; 15-20; 21-28',
      '214 Absolute Value and Inequalities - 1-10; 27-45',
      '215 Plug and Scaling Equations - 3; 6; 21-33; 82-88',
      '216 Probability Charts - 19-21; 27-32; 40-51; 54-57',
      '217 Exponentials - 16-43',
      '218 Word Problems - entire packet (1-19)'
    ]
  }
];
