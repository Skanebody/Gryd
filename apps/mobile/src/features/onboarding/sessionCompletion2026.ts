/** Volatile navigation preference, never an account, age check, or durable record. */
let completed = false;
export function rememberOnboardingCompletion2026(value: boolean) { completed = value; }
export function completedOnboardingThisSession2026() { return completed; }
