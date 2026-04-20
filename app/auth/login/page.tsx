import { login } from "./actions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm rounded-xl border p-6 shadow">
        <h1 className="text-2xl font-bold mb-2">Login</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Connecte-toi à ton compte
        </p>

        <form action={login} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="border rounded-md px-3 py-2 text-black"
              placeholder="m@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="border rounded-md px-3 py-2 text-black"
              placeholder="********"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : null}

          <button
            type="submit"
            className="rounded-md bg-white text-black px-4 py-2 border"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
