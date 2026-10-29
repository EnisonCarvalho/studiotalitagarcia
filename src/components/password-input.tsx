import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <input {...props} type={visible ? "text" : "password"} className={cn("w-full rounded-lg border border-input bg-card px-4 py-3 pr-14 outline-none focus:border-primary", className)} />
    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible} title={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible((v) => !v)}>
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button>
  </div>;
}