export type LearningMode =
  | "guided"
  | "subject_first"
  | "assessment_first"
  | "weak_area_first"
  | "practice_first"
  | "mock_first"
  | "revision_first";

export type LearningStage =
  | "diagnostic"
  | "learning"
  | "practice"
  | "revision"
  | "mock"
  | "mastery";

export const LEARNING_MODES: Array<{
  id: LearningMode;
  title: string;
  description: string;
  primaryStage: LearningStage;
}> = [
  { id: "guided", title: "Guided", description: "Let TargetBud balance learning, practice, revision and tests for you.", primaryStage: "learning" },
  { id: "subject_first", title: "Subject first", description: "Choose one subject/topic and finish its coverage before moving on.", primaryStage: "learning" },
  { id: "assessment_first", title: "Assessment first", description: "Test first, then use the evidence to decide what to learn next.", primaryStage: "diagnostic" },
  { id: "weak_area_first", title: "Weak areas first", description: "Spend the next session on the topics with the strongest evidence of gaps.", primaryStage: "practice" },
  { id: "practice_first", title: "Practice first", description: "Solve more questions, then convert repeated misses into lessons and revision.", primaryStage: "practice" },
  { id: "mock_first", title: "Mock first", description: "Use timed mixed tests early, then drill the gaps they expose.", primaryStage: "mock" },
  { id: "revision_first", title: "Revision first", description: "Prioritize due reviews and unresolved mistakes before new content.", primaryStage: "revision" },
];

export const DEFAULT_LEARNING_MODE: LearningMode = "guided";

export function modeLabel(mode: LearningMode) {
  return LEARNING_MODES.find((item) => item.id === mode)?.title ?? "Guided";
}
