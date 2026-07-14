'use strict';

// Handlers for a finished run: given the scheduler instance and the run's
// outcome, advance tracker state and clean up the workspace. Kept as free
// functions taking the scheduler (`sched`) rather than methods on the Scheduler
// class, so the class stays focused on the poll/dispatch loop and these stay
// independently testable (single responsibility).

const { maybeCreatePr } = require('./pr');
const { buildProofComment } = require('./result-reader');

async function finishExecution(sched, issue, group, workspace, runResult) {
  if (runResult.result.status === 'human_review') {
    await completeHumanReview(sched, issue, group, workspace, runResult);
    return;
  }

  await sched.tracker.addComment(issue.id, buildProofComment(issue, group, runResult, null));
  await sched.tracker.moveIssue(issue.id, sched.config.tracker.blockedState, sched.config.tracker.blockedStateCandidates);
  if (sched.stateStore) sched.stateStore.finishRun(issue, { status: 'blocked' });
  sched.logger.warn('run_blocked', { issueKey: issue.key, groupId: group.id });
  await sched.maybeCleanupWorkspace(issue, workspace.workspacePath);
}

async function finishPlanning(sched, issue, group, workspace, runResult) {
  const trackerConfig = sched.config.tracker;

  if (runResult.result.status === 'planned') {
    const groups = (runResult.result.groups_published || []).join(', ') || 'see specs/';
    await sched.tracker.addComment(issue.id, `Planning complete. Published groups: ${groups}.`);
    await sched.tracker.moveIssue(issue.id, trackerConfig.plannedState, trackerConfig.plannedStateCandidates);
    if (sched.stateStore) sched.stateStore.finishRun(issue, { status: 'planned', workspacePath: workspace.workspacePath });
    sched.logger.info('plan_completed', { issueKey: issue.key });
  } else {
    await sched.tracker.addComment(issue.id, `Planning blocked: ${runResult.result.blocker || runResult.result.summary || 'unknown'}`);
    await sched.tracker.moveIssue(issue.id, trackerConfig.blockedState, trackerConfig.blockedStateCandidates);
    if (sched.stateStore) sched.stateStore.finishRun(issue, { status: 'blocked' });
    sched.logger.warn('plan_blocked', { issueKey: issue.key });
  }

  await sched.maybeCleanupWorkspace(issue, workspace.workspacePath);
}

// A run that reached human_review has already passed the harness's own gates
// (ratchet, /gate, Phase 9.5 review). Push the branch, open the PR, post proof
// to the tracker, then either hand off to a human or — if AUTO_MERGE is on —
// enable GitHub's own auto-merge so CI becomes the final machine gate.
async function completeHumanReview(sched, issue, group, workspace, runResult) {
  await sched.workspaceManager.pushBranch(workspace.workspacePath, workspace.branchName);
  const prUrl = await maybeCreatePr(workspace.workspacePath, issue, group, sched.config);
  await sched.tracker.addComment(issue.id, buildProofComment(issue, group, runResult, prUrl));

  const outcome = await resolveReviewOutcome(sched, issue, workspace, prUrl);
  await sched.tracker.moveIssue(issue.id, outcome.state, outcome.candidates);
  if (sched.stateStore) {
    sched.stateStore.finishRun(issue, { status: outcome.runStatus, branchName: workspace.branchName, workspacePath: workspace.workspacePath, prUrl });
  }
  sched.logger.info('run_completed', { issueKey: issue.key, groupId: group.id, prUrl, outcome: outcome.runStatus });
  await sched.maybeCleanupWorkspace(issue, workspace.workspacePath);
}

// Default outcome: hand off to a human reviewer. With AUTO_MERGE enabled,
// attempt GitHub native auto-merge instead — GitHub only merges once required
// checks pass, so a red build never lands — and fall back to human review if
// enabling it fails for any reason (never silently drop the PR).
async function resolveReviewOutcome(sched, issue, workspace, prUrl) {
  const trackerConfig = sched.config.tracker;
  const autoMerge = sched.config.autoMerge;

  if (!autoMerge || !autoMerge.enabled) {
    return { state: trackerConfig.reviewState, candidates: trackerConfig.reviewStateCandidates, runStatus: 'human_review' };
  }

  const merge = await sched.enableAutoMerge(prUrl, workspace.workspacePath, sched.config);
  if (merge && merge.enabled) {
    await sched.tracker.addComment(issue.id, `Auto-merge enabled (${autoMerge.method}); GitHub will merge once required checks pass.`);
    return { state: autoMerge.doneState, candidates: autoMerge.doneStateCandidates, runStatus: 'auto_merge' };
  }

  await sched.tracker.addComment(issue.id, `Auto-merge could not be enabled (${(merge && merge.reason) || 'unknown'}); left for human review.`);
  return { state: trackerConfig.reviewState, candidates: trackerConfig.reviewStateCandidates, runStatus: 'human_review' };
}

module.exports = { finishExecution, finishPlanning, completeHumanReview, resolveReviewOutcome };
