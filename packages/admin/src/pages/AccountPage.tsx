import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, TriangleAlert } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import type { PayloadUser } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export function AccountPage() {
  const { user } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordProblem, setPasswordProblem] = useState<string | null>(null);

  const profileMutation = useMutation({
    mutationFn: (payload: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    }) => {
      if (!user) throw new Error("Not signed in.");
      return api.patch<PayloadUser>(`/api/users/${user.id}?depth=0`, payload);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload: { password: string }) => {
      if (!user) throw new Error("Not signed in.");
      return api.patch<PayloadUser>(`/api/users/${user.id}?depth=0`, payload);
    },
  });

  if (!user) {
    // RequireAuth guarantees a signed-in user; this only satisfies TypeScript.
    return null;
  }

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    profileMutation.reset();
    profileMutation.mutate({
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      email: email.trim(),
    });
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordProblem(null);
    passwordMutation.reset();
    if (!password) {
      setPasswordProblem("Enter a new password.");
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordProblem("Passwords do not match.");
      return;
    }
    passwordMutation.mutate({ password });
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordProblem(null);
    passwordMutation.reset();
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.username} ({user.role})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="account-first-name">
                    First name
                  </FieldLabel>
                  <Input
                    id="account-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="account-last-name">Last name</FieldLabel>
                  <Input
                    id="account-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="account-email">Email</FieldLabel>
                <Input
                  id="account-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <FieldDescription>
                  Also used to sign in alongside your username (
                  {user.username}).
                </FieldDescription>
              </Field>

              {profileMutation.isSuccess && (
                <Alert>
                  <CheckCircle2 />
                  <AlertTitle>Profile updated.</AlertTitle>
                </Alert>
              )}
              {profileMutation.isError && (
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>Could not update profile.</AlertTitle>
                  <AlertDescription>
                    {errorMessage(profileMutation.error)}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Button type="submit" disabled={profileMutation.isPending}>
                  {profileMutation.isPending && <Spinner className="size-4" />}
                  Save changes
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Set a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="account-password">
                    New password
                  </FieldLabel>
                  <Input
                    id="account-password"
                    type="password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="account-password-confirm">
                    Confirm password
                  </FieldLabel>
                  <Input
                    id="account-password-confirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
              </div>

              {passwordProblem && (
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>{passwordProblem}</AlertTitle>
                </Alert>
              )}
              {passwordMutation.isError && (
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>Could not update password.</AlertTitle>
                  <AlertDescription>
                    {errorMessage(passwordMutation.error)}
                  </AlertDescription>
                </Alert>
              )}
              {passwordMutation.isSuccess && (
                <Alert>
                  <CheckCircle2 />
                  <AlertTitle>Password updated.</AlertTitle>
                  <AlertDescription>
                    Use the new password the next time you sign in.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending && <Spinner className="size-4" />}
                  Update password
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
