"use client";

import { useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, CircleAlert, Minus, Plus, X } from "lucide-react";
import { site } from "@/config/site";
import { destinations } from "@/data/destinations";
import { budgets, MAX_TRAVELERS, tripTypes } from "@/data/planner";
import {
  emptyPlanner,
  fieldOrder,
  summaryRows,
  today,
  validateAll,
  validateField,
  whatsappMessage,
  type PlannerErrors,
  type PlannerField,
  type PlannerValues,
} from "@/lib/planner";
import { whatsappUrl } from "@/lib/whatsapp";
import { usePlanner } from "@/components/PlannerContext";
import { Dialog } from "@/components/ui/Dialog";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { arrowClass, buttonClass } from "@/components/ui/button";

const steps = [
  { title: "Conte o essencial", text: "Destino, datas, quem vai e quanto pretende investir." },
  { title: "Revise o resumo", text: "Confira tudo antes de enviar. Dá para editar o que quiser." },
  { title: "Envie pelo WhatsApp", text: "Um especialista continua a conversa e prepara a proposta." },
];

const noSubscribe = () => () => {};

const inputClass =
  "block h-13 w-full rounded-none border-0 border-b bg-transparent px-0 text-base text-navy placeholder:text-navy/35 focus:outline-none focus-visible:outline-none transition-colors";

export function TripPlanner() {
  const { request } = usePlanner();
  const [values, setValues] = useState<PlannerValues>(emptyPlanner);
  const [errors, setErrors] = useState<PlannerErrors>({});
  const [status, setStatus] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // a data mínima depende do relógio de quem visita: calculada só no navegador
  const minDate = useSyncExternalStore(noSubscribe, today, () => undefined);

  // pedido vindo de um cartão de destino ou de experiência: preenche o campo correspondente
  const [appliedRequest, setAppliedRequest] = useState<number | null>(null);
  if (request && request.id !== appliedRequest) {
    setAppliedRequest(request.id);
    setValues((v) => ({
      ...v,
      destino: request.destination ?? v.destino,
      tipo: request.tripType ?? v.tipo,
    }));
    setErrors((e) => ({ ...e, ...(request.destination && { destino: undefined }), ...(request.tripType && { tipo: undefined }) }));
    const text = request.destination
      ? `Destino preenchido: ${request.destination}.`
      : request.tripType
        ? `Tipo de viagem preenchido: ${request.tripType}.`
        : "";
    setStatus(text ? { tone: "info", text } : null);
  }

  const set = (field: PlannerField, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    // depois do primeiro erro, o campo é revalidado enquanto a pessoa corrige
    if (errors[field]) setErrors((e) => ({ ...e, [field]: validateField(field, next) }));
    if (field === "ida" && errors.volta) setErrors((e) => ({ ...e, volta: validateField("volta", next) }));
  };

  const blur = (field: PlannerField) => {
    if (!values[field] && field !== "viajantes") return; // não acusa erro em campo que a pessoa só atravessou
    setErrors((e) => ({ ...e, [field]: validateField(field, values) }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateAll(values);
    setErrors(found);
    const invalid = fieldOrder.filter((f) => found[f]);
    if (invalid.length) {
      setStatus({
        tone: "error",
        text: invalid.length === 1 ? "Falta corrigir 1 campo." : `Faltam corrigir ${invalid.length} campos.`,
      });
      formRef.current?.querySelector<HTMLElement>(`[name="${invalid[0]}"]`)?.focus();
      return;
    }
    setStatus(null);
    setSent(false);
    setSummaryOpen(true);
  };

  const travelers = Number(values.viajantes) || 0;
  const step = (delta: number) =>
    set("viajantes", String(Math.min(MAX_TRAVELERS, Math.max(1, travelers + delta))));

  return (
    <section id="planejar" aria-labelledby="planejar-title" className="relative overflow-hidden bg-navy py-24 text-white sm:py-32 lg:py-40">
      {/* brilho de amanhecer, bem discreto */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(197_164_109/0.16),transparent)]"
      />
      <div className="relative mx-auto grid max-w-[90rem] gap-16 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12">
        <div className="lg:col-span-5">
          <SectionHeading
            index="03"
            label="Planejador"
            id="planejar-title"
            tone="dark"
            title={
              <>
                Comece a desenhar <em className="text-gold">sua viagem.</em>
              </>
            }
            text="Conte o essencial em menos de um minuto. A partir daqui, um especialista continua a conversa com você."
          />
          <ol className="mt-12 grid gap-6 border-t border-white/10 pt-8">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 100} className="flex gap-5">
                <span className="font-display text-3xl leading-none text-gold">{i + 1}</span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <p className="mt-10 max-w-md border-l border-gold/60 pl-4 text-sm leading-relaxed text-white/65">
            O formulário envia apenas uma solicitação de planejamento. Nenhuma passagem, hospedagem ou reserva é
            confirmada por aqui.
          </p>
        </div>

        <Reveal className="lg:col-span-7 lg:col-start-6">
          <form
            ref={formRef}
            noValidate
            onSubmit={submit}
            aria-describedby="planner-status"
            className="bg-white p-6 text-navy shadow-[0_40px_80px_-40px_rgb(0_0_0/0.6)] sm:p-10 lg:p-12"
          >
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              <Field label="Destino desejado" name="destino" error={errors.destino} className="sm:col-span-2">
                {(props) => (
                  <>
                    <input
                      {...props}
                      type="text"
                      list="planner-destinos"
                      autoComplete="off"
                      placeholder="Ex.: Santorini, Gramado, Japão..."
                      value={values.destino}
                      onChange={(e) => set("destino", e.target.value)}
                      onBlur={() => blur("destino")}
                    />
                    <datalist id="planner-destinos">
                      {destinations.map((d) => (
                        <option key={d.slug} value={d.name} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>

              <Field label="Cidade de origem" name="origem" error={errors.origem} className="sm:col-span-2">
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    autoComplete="address-level2"
                    placeholder="De onde você vai sair?"
                    value={values.origem}
                    onChange={(e) => set("origem", e.target.value)}
                    onBlur={() => blur("origem")}
                  />
                )}
              </Field>

              <Field label="Data de ida" name="ida" error={errors.ida}>
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    min={minDate}
                    value={values.ida}
                    onChange={(e) => set("ida", e.target.value)}
                    onBlur={() => blur("ida")}
                  />
                )}
              </Field>

              <Field label="Data de volta" name="volta" error={errors.volta}>
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    min={values.ida || minDate}
                    value={values.volta}
                    onChange={(e) => set("volta", e.target.value)}
                    onBlur={() => blur("volta")}
                  />
                )}
              </Field>

              <Field label="Quantidade de viajantes" name="viajantes" error={errors.viajantes}>
                {(props) => (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      disabled={travelers <= 1}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-navy/20 transition-colors hover:border-navy disabled:opacity-35"
                    >
                      <Minus className="size-4" />
                      <span className="sr-only">Menos um viajante</span>
                    </button>
                    <input
                      {...props}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_TRAVELERS}
                      value={values.viajantes}
                      onChange={(e) => set("viajantes", e.target.value)}
                      onBlur={() => blur("viajantes")}
                      className={`${props.className} text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                    />
                    <button
                      type="button"
                      onClick={() => step(1)}
                      disabled={travelers >= MAX_TRAVELERS}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-navy/20 transition-colors hover:border-navy disabled:opacity-35"
                    >
                      <Plus className="size-4" />
                      <span className="sr-only">Mais um viajante</span>
                    </button>
                  </div>
                )}
              </Field>

              <Field label="Tipo de viagem" name="tipo" error={errors.tipo}>
                {(props) => (
                  <Select {...props} value={values.tipo} onChange={(v) => set("tipo", v)} onBlur={() => blur("tipo")}>
                    {tripTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Faixa de orçamento" name="orcamento" error={errors.orcamento} className="sm:col-span-2">
                {(props) => (
                  <Select
                    {...props}
                    value={values.orcamento}
                    onChange={(v) => set("orcamento", v)}
                    onBlur={() => blur("orcamento")}
                  >
                    {budgets.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p
                id="planner-status"
                role="status"
                className={`min-h-5 text-sm font-medium ${status?.tone === "error" ? "text-danger" : "text-gold-ink"}`}
              >
                {status?.text}
              </p>
              <button type="submit" className={buttonClass("navy", "w-full sm:w-auto")}>
                Solicitar planejamento <ArrowUpRight className={arrowClass} />
              </button>
            </div>
          </form>
        </Reveal>
      </div>

      <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} labelledBy="resumo-title" size="md">
        <Summary values={values} sent={sent} onSent={() => setSent(true)} onClose={() => setSummaryOpen(false)} />
      </Dialog>
    </section>
  );
}

type FieldControlProps = {
  id: string;
  name: PlannerField;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
  className: string;
};

function Field({
  label,
  name,
  error,
  className = "",
  children,
}: {
  label: string;
  name: PlannerField;
  error?: string;
  className?: string;
  children: (props: FieldControlProps) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-erro`;
  return (
    <div className={className}>
      <label htmlFor={id} className="eyebrow block text-navy/60">
        {label}
      </label>
      {children({
        id,
        name,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : undefined,
        className: `${inputClass} ${error ? "border-danger" : "border-navy/20 hover:border-navy/45 focus:border-navy"}`,
      })}
      {error && (
        <p id={errorId} className="mt-2 flex items-center gap-1.5 text-sm text-danger">
          <CircleAlert className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  onBlur,
  children,
  className,
  ...rest
}: FieldControlProps & { value: string; onChange: (v: string) => void; onBlur: () => void; children: ReactNode }) {
  return (
    <div className="relative">
      <select
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`${className} cursor-pointer appearance-none pr-8 ${value ? "" : "text-navy/45"}`}
      >
        <option value="" disabled>
          Selecione
        </option>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-navy/50" aria-hidden="true" />
    </div>
  );
}

function Summary({
  values,
  sent,
  onSent,
  onClose,
}: {
  values: PlannerValues;
  sent: boolean;
  onSent: () => void;
  onClose: () => void;
}) {
  const demo = site.isDemo && !site.whatsapp.number;
  return (
    <div className="relative flex min-h-full flex-col p-6 pb-8 sm:p-10">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 inline-flex size-12 items-center justify-center rounded-full transition-colors hover:bg-mist"
      >
        <X className="size-5" strokeWidth={1.5} />
        <span className="sr-only">Fechar</span>
      </button>
      <p className="eyebrow text-gold-ink">Quase lá</p>
      <h3 id="resumo-title" className="mt-3 pr-10 font-display text-[clamp(2.3rem,6vw,3.25rem)] leading-[0.95]">
        Resumo da sua solicitação
      </h3>

      <dl className="mt-8 divide-y divide-navy/10 border-y border-navy/10">
        {summaryRows(values).map((row) => (
          <div key={row.label} className="grid grid-cols-[8.5rem_1fr] gap-4 py-3.5 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="eyebrow pt-0.5 text-navy/55">{row.label}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 bg-sky/60 p-4 text-sm leading-relaxed text-navy/80">
        Esta é apenas uma <strong>solicitação de planejamento</strong>. Nenhuma passagem, hospedagem ou reserva é
        confirmada neste envio; valores e disponibilidade são apresentados depois, por um especialista.
      </p>
      {demo && (
        <p className="mt-3 text-xs leading-relaxed text-navy/60">
          Demonstração: nenhum número real está configurado. O WhatsApp abre com a mensagem pronta e você escolhe o
          contato.
        </p>
      )}

      <div className="mt-auto grid gap-3 pt-8 sm:grid-cols-2">
        <a
          href={whatsappUrl(whatsappMessage(values))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onSent}
          className={buttonClass("navy", "sm:order-2")}
        >
          Enviar pelo WhatsApp <ArrowUpRight className={arrowClass} />
        </a>
        <button type="button" onClick={onClose} className={buttonClass("outline", "sm:order-1")}>
          Editar informações
        </button>
      </div>
      <p role="status" className="mt-4 min-h-5 text-center text-sm text-gold-ink">
        {sent ? "Abrimos o WhatsApp com sua solicitação. É só tocar em enviar por lá." : ""}
      </p>
    </div>
  );
}
