"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type AssessmentPayload = {
  request_type: "detailing" | "class";
  name: string;
  phone: string;
  email?: string;
  county: "Carteret" | "Onslow" | "Craven" | "Other";
  vehicle_type?: "Car / Sedan" | "SUV / Truck / Van" | "Boat" | "Side-by-side" | "Motor home / Camper / RV" | "Other";
  service_interest?: string;
  class_interest?: string;
  preferred_window?: string;
  notes?: string;
  consent_to_contact: true;
  company?: string;
};

type ModelContext = {
  registerTool: (tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: { readOnlyHint: false; untrustedContentHint: false };
    execute: (input: unknown) => Promise<unknown>;
  }, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

async function sendAssessment(payload: AssessmentPayload) {
  const response = await fetch("/api/assessment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as { ok?: boolean; error?: string };
  if (!response.ok || !result.ok) throw new Error(result.error || "Unable to submit your request.");
  return result;
}

function successMessage(requestType: AssessmentPayload["request_type"]) {
  return requestType === "class"
    ? "Class inquiry received. Aspire will follow up with upcoming dates and enrollment details."
    : "Request received. Aspire will follow up to confirm the right service and price.";
}

export function AssessmentForm({ serviceOptions, classOptions }: { serviceOptions: string[]; classOptions: string[] }) {
  const [requestType, setRequestType] = useState<AssessmentPayload["request_type"] | "">("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    Promise.resolve(context.registerTool({
      name: "submit_aspire_inquiry",
      title: "Submit an Aspire inquiry",
      description: "Submit a detailing-service request or class inquiry to Aspire Mobil Detailing and authorize Aspire to contact the customer. This creates a lead in the business system.",
      inputSchema: {
        type: "object",
        properties: {
          request_type: { type: "string", enum: ["detailing", "class"] },
          name: { type: "string", minLength: 2, maxLength: 120 },
          phone: { type: "string", minLength: 7, maxLength: 30 },
          email: { type: "string", format: "email" },
          county: { type: "string", enum: ["Carteret", "Onslow", "Craven", "Other"] },
          vehicle_type: { type: "string", enum: ["Car / Sedan", "SUV / Truck / Van", "Boat", "Side-by-side", "Motor home / Camper / RV", "Other"] },
          service_interest: { type: "string", enum: ["Not sure", ...serviceOptions] },
          class_interest: { type: "string", enum: ["Not sure", ...classOptions] },
          preferred_window: { type: "string", maxLength: 160 },
          notes: { type: "string", maxLength: 2000 },
          consent_to_contact: { type: "boolean", const: true },
        },
        required: ["request_type", "name", "phone", "county", "consent_to_contact"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        setStatus("sending");
        try {
          const payload = input as AssessmentPayload;
          await sendAssessment(payload);
          setStatus("success");
          setMessage(successMessage(payload.request_type));
          document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
          return { status: "received", request_type: payload.request_type };
        } catch (error) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Unable to submit your request.");
          throw error;
        }
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, [classOptions, serviceOptions]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestType) return;

    setStatus("sending");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fields = Object.fromEntries(form.entries()) as Record<string, string>;

    try {
      await sendAssessment({
        request_type: requestType,
        name: fields.name,
        phone: fields.phone,
        email: fields.email || undefined,
        county: fields.county as AssessmentPayload["county"],
        vehicle_type: requestType === "detailing" ? fields.vehicle_type as AssessmentPayload["vehicle_type"] : undefined,
        service_interest: requestType === "detailing" ? fields.service_interest as AssessmentPayload["service_interest"] : undefined,
        class_interest: requestType === "class" ? fields.class_interest as AssessmentPayload["class_interest"] : undefined,
        preferred_window: fields.preferred_window || undefined,
        notes: fields.notes || undefined,
        consent_to_contact: true,
        company: fields.company,
      });
      formElement.reset();
      setRequestType("");
      setStatus("success");
      setMessage(successMessage(requestType));
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to submit your request.");
    }
  }

  return (
    <form className="assessment-form" onSubmit={onSubmit}>
      <fieldset className="request-kind">
        <legend>What can we help with?</legend>
        <RadioGroup
          className="request-kind-grid"
          name="request_type"
          value={requestType}
          onValueChange={(value) => {
            setRequestType(value as AssessmentPayload["request_type"]);
            setMessage("");
            setStatus("idle");
          }}
          required
        >
          <label className="request-choice" htmlFor="request-detailing">
            <RadioGroupItem id="request-detailing" value="detailing" />
            <span><strong>Vehicle detailing</strong><small>Cleaning, restoration or protection</small></span>
          </label>
          <label className="request-choice" htmlFor="request-class">
            <RadioGroupItem id="request-class" value="class" />
            <span><strong>Detailing classes</strong><small>Upcoming training and enrollment</small></span>
          </label>
        </RadioGroup>
      </fieldset>

      {requestType && (
        <div className="inquiry-fields">
          <div className="form-grid">
            <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={120} placeholder="Your name" /></label>
            <label>Phone<input name="phone" type="tel" autoComplete="tel" required maxLength={30} placeholder="(252) 555-0123" /></label>
            <label>Email <span>optional</span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label>
            <label>County<select name="county" required defaultValue=""><option value="" disabled>Select county</option><option>Carteret</option><option>Onslow</option><option>Craven</option><option>Other</option></select></label>
            {requestType === "detailing" ? (
              <>
                <label>Vehicle<select name="vehicle_type" required defaultValue=""><option value="" disabled>Select vehicle</option><option>Car / Sedan</option><option>SUV / Truck / Van</option><option>Boat</option><option>Side-by-side</option><option>Motor home / Camper / RV</option><option>Other</option></select></label>
                <label>Service<select name="service_interest" required defaultValue="Not sure"><option>Not sure</option>{serviceOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              </>
            ) : (
              <label className="full-field">Class of interest<select name="class_interest" required defaultValue="Not sure"><option>Not sure</option>{classOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            )}
          </div>
          <label>{requestType === "class" ? "Preferred class timing" : "Preferred appointment window"} <span>optional</span><input name="preferred_window" maxLength={160} placeholder={requestType === "class" ? "Example: weekends or the next available class" : "Example: Friday morning"} /></label>
          <label>What should we know? <span>optional</span><textarea name="notes" maxLength={2000} rows={4} placeholder={requestType === "class" ? "Your experience level, learning goals, or questions about the program" : "Vehicle condition, goals, stains, pet hair, or questions"} /></label>
          <label className="honey" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
          <label className="consent"><input type="checkbox" required /> <span>I agree that Aspire may contact me about this request.</span></label>
          <button className="submit-button" type="submit" disabled={status === "sending"}>
            {status === "sending" ? <><Loader2 className="spin" size={18} /> Sending request</> : requestType === "class" ? "Ask about the next class" : "Request my assessment"}
          </button>
        </div>
      )}
      {message && <p className={status === "success" ? "form-message success" : "form-message error"} role="status">{status === "success" && <CheckCircle2 size={18} />}{message}</p>}
    </form>
  );
}
