import { Link } from "react-router-dom"

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#0b1120] px-5 py-5 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-[#71809b] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Safiri. Built for Kenya.</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link to="/contact" className="transition hover:text-white">Contact details</Link>
          <Link to="/terms" className="transition hover:text-white">Terms and Conditions</Link>
          <Link to="/privacy" className="transition hover:text-white">Privacy Notice</Link>
        </nav>
      </div>
    </footer>
  )
}
