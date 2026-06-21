// ================================================================
// SikafroLoan Ghana — app.js
// ================================================================

let currentPage = 'landing';
let currentStep = 1;
const totalSteps = 6;
let pieChart = null;
let currentLoanId = null;
let notificationsOpen = false;
let pendingRegData = null;
let generatedOTP = null;
let niaVerified = false;
let pendingDisburseLoanId = null;
const ghanaCardFiles = { front: null, back: null };

// ===== SEED DATA =====
const SEED_USER = {
  id: 'u1', firstName: 'Kofi', lastName: 'Mensah',
  email: 'demo@sikafroloan.com.gh', password: 'demo1234',
  phone: '0244000000', address: 'Osu, Accra, Greater Accra Region',
  creditScore: 720, joinDate: '2024-01-15',
  referralCode: 'SKF-KOFI7890',
  referrals: [
    { name: 'Ama Boateng', date: '2024-03-10', status: 'successful' },
    { name: 'Yaw Darko', date: '2024-04-22', status: 'pending' }
  ],
  referralEarnings: 50,
  paymentAccounts: [
    { id: 'pa1', type: 'momo', provider: 'MTN Mobile Money', number: '0244000000', name: 'Kofi Mensah' }
  ]
};

const SEED_LOANS = [
  { id: 'L001', type: 'personal', amount: 10000, tenure: 24, rate: 24, status: 'disbursed', purpose: 'Business capital / trading stock', appliedDate: '2024-02-01', outstanding: 7200, emi: 470, disbursementMethod: 'MTN Mobile Money', disbursementAccount: '0244000000', guarantors: [{ name: 'Ama Boateng', phone: '0200000000', relation: 'Sibling' }, { name: 'Kwame Osei', phone: '0270000000', relation: 'Friend' }] },
  { id: 'L002', type: 'car', amount: 25000, tenure: 60, rate: 20, status: 'approved', purpose: 'Vehicle purchase', appliedDate: '2024-05-10', outstanding: 25000, emi: 663, disbursementMethod: null, guarantors: [{ name: 'Kwesi Amponsah', phone: '0550000000', relation: 'Employer' }, { name: 'Abena Frimpong', phone: '0240000001', relation: 'Colleague' }] },
  { id: 'L003', type: 'education', amount: 5000, tenure: 12, rate: 16, status: 'closed', purpose: 'School fees', appliedDate: '2023-08-01', outstanding: 0, emi: 0, disbursementMethod: 'Vodafone Cash', guarantors: [] },
  { id: 'L004', type: 'home', amount: 80000, tenure: 120, rate: 18, status: 'pending', purpose: 'House rent', appliedDate: '2024-06-01', outstanding: 80000, emi: 1440, guarantors: [{ name: 'Akua Mensah', phone: '0270000000', relation: 'Spouse' }, { name: 'Kofi Asante', phone: '0244000002', relation: 'Parent' }] }
];

const SEED_TRANSACTIONS = [
  { id: 'T001', loanId: 'L001', type: 'payment', amount: 470, date: '2024-06-01', method: 'MTN Mobile Money' },
  { id: 'T002', loanId: 'L001', type: 'payment', amount: 470, date: '2024-05-01', method: 'MTN Mobile Money' },
  { id: 'T003', loanId: 'L002', type: 'disbursement', amount: 25000, date: '2024-05-15', method: 'Bank Transfer' },
  { id: 'T004', loanId: 'L001', type: 'payment', amount: 470, date: '2024-04-01', method: 'Vodafone Cash' }
];

const SEED_NOTIFICATIONS = [
  { id: 'n1', message: 'Your Car Loan (L002) has been approved. Please select a disbursement method.', time: '2 hours ago' },
  { id: 'n2', message: 'Monthly payment of GHS 470 due on 1st July for Loan L001.', time: '1 day ago' },
  { id: 'n3', message: 'Your Home Loan (L004) application is under review.', time: '3 days ago' }
];

// ===== INIT =====
function init() {
  loadTheme();
  seedData();
  const session = sessionStorage.getItem('sfl_user') || localStorage.getItem('sfl_user');
  if (session) { navigate('dashboard'); } else { navigate('landing'); }
}

function seedData() {
  if (!localStorage.getItem('sfl_seeded')) {
    localStorage.setItem('sfl_users', JSON.stringify([SEED_USER]));
    localStorage.setItem('sfl_loans_u1', JSON.stringify(SEED_LOANS));
    localStorage.setItem('sfl_transactions_u1', JSON.stringify(SEED_TRANSACTIONS));
    localStorage.setItem('sfl_notifications', JSON.stringify(SEED_NOTIFICATIONS));
    localStorage.setItem('sfl_seeded', '1');
  }
}

// ===== NAVIGATION =====
function navigate(page) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  document.getElementById('app-shell').classList.add('hidden');

  const protected_ = ['dashboard','calculator','apply','myloans','payments','eligibility','referral','profile','support'];

  if (protected_.includes(page)) {
    const user = getUser();
    if (!user) { navigate('login'); return; }
    document.getElementById('app-shell').classList.remove('hidden');
    document.querySelectorAll('.inner-page').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
    const titles = { dashboard:'Dashboard', calculator:'Calculator', apply:'Apply for Loan', myloans:'My Loans', payments:'Payments', eligibility:'Eligibility', referral:'Refer & Earn', profile:'Profile', support:'Support' };
    document.getElementById('topbar-title').textContent = titles[page] || '';
    updateUserUI(user);
    if (page === 'dashboard') loadDashboard();
    if (page === 'myloans') loadMyLoans('all');
    if (page === 'payments') loadPayments();
    if (page === 'calculator') calculateEMI();
    if (page === 'profile') loadProfile();
    if (page === 'referral') loadReferral();
    loadNotifications();
    closeSidebarOnMobile();
  } else if (page === 'landing') {
    document.getElementById('page-landing').classList.remove('hidden');
  } else if (page === 'calculator-public') {
    document.getElementById('page-calculator-public').classList.remove('hidden');
    calcPublic();
  } else {
    const el = document.getElementById('page-' + page);
    if (el) el.classList.remove('hidden');
  }
  currentPage = page;
  window.scrollTo(0, 0);
}

function scrollTo_(id) {
  const el = document.querySelector(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleLandingMenu() {
  document.getElementById('landing-mobile-menu').classList.toggle('hidden');
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('open');
}

// ===== AUTH =====
function getUser() {
  const raw = sessionStorage.getItem('sfl_user') || localStorage.getItem('sfl_user');
  return raw ? JSON.parse(raw) : null;
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('remember-me').checked;
  if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }
  const users = JSON.parse(localStorage.getItem('sfl_users') || '[]');
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) { showToast('Invalid email or password', 'error'); return; }
  const session = JSON.stringify(user);
  sessionStorage.setItem('sfl_user', session);
  if (remember) localStorage.setItem('sfl_user', session);
  showToast('Welcome back, ' + user.firstName + '!', 'success');
  navigate('dashboard');
}

function handleRegister() {
  const firstName = document.getElementById('reg-firstname').value.trim();
  const lastName = document.getElementById('reg-lastname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const referralCode = document.getElementById('reg-referral').value.trim();

  if (!firstName || !lastName || !email || !phone || !password) { showToast('Please fill in all fields', 'error'); return; }
  if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
  const cleanPhone = phone.replace(/\s/g, '');
  if (!/^\d{9,10}$/.test(cleanPhone)) { showToast('Enter a valid Ghana phone number', 'error'); return; }

  const users = JSON.parse(localStorage.getItem('sfl_users') || '[]');
  if (users.find(u => u.email === email)) { showToast('Email already registered', 'error'); return; }

  let referredBy = null;
  if (referralCode) {
    const referrer = users.find(u => u.referralCode === referralCode.toUpperCase());
    if (referrer) { referredBy = referrer.id; showToast('Referral code applied!', 'success'); }
    else { showToast('Invalid referral code — continuing without it', 'warning'); }
  }

  pendingRegData = { firstName, lastName, email, phone: cleanPhone, password, referredBy };
  generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
  document.getElementById('otp-phone-display').textContent = '+233 ' + cleanPhone;
  document.getElementById('otp-demo-code').textContent = generatedOTP;
  [0,1,2,3].forEach(i => document.getElementById('otp-' + i).value = '');
  showToast('Code sent to +233 ' + cleanPhone, 'success');
  navigate('otp');
  setTimeout(() => document.getElementById('otp-0').focus(), 300);
}

function otpInput(index) {
  const val = document.getElementById('otp-' + index).value;
  if (val && index < 3) document.getElementById('otp-' + (index + 1)).focus();
}

function otpKeydown(e, index) {
  if (e.key === 'Backspace' && !document.getElementById('otp-' + index).value && index > 0)
    document.getElementById('otp-' + (index - 1)).focus();
}

function verifyOTP() {
  const entered = [0,1,2,3].map(i => document.getElementById('otp-' + i).value).join('');
  if (entered.length < 4) { showToast('Enter the 4-digit code', 'error'); return; }
  if (entered !== generatedOTP) { showToast('Incorrect code. Try again.', 'error'); return; }

  const users = JSON.parse(localStorage.getItem('sfl_users') || '[]');
  const code = 'SKF-' + pendingRegData.firstName.toUpperCase().slice(0,4) + Math.floor(1000 + Math.random() * 9000);
  const newUser = {
    id: 'u' + Date.now(), ...pendingRegData,
    address: '', creditScore: 680,
    joinDate: new Date().toISOString().split('T')[0],
    referralCode: code, referrals: [], referralEarnings: 0, paymentAccounts: []
  };

  if (newUser.referredBy) {
    const refIdx = users.findIndex(u => u.id === newUser.referredBy);
    if (refIdx !== -1) {
      if (!users[refIdx].referrals) users[refIdx].referrals = [];
      users[refIdx].referrals.push({ name: newUser.firstName + ' ' + newUser.lastName, date: newUser.joinDate, status: 'pending' });
    }
  }

  users.push(newUser);
  localStorage.setItem('sfl_users', JSON.stringify(users));
  localStorage.setItem('sfl_loans_' + newUser.id, JSON.stringify([]));
  localStorage.setItem('sfl_transactions_' + newUser.id, JSON.stringify([]));
  sessionStorage.setItem('sfl_user', JSON.stringify(newUser));
  pendingRegData = null; generatedOTP = null;
  showToast('Account verified! Welcome, ' + newUser.firstName + '!', 'success');
  navigate('dashboard');
}

function resendOTP() {
  if (!pendingRegData) { navigate('register'); return; }
  generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
  document.getElementById('otp-demo-code').textContent = generatedOTP;
  [0,1,2,3].forEach(i => document.getElementById('otp-' + i).value = '');
  document.getElementById('otp-0').focus();
  showToast('New code sent to +233 ' + pendingRegData.phone, 'info');
}

function handleForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { showToast('Please enter your email', 'error'); return; }
  showToast('Reset link sent to ' + email, 'success');
  setTimeout(() => navigate('login'), 1500);
}

function handleLogout() {
  sessionStorage.removeItem('sfl_user');
  localStorage.removeItem('sfl_user');
  showToast('Signed out successfully', 'info');
  navigate('landing');
}

// ===== USER UI =====
function updateUserUI(user) {
  const initial = (user.firstName || 'U')[0].toUpperCase();
  document.getElementById('topbar-avatar').textContent = initial;
  document.getElementById('topbar-name').textContent = user.firstName;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const el = document.getElementById('dash-greeting');
  if (el) el.textContent = greeting + ', ' + user.firstName;
}

// ===== DASHBOARD =====
function loadDashboard() {
  const user = getUser();
  const loans = getUserLoans();
  const transactions = getUserTransactions();
  const totalBorrowed = loans.reduce((s, l) => s + l.amount, 0);
  const outstanding = loans.filter(l => l.status !== 'closed' && l.status !== 'rejected').reduce((s, l) => s + l.outstanding, 0);
  const activeLoans = loans.filter(l => l.status === 'disbursed' || l.status === 'approved');
  const nextEMI = activeLoans.length > 0 ? activeLoans[0].emi : 0;

  document.getElementById('stat-borrowed').textContent = fmt(totalBorrowed);
  document.getElementById('stat-outstanding').textContent = fmt(outstanding);
  document.getElementById('stat-emi').textContent = fmt(nextEMI);
  document.getElementById('stat-emi-date').textContent = activeLoans.length > 0 ? 'Due on 1st of month' : 'No active loans';
  document.getElementById('stat-credit').textContent = user.creditScore || 720;

  const score = user.creditScore || 720;
  const lbl = document.getElementById('stat-credit-label');
  if (score >= 750) { lbl.textContent = 'Excellent'; lbl.style.color = '#16a34a'; }
  else if (score >= 700) { lbl.textContent = 'Good'; lbl.style.color = '#22c55e'; }
  else if (score >= 650) { lbl.textContent = 'Fair'; lbl.style.color = '#f59e0b'; }
  else { lbl.textContent = 'Poor'; lbl.style.color = '#ef4444'; }

  const active = loans.filter(l => l.status !== 'closed' && l.status !== 'rejected');
  document.getElementById('dash-loans-list').innerHTML = active.length === 0
    ? '<p class="muted" style="padding:16px;text-align:center;font-size:13px">No active loans. <button class="link-btn" onclick="navigate(\'apply\')">Apply now</button></p>'
    : active.map(l => `<div class="dash-loan-item"><div><p class="bold" style="font-size:13px">${capitalize(l.type)} Loan — ${l.id}</p><p class="muted" style="font-size:12px">${fmt(l.outstanding)} outstanding</p></div><span class="badge badge-${l.status}">${l.status}</span></div>`).join('');

  document.getElementById('dash-transactions').innerHTML = transactions.slice(0, 5).map(t =>
    `<div class="tx-item"><div><p style="font-size:13px;font-weight:600;color:var(--bold)">${capitalize(t.type)}</p><p class="muted" style="font-size:12px">${t.loanId} · ${t.date}</p></div><span class="${t.type === 'disbursement' ? 'pay-amount-pos' : 'pay-amount-neg'}">${t.type === 'disbursement' ? '+' : '-'}${fmt(t.amount)}</span></div>`
  ).join('');
}

// ===== CALCULATOR =====
function calculateEMI() {
  const P = parseFloat(document.getElementById('calc-amount').value) || 0;
  const n = parseInt(document.getElementById('calc-tenure').value) || 1;
  const annualRate = parseFloat(document.getElementById('calc-rate').value) || 0;
  const r = annualRate / 100 / 12;
  const emi = r === 0 ? P / n : (P * r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
  const total = emi * n;
  const totalInterest = total - P;

  document.getElementById('res-emi').textContent = fmt(emi);
  document.getElementById('res-interest').textContent = fmt(totalInterest);
  document.getElementById('res-total').textContent = fmt(total);
  document.getElementById('res-principal').textContent = fmt(P);

  const ctx = document.getElementById('emi-pie-chart').getContext('2d');
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['Principal', 'Interest'], datasets: [{ data: [P, totalInterest], backgroundColor: ['#000000', '#dfdfdf'], borderWidth: 0 }] },
    options: { plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', weight: '600' }, color: '#8e8e8e' } } }, cutout: '65%' }
  });

  let balance = P;
  const tbody = document.getElementById('amort-body');
  tbody.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    const intPart = balance * r;
    const prinPart = emi - intPart;
    balance = Math.max(0, balance - prinPart);
    tbody.innerHTML += `<tr><td>${i}</td><td>${fmt(emi)}</td><td>${fmt(prinPart)}</td><td>${fmt(intPart)}</td><td>${fmt(balance)}</td></tr>`;
  }
}

function calcPublic() {
  const P = parseFloat(document.getElementById('pub-calc-amount').value) || 0;
  const n = parseInt(document.getElementById('pub-calc-tenure').value) || 1;
  const rate = parseFloat(document.getElementById('pub-calc-type').value) || 24;
  const r = rate / 100 / 12;
  const emi = r === 0 ? P / n : (P * r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
  const total = emi * n;
  document.getElementById('pub-res-emi').textContent = fmt(emi);
  document.getElementById('pub-res-interest').textContent = fmt(total - P);
  document.getElementById('pub-res-total').textContent = fmt(total);
  document.getElementById('pub-res-principal').textContent = fmt(P);
}

function syncRange(inputId, rangeId, callback) {
  const input = document.getElementById(inputId);
  const range = document.getElementById(rangeId);
  if (!input || !range) return;
  input.addEventListener('input', () => { range.value = input.value; if (callback) callback(); });
  range.addEventListener('input', () => { input.value = range.value; if (callback) callback(); });
}

function setupCalcType() {
  const rates = { personal: 24, home: 18, car: 20, education: 16, business: 28 };
  const el = document.getElementById('calc-type');
  if (el) el.addEventListener('change', function () {
    const r = rates[this.value] || 24;
    document.getElementById('calc-rate').value = r;
    document.getElementById('calc-rate-range').value = r;
    calculateEMI();
  });
}

// ===== MULTI-STEP FORM =====
function nextStep() {
  if (!validateStep(currentStep)) return;
  if (currentStep === totalSteps) { submitApplication(); return; }
  markStepDone(currentStep);
  currentStep++;
  showStep(currentStep);
}

function prevStep() {
  if (currentStep <= 1) return;
  currentStep--;
  showStep(currentStep);
}

function showStep(step) {
  for (let i = 1; i <= totalSteps; i++) document.getElementById('step-' + i).classList.toggle('hidden', i !== step);
  document.querySelectorAll('.progress-step').forEach(el => el.classList.toggle('active', parseInt(el.dataset.step) === step));
  document.getElementById('btn-prev').style.display = step > 1 ? 'inline-flex' : 'none';
  document.getElementById('btn-next').textContent = step === totalSteps ? 'Submit Application' : 'Next';
  if (step === totalSteps) buildReview();
}

function markStepDone(step) {
  const el = document.querySelector(`.progress-step[data-step="${step}"]`);
  if (el) { el.classList.add('done'); el.classList.remove('active'); }
}

function validateStep(step) {
  if (step === 1) {
    const fname = document.getElementById('app-fname').value.trim();
    const lname = document.getElementById('app-lname').value.trim();
    const phone = document.getElementById('app-phone').value.trim();
    if (!fname || !lname || !phone) { showToast('Please fill in required personal details', 'error'); return false; }
    const ghId = document.getElementById('app-id').value.trim();
    if (ghId && !/^GHA-\d{9}-\d$/.test(ghId)) { showToast('Ghana Card format: GHA-000000000-0', 'error'); return false; }
  }
  if (step === 2) {
    const type = document.getElementById('app-loan-type').value;
    const amount = parseFloat(document.getElementById('app-amount').value);
    const tenure = parseInt(document.getElementById('app-tenure').value);
    const disbursement = document.getElementById('app-disbursement').value;
    if (!type || !amount || !tenure) { showToast('Please fill in all loan details', 'error'); return false; }
    if (amount < 500) { showToast('Minimum loan amount is GHS 500', 'error'); return false; }
    if (!disbursement) { showToast('Please select a disbursement method', 'error'); return false; }
  }
  if (step === 3) {
    const income = parseFloat(document.getElementById('app-income').value);
    if (!income || income <= 0) { showToast('Please enter your monthly income', 'error'); return false; }
  }
  if (step === 4) {
    const g1name = document.getElementById('guar1-fname').value.trim();
    const g1phone = document.getElementById('guar1-phone').value.trim();
    const g1rel = document.getElementById('guar1-relation').value;
    const g2name = document.getElementById('guar2-fname').value.trim();
    const g2phone = document.getElementById('guar2-phone').value.trim();
    const g2rel = document.getElementById('guar2-relation').value;
    if (!g1name || !g1phone || !g1rel) { showToast('Please complete Guarantor 1 details', 'error'); return false; }
    if (!g2name || !g2phone || !g2rel) { showToast('Please complete Guarantor 2 details', 'error'); return false; }
    if (g1phone.replace(/\s/g,'') === g2phone.replace(/\s/g,'')) { showToast('Guarantors must have different phone numbers', 'error'); return false; }
  }
  if (step === 5) {
    if (!ghanaCardFiles.front || !ghanaCardFiles.back) { showToast('Please upload both sides of your Ghana Card', 'error'); return false; }
    if (!niaVerified) { showToast('Please complete NIA verification before proceeding', 'error'); return false; }
  }
  if (step === 6) {
    if (!document.getElementById('app-agree').checked) { showToast('Please agree to the Terms & Conditions', 'error'); return false; }
  }
  return true;
}

function buildReview() {
  const disbMethod = document.getElementById('app-disbursement');
  const disbText = disbMethod ? disbMethod.options[disbMethod.selectedIndex]?.text : 'N/A';
  document.getElementById('review-content').innerHTML = `
    <div class="review-block"><h4>Personal Details</h4>
      <p><strong>Name:</strong> ${document.getElementById('app-fname').value} ${document.getElementById('app-lname').value}</p>
      <p><strong>Phone:</strong> +233 ${document.getElementById('app-phone').value}</p>
      <p><strong>Address:</strong> ${document.getElementById('app-address').value || 'Not provided'}</p>
      <p><strong>Ghana Card No:</strong> ${document.getElementById('app-id').value || 'Not provided'}</p>
    </div>
    <div class="review-block"><h4>Loan Details</h4>
      <p><strong>Type:</strong> ${capitalize(document.getElementById('app-loan-type').value)} Loan</p>
      <p><strong>Amount:</strong> ${fmt(document.getElementById('app-amount').value)}</p>
      <p><strong>Tenure:</strong> ${document.getElementById('app-tenure').value} months</p>
      <p><strong>Purpose:</strong> ${document.getElementById('app-purpose').value || 'Not provided'}</p>
      <p><strong>Disbursement:</strong> ${disbText}</p>
    </div>
    <div class="review-block"><h4>Income & Employment</h4>
      <p><strong>Status:</strong> ${document.getElementById('app-employment').value || 'Not provided'}</p>
      <p><strong>Employer:</strong> ${document.getElementById('app-employer').value || 'Not provided'}</p>
      <p><strong>Monthly Income:</strong> ${fmt(document.getElementById('app-income').value)}</p>
    </div>
    <div class="review-block"><h4>Guarantors</h4>
      <p><strong>Guarantor 1:</strong> ${document.getElementById('guar1-fname').value} · +233 ${document.getElementById('guar1-phone').value} · ${document.getElementById('guar1-relation').value}</p>
      <p style="margin-top:6px"><strong>Guarantor 2:</strong> ${document.getElementById('guar2-fname').value} · +233 ${document.getElementById('guar2-phone').value} · ${document.getElementById('guar2-relation').value}</p>
    </div>
    <div class="review-block"><h4>Ghana Card Verification</h4>
      <p style="color:var(--success);font-weight:600">Verified with NIA database</p>
    </div>`;
}

function submitApplication() {
  if (!validateStep(6)) return;
  const loanRates = { personal: 24, home: 18, car: 20, education: 16, business: 28, emergency: 30 };
  const type = document.getElementById('app-loan-type').value;
  const amount = parseFloat(document.getElementById('app-amount').value);
  const tenure = parseInt(document.getElementById('app-tenure').value);
  const rate = loanRates[type] || 24;
  const r = rate / 100 / 12;
  const emi = r === 0 ? amount / tenure : (amount * r * Math.pow(1+r,tenure)) / (Math.pow(1+r,tenure)-1);
  const disbMethod = document.getElementById('app-disbursement');

  const newLoan = {
    id: 'L' + Date.now().toString().slice(-6),
    type, amount, tenure, rate, status: 'pending',
    purpose: document.getElementById('app-purpose').value,
    appliedDate: new Date().toISOString().split('T')[0],
    outstanding: amount, emi: Math.round(emi * 100) / 100,
    disbursementMethod: disbMethod ? disbMethod.options[disbMethod.selectedIndex]?.text : null,
    disbursementAccount: document.getElementById('app-disbursement-detail')?.value || null,
    niaVerified: true,
    guarantors: [
      { name: document.getElementById('guar1-fname').value, phone: document.getElementById('guar1-phone').value, relation: document.getElementById('guar1-relation').value },
      { name: document.getElementById('guar2-fname').value, phone: document.getElementById('guar2-phone').value, relation: document.getElementById('guar2-relation').value }
    ]
  };

  const loans = getUserLoans();
  loans.unshift(newLoan);
  saveUserLoans(loans);
  showToast('Application submitted! ID: ' + newLoan.id, 'success');
  resetApplyForm();
  navigate('myloans');
}

function resetApplyForm() {
  currentStep = 1; niaVerified = false;
  ghanaCardFiles.front = null; ghanaCardFiles.back = null;
  showStep(1);
  document.querySelectorAll('.progress-step').forEach(el => el.classList.remove('done', 'active'));
  document.querySelector('.progress-step[data-step="1"]').classList.add('active');
  const statusEl = document.getElementById('ghana-card-status');
  if (statusEl) { statusEl.className = 'ghana-card-status'; statusEl.innerHTML = ''; }
  const niaEl = document.getElementById('nia-verify-status');
  if (niaEl) { niaEl.className = 'nia-status hidden'; niaEl.innerHTML = ''; }
  const verifyBtn = document.getElementById('verify-btn-wrap');
  if (verifyBtn) verifyBtn.classList.add('hidden');
  ['slot-front','slot-back'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('uploaded'); });
  ['preview-front-wrap','preview-back-wrap'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  ['upload-area-front','upload-area-back'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; });
}

function setupDisbursementToggle() {
  const select = document.getElementById('app-disbursement');
  if (!select) return;
  select.addEventListener('change', function () {
    const wrap = document.getElementById('disbursement-detail-wrap');
    const label = document.getElementById('disbursement-detail-label');
    if (this.value === 'mtn' || this.value === 'vodafone' || this.value === 'airteltigo') {
      wrap.classList.remove('hidden'); label.textContent = 'MoMo Number (+233)';
    } else if (this.value === 'bank') {
      wrap.classList.remove('hidden'); label.textContent = 'Bank Account Number';
    } else { wrap.classList.add('hidden'); }
  });
}

// ===== CONTACT PICKER =====
async function pickContact(guarantorNumber) {
  if ('contacts' in navigator && 'ContactsManager' in window) {
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const name = contact.name && contact.name[0] ? contact.name[0] : '';
        let phone = contact.tel && contact.tel[0] ? contact.tel[0] : '';
        phone = phone.replace(/\s+/g, '').replace(/^\+233/, '0').replace(/^233/, '0');
        const phoneForInput = phone.replace(/^0/, '');
        document.getElementById('guar' + guarantorNumber + '-fname').value = name;
        document.getElementById('guar' + guarantorNumber + '-phone').value = phoneForInput;
        showToast('Contact filled for Guarantor ' + guarantorNumber, 'success');
      }
    } catch (err) {
      showToast('Contact access was cancelled or denied', 'warning');
    }
  } else {
    showToast('Contact picker not supported on this browser — please type the details manually', 'info');
  }
}

// ===== MY LOANS =====
function loadMyLoans(filter) {
  const loans = getUserLoans();
  const filtered = filter === 'all' ? loans : loans.filter(l => l.status === filter);
  document.getElementById('loans-list').innerHTML = filtered.length === 0
    ? `<div class="card" style="padding:30px;text-align:center"><p class="muted">No loans found</p><button class="btn-primary" style="margin-top:12px" onclick="navigate('apply')">Apply for Loan</button></div>`
    : filtered.map(l => `
      <div class="card loan-card">
        <div class="loan-type-icon">
          <div class="icon-wrapper">${loanIcon(l.type)}</div>
          <div class="loan-meta"><strong>${capitalize(l.type)} Loan</strong><p>${l.id} · Applied ${l.appliedDate}</p></div>
        </div>
        <div style="text-align:center"><p class="muted" style="font-size:12px">Amount</p><p class="bold">${fmt(l.amount)}</p></div>
        <div style="text-align:center"><p class="muted" style="font-size:12px">Outstanding</p><p class="bold">${fmt(l.outstanding)}</p></div>
        <div style="text-align:center"><p class="muted" style="font-size:12px">Monthly</p><p class="bold">${fmt(l.emi)}</p></div>
        <div class="loan-actions">
          <span class="badge badge-${l.status}">${l.status}</span>
          ${l.status === 'approved' && !l.disbursementMethod ? `<button class="btn-primary" onclick="openDisbursementModal('${l.id}')">Receive Funds</button>` : ''}
          <button class="btn-secondary" onclick="openLoanModal('${l.id}')">Details</button>
        </div>
      </div>`).join('');

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
    btn.onclick = () => loadMyLoans(btn.dataset.filter);
  });
}

function loanIcon(type) {
  const icons = {
    personal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    car: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    education: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    business: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
    emergency: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>'
  };
  return icons[type] || icons.personal;
}

// ===== LOAN MODAL =====
function openLoanModal(loanId) {
  const loan = getUserLoans().find(l => l.id === loanId);
  if (!loan) return;
  currentLoanId = loanId;
  const totalInterest = (loan.emi * loan.tenure) - loan.amount;
  const guarantors = loan.guarantors || [];
  document.getElementById('modal-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div class="review-block"><h4>Loan Type</h4><p class="bold">${capitalize(loan.type)} Loan</p></div>
      <div class="review-block"><h4>Loan ID</h4><p class="bold">${loan.id}</p></div>
      <div class="review-block"><h4>Principal</h4><p class="bold">${fmt(loan.amount)}</p></div>
      <div class="review-block"><h4>Interest Rate</h4><p class="bold">${loan.rate}% p.a.</p></div>
      <div class="review-block"><h4>Tenure</h4><p class="bold">${loan.tenure} months</p></div>
      <div class="review-block"><h4>Monthly Payment</h4><p class="bold">${fmt(loan.emi)}</p></div>
      <div class="review-block"><h4>Total Interest</h4><p class="bold">${fmt(totalInterest)}</p></div>
      <div class="review-block"><h4>Outstanding</h4><p class="bold">${fmt(loan.outstanding)}</p></div>
      <div class="review-block"><h4>Status</h4><span class="badge badge-${loan.status}">${loan.status}</span></div>
      <div class="review-block"><h4>Applied</h4><p class="bold">${loan.appliedDate}</p></div>
    </div>
    ${loan.disbursementMethod ? `<div class="review-block" style="margin-bottom:14px"><h4>Disbursement</h4><p><strong>Method:</strong> ${loan.disbursementMethod}</p>${loan.disbursementAccount ? `<p><strong>Account:</strong> ${loan.disbursementAccount}</p>` : ''}</div>` : ''}
    ${guarantors.length > 0 ? `<div class="review-block"><h4>Guarantors</h4>${guarantors.map((g, i) => `<p style="margin-bottom:4px"><strong>Guarantor ${i+1}:</strong> ${g.name} · +233 ${g.phone} · ${g.relation}</p>`).join('')}</div>` : ''}`;
  document.getElementById('loan-modal').classList.remove('hidden');
}

function closeLoanModal() { document.getElementById('loan-modal').classList.add('hidden'); currentLoanId = null; }

// ===== DISBURSEMENT MODAL =====
function openDisbursementModal(loanId) {
  pendingDisburseLoanId = loanId;
  document.getElementById('disburse-method').value = '';
  document.getElementById('disburse-detail-wrap').classList.add('hidden');
  document.getElementById('disburse-modal').classList.remove('hidden');
}

function closeDisbursementModal() { document.getElementById('disburse-modal').classList.add('hidden'); pendingDisburseLoanId = null; }

function renderDisbursementDetail() {
  const method = document.getElementById('disburse-method').value;
  const wrap = document.getElementById('disburse-detail-wrap');
  const label = document.getElementById('disburse-detail-label');
  if (method === 'branch') { wrap.classList.add('hidden'); }
  else {
    wrap.classList.remove('hidden');
    if (['mtn','vodafone','airteltigo'].includes(method)) label.textContent = 'MoMo Number (+233)';
    else if (method === 'bank') label.textContent = 'Bank Account Number';
  }
}

function confirmDisbursement() {
  if (!pendingDisburseLoanId) return;
  const methodEl = document.getElementById('disburse-method');
  const method = methodEl.value;
  const methodText = methodEl.options[methodEl.selectedIndex]?.text;
  const detail = document.getElementById('disburse-detail').value.trim();
  const name = document.getElementById('disburse-name').value.trim();
  if (!method) { showToast('Please select a disbursement method', 'error'); return; }
  if (method !== 'branch' && !detail) { showToast('Please enter your account / MoMo number', 'error'); return; }

  const loans = getUserLoans();
  const idx = loans.findIndex(l => l.id === pendingDisburseLoanId);
  if (idx === -1) return;
  loans[idx].disbursementMethod = methodText;
  loans[idx].disbursementAccount = detail;
  loans[idx].disbursementName = name;
  loans[idx].status = 'disbursed';
  saveUserLoans(loans);

  const txs = getUserTransactions();
  txs.unshift({ id: 'T' + Date.now(), loanId: pendingDisburseLoanId, type: 'disbursement', amount: loans[idx].amount, date: new Date().toISOString().split('T')[0], method: methodText });
  saveUserTransactions(txs);
  closeDisbursementModal();
  showToast('Funds disbursed via ' + methodText + '!', 'success');
  loadMyLoans('all');
}

// ===== PAYMENTS =====
function loadPayments() {
  const loans = getUserLoans().filter(l => l.status === 'disbursed' || l.status === 'approved');
  const select = document.getElementById('pay-loan-select');
  select.innerHTML = loans.length === 0 ? '<option value="">No active loans</option>'
    : loans.map(l => `<option value="${l.id}">${l.id} — ${capitalize(l.type)} (${fmt(l.emi)}/mo)</option>`).join('');
  const transactions = getUserTransactions();
  document.getElementById('payment-history').innerHTML = transactions.length === 0
    ? '<p class="muted" style="padding:16px;text-align:center">No payments yet</p>'
    : transactions.map(t => `<div class="pay-item"><div><p style="font-weight:600;color:var(--bold);font-size:13px">${capitalize(t.type)} · ${t.loanId}</p><p class="muted" style="font-size:12px">${t.date} · ${t.method}</p></div><span class="${t.type === 'disbursement' ? 'pay-amount-pos' : 'pay-amount-neg'}">${t.type === 'disbursement' ? '+' : '-'}${fmt(t.amount)}</span></div>`).join('');
}

function makePayment() {
  const loanId = document.getElementById('pay-loan-select').value;
  const amount = parseFloat(document.getElementById('pay-amount').value);
  const method = document.getElementById('pay-method').value;
  if (!loanId) { showToast('Please select a loan', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Please enter a valid amount', 'error'); return; }
  const loans = getUserLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return;
  if (amount > loan.outstanding) { showToast('Amount exceeds outstanding balance', 'error'); return; }
  loan.outstanding = Math.max(0, loan.outstanding - amount);
  if (loan.outstanding === 0) loan.status = 'closed';
  const user = getUser();
  const txs = getUserTransactions();
  txs.unshift({ id: 'T' + Date.now(), loanId, type: 'payment', amount, date: new Date().toISOString().split('T')[0], method });
  const users = JSON.parse(localStorage.getItem('sfl_users') || '[]');
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx].creditScore = Math.min(850, (users[idx].creditScore || 720) + 2);
    localStorage.setItem('sfl_users', JSON.stringify(users));
    sessionStorage.setItem('sfl_user', JSON.stringify(users[idx]));
    if (localStorage.getItem('sfl_user')) localStorage.setItem('sfl_user', JSON.stringify(users[idx]));
  }
  saveUserLoans(loans); saveUserTransactions(txs);
  showToast('Payment of ' + fmt(amount) + ' confirmed!', 'success');
  document.getElementById('pay-amount').value = '';
  loadPayments();
}

// ===== ELIGIBILITY =====
function checkEligibility() {
  const income = parseFloat(document.getElementById('elig-income').value) || 0;
  const expenses = parseFloat(document.getElementById('elig-expenses').value) || 0;
  const existing = parseFloat(document.getElementById('elig-existing').value) || 0;
  const credit = parseInt(document.getElementById('elig-credit').value) || 0;
  const desired = parseFloat(document.getElementById('elig-desired').value) || 0;
  if (!income || !desired) { showToast('Please fill in required fields', 'error'); return; }
  const disposable = income - expenses - existing;
  const dti = ((expenses + existing) / income) * 100;
  const maxLoan = (disposable * 0.5) * 24;
  const eligible = credit >= 620 && dti < 50 && desired <= maxLoan;
  const score = Math.min(100, Math.round(
    (credit >= 750 ? 40 : credit >= 700 ? 30 : credit >= 650 ? 20 : 10) +
    (dti < 30 ? 30 : dti < 40 ? 20 : dti < 50 ? 10 : 0) +
    (desired <= maxLoan * 0.7 ? 30 : desired <= maxLoan ? 20 : 0)
  ));
  document.getElementById('elig-result-card').style.display = 'block';
  document.getElementById('elig-result').innerHTML = `
    <div class="elig-result-box ${eligible ? 'approved' : 'rejected'}">
      <p class="elig-score" style="color:${eligible ? '#16a34a' : '#dc2626'}">${score}%</p>
      <p class="elig-label" style="color:${eligible ? '#16a34a' : '#dc2626'}">${eligible ? 'Pre-Qualified' : 'Not Eligible'}</p>
    </div>
    <div class="review-block" style="margin-bottom:10px">
      <h4>Analysis</h4>
      <p><strong>Disposable Income:</strong> ${fmt(disposable)}/month</p>
      <p><strong>Debt-to-Income Ratio:</strong> ${dti.toFixed(1)}%</p>
      <p><strong>Max Loan You Qualify For:</strong> ${fmt(maxLoan)}</p>
      <p><strong>Credit Score:</strong> ${credit} (${credit >= 700 ? 'Good' : credit >= 650 ? 'Fair' : 'Poor'})</p>
    </div>
    ${eligible ? '<button class="btn-primary full-width" onclick="navigate(\'apply\')">Apply Now</button>' : '<p class="muted" style="text-align:center;font-size:13px">Reduce existing obligations or improve your credit score to qualify.</p>'}`;
}

// ===== REFERRAL =====
function loadReferral() {
  const user = getUser();
  document.getElementById('user-referral-code').textContent = user.referralCode || 'SKF-XXXXXXXX';
  const refs = user.referrals || [];
  const successful = refs.filter(r => r.status === 'successful').length;
  const pending = refs.filter(r => r.status === 'pending').length;
  document.getElementById('ref-total').textContent = refs.length;
  document.getElementById('ref-success').textContent = successful;
  document.getElementById('ref-earnings').textContent = fmt(user.referralEarnings || 0);
  document.getElementById('ref-pending').textContent = pending;
  const history = document.getElementById('referral-history');
  history.innerHTML = refs.length === 0
    ? '<p class="muted" style="font-size:13px;text-align:center;padding:16px">No referrals yet. Share your code!</p>'
    : refs.map(r => `<div class="ref-history-item"><div><p style="font-weight:600;font-size:13px;color:var(--bold)">${r.name}</p><p class="muted" style="font-size:12px">${r.date}</p></div><span class="badge badge-${r.status === 'successful' ? 'approved' : 'pending'}">${r.status}</span></div>`).join('');
}

function copyReferralCode() {
  const user = getUser();
  const code = user.referralCode || '';
  navigator.clipboard.writeText(code).then(() => showToast('Referral code copied!', 'success')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('Referral code copied!', 'success');
  });
}

// ===== GHANA CARD UPLOAD =====
function handleSlotFile(event, side) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Please upload an image file', 'error'); return; }
  ghanaCardFiles[side] = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('preview-' + side).src = e.target.result;
    document.getElementById('preview-' + side + '-wrap').style.display = 'block';
    document.getElementById('upload-area-' + side).style.display = 'none';
    document.getElementById('slot-' + side).classList.add('uploaded');
    updateGhanaCardStatus();
  };
  reader.readAsDataURL(file);
}

function retakeSlot(side) {
  ghanaCardFiles[side] = null; niaVerified = false;
  document.getElementById('preview-' + side).src = '';
  document.getElementById('preview-' + side + '-wrap').style.display = 'none';
  document.getElementById('upload-area-' + side).style.display = 'flex';
  document.getElementById('slot-' + side).classList.remove('uploaded');
  document.getElementById('file-' + side).value = '';
  document.getElementById('camera-' + side).value = '';
  const niaEl = document.getElementById('nia-verify-status');
  niaEl.className = 'nia-status hidden'; niaEl.innerHTML = '';
  document.getElementById('verify-btn-wrap').classList.add('hidden');
  updateGhanaCardStatus();
}

function updateGhanaCardStatus() {
  const statusEl = document.getElementById('ghana-card-status');
  const hasFront = !!ghanaCardFiles.front;
  const hasBack = !!ghanaCardFiles.back;
  if (hasFront && hasBack) {
    statusEl.className = 'ghana-card-status both-done';
    statusEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Both sides uploaded — click Verify with NIA below';
    document.getElementById('verify-btn-wrap').classList.remove('hidden');
  } else if (hasFront || hasBack) {
    statusEl.className = 'ghana-card-status partial';
    statusEl.innerHTML = 'Please also upload the ' + (hasFront ? 'back' : 'front') + ' side';
    document.getElementById('verify-btn-wrap').classList.add('hidden');
  } else {
    statusEl.className = 'ghana-card-status'; statusEl.innerHTML = '';
    document.getElementById('verify-btn-wrap').classList.add('hidden');
  }
}

function simulateNIAVerification() {
  const niaEl = document.getElementById('nia-verify-status');
  const ghanaId = document.getElementById('app-id').value.trim();
  niaEl.className = 'nia-status verifying';
  niaEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Verifying with NIA database...';
  niaEl.classList.remove('hidden');
  setTimeout(() => {
    const pass = !ghanaId || /^GHA-\d{9}-\d$/.test(ghanaId);
    if (pass) {
      niaVerified = true;
      niaEl.className = 'nia-status verified';
      niaEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Ghana Card verified with NIA — Identity confirmed';
      showToast('Ghana Card verified successfully!', 'success');
    } else {
      niaVerified = false;
      niaEl.className = 'nia-status failed';
      niaEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Verification failed — ensure Ghana Card number matches uploaded image';
      showToast('Verification failed. Check Ghana Card number.', 'error');
    }
  }, 2200);
}

// ===== PROFILE =====
function loadProfile() {
  const user = getUser();
  if (!user) return;
  document.getElementById('prof-fname').value = user.firstName || '';
  document.getElementById('prof-lname').value = user.lastName || '';
  document.getElementById('prof-phone').value = user.phone || '';
  document.getElementById('prof-address').value = user.address || '';
  document.getElementById('profile-fullname').textContent = user.firstName + ' ' + user.lastName;
  document.getElementById('profile-email-display').textContent = user.email;
  document.getElementById('profile-avatar-display').textContent = (user.firstName || 'U')[0].toUpperCase();
  loadPaymentAccounts();
}

function saveProfile() {
  const fname = document.getElementById('prof-fname').value.trim();
  const lname = document.getElementById('prof-lname').value.trim();
  if (!fname || !lname) { showToast('Name fields are required', 'error'); return; }
  const user = getUser();
  const users = JSON.parse(localStorage.getItem('sfl_users') || '[]');
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx].firstName = fname; users[idx].lastName = lname;
    users[idx].phone = document.getElementById('prof-phone').value.trim();
    users[idx].address = document.getElementById('prof-address').value.trim();
    localStorage.setItem('sfl_users', JSON.stringify(users));
    sessionStorage.setItem('sfl_user', JSON.stringify(users[idx]));
    if (localStorage.getItem('sfl_user')) localStorage.setItem('sfl_user', JSON.stringify(users[idx]));
  }
  loadProfile(); updateUserUI(getUser()); showToast('Profile updated', 'success');
}

function changePassword() {
  const current = document.getElementById('sec-current').value;
  const newPass = document.getElementById('sec-new').value;
  const confirm = document.getElementById('sec-confirm').value;
  const user = getUser();
  if (!current || !newPass || !confirm) { showToast('Please fill in all fields', 'error'); return; }
  const users = JSON.parse(localStorage.getItem('sfl_users') || '[]');
  const u = users.find(u => u.id === user.id);
  if (!u || u.password !== current) { showToast('Current password is incorrect', 'error'); return; }
  if (newPass.length < 8) { showToast('New password must be at least 8 characters', 'error'); return; }
  if (newPass !== confirm) { showToast('Passwords do not match', 'error'); return; }
  u.password = newPass;
  localStorage.setItem('sfl_users', JSON.stringify(users));
  showToast('Password updated', 'success');
  ['sec-current','sec-new','sec-confirm'].forEach(id => document.getElementById(id).value = '');
}

// ===== PAYMENT ACCOUNTS =====
function loadPaymentAccounts() {
  const user = getUser();
  const accounts = user.paymentAccounts || [];
  const list = document.getElementById('payment-accounts-list');
  list.innerHTML = accounts.length === 0
    ? '<p class="muted" style="padding:16px;text-align:center;font-size:13px">No payment accounts added yet.</p>'
    : accounts.map(a => `
      <div class="payment-account-item">
        <div class="acct-icon-wrap">
          <div class="icon-wrapper">${accountIcon(a.type)}</div>
          <div><p class="bold" style="font-size:13px">${a.name}</p><p class="muted" style="font-size:12px">${a.number} · ${a.provider}</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="acct-type-badge">${a.type}</span>
          <button class="link-btn" style="color:var(--danger)" onclick="removePaymentAccount('${a.id}')">Remove</button>
        </div>
      </div>`).join('');
}

function accountIcon(type) {
  const icons = {
    momo: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    bank: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>',
    visa: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    ghipss: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
  };
  return icons[type] || icons.bank;
}

function openAddAccountModal() { document.getElementById('account-modal').classList.remove('hidden'); document.getElementById('acct-type').value = ''; document.getElementById('account-fields').innerHTML = ''; }
function closeAccountModal() { document.getElementById('account-modal').classList.add('hidden'); }

function renderAccountFields() {
  const type = document.getElementById('acct-type').value;
  const container = document.getElementById('account-fields');
  const fields = {
    momo: `<div class="form-group"><label class="form-label">Mobile Network</label><select id="acct-provider" class="form-input"><option>MTN Mobile Money</option><option>Vodafone Cash</option><option>AirtelTigo Money</option></select></div><div class="form-group"><label class="form-label">Mobile Number</label><div class="phone-input-wrap"><span class="phone-flag">+233</span><input type="tel" id="acct-number" class="form-input phone-input" placeholder="024 000 0000"/></div></div><div class="form-group"><label class="form-label">Account Name</label><input type="text" id="acct-name" class="form-input" placeholder="Ankamah Johnson"/></div>`,
    bank: `<div class="form-group"><label class="form-label">Bank Name</label><select id="acct-provider" class="form-input"><option>GCB Bank</option><option>Ecobank Ghana</option><option>Absa Ghana</option><option>Standard Chartered Ghana</option><option>Fidelity Bank Ghana</option><option>Cal Bank</option><option>Stanbic Bank Ghana</option><option>Access Bank Ghana</option><option>Agricultural Development Bank (ADB)</option></select></div><div class="form-group"><label class="form-label">Account Number</label><input type="text" id="acct-number" class="form-input" placeholder="1234567890"/></div><div class="form-group"><label class="form-label">Account Name</label><input type="text" id="acct-name" class="form-input" placeholder="Ankamah Johnson"/></div>`,
    visa: `<div class="form-group"><label class="form-label">Card Type</label><select id="acct-provider" class="form-input"><option>Visa</option><option>Mastercard</option></select></div><div class="form-group"><label class="form-label">Card Number (last 4 digits)</label><input type="text" id="acct-number" class="form-input" maxlength="4" placeholder="4321"/></div><div class="form-group"><label class="form-label">Cardholder Name</label><input type="text" id="acct-name" class="form-input" placeholder="KOFI MENSAH"/></div>`,
    ghipss: `<div class="form-group"><label class="form-label">GhIPSS Account Number</label><input type="text" id="acct-number" class="form-input" placeholder="GH00001234567890"/></div><div class="form-group"><label class="form-label">Account Name</label><input type="text" id="acct-name" class="form-input" placeholder="Kofi Mensah"/></div><div class="form-group"><label class="form-label">Bank / Institution</label><input type="text" id="acct-provider" class="form-input" placeholder="e.g. GCB Bank"/></div>`
  };
  container.innerHTML = fields[type] || '';
}

function savePaymentAccount() {
  const type = document.getElementById('acct-type').value;
  if (!type) { showToast('Please select an account type', 'error'); return; }
  const numberEl = document.getElementById('acct-number');
  const nameEl = document.getElementById('acct-name');
  const providerEl = document.getElementById('acct-provider');
  if (!numberEl || !nameEl || !numberEl.value.trim() || !nameEl.value.trim()) { showToast('Please fill in all fields', 'error'); return; }
  const user = getUser();
  const users = JSON.parse(localStorage.getItem('sfl_users') || '[]');
  const idx = users.findIndex(u => u.id === user.id);
  if (idx === -1) return;
  if (!users[idx].paymentAccounts) users[idx].paymentAccounts = [];
  users[idx].paymentAccounts.push({ id: 'pa' + Date.now(), type, provider: providerEl ? providerEl.value : type, number: numberEl.value.trim(), name: nameEl.value.trim() });
  localStorage.setItem('sfl_users', JSON.stringify(users));
  sessionStorage.setItem('sfl_user', JSON.stringify(users[idx]));
  if (localStorage.getItem('sfl_user')) localStorage.setItem('sfl_user', JSON.stringify(users[idx]));
  closeAccountModal(); loadPaymentAccounts();
  showToast('Payment account added', 'success');
}

function removePaymentAccount(id) {
  const user = getUser();
  const users = JSON.parse(localStorage.getItem('sfl_users') || '[]');
  const idx = users.findIndex(u => u.id === user.id);
  if (idx === -1) return;
  users[idx].paymentAccounts = (users[idx].paymentAccounts || []).filter(a => a.id !== id);
  localStorage.setItem('sfl_users', JSON.stringify(users));
  sessionStorage.setItem('sfl_user', JSON.stringify(users[idx]));
  if (localStorage.getItem('sfl_user')) localStorage.setItem('sfl_user', JSON.stringify(users[idx]));
  loadPaymentAccounts(); showToast('Account removed', 'info');
}

// ===== SUPPORT CHAT =====
const chatResponses = {
  default: ['Thanks for reaching out. A support agent will respond shortly.', 'We\'ve received your message. Our team is available Mon–Fri 8am–6pm.', 'For urgent issues call 0800-SIKAFRO (toll free).'],
  loan: 'To apply, click "Apply for Loan" in the sidebar. You\'ll complete 6 steps including personal details, loan details, two guarantors, and Ghana Card NIA verification.',
  interest: 'Our rates: Personal (24%), Home (18%), Car (20%), Education (16%), Business (28%), Emergency (30%) — all per annum. Final rate depends on your credit profile.',
  payment: 'Go to the Payments page. Select your loan, choose MTN MoMo, Vodafone Cash, AirtelTigo, or bank transfer and enter the amount.',
  document: 'You need your Ghana Card front and back. Business loans may require a TIN number and business registration certificate.',
  approval: 'Most applications are reviewed in 24–48 hours. You\'ll get an in-app notification and SMS when a decision is made.',
  guarantor: 'SikafroLoan requires two guarantors. Each must be a Ghanaian citizen with stable income and a valid Ghana Card. You can pick them directly from your phone\'s contact list.'
};

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  appendChatMsg(msg, 'user');
  input.value = '';
  setTimeout(() => {
    const lower = msg.toLowerCase();
    let reply;
    if (lower.includes('apply') || lower.includes('loan')) reply = chatResponses.loan;
    else if (lower.includes('interest') || lower.includes('rate')) reply = chatResponses.interest;
    else if (lower.includes('pay') || lower.includes('momo') || lower.includes('repay')) reply = chatResponses.payment;
    else if (lower.includes('document') || lower.includes('ghana card') || lower.includes('id')) reply = chatResponses.document;
    else if (lower.includes('approv') || lower.includes('how long') || lower.includes('when')) reply = chatResponses.approval;
    else if (lower.includes('guarantor') || lower.includes('guarantee')) reply = chatResponses.guarantor;
    else reply = chatResponses.default[Math.floor(Math.random() * chatResponses.default.length)];
    appendChatMsg(reply, 'agent');
  }, 900);
}

function appendChatMsg(text, sender) {
  const container = document.getElementById('chat-messages');
  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + sender;
  div.innerHTML = `<div class="chat-bubble">${text}</div><span class="chat-time">${time}</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function injectFAQ(question) {
  document.getElementById('chat-input').value = question;
  sendChatMessage();
}

// ===== NOTIFICATIONS =====
function loadNotifications() {
  const notifs = JSON.parse(localStorage.getItem('sfl_notifications') || '[]');
  const badge = document.getElementById('notif-badge');
  badge.textContent = notifs.length;
  badge.style.display = notifs.length > 0 ? 'grid' : 'none';
  document.getElementById('notif-list').innerHTML = notifs.length === 0
    ? '<p class="muted" style="padding:16px;text-align:center;font-size:13px">No notifications</p>'
    : notifs.map(n => `<div class="notif-item"><p>${n.message}</p><span>${n.time}</span></div>`).join('');
}

function toggleNotifications() {
  document.getElementById('notif-panel').classList.toggle('hidden');
  notificationsOpen = !notificationsOpen;
}

function clearNotifications() {
  localStorage.setItem('sfl_notifications', '[]');
  loadNotifications();
  document.getElementById('notif-panel').classList.add('hidden');
  notificationsOpen = false;
  showToast('Notifications cleared', 'info');
}

// ===== DOWNLOAD STATEMENT =====
function downloadStatement() {
  if (!currentLoanId) return;
  const loan = getUserLoans().find(l => l.id === currentLoanId);
  if (!loan) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('SikafroLoan Ghana', 14, 20);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.setTextColor(142, 142, 142); doc.text('Loan Statement', 14, 27);
  doc.setTextColor(0, 0, 0);
  const guarantorText = loan.guarantors && loan.guarantors.length
    ? loan.guarantors.map((g, i) => `${i+1}. ${g.name} (${g.relation})`).join(', ')
    : 'N/A';
  doc.autoTable({ startY: 38, body: [
    ['Loan ID', loan.id], ['Loan Type', capitalize(loan.type) + ' Loan'],
    ['Principal', 'GHS ' + loan.amount.toLocaleString()], ['Interest Rate', loan.rate + '% per annum'],
    ['Tenure', loan.tenure + ' months'], ['Monthly Payment', 'GHS ' + loan.emi],
    ['Outstanding', 'GHS ' + loan.outstanding], ['Status', loan.status.toUpperCase()],
    ['Applied Date', loan.appliedDate], ['Disbursement', loan.disbursementMethod || 'Pending'],
    ['Guarantors', guarantorText]
  ], theme: 'plain', styles: { fontSize: 10, cellPadding: 4 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } } });
  doc.save('SikafroLoan_Statement_' + loan.id + '.pdf');
  showToast('Statement downloaded', 'success');
}

// ===== DARK MODE =====
function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
  localStorage.setItem('sfl_theme', isDark ? 'light' : 'dark');
}
function loadTheme() {
  const t = localStorage.getItem('sfl_theme') || 'light';
  document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : '');
}

// ===== SIDEBAR =====
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// ===== TOAST =====
function showToast(message, type = 'info') {
  const icons = {
    success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
    info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  };
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = (icons[type] || icons.info) + `<span>${message}</span>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ===== UTILS =====
function fmt(n) { return 'GHS ' + parseFloat(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function togglePassword(id) { const el = document.getElementById(id); el.type = el.type === 'password' ? 'text' : 'password'; }

function getUserLoans() { const user = getUser(); if (!user) return []; return JSON.parse(localStorage.getItem('sfl_loans_' + user.id) || '[]'); }
function saveUserLoans(loans) { const user = getUser(); if (!user) return; localStorage.setItem('sfl_loans_' + user.id, JSON.stringify(loans)); }
function getUserTransactions() { const user = getUser(); if (!user) return []; return JSON.parse(localStorage.getItem('sfl_transactions_' + user.id) || '[]'); }
function saveUserTransactions(txs) { const user = getUser(); if (!user) return; localStorage.setItem('sfl_transactions_' + user.id, JSON.stringify(txs)); }

// ===== CLOSE ON OUTSIDE CLICK =====
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const btn = e.target.closest('[onclick="toggleNotifications()"]');
  if (!panel.contains(e.target) && !btn && notificationsOpen) {
    panel.classList.add('hidden');
    notificationsOpen = false;
  }
});

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  init();
  syncRange('calc-amount', 'calc-amount-range', calculateEMI);
  syncRange('calc-tenure', 'calc-tenure-range', calculateEMI);
  syncRange('calc-rate', 'calc-rate-range', calculateEMI);
  syncRange('pub-calc-amount', 'pub-calc-amount-range', calcPublic);
  syncRange('pub-calc-tenure', 'pub-calc-tenure-range', calcPublic);
  setupCalcType();
  setupDisbursementToggle();
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.getAttribute('data-page')));
  });
});