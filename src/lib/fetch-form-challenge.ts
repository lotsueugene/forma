/** Client helper: fetch a short-lived submission token for a form. */
export async function fetchFormChallenge(formId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/forms/${formId}/challenge`, { method: 'POST' });
    if (!response.ok) return null;
    const data = await response.json() as { token?: string };
    return data.token || null;
  } catch {
    return null;
  }
}
