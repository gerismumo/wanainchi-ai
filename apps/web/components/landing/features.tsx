import {
  Brain,
  Globe,
  MapPin,
  BarChart3,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Understanding",
    description:
      "Gemma 4 automatically transcribes, translates, classifies, and clusters similar reports from any language or format.",
  },
  {
    icon: MapPin,
    title: "Geolocation Intelligence",
    description:
      "Reports are geo-tagged to ward, constituency, and county level — enabling hyper-local development priorities.",
  },
  {
    icon: BarChart3,
    title: "Priority Scoring",
    description:
      "Urgency and priority scores combine community volume, public dataset signals, and AI reasoning into ranked actions.",
  },
  {
    icon: Globe,
    title: "Multimodal Submission",
    description:
      "Citizens submit via WhatsApp, SMS, or the web in English or Kiswahili — voice, text, and photo all supported.",
  },
  {
    icon: ShieldCheck,
    title: "Spam & Abuse Detection",
    description:
      "Device trust scores and AI-powered duplicate detection keep the data clean without requiring citizens to log in.",
  },
  {
    icon: TrendingUp,
    title: "Evidence-Backed Reports",
    description:
      "AI digests merge citizen reports with census, CDF, infrastructure, and budget data to produce actionable briefs for leaders.",
  },
];

export function Features() {
  return (
    <section className="border-b border-border bg-muted/30 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            Platform Features
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            From fragmented voices to structured intelligence
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            WananchiAI turns millions of raw citizen reports into the evidence
            base that development planning has always been missing.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-4 text-primary" />
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-card-foreground">{title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
