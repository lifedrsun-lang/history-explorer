"use client";

type Props = {
  email: string;
  password: string;
  errorMessage: string;
  isSubmitting: boolean;
  rememberLogin: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setRememberLogin: (value: boolean) => void;
  onLogin: () => void;
};

export default function TeacherLogin({
  email,
  password,
  errorMessage,
  isSubmitting,
  rememberLogin,
  setEmail,
  setPassword,
  setRememberLogin,
  onLogin,
}: Props) {
  return (
    <div className="min-h-[100dvh] bg-[#f5f7fb] flex items-center justify-center p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onLogin();
        }}
        className="bg-white shadow-xl rounded-3xl p-6 w-full max-w-sm"
      >
        <div className="text-2xl font-bold mb-4 text-center">
          Teacher Login
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className="w-full border rounded-2xl px-4 py-3 mb-4 outline-none"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="w-full border rounded-2xl px-4 py-3 mb-4 outline-none"
        />

        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
          <input
            type="checkbox"
            checked={rememberLogin}
            onChange={(event) => setRememberLogin(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-yellow-500"
          />
          <span>이 기기에서 로그인 유지</span>
        </label>

        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-yellow-500 rounded-2xl py-3 font-bold text-white disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
