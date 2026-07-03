export type CursorUsage = "Cursor Desktop" | "Cursor Mobile (iOS)" | "Cursor Web";

export type Domain =
  | "AI / ML"
  | "Developer Tools"
  | "Productivity"
  | "Education"
  | "Healthcare"
  | "FinTech"
  | "Open Innovation"
  | "Web"
  | "Mobile"
  | "Gaming"
  | "Climate"
  | "Social Impact"
  | "Other";

export interface TeamMember {
  name: string;
  email?: string;
}

export interface IdeaRegistration {
  teamLeadEmail: string;
  teamName: string;
  projectName: string;
  tagline: string;
  description: string;
  domain: Domain;
  techStack: string;
  cursorUsage: CursorUsage[];
  teamMembers: TeamMember[];
}

export interface FinalSubmission {
  teamLeadEmail: string;
  githubUrl: string;
  liveDemoUrl: string;
  demoVideoUrl?: string;
  notes?: string;
}

export interface SubmissionResult {
  ok: boolean;
  message?: string;
}

export type Workflow = "idea-registration" | "final-submission";
