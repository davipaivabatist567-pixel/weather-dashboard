import { PlannerProvider } from "@/components/PlannerContext";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Destinations } from "@/components/sections/Destinations";
import { Experiences } from "@/components/sections/Experiences";
import { TripPlanner } from "@/components/sections/TripPlanner";
import { Feature } from "@/components/sections/Feature";
import { WhyAurora } from "@/components/sections/WhyAurora";
import { Testimonials } from "@/components/sections/Testimonials";
import { Faq } from "@/components/sections/Faq";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <PlannerProvider>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-sm focus:text-navy"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Hero />
        <Destinations />
        <Experiences />
        <TripPlanner />
        <Feature />
        <WhyAurora />
        <Testimonials />
        <Faq />
      </main>
      <Footer />
    </PlannerProvider>
  );
}
