import type { Metadata } from "next"

import { PosView } from "@/components/pos/pos-view"

export const metadata: Metadata = {
  title: "POS",
}

export default function PosPage() {
  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PosView />
    </div>
  )
}