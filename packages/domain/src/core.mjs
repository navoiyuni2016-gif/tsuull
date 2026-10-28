/**
 * Domain demo. NOT a production regulation engine.
 * All financial/hour amounts are represented as integer units of 1/10,000 hour.
 * Inputs are decimal strings (or integers); percentages use whole basis points.
 */
const SCALE = 10000n;

export function toScaled(value) {
  const s = String(value);
  if (!/^(0|[1-9]\d*)(\.\d{1,4})?$/.test(s)) {
    throw new RangeError(`Invalid nonnegative decimal: ${s}`);
  }
  const [whole, fraction = ''] = s.split('.');
  return BigInt(whole) * SCALE + BigInt((fraction + '0000').slice(0, 4));
}

export function fromScaled(value) {
  if (typeof value !== 'bigint' || value < 0n) throw new RangeError('Only nonnegative scaled values supported');
  const int = value / SCALE;
  const frac = (value % SCALE).toString().padStart(4, '0').replace(/0+$/, '');
  return frac ? `${int}.${frac}` : String(int);
}

export function multiply(a, b) {
  const v = toScaled(a) * toScaled(b);
  return fromScaled((v + SCALE / 2n) / SCALE); // half up, 4 decimal places
}

export function percent(a, basisPoints) {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) {
    throw new RangeError('Invalid ratio basis points');
  }
  return fromScaled((toScaled(a) * BigInt(basisPoints) + 5000n) / 10000n);
}

export function add(a, b) { return fromScaled(toScaled(a) + toScaled(b)); }
export function subtract(a, b) {
  const v = toScaled(a) - toScaled(b);
  if (v < 0n) throw new RangeError('Negative quantity');
  return fromScaled(v);
}
export function timesInt(a, count) {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Invalid count');
  return fromScaled(toScaled(a) * BigInt(count));
}

export class ProductionRuleBlocked extends Error {
  constructor(message = 'BLOCKED: tasdiqlangan rasmiy hisoblash me’yori mavjud emas') {
    super(message);
    this.name = 'ProductionRuleBlocked';
    this.code = 'PRODUCTION_RULE_BLOCKED';
  }
}

const CURRENT_STATES = Object.freeze(['DRAFT','SUBMITTED','APPROVED','REJECTED']);

export function validateRule(rule) {
  if (!rule || typeof rule !== 'object') throw new TypeError('RuleSet is required');
  if (!CURRENT_STATES.includes(rule.status)) throw new RangeError('Unknown RuleSet state');
  if (rule.sourceType !== 'DEMO' && rule.sourceType !== 'INSTITUTIONAL') throw new RangeError('Unknown rule source');
  if (!rule.authorId || typeof rule.authorId !== 'string') throw new RangeError('authorId required');
  if (rule.status === 'APPROVED' && (!rule.approvedBy || !rule.legalBasis || !rule.effectiveFrom || rule.approvedBy === rule.authorId)) {
    throw new RangeError('Approved rule requires distinct approver, legal basis and effective date');
  }
  return true;
}

export function approveRule(draft, actorId, legalBasis, effectiveFrom) {
  validateRule(draft);
  if (draft.status !== 'SUBMITTED') throw new RangeError('Rule must be SUBMITTED');
  if (actorId === draft.authorId) throw new Error('Four-eyes: self-approval is prohibited');
  if (!actorId || !legalBasis || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) throw new RangeError('Approval metadata required');
  const approved = { ...draft, status:'APPROVED', approvedBy:actorId, legalBasis, effectiveFrom };
  validateRule(approved);
  return Object.freeze(approved);
}

export function assertProductionRule(rule, date = '2026-10-28') {
  if (!rule) throw new ProductionRuleBlocked();
  validateRule(rule);
  if (rule.sourceType !== 'INSTITUTIONAL' || rule.status !== 'APPROVED' || rule.effectiveFrom > date || (rule.effectiveTo && rule.effectiveTo < date)) {
    throw new ProductionRuleBlocked();
  }
  return true;
}

export function computeDemoCourse(input, rule, { production = false, onDate = '2026-10-28' } = {}) {
  validateRule(rule);
  if (production) assertProductionRule(rule, onDate);
  if (!Number.isSafeInteger(input.groups) || input.groups < 1 || !Number.isSafeInteger(input.lectureStreams) || input.lectureStreams < 1) {
    throw new RangeError('At least one valid group and stream required');
  }
  const { hoursPerCredit, contactBasisPoints, lectureBasisPoints } = rule.parameters ?? {};
  if (hoursPerCredit === undefined || contactBasisPoints === undefined || lectureBasisPoints === undefined) throw new RangeError('Incomplete parameters');
  if (toScaled(input.credits) <= 0n || toScaled(hoursPerCredit) <= 0n) throw new RangeError('Positive credits and hours required');
  const totalStudentHours = multiply(input.credits, hoursPerCredit);
  const contactHoursPerStudent = percent(totalStudentHours, contactBasisPoints);
  const independentHoursPerStudent = subtract(totalStudentHours, contactHoursPerStudent);
  const lectureHoursPerStream = percent(contactHoursPerStudent, lectureBasisPoints);
  const practiceHoursPerGroup = subtract(contactHoursPerStudent, lectureHoursPerStream);
  const lectureTeachingDemand = timesInt(lectureHoursPerStream, input.lectureStreams);
  const practiceTeachingDemand = timesInt(practiceHoursPerGroup, input.groups);
  return Object.freeze({
    unit: 'academic_hours', calculationMode: production ? 'PRODUCTION' : 'DEMO',
    totalStudentHours, contactHoursPerStudent, independentHoursPerStudent,
    lectureHoursPerStream, practiceHoursPerGroup,
    lectureTeachingDemand, practiceTeachingDemand,
    basicTeachingDemand: add(lectureTeachingDemand, practiceTeachingDemand),
    warning: production ? null : 'DEMO ONLY — not an official university workload calculation',
  });
}

export const demoRule = Object.freeze({
  id:'DEMO-2026-01', status:'DRAFT', sourceType:'DEMO', authorId:'demo-operator',
  parameters: Object.freeze({ hoursPerCredit:'30', contactBasisPoints:4000, lectureBasisPoints:5000 }),
});
