// G9 Assignment Helper: Python workbook (static version for GitHub Pages)

// ---------- Python checker (Pyodide in a web worker) ----------
let worker = null;
let workerReady = null;
let jobId = 0;

function loadWorker() {
  if (workerReady) return workerReady;
  worker = new Worker('python-worker.js');
  const w = worker;
  workerReady = new Promise((resolve, reject) => {
    const timer = setTimeout(fail, 90000);
    function fail() {
      clearTimeout(timer);
      w.terminate();
      worker = null;
      workerReady = null;
      reject(new Error('Python could not load. Check your connection and try again. Your mark has not changed.'));
    }
    w.onerror = fail;
    w.addEventListener('message', function onReady(e) {
      if (e.data.ready) {
        clearTimeout(timer);
        w.removeEventListener('message', onReady);
        resolve();
      } else if (e.data.fatal) fail();
    });
  });
  return workerReady;
}

async function runPython(source, inputs) {
  await loadWorker();
  const w = worker;
  const id = ++jobId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      w.terminate();
      worker = null;
      workerReady = null;
      reject(new Error('Your code took too long. Keep calculations small and try again. Your mark has not changed.'));
    }, 8000);
    function onMessage(e) {
      if (e.data.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.results);
    }
    w.addEventListener('message', onMessage);
    w.postMessage({ id, source, inputs });
  });
}

// ---------- Questions ----------
const q = (id, title, prompt, steps, hints, inputs, expected, required, solution, points, firstLine) =>
  ({ id, title, prompt, steps, hints, inputs, expected, required, solution, points, firstLine });

// Part 1: one step-by-step warm-up question (3 marks)
const STARTER = [
  q(
    's1',
    'Book Club reading log',
    'The school library is starting a Book Club. Write a small program that welcomes students and updates their reading log.',
    [
      'Display exactly this welcome line: <code>Welcome to the Book Club!</code>',
      'Ask the student how many books they have read this month. Use <code>input()</code>.',
      'The answer from <code>input()</code> is text. Convert it to a whole number with <code>int()</code> and store it in a variable, such as <code>books</code>.',
      'The student reads 3 more books this week. Add 3 to <code>books</code>.',
      'Print the new total number of books.',
    ],
    [
      'Use print() with quotation marks for the welcome line. Remember: input() always gives you text.',
      'Put input() inside int(), store the result in books, then print books + 3.',
    ],
    [['5'], ['12']],
    (e) => Number(e[0]) + 3,
    ['print', 'input', 'int', '+'],
    `print("Welcome to the Book Club!")
books = int(input("How many books have you read this month? "))
print(books + 3)`,
    3,
    'Welcome to the Book Club!',
  ),
];

// Part 2: two step-by-step questions, chosen from the Part 1 score (3 + 4 marks)
function followUp(starterMarks) {
  const tier = starterMarks < 1.5 ? 0 : starterMarks < 3 ? 1 : 2;
  const tip = (text) => (tier === 0 ? ` ${text}` : '');

  if (tier === 2) {
    return [
      q(
        'f1',
        'Bookmark stall profit',
        'Your class sells handmade bookmarks at the school book fair. Each bookmark costs the class 0.25 KD to make. Work out the total profit.',
        [
          'Ask for the number of bookmarks sold. Convert it with <code>int()</code> and store it in a variable, such as <code>sold</code>.',
          'Ask for the selling price of one bookmark in KD. Prices can have decimals, so convert it with <code>float()</code> and store it, such as <code>price</code>.',
          'Work out the profit on one bookmark: the selling price minus the 0.25 KD cost.',
          'Multiply the profit on one bookmark by the number sold.',
          'Print the total profit.',
        ],
        [
          'Read two inputs in this order: int() for the number sold, then float() for the price.',
          'Brackets keep a calculation together: sold * (price - 0.25).',
        ],
        [['12', '0.75'], ['20', '1.5']],
        (e) => Number(e[0]) * (Number(e[1]) - 0.25),
        ['input', 'int', 'float', '-', '*', 'print'],
        `sold = int(input("Bookmarks sold? "))
price = float(input("Price of one bookmark? "))
profit = sold * (price - 0.25)
print(profit)`,
        3,
      ),
      q(
        'f2',
        'Share the book fair funds',
        'A parent donates 5 KD to the bookmark stall. The class adds the donation to the profit, then shares all the funds equally between 3 class libraries.',
        [
          'Read two inputs in this order: the whole-number number of bookmarks sold (<code>int()</code>), then the decimal selling price in KD (<code>float()</code>).',
          'Calculate the total profit. Each bookmark still costs 0.25 KD to make.',
          'Add the 5 KD donation to the total profit.',
          'Divide the funds equally between 3 class libraries.',
          'Print the amount for one library.',
        ],
        [
          'Break the task into small calculations stored in variables, such as profit and funds.',
          'Follow the order in the question: profit first, then + 5, then / 3.',
        ],
        [['12', '0.75'], ['20', '1.5']],
        (e) => (Number(e[0]) * (Number(e[1]) - 0.25) + 5) / 3,
        ['input', 'int', 'float', '-', '*', '+', '/', 'print'],
        `sold = int(input("Bookmarks sold? "))
price = float(input("Price of one bookmark? "))
profit = sold * (price - 0.25)
funds = profit + 5
print(funds / 3)`,
        4,
      ),
    ];
  }

  return [
    q(
      'f1',
      'Science trip snacks',
      'The Science Club is going on a trip and needs juice boxes. The club has a budget of 15 KD. Work out how much money is left after buying the juice.',
      [
        'Ask for the number of juice boxes. Convert it with <code>int()</code> and store it in a variable, such as <code>boxes</code>.',
        'Ask for the price of one juice box in KD. Prices can have decimals, so convert it with <code>float()</code> and store it, such as <code>price</code>.',
        'Work out the total cost of the juice: the number of boxes multiplied by the price.' + tip('Use <code>*</code>.'),
        'Subtract the cost from the 15 KD budget.' + tip('Use <code>-</code>.'),
        'Print the money left.',
      ],
      [
        'Read two inputs in this order: int() for the number of boxes, then float() for the price.',
        'Store the cost in a variable: cost = boxes * price. Then print 15 - cost.',
      ],
      [['6', '0.75'], ['10', '0.5']],
      (e) => 15 - Number(e[0]) * Number(e[1]),
      ['input', 'int', 'float', '*', '-', 'print'],
      `boxes = int(input("How many juice boxes? "))
price = float(input("Price of one box? "))
cost = boxes * price
print(15 - cost)`,
      3,
    ),
    q(
      'f2',
      'Share what is left',
      'The Science Club buys the juice boxes and also pays 3 KD for a bag of ice. Whatever is left from the 15 KD budget is shared equally between 3 groups for lunch.',
      [
        'Read two inputs in this order: the whole-number number of juice boxes (<code>int()</code>), then the decimal price of one box in KD (<code>float()</code>).',
        'Work out the cost of the juice: boxes multiplied by price.',
        'Add 3 KD for the ice to get the total spent.' + tip('Use <code>+</code>.'),
        'Subtract the total spent from the 15 KD budget to find what is left.',
        'Share what is left equally between 3 groups.' + tip('Use <code>/</code> to divide.'),
        'Print the amount for one group.',
      ],
      [
        'Break the task into small calculations stored in variables, such as spent and left.',
        'Follow the order in the question. Brackets can keep a calculation together: (15 - spent) / 3.',
      ],
      [['6', '0.75'], ['10', '0.5']],
      (e) => (15 - (Number(e[0]) * Number(e[1]) + 3)) / 3,
      ['input', 'int', 'float', '*', '+', '-', '/', 'print'],
      `boxes = int(input("How many juice boxes? "))
price = float(input("Price of one box? "))
spent = boxes * price + 3
left = 15 - spent
print(left / 3)`,
      4,
    ),
  ];
}

const STARTER_TOTAL = 3;
const FOLLOW_TOTAL = 7;

// ---------- Marking ----------
function grade(question, code, results) {
  const close = (a, b) => typeof a === 'number' && Number.isFinite(a) && Math.abs(a - b) < 1e-7;
  const outputOk = (r, expected) => {
    const lines = r.output.map((l) => l.trim()).filter(Boolean);
    if (question.firstLine && lines[0] !== question.firstLine) return false;
    if (question.firstLine && lines.length < 2) return false;
    const nums = (lines.at(-1) || '').match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g) || [];
    return nums.length === 1 && close(Number(nums[0]), expected);
  };
  const ranAll = results.length === question.inputs.length &&
    results.every((r, i) => !r.error && r.inputCount === question.inputs[i].length);
  const correct = ranAll && results.every((r, i) => outputOk(r, question.expected(question.inputs[i])));
  const first = results[0];
  const partial = !!first && !first.error &&
    question.required.filter((x) => first.calls.includes(x) || first.ops.includes(x)).length >=
      Math.ceil(question.required.length / 2);
  const points = question.points || 1;
  let feedback;
  if (correct) feedback = 'Correct. Your code produces the expected result for every test. Different valid solutions are welcome.';
  else if (first?.error) feedback = first.error;
  else if (question.firstLine && ranAll && results.some((r) => (r.output.map((l) => l.trim()).filter(Boolean)[0] || '') !== question.firstLine))
    feedback = `Not quite yet. Check step 1: the first line must be exactly "${question.firstLine}". You can correct your code and check again.`;
  else feedback = 'Not quite yet. Work through each step again: check your inputs and calculation, then print the requested result (a short label is fine). You can correct your code and check again.';
  return { id: question.id, title: question.title, marks: (correct ? 1 : partial ? 0.5 : 0) * points, points, correct, feedback, code };
}

const isSolved = (id, answers, attempts) => !!attempts[id]?.latest.correct && attempts[id].latest.code === (answers[id] || '');
const canOpen = (i, list, answers, attempts) => i >= 0 && i < list.length && list.slice(0, i).every((x) => isSolved(x.id, answers, attempts));

function recordAttempt(prev, result, hintsUsed) {
  return {
    first: prev?.first || result,
    latest: result,
    wrongCount: (prev?.wrongCount || 0) + (result.correct ? 0 : 1),
    revealed: !!prev?.revealed || (!result.correct && (hintsUsed >= 2 || (prev?.wrongCount || 0) + 1 >= 3)),
  };
}

function finalResult(attempt) {
  const r = attempt.latest;
  const pts = r.points || 1;
  return {
    ...r,
    marks: attempt.revealed ? Math.min(r.marks, pts / 2) : r.marks,
    feedback: r.feedback + (attempt.revealed ? ' A worked answer was shown: this question is capped at half marks.' : ''),
  };
}

function endedResults(list, answers, attempts) {
  return list.map((x) => attempts[x.id] ? finalResult(attempts[x.id]) : {
    id: x.id, title: x.title, marks: 0, points: x.points || 1, correct: false, code: answers[x.id] || '',
    feedback: answers[x.id]?.trim()
      ? 'This answer was not checked before the assignment ended. No marks awarded.'
      : 'Not attempted before the assignment ended. No marks awarded.',
  });
}

// ---------- State ----------
const STORE_KEY = 'g9-workbook-three-v1';
let S = {
  phase: 'welcome', name: '', className: '', index: 0,
  answers: {}, hints: {}, first: [], last: [], attempts: {},
  endedEarly: false, reflection: { learned: '', practice: '' },
};
let ui = { feedback: '', checking: false, confirmFinish: false, confirmEnd: false, dialog: null };
let checkRun = 0;

try {
  const saved = sessionStorage.getItem(STORE_KEY);
  if (saved) S = { ...S, ...JSON.parse(saved) };
} catch {}

function save() {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch {}
}

const sum = (list) => list.reduce((t, r) => t + r.marks, 0);
const starterScore = () => sum(S.first);
const followScore = () => sum(S.last);
const hintsUsed = () => Object.values(S.hints).reduce((t, n) => t + n, 0);
const currentList = () => (S.phase === 'starter' ? STARTER : followUp(starterScore()));

// ---------- Icons (lucide) ----------
const svg = (size, paths) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const icon = {
  arrow: (s) => svg(s, '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
  check: (s) => svg(s, '<path d="M20 6 9 17l-5-5"/>'),
  code: (s) => svg(s, '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>'),
  bulb: (s) => svg(s, '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>'),
  shield: (s) => svg(s, '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
};

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Views ----------
function welcomeView() {
  return `
  <div class="eyebrow">YOUR PYTHON WORKBOOK · 3 QUESTIONS</div>
  <h1>A little code.<br><em>A lot of possibility.</em></h1>
  <p class="intro">Assalamu alaikum! Put your Python skills into practice,<br class="desktop"> one small challenge at a time.</p>
  <div class="welcome-grid">
    <section class="card">
      <div class="card-heading">
        <span class="number">01</span>
        <div><h2>Make this workbook yours</h2><p>Enter your details to begin your assignment.</p></div>
      </div>
      <form data-form="start">
        <label>Your name<input required maxlength="70" name="name" value="${esc(S.name)}" placeholder="e.g. Ahmed Abdullah" autocomplete="name"></label>
        <label>Grade / class<input required maxlength="25" name="className" value="${esc(S.className)}" placeholder="e.g. 9B"></label>
        <button class="primary">Open my assignment ${icon.arrow(18)}</button>
      </form>
      <div class="privacy">${icon.shield(16)} Print or save your report at the end and share it with your teacher.</div>
    </section>
    <aside>
      <div class="journey">
        <h3>Your learning journey</h3>
        <div><span class="step active">1</span><p><b>Start with the basics</b><small>1 step-by-step question · 3 marks</small></p></div>
        <div><span class="step">2</span><p><b>Take your next challenge</b><small>2 questions selected for you · 7 marks</small></p></div>
        <div><span class="step">3</span><p><b>See how you did</b><small>Your feedback and score out of 10</small></p></div>
      </div>
      <div class="hint-note">${icon.bulb(22)}<p><b>A little help, when you need it.</b><br>You have 2 hints for the whole activity. Use them thoughtfully. Check and correct each answer before moving on.</p></div>
    </aside>
  </div>
  <div class="toolkit"><span>IN YOUR TOOLKIT</span>${['print()', 'input()', 'int()', 'float()', '+  −  *  /'].map((t) => `<code>${esc(t)}</code>`).join('')}</div>`;
}

function betweenView() {
  return `
  <section class="card">
    <div class="eyebrow">PART 1 COMPLETE</div>
    <h1>A good step forward, ${esc(S.name.split(' ')[0])}.</h1>
    <div class="report-score">${starterScore()}<small> / ${STARTER_TOTAL}</small></div>
    <p>Your next questions are ready. Each one is a fresh program. You have ${2 - hintsUsed()} hints remaining.</p>
    <div class="actions"><button class="primary" data-action="part2">Continue to part 2 ${icon.arrow(18)}</button></div>
  </section>`;
}

function reflectionView() {
  return `
  <section class="card reflection">
    <div class="eyebrow">PAUSE AND REFLECT</div>
    <h1>What did you learn?</h1>
    <p>Think about your Python work. Your reflection appears on your report and will not change your marks.</p>
    <label>One thing I learned or understand better<textarea maxlength="1200" rows="4" data-reflect="learned" placeholder="For example: I learned why input needs converting before arithmetic…">${esc(S.reflection.learned)}</textarea></label>
    <label>Something I want to practise next<textarea maxlength="1200" rows="4" data-reflect="practice" placeholder="What would help you feel more confident?">${esc(S.reflection.practice)}</textarea></label>
    <div class="actions">
      <button class="secondary" data-action="report">Skip reflection</button>
      <button class="primary" data-action="report">Save reflection and view report</button>
    </div>
  </section>`;
}

function reportView() {
  const a = starterScore(), b = followScore(), total = a + b;
  const message = total >= 8
    ? 'You applied the basics confidently. Keep practising clear, accurate calculations.'
    : total >= 5
      ? 'You have several skills in place. Review the questions below and practise the steps that need attention.'
      : 'Thank you for giving each question a try. Practise one small step at a time: reading input, converting it, and printing a result.';
  const R = S.reflection;
  return `
  <section class="card">
    <div class="eyebrow">YOUR ASSIGNMENT REPORT</div>
    ${S.endedEarly ? '<div class="feedback">You ended the activity early. Checked answers keep their earned marks. Unchecked and unanswered questions receive 0 marks.</div>' : ''}
    <div class="report-head">
      <div><h1>Thank you for working on<br>your workbook.</h1><p>${esc(S.name)} · Grade / class ${esc(S.className)}</p></div>
      <div class="report-score">${total}<small> / 10</small></div>
    </div>
    <div class="score-grid">
      <div><b>Starter assignment</b><p>${a} / ${STARTER_TOTAL} marks</p></div>
      <div><b>Follow-up assignment</b><p>${b} / ${FOLLOW_TOTAL} marks</p></div>
      <div><b>Hints used</b><p>${hintsUsed()} / 2</p></div>
    </div>
    <div class="feedback">${message}</div>
    <div class="actions no-print"><button class="primary" data-action="print">Print / save report</button></div>
    ${R.learned || R.practice ? `<div class="feedback"><h2>My reflection</h2><p><b>I learned:</b> ${esc(R.learned || 'Not answered')}</p><p><b>I will practise:</b> ${esc(R.practice || 'Not answered')}</p></div>` : ''}
    ${[...S.first, ...S.last].map((r, i) => `
      <div class="report-row">
        <h3>${i < STARTER.length ? 'Starter' : 'Follow-up'} · ${esc(r.title)} <span class="mark">${r.marks} / ${r.points || 1}</span></h3>
        <p>${esc(r.feedback)}</p>
        <details><summary>View your submitted work</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.code || 'No answer submitted.')}</pre></details>
      </div>`).join('')}
  </section>`;
}

function workspaceView() {
  const list = currentList();
  const i = Math.min(S.index, list.length - 1);
  const Q = list[i];
  const solved = isSolved(Q.id, S.answers, S.attempts);
  const allSolved = list.every((x) => isSolved(x.id, S.answers, S.attempts));
  const used = hintsUsed();
  const busy = ui.checking;
  const done = S.phase === 'starter' ? i : STARTER.length + i;
  const progress = (done / (STARTER.length + 2)) * 100;
  const pts = Q.points || 1;
  return `
  <div class="workspace-top">
    <div>
      <div class="eyebrow">${S.phase === 'starter' ? `PART 1 · ${STARTER_TOTAL} MARKS` : `PART 2 · ${FOLLOW_TOTAL} MARKS`}</div>
      <h1>${S.phase === 'starter' ? 'Start with the basics.' : 'Your next challenge.'}</h1>
      <p class="small">${esc(S.name)} · ${esc(S.className)}</p>
    </div>
    <span class="badge">${2 - used} hints remaining</span>
  </div>
  <div class="progress-track" role="progressbar" aria-label="Activity progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><div class="progress-indicator" style="width:${progress}%"></div></div>
  <div class="activity">
    <nav aria-label="Assignment questions">
      ${list.map((x, n) => `<button class="nav-question ${n === i ? 'selected' : ''}" data-action="goto" data-index="${n}" ${busy || (n > i && !canOpen(n, list, S.answers, S.attempts)) ? 'disabled' : ''}><span>Question ${n + 1}</span>${isSolved(x.id, S.answers, S.attempts) ? icon.check(15) : '<span>—</span>'}</button>`).join('')}
    </nav>
    <section class="card question">
      <div class="small">QUESTION ${i + 1} OF ${list.length} · ${pts} MARK${pts > 1 ? 'S' : ''}</div>
      <h2>${esc(Q.title)}</h2>
      <p class="prompt">${esc(Q.prompt)}</p>
      <p class="steps-label">FOLLOW THESE STEPS</p>
      <ol class="steps">${Q.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      <p class="small" style="margin-bottom:16px">Write a fresh program for this question. Use only print(), input(), int(), float(), variables and + − * /.</p>
      <label for="code" class="editor-head"><span>YOUR PYTHON CODE</span><span>answer.py</span></label>
      <textarea id="code" class="code-editor" spellcheck="false" autocapitalize="off" autocorrect="off" ${busy ? 'disabled' : ''} maxlength="6000" placeholder="# Write your code here">${esc(S.answers[Q.id] || '')}</textarea>
      <div class="actions">
        <button class="secondary" data-action="check" id="check-btn" ${busy || !(S.answers[Q.id] || '').trim() ? 'disabled' : ''}>${busy ? 'Checking…' : 'Check my answer'}</button>
        <button class="secondary" data-action="hint" ${busy || used >= 2 || (S.hints[Q.id] || 0) >= 2 ? 'disabled' : ''}>${icon.bulb(17)}Use a hint (${2 - used} left)</button>
      </div>
      ${Array.from({ length: S.hints[Q.id] || 0 }, (_, n) => `<div class="hint-revealed">Hint ${n + 1}: ${esc(Q.hints[n])}</div>`).join('')}
      ${S.attempts[Q.id]?.revealed ? `<div class="hint-revealed"><b>One correct solution</b><p>Read each line, then write a working answer in the editor and check it. Your solution can be different.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(Q.solution)}</pre><p>After a worked answer is shown, a correct solution earns half the marks for this question.</p></div>` : ''}
      ${ui.feedback ? `<div class="feedback" role="status" id="feedback">${esc(ui.feedback)}</div>` : ''}
      <div class="actions">
        <button class="secondary" data-action="goto" data-index="${i - 1}" ${busy || i === 0 ? 'disabled' : ''}>Previous</button>
        ${i < list.length - 1
          ? `<button class="primary" data-action="goto" data-index="${i + 1}" ${busy || !solved || !canOpen(i + 1, list, S.answers, S.attempts) ? 'disabled' : ''}>Next question ${icon.arrow(17)}</button>`
          : `<button class="primary" data-action="confirm-finish" ${busy || !allSolved ? 'disabled' : ''}>Finish assignment ${icon.arrow(17)}</button>`}
      </div>
      ${ui.confirmFinish ? `<div class="feedback" role="status">All answers are now correct. Finish this part and record your earned marks?<div class="actions"><button class="secondary" data-action="keep-editing">Keep editing</button><button class="primary" data-action="finish">Yes, finish this part</button></div></div>` : ''}
    </section>
  </div>
  <p class="small" style="margin-top:22px">Correct answers earn full marks unless a worked answer was shown; then the question is capped at half marks. Correct each answer to unlock the next question. Hints do not deduct marks. After both hints are used, an incorrect check reveals a worked answer. A worked answer also appears after three incorrect checks on a question.</p>`;
}

function endBar() {
  if (!['starter', 'followup', 'between'].includes(S.phase)) return '';
  return `<aside class="end-assignment no-print" aria-label="End activity">${ui.confirmEnd
    ? `<p><b>End the whole activity and reflect?</b><br>Checked answers keep their marks. Unchecked or unanswered questions receive 0, including any check still running. You cannot continue this attempt after ending.</p><div class="actions"><button class="secondary" data-action="end-cancel">Keep working</button><button class="primary" data-action="end-confirm">End and reflect</button></div>`
    : `<span>You can finish here at any time.</span><button class="secondary" data-action="end-ask">End assignment</button>`}</aside>`;
}

function dialogView() {
  const d = ui.dialog;
  if (!d) return '';
  return `<div class="dialog-overlay" data-action="close-dialog"><div class="dialog-content answer-feedback" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
    <h2 id="dlg-title" class="${d.correct ? 'correct-title' : 'retry-title'}">${d.correct ? 'Correct!' : 'Try again'}</h2>
    <p data-slot="dialog-description">${d.correct ? 'Your code gives the correct result. Well done!' : d.revealed ? 'Check your answer. A worked solution is ready below to help you.' : 'Check your answer, then make a change and try again.'}</p>
    <button class="primary" data-action="close-dialog" autofocus>${d.correct ? 'Continue' : 'Back to my code'}</button>
  </div></div>`;
}

function render() {
  let body;
  if (S.phase === 'welcome') body = welcomeView();
  else if (S.phase === 'between') body = betweenView();
  else if (S.phase === 'reflection') body = reflectionView();
  else if (S.phase === 'report') body = reportView();
  else body = workspaceView();
  document.getElementById('root').innerHTML = `
  <div class="shell">
    <header>
      <a class="brand" href="./"><span class="brand-icon">${icon.code(25)}</span><span>G9 <b>Assignment Helper</b></span></a>
    </header>
    <main>${body}</main>
    ${endBar()}
    <footer><span>Created by Mr. Kassem Freiji - ICT Department</span></footer>
  </div>${dialogView()}`;
  save();
  if (ui.dialog) document.querySelector('.dialog-content .primary')?.focus();
}

// ---------- Actions ----------
function goto(n) {
  const list = currentList();
  if (ui.checking || (n > S.index && !canOpen(n, list, S.answers, S.attempts)) || n < 0 || n >= list.length) return;
  S.index = n;
  ui.feedback = '';
  ui.confirmFinish = false;
  render();
}

async function check() {
  if (ui.checking) return;
  const list = currentList();
  const Q = list[S.index];
  const run = ++checkRun;
  ui.checking = true;
  ui.confirmFinish = false;
  ui.feedback = 'Checking your Python… The first check may take a moment.';
  render();
  try {
    const code = S.answers[Q.id] || '';
    const result = grade(Q, code, await runPython(code, Q.inputs));
    if (run !== checkRun) return;
    const attempt = recordAttempt(S.attempts[Q.id], result, hintsUsed());
    S.attempts = { ...S.attempts, [Q.id]: attempt };
    ui.dialog = { correct: result.correct, revealed: attempt.revealed };
    ui.feedback = result.feedback + (result.correct
      ? ' You can continue.'
      : attempt.revealed
        ? ' A worked answer is shown below. Type a correct solution and check it to continue.'
        : ' Correct your code, or use a hint, then check again.');
  } catch (err) {
    if (run !== checkRun) return;
    ui.feedback = err.message;
  } finally {
    if (run === checkRun) {
      ui.checking = false;
      render();
    }
  }
}

function useHint() {
  const used = hintsUsed();
  if (ui.checking || used >= 2) return;
  const Q = currentList()[S.index];
  S.hints = { ...S.hints, [Q.id]: (S.hints[Q.id] || 0) + 1 };
  const attempt = S.attempts[Q.id];
  if (used + 1 === 2 && attempt && !isSolved(Q.id, S.answers, S.attempts)) {
    S.attempts = { ...S.attempts, [Q.id]: { ...attempt, revealed: true } };
  }
  render();
}

function finishPart() {
  const list = currentList();
  if (ui.checking || !list.every((x) => isSolved(x.id, S.answers, S.attempts))) return;
  const results = list.map((x) => finalResult(S.attempts[x.id]));
  if (S.phase === 'starter') { S.first = results; S.phase = 'between'; }
  else { S.last = results; S.phase = 'reflection'; }
  S.index = 0;
  ui.feedback = '';
  ui.confirmFinish = false;
  render();
  window.scrollTo(0, 0);
}

function endEarly() {
  checkRun++;
  ui.checking = false;
  const first = S.phase === 'starter' ? endedResults(STARTER, S.answers, S.attempts) : S.first;
  S.first = first;
  S.last = endedResults(followUp(sum(first)), S.phase === 'starter' ? {} : S.answers, S.phase === 'starter' ? {} : S.attempts);
  S.endedEarly = true;
  S.phase = 'reflection';
  S.index = 0;
  ui = { ...ui, confirmEnd: false, confirmFinish: false, feedback: '' };
  render();
  window.scrollTo(0, 0);
}

document.addEventListener('submit', (e) => {
  if (e.target.dataset.form !== 'start') return;
  e.preventDefault();
  const f = new FormData(e.target);
  S.name = String(f.get('name')).trim();
  S.className = String(f.get('className')).trim();
  if (!S.name || !S.className) return;
  S.phase = 'starter';
  render();
  window.scrollTo(0, 0);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'code') {
    const Q = currentList()[S.index];
    S.answers = { ...S.answers, [Q.id]: t.value };
    ui.feedback = '';
    ui.confirmFinish = false;
    document.getElementById('feedback')?.remove();
    const btn = document.getElementById('check-btn');
    if (btn) btn.disabled = !t.value.trim();
    save();
  } else if (t.dataset.reflect) {
    S.reflection = { ...S.reflection, [t.dataset.reflect]: t.value };
    save();
  } else if (t.name === 'name' || t.name === 'className') {
    S[t.name] = t.value;
    save();
  }
});

// Tab key inserts four spaces in the code editor
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'code' && e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    const t = e.target;
    t.setRangeText('    ', t.selectionStart, t.selectionEnd, 'end');
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (e.key === 'Escape' && ui.dialog) { ui.dialog = null; render(); }
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'close-dialog') {
    if (el.classList.contains('dialog-overlay') && e.target !== el) return;
    ui.dialog = null;
    render();
  } else if (action === 'goto') goto(Number(el.dataset.index));
  else if (action === 'check') check();
  else if (action === 'hint') useHint();
  else if (action === 'confirm-finish') { ui.confirmFinish = true; render(); }
  else if (action === 'keep-editing') { ui.confirmFinish = false; render(); }
  else if (action === 'finish') finishPart();
  else if (action === 'part2') { S.phase = 'followup'; S.index = 0; ui.feedback = ''; render(); }
  else if (action === 'report') { S.phase = 'report'; render(); window.scrollTo(0, 0); }
  else if (action === 'print') window.print();
  else if (action === 'end-ask') { ui.confirmEnd = true; render(); }
  else if (action === 'end-cancel') { ui.confirmEnd = false; render(); }
  else if (action === 'end-confirm') endEarly();
});

render();
