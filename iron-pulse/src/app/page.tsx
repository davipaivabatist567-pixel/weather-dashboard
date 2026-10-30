import { LeadProvider } from "@/components/LeadContext";
import { PrivacyDialog } from "@/components/Privacy";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Impact } from "@/components/sections/Impact";
import { Structure } from "@/components/sections/Structure";
import { Modalities } from "@/components/sections/Modalities";
import { Plans } from "@/components/sections/Plans";
import { Team } from "@/components/sections/Team";
import { Motivation } from "@/components/sections/Motivation";
import { Enroll } from "@/components/sections/Enroll";
import { Location } from "@/components/sections/Location";
import { Faq } from "@/components/sections/Faq";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <LeadProvider>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-lime focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Hero />
        <Marquee />
        <Impact />
        <Structure />
        <Modalities />
        <Plans />
        <Team />
        <Motivation />
        <Enroll />
        <Location />
        <Faq />
      </main>
      <Footer />
      <PrivacyDialog />
    </LeadProvider>
  );
}
