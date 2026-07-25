import { Mic, Cpu, BarChart3, Users } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Mic,
    title: "Citizens Submit",
    description:
      "A resident reports a broken water pipe via WhatsApp voice note in Kiswahili. No app, no account, no barrier.",
  },
  {
    step: "02",
    icon: Cpu,
    title: "AI Processes",
    description:
      "Gemma 4 transcribes, translates, detects location, assigns category, urgency score, and clusters it with similar reports.",
  },
  {
    step: "03",
    icon: BarChart3,
    title: "Intelligence Generated",
    description:
      "AI digests combine community reports with public data — census, CDF budgets, infrastructure maps — to score priorities.",
  },
  {
    step: "04",
    icon: Users,
    title: "Leaders Act",
    description:
      "MPs and county officers receive ward-level briefings with ranked issues, underserved areas, and resource recommendations.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-border bg-background px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Four steps from concern to action
          </h2>
        </div>

        {/* Steps — horizontal on desktop, stacked on mobile */}
        <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connecting line visible on lg */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-9 hidden h-px bg-border lg:block"
          />

          {steps.map(({ step, icon: Icon, title, description }) => (
            <div key={step} className="relative flex flex-col items-start gap-3">
              {/* Icon circle — sits on top of the connecting line */}
              <div className="relative z-10 flex size-[52px] shrink-0 items-center justify-center rounded-full border-2 border-border bg-background">
                <Icon className="size-5 text-primary" />
              </div>

              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Step {step}
                </p>
                <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
