export interface JudgeConfig {
  id: string;
  name: string;
  code: string;
}

export interface JudgeSession {
  id: string;
  name: string;
  eventId: string;
}

export interface JudgeEvaluation {
  judgeId: string;
  judgeName: string;
  rating: number;
  notes: string;
  updatedAt: string;
}

export interface TeamEvaluations {
  teamId: string;
  judges: JudgeEvaluation[];
}

export const MAX_JUDGE_NOTES_LENGTH = 2000;
