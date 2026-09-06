import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export type UserRole = "passenger" | "driver" | "admin";

export interface Profile {
  id: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  banned_at: string | null;
  created_at: string;
}

export interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distance_km: number;
  base_fare: number;
  active: boolean;
  location: string | null;
}

export interface Vehicle {
  id: string;
  type: "matatu" | "bus" | "taxi" | "bodaboda";
  number_plate: string;
  seat_count: number;
  owner_id: string;
  route_id: string | null;
  status: "active" | "inactive" | "banned";
  model: string | null;
  color: string | null;
  location: string | null;
  routes?: Pick<Route, "name" | "location"> | null;
}

export interface Schedule {
  id: string;
  route_id: string;
  vehicle_id: string;
  driver_id: string;
  departure_at: string;
  arrival_at: string;
  seats_available: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  price: number;
  routes?: Route;
  vehicles?: Vehicle;
  profiles?: Profile;
}

export interface Booking {
  id: string;
  passenger_id: string;
  schedule_id: string;
  seat_number: number | null;
  pickup_stop: string | null;
  dropoff_stop: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  created_at: string;
  schedules?: Schedule;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  mpesa_receipt: string | null;
  phone: string;
  status: "pending" | "confirmed" | "failed";
  created_at: string;
}

export interface Ticket {
  id: string;
  booking_id: string;
  ticket_code: string;
  issued_at: string;
  bookings?: Booking;
}

export interface Complaint {
  id: string;
  passenger_id: string;
  driver_id: string | null;
  booking_id: string | null;
  subject: string | null;
  message: string;
  status: "open" | "resolved";
  created_at: string;
  passenger?: Profile;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  type: string;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export interface ActivityBooking {
  id: string;
  activity_id: string;
  passenger_id: string;
  activity_date: string;
  guests: number;
  notes: string | null;
  status: "requested" | "confirmed" | "cancelled" | "completed";
  created_at: string;
  activities?: Activity;
}
