import test from 'node:test';
import assert from 'node:assert/strict';
import { demoRule, computeDemoCourse, toScaled, fromScaled, percent, multiply, approveRule, assertProductionRule, ProductionRuleBlocked } from '../src/core.mjs';

test('decimal strings maintain fixed scale', () => {
  assert.equal(toScaled('1.125'), 11250n);
  assert.equal(fromScaled(90000n), '9');
  assert.equal(multiply('1.5', '2.25'), '3.375');
  assert.equal(percent('180', 4000), '72');
});

test('requested demo 6 credits, 3 groups, 1 stream', () => {
  const result = computeDemoCourse({ credits:'6', groups:3, lectureStreams:1 }, demoRule);
  assert.equal(result.totalStudentHours, '180');
  assert.equal(result.contactHoursPerStudent, '72');
  assert.equal(result.independentHoursPerStudent, '108');
  assert.equal(result.lectureTeachingDemand, '36');
  assert.equal(result.practiceTeachingDemand, '108');
  assert.equal(result.basicTeachingDemand, '144');
});

test('changing a parameter recalculates, without changing original', () => {
  const modified = { ...demoRule, parameters:{...demoRule.parameters,contactBasisPoints:5000} };
  const output = computeDemoCourse({credits:'6',groups:3,lectureStreams:1},modified);
  assert.equal(output.contactHoursPerStudent,'90');
  assert.equal(output.basicTeachingDemand,'180');
  assert.equal(demoRule.parameters.contactBasisPoints,4000);
});

test('requires valid count and fractions', () => {
  assert.throws(() => computeDemoCourse({credits:'6',groups:0,lectureStreams:1},demoRule));
  assert.throws(() => percent('20',10001));
  assert.throws(() => toScaled('20.12345'));
});

test('all demo rules are blocked for production calculation', () => {
  assert.throws(() => computeDemoCourse({credits:'6',groups:3,lectureStreams:1},demoRule,{production:true}), ProductionRuleBlocked);
  assert.throws(() => assertProductionRule(demoRule), ProductionRuleBlocked);
});

test('author cannot self-approve a submitted rule', () => {
  const draft = { ...demoRule, status:'SUBMITTED', sourceType:'INSTITUTIONAL' };
  assert.throws(() => approveRule(draft,'demo-operator','Official doc','2026-09-01'), /self-approval/);
  const approved = approveRule(draft,'academic-approver','Official doc','2026-09-01');
  assert.equal(approved.approvedBy,'academic-approver');
  assert.ok(Object.isFrozen(approved));
  assert.equal(assertProductionRule(approved,'2026-10-28'),true);
  assert.throws(() => assertProductionRule(approved,'2026-08-01'), ProductionRuleBlocked);
});
