'use strict';

// Pure predicates with no scheduler state, kept separate so Scheduler stays
// focused on the poll/dispatch loop rather than also owning classification
// rules (single responsibility).

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

// Classifies an issue by its label: 'plan' (PRD, plan label), 'feature'
// (brownfield change request), 'execute' (groomed group, ready label), or null
// if it carries none of the three. Plan is checked before feature/execute so an
// issue that somehow carries multiple labels still resolves deterministically.
function issueKind(issue, config) {
  const labels = (issue.labels || []).map(normalize);
  const { planLabel, featureLabel, readyLabel } = config.tracker;

  if (planLabel && labels.includes(normalize(planLabel))) return 'plan';
  if (featureLabel && labels.includes(normalize(featureLabel))) return 'feature';
  if (labels.includes(normalize(readyLabel))) return 'execute';
  return null;
}

function isEligible(issue, config) {
  const inReadyState = normalize(issue.state) === normalize(config.tracker.readyState);
  const terminal = config.tracker.terminalStates.map(normalize);
  const blockersCleared = issue.blockedBy.every((blocker) => terminal.includes(normalize(blocker.state)));
  return inReadyState && Boolean(issueKind(issue, config)) && blockersCleared;
}

// An issue sitting in the running state that this process didn't claim itself
// is either abandoned by a crashed/restarted orchestrator or belongs to a
// different orchestrator instance entirely — either way, this process should
// treat it as stuck and reclaim it.
function isStuck(issue, runningSet, config) {
  const inRunningState = normalize(issue.state) === normalize(config.tracker.runningState);
  const claimedHere = Boolean(runningSet && runningSet.has(issue.id));
  return inRunningState && !claimedHere;
}

module.exports = { normalize, issueKind, isEligible, isStuck };
