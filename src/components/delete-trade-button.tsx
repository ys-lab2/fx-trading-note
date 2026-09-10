"use client";

export default function DeleteTradeButton({
  id,
  action,
}: {
  id: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("この記録を削除しますか？")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label="削除"
        title="削除"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)] transition-all hover:from-red-400 hover:to-red-600 active:translate-y-px active:shadow-[inset_0_2px_3px_rgba(0,0,0,0.45)]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </form>
  );
}
