import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { api, ApiError } from "@/lib/api";

const schema = z.object({
  login: z.string().trim().min(1, "Login required"),
  password: z.string().min(1, "Password required"),
  remember: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — QA Admin" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { creds, signIn } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { login: "", password: "", remember: true },
  });

  useEffect(() => {
    if (creds) navigate({ to: "/", replace: true });
  }, [creds, navigate]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const c = btoa(`${values.login}:${values.password}`);
      await api.ping(c);
      signIn(values.login, values.password, values.remember);
      navigate({ to: "/", replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setServerError(e.message || "Failed to sign in.");
      } else {
        setServerError(e instanceof Error ? e.message : "Failed to sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label="Toggle theme"
        className="absolute right-4 top-4 h-9 w-9"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <div className="h-4 w-4 rounded-sm bg-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">QA knowledge base admin</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="login">Login</Label>
            <Input id="login" autoComplete="username" autoFocus {...register("login")} />
            {errors.login && <p className="text-xs text-destructive">{errors.login.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={watch("remember")}
              onCheckedChange={(v) => setValue("remember", Boolean(v))}
            />
            <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-muted-foreground">
              Remember me
            </Label>
          </div>

          {serverError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
