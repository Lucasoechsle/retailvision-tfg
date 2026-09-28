"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES, passwordAttributeIssues, type PasswordContext } from "@/lib/schemas/auth";

/** Requisitos de la contraseña, marcados a medida que se escribe. */
export function PasswordChecklist({ password, context }: { password: string; context: PasswordContext }) {
  const attributeIssues = password ? passwordAttributeIssues(password, context) : [];

  return (
    <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Requisitos de la contraseña">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.key}
            className={cn("flex items-center gap-1.5", ok ? "text-emerald-500" : "text-muted-foreground")}
          >
            {ok ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0 opacity-60" />}
            {rule.label}
          </li>
        );
      })}
      {attributeIssues.map((issue) => (
        <li key={issue} className="flex items-center gap-1.5 text-destructive sm:col-span-2">
          <X className="h-3.5 w-3.5 shrink-0" />
          {issue}
        </li>
      ))}
    </ul>
  );
}
