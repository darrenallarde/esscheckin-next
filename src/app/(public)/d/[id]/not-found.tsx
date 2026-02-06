import Link from "next/link";

export default function DevotionalNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-semibold text-stone-900">
          Devotional Not Available
        </h1>
        <p className="text-base text-stone-600">
          This devotional may not be published yet, or the link may be incorrect.
          Check with your youth pastor for the latest devotional link.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
