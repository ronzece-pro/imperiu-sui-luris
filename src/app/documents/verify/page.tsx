import { Suspense } from "react";

import VerifyClient from "./VerifyClient";

export default function DocumentVerifyPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />}
    >
      <VerifyClient />
    </Suspense>
  );
}
