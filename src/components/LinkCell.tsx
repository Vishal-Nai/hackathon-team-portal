const URL_PATTERN = /^https?:\/\/.+/i;

interface LinkCellProps {
  value: string;
}

export function LinkCell({ value }: LinkCellProps) {
  if (!value || value === "—") {
    return <span>—</span>;
  }

  if (!URL_PATTERN.test(value)) {
    return <span title={value}>{value}</span>;
  }

  return (
    <a
      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
      href={value}
      onClick={(event) => event.stopPropagation()}
      rel="noreferrer"
      target="_blank"
      title={value}
    >
      {value}
    </a>
  );
}

export function isLinkValue(value: string): boolean {
  return URL_PATTERN.test(value.trim());
}
