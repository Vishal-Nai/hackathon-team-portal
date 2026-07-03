import type {
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayReturn,
  UseFormRegister,
} from "react-hook-form";
import { MAX_TEAM_MEMBERS } from "../constants/options";
import type { IdeaRegistrationFormValues } from "../schemas/forms";
import { Button } from "./Button";
import { TextInput } from "./FormField";

interface TeamMembersFieldProps {
  fields: UseFieldArrayReturn<IdeaRegistrationFormValues, "teamMembers">["fields"];
  register: UseFormRegister<IdeaRegistrationFormValues>;
  errors: FieldErrors<IdeaRegistrationFormValues>;
  append: UseFieldArrayAppend<IdeaRegistrationFormValues, "teamMembers">;
  remove: UseFieldArrayRemove;
}

export function TeamMembersField({ fields, register, errors, append, remove }: TeamMembersFieldProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Team Members</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add up to 6 members.</p>
        </div>
        <Button
          disabled={fields.length >= MAX_TEAM_MEMBERS}
          onClick={() => append({ name: "", email: "" })}
          type="button"
          variant="secondary"
        >
          Add
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        {fields.map((field, index) => (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
            key={field.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Member {index + 1}</p>
              {fields.length > 1 ? (
                <button
                  className="text-xs font-semibold text-slate-500 underline-offset-4 hover:text-slate-950 hover:underline dark:text-slate-400 dark:hover:text-white"
                  onClick={() => remove(index)}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TextInput
                error={errors.teamMembers?.[index]?.name?.message}
                label="Name"
                placeholder="Dinosaur"
                {...register(`teamMembers.${index}.name`)}
              />
              <TextInput
                error={errors.teamMembers?.[index]?.email?.message}
                label="Email optional"
                placeholder="member@example.com"
                type="email"
                {...register(`teamMembers.${index}.email`)}
              />
            </div>
          </div>
        ))}
      </div>

      {typeof errors.teamMembers?.message === "string" ? (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {errors.teamMembers.message}
        </p>
      ) : null}
    </section>
  );
}
