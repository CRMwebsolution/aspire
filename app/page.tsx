import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Check,
  CheckCircle2,
  Clock3,
  Gift,
  GraduationCap,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { AssessmentForm } from "@/components/assessment-form";

const packages = [
  {
    name: "Exterior Wash",
    car: "$34.95",
    large: "$39.95",
    summary: "A crisp maintenance wash with polish and protection.",
    includes: ["Wash & dry", "Quick polish / sealer", "Windows & door jambs", "Wheels & tire dressing"],
  },
  {
    name: "Exterior Detail",
    car: "$74.95",
    large: "$79.95",
    summary: "Decontamination and shine for tired exterior surfaces.",
    includes: ["Foam bath", "Clay bar", "Bug & tar removal", "Quick polish / sealer"],
  },
  {
    name: "Interior Clean",
    car: "$99.95",
    large: "$109.95",
    summary: "A practical interior reset for your daily driver.",
    includes: ["Full vacuum", "Hard-surface wipe-down", "Leather, plastic & trim", "Windows & door jambs"],
  },
  {
    name: "Standard Detail",
    car: "$119.95",
    large: "$129.95",
    summary: "Our streamlined inside-and-out maintenance package.",
    includes: ["Interior cleaning", "Exterior cleaning", "Windows inside & out", "Wheels & tires"],
  },
  {
    name: "Interior Detail",
    car: "$149.95",
    large: "$159.95",
    summary: "A deeper clean focused on stains, surfaces and comfort.",
    includes: ["Full vacuum", "Surface stain removal", "Scrub & clean all trim", "Leather & surface conditioning"],
  },
  {
    name: "Full Detail",
    car: "$269.95",
    large: "$289.95",
    summary: "The complete interior and exterior transformation.",
    includes: ["Interior Detail package", "Exterior Detail package", "Clay-bar decontamination", "Conditioning & protection"],
    featured: true,
  },
];

const reviews = [
  { quote: "My car looks brand new!", name: "Tesha Lisa Cox" },
  { quote: "Friendly and affordable.", name: "Natasha Rene" },
  { quote: "Showroom quality each and every time.", name: "Ryan Riggs" },
];

const hours = [
  ["Monday", "8:30 a.m. – 3:30 p.m."],
  ["Tuesday", "Closed"],
  ["Wednesday", "Closed"],
  ["Thursday", "8:30 a.m. – 3:30 p.m."],
  ["Friday", "8:30 a.m. – 3:30 p.m."],
  ["Saturday", "By appointment"],
  ["Sunday", "Closed"],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="promo-bar">
        <span>End-of-summer Clay &amp; Seal</span>
        <strong>From $119.99 · through Oct 12</strong>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Aspire Mobil Detailing home">
          <span className="brand-mark">A</span>
          <span>ASPIRE <small>MOBIL DETAILING</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#services">Services</a>
          <a href="#specialty">Specialty</a>
          <a href="#about">Why Aspire</a>
          <a href="#training">Training</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="header-call" href="tel:+12522691517"><Phone size={17} /> (252) 269-1517</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><MapPin size={15} /> Eastern North Carolina · We come to you</div>
          <h1>Cleaner rides.<br /><em>Happier miles.</em></h1>
          <p>Certified mobile detailing for cars, trucks, boats, side-by-sides and RVs across Carteret, Onslow and Craven counties.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#contact">Request an assessment <ArrowUpRight size={18} /></a>
            <a className="button button-secondary" href="#services">Explore services</a>
          </div>
          <div className="trust-row" aria-label="Business highlights">
            <span><CheckCircle2 /> CARETech Certified</span>
            <span><CheckCircle2 /> 100% recommended</span>
            <span><CheckCircle2 /> Mobile service</span>
          </div>
        </div>

        <div className="hero-visual">
          <Image className="hero-image" src="/mobile-auto-detailing-hero.png" alt="Glossy black vehicle being washed with detailing foam" fill priority sizes="(max-width: 980px) 100vw, 50vw" />
          <div className="hero-image-shade" />
          <p className="motto">“Never a problem, Always a solution.”</p>
          <div className="service-ticket">
            <span className="ticket-kicker">POPULAR PACKAGE</span>
            <div><Sparkles size={22} /><strong>Full Detail</strong></div>
            <p>Interior detail + exterior detail package</p>
            <footer><span>Starting at</span><b>$269.95</b></footer>
          </div>
        </div>
      </section>

      <section className="service-strip" aria-label="Popular services">
        <div className="strip-intro">
          <span>01 / SERVICES</span>
          <h2>A clean that meets you where you are.</h2>
        </div>
        {packages.slice(3).map((service) => (
          <article className="service-card" key={service.name}>
            <p>{service.summary}</p>
            <h3>{service.name}</h3>
            <span>from <strong>{service.car}</strong></span>
          </article>
        ))}
      </section>

      <section className="section pricing-section" id="services">
        <div className="section-heading">
          <div>
            <span className="section-index">01 / PACKAGES</span>
            <h2>Choose your level of clean.</h2>
          </div>
          <p>Prices shown are starting points. Vehicle size and condition may affect the final price, so every job begins with an assessment.</p>
        </div>

        <div className="package-grid">
          {packages.map((pkg) => (
            <article className={`package-card ${pkg.featured ? "featured" : ""}`} key={pkg.name}>
              {pkg.featured && <span className="featured-tag">MOST COMPLETE</span>}
              <p className="package-summary">{pkg.summary}</p>
              <h3>{pkg.name}</h3>
              <div className="price-row">
                <div><span>Cars / mid-size</span><strong>{pkg.car}</strong></div>
                <div><span>Large SUV / truck / van</span><strong>{pkg.large}</strong></div>
              </div>
              <ul>{pkg.includes.map((item) => <li key={item}><Check size={15} /> {item}</li>)}</ul>
              <a href="#contact">Ask about this package <ArrowRight size={16} /></a>
            </article>
          ))}
        </div>

        <div className="addon-row">
          <span>Add-on services</span>
          <div><b>Headlight renewal</b><em>$49.95</em></div>
          <div><b>Steam cleaning</b><em>from $59.95</em></div>
          <div><b>Engine bay</b><em>$64.95</em></div>
          <div><b>Deep shampoo</b><em>from $89.95</em></div>
        </div>
      </section>

      <section className="specialty-section" id="specialty">
        <div className="specialty-copy">
          <span className="section-index">02 / RESTORE &amp; PROTECT</span>
          <h2>More than a wash.<br />Built for the long haul.</h2>
          <p>From paint correction to long-term coating protection, we build the right process around your vehicle’s condition and the finish you want.</p>
          <div className="specialty-actions">
            <a className="button button-primary" href="#contact">Schedule a consultation <ArrowUpRight size={18} /></a>
            <a className="text-link" href="tel:+12522691517">Call to talk it through</a>
          </div>
        </div>
        <div className="specialty-cards">
          <article>
            <span>01</span>
            <ShieldCheck />
            <h3>Ceramic &amp; graphene coating</h3>
            <p>Professional preparation and application with an in-person consultation.</p>
            <strong>from $849.95</strong>
          </article>
          <article>
            <span>02</span>
            <Sparkles />
            <h3>Exterior re-conditioning</h3>
            <p>Buff and polish to improve gloss and address visible paint defects. Test spots recommended.</p>
            <strong>from $299.95</strong>
          </article>
          <article>
            <span>03</span>
            <MapPin />
            <h3>Boats, RVs &amp; specialty vehicles</h3>
            <p>Mobile detailing for boats, side-by-sides, motor homes, campers and RVs.</p>
            <strong>assessment required</strong>
          </article>
        </div>
      </section>

      <section className="section process-section" id="about">
        <div className="section-heading">
          <div>
            <span className="section-index">03 / THE ASPIRE WAY</span>
            <h2>Simple from first call to final shine.</h2>
          </div>
          <p>We match the service to the vehicle instead of forcing every customer into the same package.</p>
        </div>
        <div className="process-grid">
          {[
            ["01", "Request an assessment", "Tell us what you drive, where you are and what result you want."],
            ["02", "Get your recommendation", "We assess size, condition and goals, then confirm the service and price."],
            ["03", "We come to you", "Aspire arrives at the scheduled location and handles the transformation."],
            ["04", "Enjoy the finish", "Drive away clean, protected and ready for happier miles."],
          ].map(([number, title, text]) => (
            <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
        <div className="credential-panel">
          <Award />
          <div><span>CERTIFIED CARE</span><h3>Majestic Solutions CARETech Certified Alumni</h3></div>
          <p>Training-backed technique, a problem-solving mindset, and service that respects your vehicle.</p>
        </div>
      </section>

      <section className="training-section" id="training">
        <div className="training-lead">
          <GraduationCap />
          <span className="section-index">04 / DETAILING SCHOOL</span>
          <h2>Learn the craft.<br />Build the business.</h2>
          <p>Professional auto-detailing education in Carteret County, from core cleaning skills through coatings and business essentials.</p>
          <a className="button button-secondary" href="#contact">Ask about the next class <ArrowRight size={18} /></a>
        </div>
        <div className="course-list">
          <article><span>LEVEL 1</span><div><h3>Basic Core Auto Detailing</h3><p>Interior, exterior, reconditioning, stains, odors and extraction.</p></div><strong>$500</strong></article>
          <article><span>LEVEL 2</span><div><h3>Intermediate</h3><p>Paint correction, sanding, leveling and scratch-removal technique.</p></div><strong>$600</strong></article>
          <article><span>LEVEL 3</span><div><h3>Advanced</h3><p>Ceramic and graphene coatings, SOPs and business essentials.</p></div><strong>$700</strong></article>
          <article className="master-course"><span>MASTER</span><div><h3>All three levels</h3><p>A complete progression from fundamentals through advanced coatings.</p></div><strong>$1,500</strong></article>
          <small>Course dates, duration, inclusions and promotional pricing are confirmed during enrollment.</small>
        </div>
      </section>

      <section className="rewards-section">
        <div className="rewards-card">
          <Gift />
          <span>GIFT CARDS</span>
          <h2>A cleaner ride is always a good gift.</h2>
          <p>Available in $50, $100 and $200 amounts toward detailing services.</p>
          <a href="#contact">Ask about a gift card <ArrowRight size={16} /></a>
        </div>
        <div className="loyalty-card">
          <Star />
          <span>LOYALTY POINTS</span>
          <h2>Come back. Get rewarded.</h2>
          <div className="points"><b>50</b><p>points to enroll</p></div>
          <ul><li>25 points · cleaning, trim or merch rewards</li><li>50 points · leather, engine bay or apparel</li><li>100 points · free Standard Cleaning</li><li>200 points · free Deep Shampoo</li></ul>
          <small>Ask Aspire for current earning and redemption terms.</small>
        </div>
      </section>

      <section className="section review-section">
        <div className="review-score">
          <span>FACEBOOK REVIEWS</span>
          <strong>100%</strong>
          <p>recommended by all five visible reviewers</p>
          <div>{[1, 2, 3, 4, 5].map((star) => <Star key={star} fill="currentColor" />)}</div>
        </div>
        <div className="review-grid">
          {reviews.map((review) => (
            <blockquote key={review.name}><p>“{review.quote}”</p><footer>— {review.name}</footer></blockquote>
          ))}
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-intro">
          <span className="section-index">05 / GET STARTED</span>
          <h2>Start with the right kind of request.</h2>
          <p>Choose vehicle detailing or professional training, then share the details Aspire needs to follow up.</p>
          <div className="contact-methods">
            <a href="tel:+12522691517"><Phone /><span>Call Aspire<strong>(252) 269-1517</strong></span></a>
            <div><MapPin /><span>Mobile service<strong>Carteret · Onslow · Craven</strong></span></div>
            <div><Clock3 /><span>Regular service days<strong>Monday · Thursday · Friday</strong></span></div>
          </div>
          <div className="hours-card">
            <h3>Current hours</h3>
            {hours.map(([day, time]) => <div key={day}><span>{day}</span><strong>{time}</strong></div>)}
          </div>
        </div>
        <div className="form-shell">
          <div className="form-heading"><span>CONTACT ASPIRE</span><h3>Start your request</h3><p>Select detailing or classes to see the right questions.</p></div>
          <AssessmentForm />
        </div>
      </section>

      <footer className="footer">
        <div className="brand"><span className="brand-mark">A</span><span>ASPIRE <small>MOBIL DETAILING</small></span></div>
        <p>Certified mobile detailing across Carteret, Onslow and Craven counties, North Carolina.</p>
        <div className="socials">
          <a href="https://www.facebook.com/kristalsaspirations" target="_blank" rel="noreferrer" aria-label="Aspire on Facebook">fb</a>
          <a href="https://www.instagram.com/sun1985shine" target="_blank" rel="noreferrer" aria-label="Aspire on Instagram">ig</a>
        </div>
        <small>Prices are starting points and may vary by vehicle size and condition. Holiday closures may apply.</small>
      </footer>
    </main>
  );
}
