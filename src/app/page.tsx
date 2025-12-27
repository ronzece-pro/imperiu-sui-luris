import GlobeHero from "@/components/dashboard/GlobeHero";
import Navbar from "@/components/layout/Navbar";

export const metadata = {
  title: "Imperiu Sui Luris - Libertate, Fraternitate, Durabilitate",
  description:
    "O țară virtuală dedicată protecției apei, hranei naturale și energiei curate. Devino cetățean și construiește viitorul cu noi.",
  keywords: ["virtual nation", "sustainability", "freedom", "community"],
  openGraph: {
    title: "Imperiu Sui Luris",
    description: "A virtual nation dedicated to freedom, fraternity, and sustainability",
    url: "https://imperiu-sui-luris.com",
    type: "website",
  },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <GlobeHero />
    </>
  );
}
