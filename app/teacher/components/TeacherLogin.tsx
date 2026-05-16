"use client";

type Props = {
  passwordInput: string;
  setPasswordInput: (
    value: string
  ) => void;

  onLogin: () => void;
};

export default function TeacherLogin({
  passwordInput,
  setPasswordInput,
  onLogin,
}: Props) {

  return (

    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-4">

      <div className="bg-white shadow-xl rounded-3xl p-6 w-full max-w-sm">

        <div className="text-2xl font-bold mb-4 text-center">
          🔒 교사용 입장
        </div>

        <input
          type="password"
          placeholder="비밀번호 입력"
          value={passwordInput}
          onChange={(e) =>
            setPasswordInput(
              e.target.value
            )
          }
          className="w-full border rounded-2xl px-4 py-3 mb-4 outline-none"
        />

        <button
          onClick={onLogin}
          className="w-full bg-yellow-500 rounded-2xl py-3 font-bold text-white"
        >
          입장하기
        </button>

      </div>

    </div>

  );

}