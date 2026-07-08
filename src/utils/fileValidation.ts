export const MAX_CSV_FILE_SIZE_MB = 10;

export function validateCsvFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".csv")) {
    return "Please upload a .csv file exported from Typeform.";
  }

  const maxBytes = MAX_CSV_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File is too large. Maximum size is ${MAX_CSV_FILE_SIZE_MB} MB.`;
  }

  if (file.size === 0) {
    return "The selected file is empty.";
  }

  return null;
}
