import React from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import WorkflowSection from "@/components/landing/WorkflowSection";
import EditorShowcase from "@/components/landing/EditorShowcase";
import ExistingCVSection from "@/components/landing/ExistingCVSection";
import TemplateShowcase from "@/components/landing/TemplateShowcase";
import AudienceSection from "@/components/landing/AudienceSection";
import DigitalPresenceSection from "@/components/landing/DigitalPresenceSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf9fd] selection:bg-[#f3f0ff] selection:text-[#6e56cf]">
      <Navbar />
      <main className="flex-1 w-full">
        <Hero />
        <WorkflowSection />
        <EditorShowcase />
        <ExistingCVSection />
        <TemplateShowcase />
        <AudienceSection />
        <DigitalPresenceSection />
        <BenefitsSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
