import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { TextInput, TextareaInput } from "../components/FormField";
import { ProgressSteps } from "../components/ProgressSteps";
import { useDraftForm } from "../hooks/useDraftForm";
import { usePortalConfig } from "../hooks/usePortalConfig";
import { type FinalSubmissionFormValues, finalSubmissionSchema } from "../schemas/forms";
import { submissionService } from "../services/submission";

const defaultValues: FinalSubmissionFormValues = {
  teamLeadEmail: "",
  githubUrl: "",
  liveDemoUrl: "",
  demoVideoUrl: "",
  notes: "",
};

export function SubmitPage() {
  const navigate = useNavigate();
  const { getPortalPath, portalConfig } = usePortalConfig();
  const form = useForm<FinalSubmissionFormValues>({
    defaultValues,
    mode: "onBlur",
    resolver: zodResolver(finalSubmissionSchema),
  });
  const { clearDraft } = useDraftForm("final-submission", form, portalConfig?.portalId);
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FinalSubmissionFormValues) {
    if (!portalConfig?.portalId) {
      toast.error("This portal is not configured yet. Ask the organizer to create a share link first.");
      return;
    }

    try {
      await submissionService.submitFinalSubmission(
        {
          ...values,
          demoVideoUrl: values.demoVideoUrl || undefined,
          notes: values.notes || undefined,
        },
        portalConfig.portalId,
      );
      clearDraft();
      toast.success("Project submitted successfully.");
      navigate(getPortalPath("/submit/success"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit project.");
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Workflow 2
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
          Submit Final Project
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Submit the repository and live demo before the judging deadline.
        </p>
      </div>

      <ProgressSteps currentStep={1} steps={["Identify", "Links", "Submit"]} />

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
        <TextInput
          autoFocus
          error={form.formState.errors.teamLeadEmail?.message}
          hint="Use the same email from idea registration."
          label="Team Lead Email"
          placeholder="lead@example.com"
          type="email"
          {...form.register("teamLeadEmail")}
        />
        <TextInput
          error={form.formState.errors.githubUrl?.message}
          label="GitHub Repository URL"
          placeholder="https://github.com/team/project"
          type="url"
          {...form.register("githubUrl")}
        />
        <TextInput
          error={form.formState.errors.liveDemoUrl?.message}
          hint="Vercel, Netlify, Render, GitHub Pages, Firebase Hosting, or any HTTPS URL."
          label="Live Demo URL"
          placeholder="https://project.vercel.app"
          type="url"
          {...form.register("liveDemoUrl")}
        />
        <TextInput
          error={form.formState.errors.demoVideoUrl?.message}
          hint="YouTube, Loom, Google Drive, Vimeo, or another HTTPS video link."
          label="Optional Demo Video URL"
          placeholder="https://youtube.com/watch?v=..."
          type="url"
          {...form.register("demoVideoUrl")}
        />
        <TextareaInput
          currentLength={form.watch("notes")?.length ?? 0}
          error={form.formState.errors.notes?.message}
          label="Additional Notes"
          maxLength={600}
          placeholder="Anything judges should know before reviewing?"
          {...form.register("notes")}
        />

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">Drafts autosave on this device.</p>
          <Button disabled={!portalConfig?.portalId} isLoading={isSubmitting} type="submit">
            Submit Project
          </Button>
        </div>
      </motion.form>
    </section>
  );
}
