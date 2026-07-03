import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { usePortalConfig } from "../hooks/usePortalConfig";
import { Button } from "./Button";

interface SuccessCardProps {
  title: string;
  message: string;
}

export function SuccessCard({ title, message }: SuccessCardProps) {
  const { getPortalPath } = usePortalConfig();

  return (
    <section className="mx-auto w-full max-w-2xl text-center">
      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-12"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <div className="mx-auto mb-6 grid size-14 place-items-center rounded-full bg-slate-950 text-2xl text-white dark:bg-white dark:text-slate-950">
          {title.slice(0, 2)}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
        <p className="mx-auto mt-4 max-w-md text-balance text-slate-600 dark:text-slate-300">{message}</p>
        <Button className="mt-8" variant="primary">
          <Link to={getPortalPath("/")}>Back to Home</Link>
        </Button>
      </motion.div>
    </section>
  );
}
