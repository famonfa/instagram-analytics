"use client";

type ConnectButtonProps = {
  label?: string;
};

export default function ConnectButton({
  label = "Continue with Facebook",
}: ConnectButtonProps) {
  return (
    <button
      className="inline-flex items-center justify-center rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f6ad8]"
      onClick={() => {
        window.location.href = "/api/facebook/login";
      }}
    >
      {label}
    </button>
  );
}
