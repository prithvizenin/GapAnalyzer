import { Nav } from "@/components/Nav";
import { Hero } from "@/components/landing/Hero";
import { StepsBand, FeatureRow } from "@/components/landing/Sections";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <StepsBand />
        <FeatureRow />
      </main>
    </>
  );
}
