import Footer from "../components/Footer";
import Hero from "../components/Hero";
import Section2 from "./Section2";
import Section3 from "./Section3";

const Home = () => {
  return (
    <>
      <section id="welcome" aria-label="Welcome" className="scroll-mt-24">
        <Hero />
      </section>
      <section id="incident" aria-label="Incident flow" className="scroll-mt-24">
        <Section2 />
      </section>
      <section
        id="capabilities"
        aria-label="Capabilities"
        className="scroll-mt-24"
      >
        <Section3 />
      </section>

      <Footer />

    </>
  );
};

export default Home;
