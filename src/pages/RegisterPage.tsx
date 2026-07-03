import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { CURSOR_USAGE_OPTIONS, DESCRIPTION_MAX_LENGTH, DOMAINS } from "../constants/options";
import { useDraftForm } from "../hooks/useDraftForm";
import { usePortalConfig } from "../hooks/usePortalConfig";
import {
  type IdeaRegistrationFormValues,
  ideaRegistrationSchema,
} from "../schemas/forms";
import { submissionService } from "../services/submission";
import { Button } from "../components/Button";
import { TextInput, SelectInput, TextareaInput } from "../components/FormField";
import { MultiSelect } from "../components/MultiSelect";
import { ProgressSteps } from "../components/ProgressSteps";
import { TeamMembersField } from "../components/TeamMembersField";

const defaultValues: IdeaRegistrationFormValues = {
  teamLeadEmail: "",
  teamName: "",
  projectName: "",
  tagline: "",
  description: "",
  domain: "AI / ML",
  techStack: "",
  cursorUsage: [],
  teamMembers: [{ name: "", email: "" }],
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { getPortalPath, portalConfig } = usePortalConfig();
  const form = useForm<IdeaRegistrationFormValues>({
    defaultValues,
    mode: "onBlur",
    resolver: zodResolver(ideaRegistrationSchema),
  });
  const { clearDraft } = useDraftForm("idea-registration", form, portalConfig?.portalId);
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "teamMembers",
  });
  const description = form.watch("description");
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: IdeaRegistrationFormValues) {
    if (!portalConfig?.portalId) {
      toast.error("This portal is not configured yet. Ask the organizer to create a share link first.");
      return;
    }

    try {
      await submissionService.submitIdeaRegistration(
        {
          ...values,
          teamMembers: values.teamMembers.map((member) => ({
            name: member.name,
            email: member.email || undefined,
          })),
        },
        portalConfig.portalId,
      );
      clearDraft();
      toast.success("Team registered successfully.");
      navigate(getPortalPath("/register/success"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit registration.");
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Workflow 1
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
          Register Team Idea
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Capture the finalized project concept before your team starts building.
        </p>
      </div>

      <ProgressSteps currentStep={1} steps={["Team", "Idea", "Submit"]} />

      {!portalConfig?.portalId ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          Submissions are disabled until an organizer configures this portal from Settings.
        </p>
      ) : null}

      <motion.form
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 space-y-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8"
        initial={{ opacity: 0, y: 16 }}
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            autoFocus
            error={form.formState.errors.teamLeadEmail?.message}
            label="Team Lead Email"
            placeholder="lead@example.com"
            type="email"
            {...form.register("teamLeadEmail")}
          />
          <TextInput
            error={form.formState.errors.teamName?.message}
            label="Team Name"
            placeholder="Pixel Pirates"
            {...form.register("teamName")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            error={form.formState.errors.projectName?.message}
            label="Project Name"
            placeholder="StudyPilot"
            {...form.register("projectName")}
          />
          <TextInput
            error={form.formState.errors.tagline?.message}
            label="One-line Tagline"
            placeholder="AI assistant for students"
            {...form.register("tagline")}
          />
        </div>

        <TextareaInput
          currentLength={description.length}
          error={form.formState.errors.description?.message}
          hint="Recommended: 100-500 characters."
          label="Project Description"
          maxLength={DESCRIPTION_MAX_LENGTH}
          placeholder="Describe the problem, your users, and the solution your team will build."
          {...form.register("description")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            error={form.formState.errors.domain?.message}
            label="Domain"
            options={DOMAINS}
            {...form.register("domain")}
          />
          <TextInput
            error={form.formState.errors.techStack?.message}
            hint="Example: React, Node.js, Cursor, Firebase, OpenAI"
            label="Tech Stack"
            placeholder="React, Cursor, Firebase"
            {...form.register("techStack")}
          />
        </div>

        <Controller
          control={form.control}
          name="cursorUsage"
          render={({ field }) => (
            <MultiSelect
              error={form.formState.errors.cursorUsage?.message}
              label="Cursor Usage"
              onChange={field.onChange}
              options={CURSOR_USAGE_OPTIONS}
              value={field.value}
            />
          )}
        />

        <TeamMembersField
          append={append}
          errors={form.formState.errors}
          fields={fields}
          register={form.register}
          remove={remove}
        />

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">Drafts autosave on this device.</p>
          <Button disabled={!portalConfig?.portalId} isLoading={isSubmitting} type="submit">
            Register Team
          </Button>
        </div>
      </motion.form>
    </section>
  );
}
