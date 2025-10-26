import { LoginForm } from "@/components/shared/LoginForm";

type LoginPageProps = {
  searchParams?: {
    returnTo?: string;
  };
};

export default function Page({ searchParams }: LoginPageProps) {
  const returnTo = searchParams?.returnTo ?? null;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm returnTo={returnTo} />
      </div>
    </div>
  );
}
