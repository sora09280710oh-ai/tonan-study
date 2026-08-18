export type CompletedLearningMode = "practice" | "test";

export function missionEventForCompletedSession(mode: CompletedLearningMode) {
  return mode;
}

export function shouldCompleteDailySelect(testOnly: boolean) {
  return testOnly;
}
