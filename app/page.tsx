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
import { formatPrice, getPublicSiteData } from "@/lib/aspire/public-data";

export const revalidate = 60;

function displayAmount(value: number | null) {
  if (value === null) return "Quote only";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}

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

export default async function Home() {
  const { catalog, rewards, loyalty } = await getPublicSiteData();
  const packages = catalog.filter((item) => item.section === "package");
  const addons = catalog.filter((item) => item.section === "addon");
  const specialty = catalog.filter((item) => item.section === "specialty");
  const courses = catalog.filter((item) => item.section === "course");
  const featuredPackage = packages.find((item) => item.is_featured) ?? packages.at(-1);
  const specialtyIcons = [ShieldCheck, Sparkles, MapPin];

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
          {featuredPackage && <div className="service-ticket">
            <span className="ticket-kicker">POPULAR PACKAGE</span>
            <div><Sparkles size={22} /><strong>{featuredPackage.name}</strong></div>
            <p>{featuredPackage.summary}</p>
            <footer><span>{featuredPackage.is_quote_only ? "Custom pricing" : featuredPackage.is_starting_at ? "Starting at" : "Price"}</span><b>{featuredPackage.is_quote_only ? "Quote" : displayAmount(featuredPackage.primary_price)}</b></footer>
          </div>}
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
            <span><strong>{formatPrice(service)}</strong></span>
          </article>
        ))}
      </section>

      <section className="section pricing-section" id="services">
        <div className="section-heading">
          <div>
            <span className="section-index">01 / PACKAGES</span>
            <h2>Choose your level of clean.</h2>
          </div>
          <p>Prices marked “from” are starting points. Vehicle size and condition may affect the final price, so every job begins with an assessment.</p>
        </div>

        <div className="package-grid">
          {packages.map((pkg) => (
            <article className={`package-card ${pkg.is_featured ? "featured" : ""}`} key={pkg.id}>
              {pkg.is_featured && <span className="featured-tag">MOST COMPLETE</span>}
              <p className="package-summary">{pkg.summary}</p>
              <h3>{pkg.name}</h3>
              <div className="price-row">
                <div><span>{pkg.primary_price_label || "Primary price"}</span><strong>{pkg.is_quote_only ? "Quote only" : `${pkg.is_starting_at ? "from " : ""}${displayAmount(pkg.primary_price)}`}</strong></div>
                {pkg.secondary_price !== null && <div><span>{pkg.secondary_price_label || "Secondary price"}</span><strong>{pkg.is_starting_at ? "from " : ""}{displayAmount(pkg.secondary_price)}</strong></div>}
              </div>
              <ul>{pkg.features.map((item) => <li key={item}><Check size={15} /> {item}</li>)}</ul>
              <a href="#contact">Ask about this package <ArrowRight size={16} /></a>
            </article>
          ))}
        </div>

        <div className="addon-row">
          <span>Add-on services</span>
          {addons.map((item) => <div key={item.id}><b>{item.name}</b><em>{formatPrice(item)}</em></div>)}
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
          {specialty.map((item, index) => {
            const Icon = specialtyIcons[index % specialtyIcons.length];
            return <article key={item.id}><span>{item.level_label || String(index + 1).padStart(2, "0")}</span><Icon /><h3>{item.name}</h3><p>{item.summary}</p><strong>{formatPrice(item)}</strong></article>;
          })}
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
          {courses.map((course) => <article className={course.level_label === "MASTER" ? "master-course" : ""} key={course.id}><span>{course.level_label || "COURSE"}</span><div><h3>{course.name}</h3><p>{course.summary}</p></div><strong>{formatPrice(course)}</strong></article>)}
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
          <div className="points"><b>{loyalty.enrollment_points}</b><p>points to enroll</p></div>
          <ul>{rewards.map((reward) => <li key={reward.id}>{reward.points_cost} points · {reward.name}</li>)}</ul>
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
          <AssessmentForm
            serviceOptions={[...packages, ...addons, ...specialty].map((item) => item.name)}
            classOptions={courses.map((item) => `${item.level_label ? `${item.level_label} - ` : ""}${item.name}`)}
          />
        </div>
      </section>

      <footer className="footer">
        <div className="brand"><span className="brand-mark">A</span><span>ASPIRE <small>MOBIL DETAILING</small></span></div>
        <p>Certified mobile detailing across Carteret, Onslow and Craven counties, North Carolina.</p>
        <div className="socials">
          <a href="https://www.facebook.com/kristalsaspirations" target="_blank" rel="noreferrer" aria-label="Aspire on Facebook">fb</a>
          <a href="https://www.instagram.com/sun1985shine" target="_blank" rel="noreferrer" aria-label="Aspire on Instagram">ig</a>
        </div>
        <small>Prices marked “from” may vary by vehicle size and condition. Holiday closures may apply.</small>
      </footer>
    </main>
  );
}
