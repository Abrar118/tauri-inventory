import { goeyToast } from "goey-toast";

const isDev = import.meta.env.VITE_ENVIRONMENT === "development";

function verboseDescription(err: unknown): string {
  if (err instanceof Error) {
    const parts: string[] = [err.message];
    const code = (err as unknown as { code?: string }).code;
    if (code) parts.push(`code: ${code}`);
    return parts.join(" · ");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function toastError(
  title: string,
  err?: unknown,
  description?: string
): void {
  if (isDev && err !== undefined) {
    goeyToast.error(`[DEV] ${title}`, {
      description: verboseDescription(err),
    });
  } else {
    goeyToast.error(title, description ? { description } : undefined);
  }
}
