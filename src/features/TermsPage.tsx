import { Link } from "react-router-dom"
import { ArrowLeft, FileText } from "lucide-react"
import Card from "../components/ui/Card"

const sections = [
  {
    title: "1. Acceptance and scope",
    body: "These Terms and Conditions govern your access to and use of the Safiri website and application (the “Platform”). By creating an account, browsing listings, or placing a booking request, you agree to these terms. If you do not agree, do not use the Platform. Additional terms shown for a particular trip, activity, payment provider, or transport operator also apply to that service. If they conflict with these terms, the specific service terms apply to that service, subject always to applicable law.",
  },
  {
    title: "2. Safiri’s role",
    body: "Safiri provides a digital platform for discovering routes and vehicles, requesting transport or activity bookings, and managing trip information and payments. A booking is for the service described in its listing and confirmation. Where a transport operator, driver, or activity provider is identified as the service provider, that provider is responsible for delivering the service it offers. Safiri remains responsible for the platform services and any commitments Safiri expressly makes. Nothing in these terms removes a responsibility that applicable law places on Safiri or a provider.",
  },
  {
    title: "3. Your account and information",
    body: "You must provide accurate, current information when registering and booking, keep your password and verification codes private, and promptly update information that changes. You are responsible for activity carried out through your account unless it resulted from circumstances for which you are not responsible. Contact Safiri promptly if you believe your account has been accessed without permission. You must not impersonate another person, create misleading bookings, interfere with the Platform, or use it unlawfully.",
  },
  {
    title: "4. Routes, schedules, and trip bookings",
    body: "Routes, vehicle details, fares, seat availability, and schedules are based on the information available when displayed and may change. Review the route, departure time, fare, passenger details, and selected seat before submitting a booking or payment. A booking is confirmed only when the Platform displays it as confirmed and, where payment is required, the payment has been verified. Keep your ticket or booking confirmation available when travelling and follow reasonable instructions from the service provider. Contact support promptly if your confirmation is missing or appears incorrect.",
  },
  {
    title: "5. Activity requests",
    body: "Submitting an activity booking is a request, not a confirmed reservation. Safiri or the activity provider will confirm availability and any applicable price or further requirements. Do not treat an activity as booked until you receive confirmation. Any activity-specific conditions provided with that confirmation form part of the booking.",
  },
  {
    title: "6. Prices and payments",
    body: "The applicable fare or price is the amount shown for your selected booking before you authorize payment, subject to any clearly disclosed service or provider charges. Payments are processed through the payment method and provider shown at checkout, including Paystack or mobile money where available. The payment provider may apply its own terms. Safiri does not treat a payment as successful until it has been verified and the booking status is updated. Never share your mobile-money PIN, card security code, password, or one-time code with Safiri or another user.",
  },
  {
    title: "7. Changes, cancellations, and refunds",
    body: "If you need to change or cancel a booking, contact Safiri through the Contact Details page as soon as possible and include your booking reference. The applicable cancellation, change, and refund terms will depend on the service and any terms disclosed before you booked or supplied with your confirmation. Where a refund is due, it will be handled in accordance with those terms and applicable law. These terms do not exclude or limit any cancellation, refund, or other consumer right that cannot lawfully be excluded or limited.",
  },
  {
    title: "8. Safe and respectful use",
    body: "Treat drivers, passengers, Safiri staff, and service providers respectfully. Follow applicable transport and safety rules and the reasonable instructions of the driver or operator. Do not use the Platform to harass, threaten, defraud, discriminate against, or endanger another person, or to submit unlawful or harmful material. Report a safety or service concern through the in-app support route or by emailing safiriapp@gmail.com.",
  },
  {
    title: "9. Platform content and availability",
    body: "Safiri and its licensors retain rights in the Platform, branding, software, and original content. You may use the Platform for personal, lawful purposes and may not copy, resell, reverse engineer, or disrupt it except where applicable law permits. We may maintain, update, or temporarily suspend parts of the Platform for security, operational, or technical reasons. We will take reasonable steps to keep the service available, but uninterrupted access cannot be guaranteed.",
  },
  {
    title: "10. Personal information",
    body: "Safiri uses account, contact, booking, and payment-status information to provide the Platform, manage bookings, prevent misuse, and respond to support requests. Payment credentials are handled through the payment provider and its payment flow. Safiri processes personal information in accordance with applicable data-protection law. You may request access to or correction of your information, or exercise other rights available under law, by emailing safiriapp@gmail.com.",
  },
  {
    title: "11. Liability and statutory rights",
    body: "Nothing in these terms excludes or restricts liability, a warranty, or a consumer right where doing so would be unlawful. Subject to that rule, Safiri is not responsible for a delay or failure caused by events outside its reasonable control. A service provider remains responsible for the transport or activity service it supplies, and Safiri remains responsible for its own obligations as platform operator. You retain all rights available to you under Kenyan law.",
  },
  {
    title: "12. Suspension and termination",
    body: "Safiri may restrict or suspend an account where reasonably necessary to investigate suspected fraud, protect users, address a serious breach of these terms, or comply with law. Where appropriate, Safiri will tell you the reason and how to contact support. You may stop using the Platform at any time. Ending access does not remove rights or obligations relating to bookings, payments, disputes, or personal information that continue under applicable law.",
  },
  {
    title: "13. Complaints, disputes, and governing law",
    body: "Please first contact Safiri at safiriapp@gmail.com or use the in-app support route so we can try to resolve your concern. These terms are governed by the laws of Kenya. Disputes may be brought before a court or other body with jurisdiction in Kenya. This clause does not prevent you from using a consumer complaint process or other remedy provided by law.",
  },
  {
    title: "14. Changes to these terms",
    body: "Safiri may update these terms when the Platform or applicable requirements change. The updated version will be posted on this page with a revised date. Changes apply from the date stated in the updated terms and do not remove rights that have already accrued or rights that cannot be changed by agreement.",
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto min-h-[65vh] max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-[#94a3b8] transition hover:text-white"><ArrowLeft size={15} /> Back to Safiri</Link>
      <div className="mb-8 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-400/10 text-orange-300"><FileText size={22} /></div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">Safiri</p>
          <h1 className="text-3xl font-bold text-[#f0f4ff] sm:text-4xl" style={{ fontFamily: "Fraunces, serif" }}>Terms and Conditions</h1>
          <p className="mt-2 text-sm text-[#8491a8]">Effective 26 September 2026</p>
        </div>
      </div>
      <div className="space-y-3">
        {sections.map((section) => (
          <Card key={section.title} className="p-5 sm:p-6">
            <h2 className="mb-2 text-base font-semibold text-[#f0f4ff]">{section.title}</h2>
            <p className="text-sm leading-6 text-[#94a3b8]">{section.body}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="mb-2 text-base font-semibold text-[#f0f4ff]">Official legal references</h2>
        <p className="mb-3 text-sm leading-6 text-[#94a3b8]">These terms are intended to be read consistently with applicable Kenyan consumer and data-protection law.</p>
        <div className="flex flex-col gap-2 text-sm">
          <a className="text-orange-300 hover:text-orange-200" href="https://new.kenyalaw.org/akn/ke/act/2012/46/eng%402013-01-11/source" target="_blank" rel="noreferrer">Consumer Protection Act, 2012 (Kenya Law)</a>
          <a className="text-orange-300 hover:text-orange-200" href="https://new.kenyalaw.org/akn/ke/act/2019/24/eng%402019-11-15/source" target="_blank" rel="noreferrer">Data Protection Act, 2019 (Kenya Law)</a>
          <a className="text-orange-300 hover:text-orange-200" href="https://www.odpc.go.ke/rights-of-a-data-subject/" target="_blank" rel="noreferrer">Rights of a data subject (ODPC)</a>
        </div>
      </Card>
      <p className="mt-6 text-xs text-[#66758d]">Questions about these terms? Email <a className="text-orange-300 hover:text-orange-200" href="mailto:safiriapp@gmail.com">safiriapp@gmail.com</a>.</p>
    </div>
  )
}
