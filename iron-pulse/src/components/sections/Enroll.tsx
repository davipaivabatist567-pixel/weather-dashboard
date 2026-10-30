"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, CircleAlert, CircleCheck, LoaderCircle, MessageCircle } from "lucide-react";
import { brandRef, site } from "@/config/site";
import { contactTimes, objectives } from "@/data/content";
import {
  emptyLead,
  formatPhone,
  leadFieldOrder,
  leadMessage,
  planOptions,
  sendLead,
  validateLead,
  validateLeadField,
  type LeadErrors,
  type LeadField,
  type LeadValues,
} from "@/lib/lead";
import { whatsappUrl } from "@/lib/whatsapp";
import { useLead } from "@/components/LeadContext";
import { PrivacyLink } from "@/components/Privacy";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { arrowClass, buttonClass } from "@/components/ui/button";

type Status = "idle" | "sending" | "sent" | "local" | "failed";

const steps = [
  { title: "Envie seus dados", text: "Leva menos de um minuto." },
  { title: "A equipe fala com você", text: "No telefone e no horário que você escolher." },
  { title: "Visite e comece", text: "Conheça o espaço, tire dúvidas e faça sua matrícula." },
];

const controlClass =
  "block h-13 w-full rounded-none border bg-ink px-4 text-base text-white placeholder:text-steel/60 transition-colors focus:outline-none focus-visible:outline-none";

export function Enroll() {
  const { request } = useLead();
  const [values, setValues] = useState<LeadValues>(emptyLead);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [notice, setNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // botão "Quero conhecer" / "Quero o plano": preenche o campo correspondente
  const [applied, setApplied] = useState<number | null>(null);
  if (request && request.id !== applied) {
    setApplied(request.id);
    setValues((v) => ({ ...v, plano: request.plan ?? v.plano, objetivo: request.objective ?? v.objetivo }));
    setErrors((e) => ({ ...e, ...(request.plan && { plano: undefined }), ...(request.objective && { objetivo: undefined }) }));
    setStatus("idle");
    const text = request.plan
      ? `Plano escolhido: ${request.plan}.`
      : request.objective
        ? `Objetivo escolhido: ${request.objective}.`
        : "";
    setNotice(text ? { tone: "info", text } : null);
  }

  const set = <K extends LeadField>(field: K, value: LeadValues[K]) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: validateLeadField(field, next) }));
  };
  const blur = (field: LeadField) => {
    if (!values[field]) return; // não acusa erro em campo que a pessoa só atravessou
    setErrors((e) => ({ ...e, [field]: validateLeadField(field, values) }));
  };

  const showResult = (s: Status) => {
    setStatus(s);
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    const found = validateLead(values);
    setErrors(found);
    const invalid = leadFieldOrder.filter((f) => found[f]);
    if (invalid.length) {
      setNotice({ tone: "error", text: invalid.length === 1 ? "Falta corrigir 1 campo." : `Faltam corrigir ${invalid.length} campos.` });
      formRef.current?.querySelector<HTMLElement>(`[name="${invalid[0]}"]`)?.focus();
      return;
    }
    setNotice(null);
    if (!site.leadEndpoint) return showResult("local"); // sem integração configurada: nada é enviado
    setStatus("sending");
    try {
      await sendLead(values);
      showResult("sent");
    } catch {
      showResult("failed");
    }
  };

  const whatsappHref = whatsappUrl(leadMessage(values));

  return (
    <section id="matricula" aria-labelledby="matricula-title" className="relative overflow-hidden bg-coal py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-0 h-[40rem] w-[40rem] bg-[radial-gradient(closest-side,rgb(198_255_0/0.08),transparent)]"
      />
      <div className="relative mx-auto grid max-w-[90rem] gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12">
        <div className="lg:col-span-5">
          <SectionHeading
            index="06"
            label="Matrícula"
            id="matricula-title"
            title={
              <>
                Seu primeiro passo <span className="text-lime">começa agora.</span>
              </>
            }
            text="Deixe seus dados e a equipe da academia entra em contato para apresentar os planos e combinar sua visita."
          />
          <ol className="mt-12 grid gap-6 border-t border-white/10 pt-8">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 100} className="flex gap-5">
                <span className="tag mt-1 inline-flex size-8 shrink-0 items-center justify-center border border-lime/50 text-lime">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-steel">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal className="lg:col-span-7 lg:col-start-6">
          <div className="border border-white/10 bg-ink p-6 sm:p-10">
            {status === "idle" || status === "sending" ? (
              <form ref={formRef} noValidate onSubmit={submit} aria-describedby="matricula-status">
                <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
                  <Field label="Nome completo" name="nome" error={errors.nome} className="sm:col-span-2">
                    {(p) => (
                      <input
                        {...p}
                        type="text"
                        autoComplete="name"
                        placeholder="Seu nome e sobrenome"
                        value={values.nome}
                        onChange={(e) => set("nome", e.target.value)}
                        onBlur={() => blur("nome")}
                      />
                    )}
                  </Field>
                  <Field label="Telefone ou WhatsApp" name="telefone" error={errors.telefone}>
                    {(p) => (
                      <input
                        {...p}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="(00) 00000-0000"
                        value={values.telefone}
                        onChange={(e) => set("telefone", formatPhone(e.target.value))}
                        onBlur={() => blur("telefone")}
                      />
                    )}
                  </Field>
                  <Field label="E-mail" hint="opcional" name="email" error={errors.email}>
                    {(p) => (
                      <input
                        {...p}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="nome@email.com"
                        value={values.email}
                        onChange={(e) => set("email", e.target.value)}
                        onBlur={() => blur("email")}
                      />
                    )}
                  </Field>
                  <Field label="Plano de interesse" name="plano" error={errors.plano}>
                    {(p) => <Select {...p} value={values.plano} options={planOptions} onChange={(v) => set("plano", v)} onBlur={() => blur("plano")} />}
                  </Field>
                  <Field label="Objetivo de treinamento" name="objetivo" error={errors.objetivo}>
                    {(p) => <Select {...p} value={values.objetivo} options={objectives} onChange={(v) => set("objetivo", v)} onBlur={() => blur("objetivo")} />}
                  </Field>
                  <Field label="Melhor horário para contato" name="horario" error={errors.horario} className="sm:col-span-2">
                    {(p) => <Select {...p} value={values.horario} options={contactTimes} onChange={(v) => set("horario", v)} onBlur={() => blur("horario")} />}
                  </Field>
                </div>

                <Consent
                  checked={values.consentimento}
                  error={errors.consentimento}
                  onChange={(v) => set("consentimento", v)}
                />

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    id="matricula-status"
                    role="status"
                    className={`min-h-5 text-sm font-medium ${notice?.tone === "error" ? "text-danger" : "text-lime"}`}
                  >
                    {status === "sending" ? "Enviando seus dados..." : notice?.text}
                  </p>
                  <button type="submit" disabled={status === "sending"} className={buttonClass("lime", "w-full disabled:opacity-60 sm:w-auto")}>
                    {status === "sending" ? (
                      <>
                        Enviando <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                      </>
                    ) : (
                      <>
                        Quero me matricular <ArrowUpRight className={arrowClass} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div ref={resultRef} tabIndex={-1} role="status" className="focus:outline-none">
                <Result status={status} values={values} whatsappHref={whatsappHref} onEdit={() => {
                    if (status === "sent") setValues(emptyLead);
                    setStatus("idle");
                  }}
                />
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

type ControlProps = {
  id: string;
  name: LeadField;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
  className: string;
};

function Field({
  label,
  hint,
  name,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  name: LeadField;
  error?: string;
  className?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-erro`;
  return (
    <div className={className}>
      <label htmlFor={id} className="tag mb-2 flex items-baseline gap-2 text-steel">
        {label}
        {hint && <span className="normal-case tracking-normal text-steel/70">({hint})</span>}
      </label>
      {children({
        id,
        name,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : undefined,
        className: `${controlClass} ${error ? "border-danger" : "border-white/15 hover:border-white/35 focus:border-lime"}`,
      })}
      {error && (
        <p id={errorId} className="mt-2 flex items-center gap-1.5 text-sm text-danger">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
  onBlur,
  className,
  ...rest
}: ControlProps & { value: string; options: readonly string[]; onChange: (v: string) => void; onBlur: () => void }) {
  return (
    <div className="relative">
      <select
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`${className.replace("text-white", "")} cursor-pointer appearance-none pr-10 ${value ? "text-white" : "text-steel/70"}`}
      >
        <option value="" disabled>
          Selecione
        </option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-steel" aria-hidden="true" />
    </div>
  );
}

function Consent({ checked, error, onChange }: { checked: boolean; error?: string; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="mt-7">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-steel">
        <input
          id={id}
          name="consentimento"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-erro` : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-lime"
        />
        <span>
          Autorizo a {brandRef} a usar estes dados para entrar em contato sobre a minha matrícula, conforme a{" "}
          <PrivacyLink className="font-semibold text-white underline decoration-lime underline-offset-4 hover:text-lime">
            Política de privacidade
          </PrivacyLink>
          .
        </span>
      </label>
      {error && (
        <p id={`${id}-erro`} className="mt-2 flex items-center gap-1.5 text-sm text-danger">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function Result({ status, values, whatsappHref, onEdit }: { status: Status; values: LeadValues; whatsappHref: string; onEdit: () => void }) {
  const first = values.nome.trim().split(/\s+/)[0];
  const content = {
    sent: {
      title: `Recebemos seus dados, ${first}!`,
      text: `A equipe da ${brandRef} vai entrar em contato pelo número ${values.telefone}, no período escolhido (${values.horario.toLowerCase()}). Se preferir adiantar a conversa, chame no WhatsApp.`,
    },
    local: {
      title: `Tudo certo com seus dados, ${first}.`,
      text: "Este site ainda não está ligado a um sistema de recebimento de cadastros, então nada foi enviado a um servidor. Para falar com a equipe agora, continue pelo WhatsApp: a mensagem já vai preenchida com as suas informações.",
    },
    failed: {
      title: "Não conseguimos enviar agora.",
      text: "Pode ser a conexão ou uma instabilidade no sistema de cadastro. Seus dados não se perderam: tente de novo ou continue pelo WhatsApp com a mensagem preenchida.",
    },
  }[status as "sent" | "local" | "failed"];

  return (
    <div className="py-4">
      {status === "failed" ? (
        <CircleAlert className="size-12 text-danger" strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <CircleCheck className="size-12 text-lime" strokeWidth={1.5} aria-hidden="true" />
      )}
      <h3 className="display mt-6 text-[clamp(1.6rem,4vw,2.25rem)]">{content.title}</h3>
      <p className="mt-4 max-w-xl leading-relaxed text-steel">{content.text}</p>
      {status === "local" && site.isDemo && (
        <p className="tag mt-4 text-lime/80">Demonstração: o WhatsApp abre com a mensagem pronta e você escolhe o contato.</p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonClass(status === "sent" ? "ghost" : "lime")}>
          <MessageCircle className="size-4" aria-hidden="true" />
          {status === "sent" ? "Falar no WhatsApp" : "Continuar pelo WhatsApp"}
        </a>
        <button type="button" onClick={onEdit} className={buttonClass(status === "sent" ? "lime" : "ghost")}>
          {status === "failed" ? "Tentar de novo" : status === "sent" ? "Enviar outro cadastro" : "Editar dados"}
        </button>
      </div>
    </div>
  );
}
