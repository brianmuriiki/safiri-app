import { Component, type ErrorInfo, type ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Safiri UI error", error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0f1e] p-6">
        <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111a2c] p-6 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f97316] text-xl font-bold text-white">
            S
          </div>
          <h1 className="mb-2 text-xl font-bold text-[#f0f4ff]">
            Something went wrong
          </h1>
          <p className="mb-5 text-sm leading-6 text-[#94a3b8]">
            Safiri hit an unexpected problem. Reload the page to try again. If it continues, contact{" "}
            <a className="text-[#f97316] hover:underline" href="mailto:safiriapp@gmail.com">
              safiriapp@gmail.com
            </a>{" "}
            and include the error details.
          </p>
          <details className="mb-5 rounded-lg bg-black/20 p-3 text-left text-xs text-[#94a3b8]">
            <summary className="cursor-pointer font-medium text-[#cbd5e1]">
              Error details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono">
              {this.state.error.message || "Unknown application error"}
            </pre>
          </details>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Reload Safiri
          </button>
        </section>
      </main>
    )
  }
}
