"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TaglineSection from "@/components/TaglineSection";
import GraphMappingSection from "@/components/GraphMappingSection";
import FeaturesSection from "@/components/FeaturesSection";
import AgentSection from "@/components/AgentSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TaglineSection />
        <GraphMappingSection />
        <FeaturesSection />
        <AgentSection />
      </main>
      <Footer />
    </>
  );
}
