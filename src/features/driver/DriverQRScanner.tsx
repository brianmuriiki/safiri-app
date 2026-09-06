import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { ScanLine, CheckCircle, XCircle, Search } from "lucide-react";

interface TicketResult {
  valid: boolean;
  ticket_code: string;
  passenger_name: string | null;
  route: string | null;
  departure: string | null;
  seat: number | null;
  status: string;
}

export default function DriverQRScanner() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketResult | null>(null);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  useEffect(() => stopCamera, []);

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;

    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const BarcodeDetector = (
      window as Window & {
        BarcodeDetector?: new (options?: { formats: string[] }) => {
          detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;
    if (!BarcodeDetector) return;

    let active = true;
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const scan = async () => {
      if (!active || !streamRef.current) return;
      const codes = await detector.detect(video);
      if (codes[0]?.rawValue) {
        setCode(codes[0].rawValue);
        await validateCode(codes[0].rawValue);
        return;
      }
      requestAnimationFrame(scan);
    };
    video.play().then(() => requestAnimationFrame(scan)).catch(() => {
      setError("Could not start the camera preview.");
      stopCamera();
    });

    return () => {
      active = false;
    };
  }, [cameraOpen]);

  const validateCode = async (ticketCode: string) => {
    setLoading(true);
    setError("");
    setResult(null);

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select(
        "*, bookings(status, seat_number, passenger_id, schedules(departure_at, routes(name)), profiles!passenger_id(full_name, email))"
      )
      .eq("ticket_code", ticketCode.trim().toUpperCase())
      .maybeSingle();

    if (ticketError) {
      setError(`Could not validate ticket: ${ticketError.message}`);
      setLoading(false);
      return;
    }
    if (!ticket) {
      setError("Ticket not found. Invalid or expired code.");
      setLoading(false);
      return;
    }

    const booking = ticket.bookings as any;
    const schedule = booking?.schedules;
    const profile = booking?.profiles;

    setResult({
      valid: booking?.status === "confirmed",
      ticket_code: ticket.ticket_code,
      passenger_name: profile?.full_name ?? profile?.email ?? null,
      route: schedule?.routes?.name ?? null,
      departure: schedule?.departure_at ?? null,
      seat: booking?.seat_number ?? null,
      status: booking?.status ?? "unknown",
    });
    setLoading(false);
    stopCamera();
  };

  const startCamera = async () => {
    setError("");
    const BarcodeDetector = (
      window as Window & {
        BarcodeDetector?: new (options?: { formats: string[] }) => {
          detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;

    if (!BarcodeDetector) {
      setError("QR scanning is not supported by this browser. Enter the ticket code manually.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : "Could not access the camera.");
      stopCamera();
    }
  };

  const validate = async () => {
    if (!code.trim()) return;
    await validateCode(code);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Ticket Scanner
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        Enter a ticket code to validate passenger boarding
      </p>

      {/* Scan icon */}
      <button
        type="button"
        onClick={cameraOpen ? stopCamera : startCamera}
        className="mx-auto mb-6 w-24 h-24 rounded-2xl bg-[#1a2235] border-2 border-dashed border-[#f97316]/40 flex flex-col items-center justify-center gap-2 hover:bg-[#243152] transition-colors"
        aria-label={cameraOpen ? "Stop camera" : "Scan QR code with camera"}
      >
          <ScanLine size={32} className="text-[#f97316]" />
          <span className="text-xs text-[#64748b]">{cameraOpen ? "Stop camera" : "Scan QR"}</span>
      </button>

      {cameraOpen && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-orange-500/30 bg-black">
          <video ref={videoRef} className="w-full aspect-video object-cover" muted playsInline />
          <p className="px-4 py-3 text-center text-xs text-[#94a3b8]">Point the camera at the ticket QR code.</p>
        </div>
      )}

      <Card className="p-5 mb-5">
        <div className="flex gap-2">
          <Input
            placeholder="Enter ticket code (e.g. A1B2C3D4)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && validate()}
            className="font-mono uppercase"
            icon={<Search size={15} />}
          />
          <Button loading={loading} onClick={validate} className="shrink-0">
            Validate
          </Button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            <XCircle size={15} />
            {error}
          </div>
        )}
      </Card>

      {result && (
        <Card
          className={`p-5 border-2 ${result.valid ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}
        >
          <div className="flex items-center gap-3 mb-4">
            {result.valid ? (
              <CheckCircle size={28} className="text-green-400" />
            ) : (
              <XCircle size={28} className="text-red-400" />
            )}
            <div>
              <div
                className={`font-bold text-lg ${result.valid ? "text-green-400" : "text-red-400"}`}
              >
                {result.valid ? "Valid Ticket ✓" : "Invalid Ticket ✗"}
              </div>
              <div className="font-mono text-sm text-[#64748b]">
                {result.ticket_code}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { label: "Passenger", value: result.passenger_name ?? "—" },
              { label: "Route", value: result.route ?? "—" },
              {
                label: "Departure",
                value: result.departure
                  ? new Date(result.departure).toLocaleString()
                  : "—",
              },
              { label: "Seat", value: result.seat ?? "Any" },
              { label: "Booking status", value: result.status },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between py-1.5 border-b border-white/5 last:border-0"
              >
                <span className="text-xs text-[#64748b]">{row.label}</span>
                <span className="text-sm font-medium text-[#f0f4ff]">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Badge
              variant={result.valid ? "success" : "danger"}
              className="text-sm px-3 py-1"
            >
              {result.valid ? "Allow boarding" : "Deny boarding"}
            </Badge>
          </div>
        </Card>
      )}
    </div>
  );
}
