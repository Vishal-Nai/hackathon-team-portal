export function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isGithubUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)github\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function optionalHttpsUrl(value: string | undefined) {
  return !value || isHttpsUrl(value);
}
