import { motion } from "framer-motion";
import { ArrowRight, Flag, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { appConfig } from "../constants/config";
import { usePortalConfig } from "../hooks/usePortalConfig";

const workflows = [
  {
    title: "Register Team Idea",
    description: "Register your team's finalized idea before you begin building.",
    button: "Register Team",
    href: "/register",
    icon: Rocket,
  },
  {
    title: "Submit Final Project",
    description: "Submit your GitHub repository and live demo before the deadline.",
    button: "Submit Project",
    href: "/submit",
    icon: Flag,
  },
];

export function HomePage() {
  const { getPortalPath, portalConfig } = usePortalConfig();

  return (
    <section className="mx-auto grid w-full gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Hackathon Team Portal
        </p>
        <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-6xl">
          {portalConfig?.title ?? appConfig.defaultHackathonName}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          {portalConfig?.tagline ?? appConfig.defaultTagline}
        </p>
        {!portalConfig ? (
          <p className="mt-5 max-w-xl rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            Organizers can use the Settings button to create a configured portal and generate a
            unique attendee link.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4">
        {workflows.map((workflow, index) => {
          const Icon = workflow.icon;

          return (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 18 }}
              key={workflow.href}
              transition={{ delay: index * 0.08, duration: 0.25 }}
            >
              <Link
                className="group block rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 focus:ring-offset-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:focus:ring-white dark:focus:ring-offset-slate-950 sm:p-8"
                to={getPortalPath(workflow.href)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white">
                    <Icon aria-hidden="true" size={22} />
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-2 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-950 dark:group-hover:text-white"
                    size={20}
                  />
                </div>
                <h2 className="mt-7 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {workflow.title}
                </h2>
                <p className="mt-3 text-slate-600 dark:text-slate-300">{workflow.description}</p>
                <span className="mt-7 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                  {workflow.button}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
