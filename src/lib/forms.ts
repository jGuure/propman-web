import type { FormInstance, FormRule } from "antd";
import type { TKey } from "@/i18n/provider";
import { ApiError } from "@/lib/api/errors";

/**
 * Shows field errors returned by the API next to the matching form fields.
 * Returns true when at least one field error was applied.
 */
export function applyFieldErrors(form: FormInstance, error: unknown, fieldMap: Record<string, string> = {}): boolean {
  if (!(error instanceof ApiError) || error.fieldErrors.length === 0) {
    return false;
  }
  const known = new Set(Object.keys(form.getFieldsValue(true)));
  const fields = error.fieldErrors
    .map((e) => ({ name: fieldMap[e.field] ?? e.field, errors: [capitalize(e.message)] }))
    .filter((f) => known.has(f.name));
  form.setFields(fields);
  return fields.length > 0;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Translate = (key: TKey) => string;

export function passwordRules(t: Translate): FormRule[] {
  return [
    { required: true, message: t("validation.enterPassword") },
    { min: 8, message: t("validation.minPassword") },
    { max: 72, message: t("validation.maxPassword") },
    { pattern: /^(?=.*\p{L})(?=.*\d).+$/u, message: t("validation.passwordLetterDigit") },
  ];
}

/** "Confirm password" field rules: required and equal to the field `other`. */
export function confirmPasswordRule(t: Translate, other: string): FormRule[] {
  return [
    { required: true, message: t("validation.repeatPassword") },
    ({ getFieldValue }) => ({
      validator: (_, value) => !value || value === getFieldValue(other)
        ? Promise.resolve()
        : Promise.reject(new Error(t("validation.passwordsDontMatch"))),
    }),
  ];
}

/** Suggests a subdomain from a company name: "Hodan Estates" -> "hodan-estates". */
export function suggestSlug(companyName: string): string {
  return companyName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}
