/**
 * All English UI text. Keep the same keys as vi.js.
 * {name} style placeholders are variables: t('key', { name: value }).
 */
const en = {
  app: {
    title: 'AIVES - AI-powered viva exams',
  },

  common: {
    home: 'Home',
    login: 'Log in',
    register: 'Sign up',
    logout: 'Log out',
    cancel: 'Cancel',
    close: 'Close',
    retry: 'Try again',
  },

  language: {
    label: 'Language',
    vi: 'Vietnamese',
    en: 'English',
  },

  roles: {
    ADMIN: 'Administrator',
    LECTURER: 'Lecturer',
    STUDENT: 'Student',
  },

  brand: {
    logoLabel: 'AIVES - back to home',
    mascotAlt: 'AIVES robot mascot',
  },

  nav: {
    main: 'Main navigation',
    features: 'Features',
    process: 'How it works',
    grading: 'Grading',
    manageAccounts: 'Manage accounts',
    profileOf: "{name}'s profile",
  },

  field: {
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },

  validation: {
    fullNameRequired: 'Enter your full name.',
    emailRequired: 'Enter your email.',
    emailInvalid: 'That email does not look right. Example: name@fpt.edu.vn',
    passwordRequired: 'Enter your password.',
    passwordMin: 'Password needs at least {min} characters.',
    confirmRequired: 'Enter the password again.',
    confirmMismatch: 'The two passwords do not match.',
    currentPasswordRequired: 'Enter your current password.',
    newPasswordMin: 'New password needs at least {min} characters.',
    newPasswordSame: 'New password must be different from the current one.',
    confirmNewRequired: 'Enter the new password again.',
  },

  // Backend errors, looked up by ErrorCode. Codes not listed here show the backend message.
  errors: {
    NETWORK_ERROR: 'Cannot reach the server. Check that the backend is running on port 8080.',
    SERVER_UNAVAILABLE: 'The server is not responding. Check that the backend is running on port 8080.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
    VALIDATION_ERROR: 'Some of the submitted data is invalid.',
    BAD_REQUEST: 'Invalid request.',
    INVALID_CREDENTIALS: 'Incorrect email or password.',
    ACCOUNT_DISABLED: 'This account has been disabled. Contact an administrator.',
    UNAUTHENTICATED: 'Your session has expired. Please log in again.',
    ACCESS_DENIED: 'You do not have permission to do this.',
    EMAIL_ALREADY_EXISTS: 'This email is already in use.',
    STUDENT_CODE_ALREADY_EXISTS: 'This student ID is already in use.',
    WRONG_CURRENT_PASSWORD: 'Current password is incorrect.',
    CANNOT_DELETE_SELF: 'You cannot delete the account you are logged in with.',
    CANNOT_DISABLE_SELF: 'You cannot disable the account you are logged in with.',
    USER_NOT_FOUND: 'User not found.',
    NOT_FOUND: 'Resource not found.',
    DATA_CONFLICT: 'The data is duplicated or breaks a constraint.',
    INTERNAL_ERROR: 'System error. Please try again later.',
  },

  home: {
    badges: ['AI follow-up questions', 'Rubric-based grading', 'Spoken answers'],
    title: 'Smart viva exams, powered by AI',
    subtitle:
      'AI asks the questions, follows up on each student answer and suggests a score against the rubric. The lecturer always makes the final call.',
    ctaStart: 'GET STARTED',
    ctaHaveAccount: 'I already have an account',
    greeting: 'Hello, {name}',
    facts: [
      { value: '3 roles', lines: ['Students, lecturers', 'and administrators'] },
      { value: 'Vietnamese', lines: ['AI reads the question,', 'students answer out loud'] },
      { value: '100%', lines: ['Final scores', 'set by the lecturer'] },
    ],

    featuresBadge: 'KEY FEATURES',
    featuresTitle: 'A complete viva exam, from question writing to final scores',
    featuresIntro:
      'AIVES helps lecturers with the most time-consuming parts: asking questions, probing deeper and grading against a rubric.',
    prevCard: 'Previous card',
    nextCard: 'Next card',
    features: [
      {
        title: 'Spoken viva',
        description: 'AI reads the question, the student answers out loud and the answer is transcribed automatically.',
        tag: '01 / Voice',
      },
      {
        title: 'Question bank',
        description: 'Lecturers write questions per lesson and topic, and attach a grading rubric to each one.',
        tag: '02 / Questions',
      },
      {
        title: 'Adaptive follow-ups',
        description: 'AI reads the answer and asks again when it is incomplete, unclear or contradictory.',
        tag: '03 / Follow-up',
      },
      {
        title: 'Rubric score suggestions',
        description: 'AI checks the answer against each criterion and proposes a score with comments and quotes.',
        tag: '04 / Rubric',
      },
      {
        title: 'Lecturer approval',
        description: 'Lecturers review the exchange, adjust scores if needed, then publish the result.',
        tag: '05 / Approval',
      },
      {
        title: 'Results and appeals',
        description: 'Students see the score for each question, read the feedback and appeal if they disagree.',
        tag: '06 / Results',
      },
    ],

    stepsBadge: 'A SIMPLE PROCESS',
    stepsTitle: 'A viva exam in just 3 steps',
    stepsIntro: 'Runs in the browser. All you need is a microphone.',
    stepLabel: 'Step {number}',
    steps: [
      {
        title: 'Write questions and rubrics',
        description:
          'The lecturer creates questions per lesson, attaches a rubric with criteria and scores, then picks questions for the exam.',
        note: 'For lecturers',
      },
      {
        title: 'Enter the room, answer the AI',
        description:
          'The student turns on the microphone and answers each question. AI listens, follows up when needed, then moves on.',
        note: 'For students',
      },
      {
        title: 'Get your score after review',
        description:
          'AI suggests a score per criterion. The lecturer reviews it, sets the official score and the student sees the result.',
        note: 'Transparent and traceable',
      },
    ],
    stepsCta: 'Create a student account',

    gradingBadge: 'RUBRIC-BASED GRADING',
    gradingTitle: 'Clear scores for every criterion',
    gradingIntro:
      "Each answer is graded against the lecturer's criteria. AI proposes a score with quotes from what the student said, and the lecturer reviews it before it is final.",
    gradingCriteria: ['Subject knowledge', 'Responsiveness', 'Critical thinking', 'Clarity and structure'],
    gradingSampleNote: 'Sample figures for illustration only.',
    sampleExam: 'Sample exam',
    sampleScore: 'Score: {score}',
    sampleChartLabel: 'Sample chart of scores across 4 criteria',
    sampleDuration: 'Duration: 14 minutes',
    sampleQuestions: 'Questions: 5',
  },

  auth: {
    panelBadge: 'Smart AI viva',
    panelTitleLine1: 'Ace your',
    panelTitleHighlight: 'viva exam',
    panelTitleLine3: 'with AIVES',
    panelIntro: 'Answer out loud and let AI dig deeper into what you said, just like a real exam panel.',
    chipFollowUpTitle: 'Adaptive follow-ups',
    chipFollowUpText: 'Based on your answer',
    chipVoiceTitle: 'Spoken Q&A',
    chipVoiceText: 'Listen, then answer out loud',
    forRoles: 'For',
  },

  login: {
    title: 'Log in',
    intro: 'Welcome back to AIVES. One login for students, lecturers and administrators.',
    email: 'Email',
    emailPlaceholder: 'name@fpt.edu.vn',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    submit: 'Log in',
    submitting: 'Logging in...',
    registered: 'Account created.',
    registeredStudentCode: 'Your student ID is {code}.',
    registeredNext: 'Log in with your new account.',
    passwordChanged: 'Password changed. Log in again with your new password.',
    noAccount: 'No student account yet?',
    registerNow: 'Sign up',
    lecturerNote: 'Lecturer accounts are created by an administrator.',
  },

  register: {
    panelBadge: 'Viva exams with AI',
    panelTitle: 'Get started with',
    panelIntro: 'Create a student account to enter the viva exam room and see your results.',
    highlights: [
      {
        title: '1-on-1 viva with AI',
        description: 'Listen to the question, answer out loud and get follow-ups based on your own answer.',
      },
      {
        title: 'Questions that follow the lessons',
        description: 'Exams are written by your lecturer for each lesson and topic of the course.',
      },
      {
        title: 'Scores for every criterion',
        description: 'See scores and feedback for each question, and appeal if you disagree with the result.',
      },
    ],
    badge: 'For students',
    title: 'Create a student account',
    intro: 'Fill in the details below to start taking viva exams with AI.',
    fullName: 'Full name',
    fullNamePlaceholder: 'Nguyen Van An',
    email: 'Email',
    emailPlaceholder: 'name@fpt.edu.vn',
    emailHint: 'You will log in with this email. Your student ID is assigned automatically.',
    password: 'Password',
    passwordPlaceholder: 'At least {min} characters',
    confirmPassword: 'Confirm password',
    confirmPlaceholder: 'Enter the password again',
    submit: 'Create account',
    submitting: 'Creating account...',
    haveAccount: 'Already have an account?',
    loginNow: 'Log in',
  },

  admin: {
    badge: 'Administrator',
    title: 'Manage accounts',
    intro: 'View all users, create accounts and disable accounts when needed.',
    createButton: 'Create account',
    closeNotice: 'Dismiss message',

    statTotal: 'Total accounts',
    statLecturers: 'Lecturers',
    statStudents: 'Students',
    statDisabled: 'Disabled',

    filterLabel: 'Filter by role',
    tabAll: 'All',
    searchLabel: 'Search accounts',
    searchPlaceholder: 'Search by name, email, account ID or student ID',

    loading: 'Loading accounts...',
    empty: 'No accounts match the filter.',
    showing: 'Showing {shown} of {total} accounts.',

    colUser: 'User',
    colId: 'Account ID',
    colRole: 'Role',
    colStudentCode: 'Student ID',
    colStatus: 'Status',
    colCreatedAt: 'Created',
    colActions: 'Actions',
    you: '(you)',
    statusActive: 'Active',
    statusDisabled: 'Disabled',

    disableAction: 'Disable account {name}',
    enableAction: 'Re-enable account {name}',
    deleteAction: 'Delete account {name}',
    disableTooltip: 'Disable',
    enableTooltip: 'Re-enable',
    deleteTooltip: 'Delete account',
    selfDisableTooltip: 'You cannot disable the account you are logged in with',
    selfDeleteTooltip: 'You cannot delete the account you are logged in with',

    createTitle: 'Create a new account',
    roleLegend: 'Role',
    studentHint: 'The student ID is assigned automatically.',
    lecturerHint: 'Lecturers can only be created here.',
    fullName: 'Full name',
    fullNamePlaceholder: 'Nguyen Van An',
    email: 'Email',
    initialPassword: 'Initial password',
    passwordPlaceholder: 'At least {min} characters',
    passwordHint: 'Users can change their password on their profile page.',
    createSubmit: 'Create account',
    creating: 'Creating...',

    disableTitle: 'Disable this account?',
    disableMessage:
      '{name} ({email}) will no longer be able to log in and will be signed out of any active session. You can re-enable the account at any time.',
    disableConfirm: 'Disable',
    disabling: 'Disabling...',

    deleteTitle: 'Delete this account?',
    deleteMessage: '{name} ({email}) will be deleted and cannot be restored.',
    deleteKeep: 'Keep account',
    deleteConfirm: 'Delete account',
    deleting: 'Deleting...',

    noticeStudentCreated: 'Student account created for {name}. Student ID: {code}.',
    noticeLecturerCreated: 'Lecturer account created for {name}. Account ID: {id}.',
    noticeDisabled: 'Account {name} disabled.',
    noticeEnabled: 'Account {name} re-enabled.',
    noticeDeleted: 'Account {name} deleted.',
  },

  profile: {
    title: 'My profile',
    intro: 'View your account details, change your name and password.',
    email: 'Email',
    accountId: 'Account ID',
    studentCode: 'Student ID',
    createdAt: 'Created',

    infoTitle: 'Personal details',
    infoIntro: 'Email and account ID cannot be changed. You can only edit your name.',
    fullName: 'Full name',
    save: 'Save changes',
    saving: 'Saving...',
    saved: 'Profile updated.',

    passwordTitle: 'Change password',
    passwordIntro: 'After changing your password you will be logged out and need to log in again with the new one.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    newPasswordPlaceholder: 'At least {min} characters',
    confirmPassword: 'Confirm new password',
    changePassword: 'Change password',
    changing: 'Changing...',
  },
}

export default en
