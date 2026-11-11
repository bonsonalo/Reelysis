// Mirrors backend/app/utils/password_strength.py so users see problems before submitting.
export const PASSWORD_RULES = [
  { label: 'More than 5 characters', test: (value: string) => value.length > 5 },
  { label: 'An uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'A lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'A number', test: (value: string) => /\d/.test(value) },
  {
    label: "A special character (!@#$%^&*(){}/'.,)",
    test: (value: string) => /[!@#$%^&*(){}/'.,]/.test(value),
  },
] as const

export function passwordMeetsRules(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value))
}
