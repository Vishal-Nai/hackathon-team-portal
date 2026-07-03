import { z } from "zod";
import {
  CURSOR_USAGE_OPTIONS,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  DOMAINS,
  MAX_TEAM_MEMBERS,
} from "../constants/options";
import { isGithubUrl, isHttpsUrl, optionalHttpsUrl } from "../utils/urls";

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

export const teamMemberSchema = z.object({
  name: requiredText("Member name"),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.email().safeParse(value).success, {
      message: "Enter a valid email or leave it blank.",
    }),
});

export const ideaRegistrationSchema = z.object({
  teamLeadEmail: z.email("Enter a valid team lead email."),
  teamName: requiredText("Team name"),
  projectName: requiredText("Project name"),
  tagline: requiredText("One-line tagline").max(120, "Keep the tagline under 120 characters."),
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN_LENGTH, "Share at least 100 characters so judges understand the idea.")
    .max(DESCRIPTION_MAX_LENGTH, "Keep the description under 500 characters."),
  domain: z.enum(DOMAINS, "Choose a project domain."),
  techStack: requiredText("Tech stack"),
  cursorUsage: z.array(z.enum(CURSOR_USAGE_OPTIONS)).min(1, "Select at least one Cursor surface."),
  teamMembers: z.array(teamMemberSchema).min(1, "Add at least one team member.").max(MAX_TEAM_MEMBERS),
});

export const finalSubmissionSchema = z.object({
  teamLeadEmail: z.email("Enter the team lead email used during registration."),
  githubUrl: z.string().trim().refine(isGithubUrl, "Enter a valid HTTPS GitHub repository URL."),
  liveDemoUrl: z.string().trim().refine(isHttpsUrl, "Enter a valid HTTPS demo URL."),
  demoVideoUrl: z
    .string()
    .trim()
    .optional()
    .refine(optionalHttpsUrl, "Enter a valid HTTPS video URL or leave it blank."),
  notes: z.string().trim().max(600, "Keep notes under 600 characters.").optional(),
});

export type IdeaRegistrationFormValues = z.infer<typeof ideaRegistrationSchema>;
export type FinalSubmissionFormValues = z.infer<typeof finalSubmissionSchema>;
