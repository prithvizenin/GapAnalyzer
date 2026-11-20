"use client"

import DoodleCrewFooter from "@/components/ui/doodle-crew-footer"

export default function Demo() {
  // w-full matters: a flex item left at width:auto shrinks the wordmark to nothing.
  return (
    <div className="w-full">
      <DoodleCrewFooter />
    </div>
  )
}
