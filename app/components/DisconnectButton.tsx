"use client";

type DisconnectButtonProps = {
  onDisconnected?: () => void;
};

export default function DisconnectButton({
  onDisconnected,
}: DisconnectButtonProps) {
  return (
    <button
      className="inline-flex items-center justify-center rounded-md border border-transparent bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-300"
      onClick={async () => {
        await fetch("/api/facebook/logout", { method: "POST" });
        if (onDisconnected) {
          onDisconnected();
        } else {
          window.location.href = "/";
        }
      }}
    >
      Disconnect
    </button>
  );
}
