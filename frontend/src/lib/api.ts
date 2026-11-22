const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export type Status = "pending" | "paid" | "cancelled";

export type EventItem = {
  id: string;
  name: string;
  venue: string | null;
  event_date: string;
  price: number;
  stock: number;
  description: string | null;
};

export type EventInput = {
  name: string;
  venue: string;
  event_date: string;
  price: number;
  stock: number;
  description: string;
};

export type Order = {
  id: string;
  code: string;
  event_id: string;
  buyer_name: string;
  buyer_email?: string;
  qty: number;
  total: number;
  status: Status;
  approval_status?: "pending" | "accepted";
  accepted_at?: string | null;
  created_at: string;
  events?: { name: string; venue?: string; event_date?: string } | null;
};

export type OrderLookup = {
  id?: string;
  code: string;
  event_name: string;
  venue?: string;
  event_date?: string;
  buyer_name: string;
  buyer_email?: string;
  qty: number;
  total: number;
  status: Status;
  created_at?: string;
  tickets?: Ticket[];
};

export type Ticket = {
  code: string;
  status: "valid" | "used";
  used_at: string | null;
};

export type TicketCheck = {
  ticket_code: string;
  ticket_status: "valid" | "used";
  used_at: string | null;
  order_code: string;
  order_status: Status;
  buyer_name: string;
  buyer_email?: string;
  event_name: string;
  venue?: string | null;
  event_date?: string;
};

export type UserRole = "admin" | "staff" | "user";
export type UserPaymentStatus = "paid" | "unpaid" | "none" | "cancelled";

export type UserItem = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
  orders_count?: number;
  paid_orders_count?: number;
  pending_orders_count?: number;
  cancelled_orders_count?: number;
  total_spent?: number;
  total_pending?: number;
  payment_status?: UserPaymentStatus;
};

export type UserOrdersResponse = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    created_at?: string;
    last_sign_in_at?: string | null;
  };
  summary: {
    orders_count: number;
    paid_orders_count: number;
    pending_orders_count: number;
    cancelled_orders_count: number;
    total_spent: number;
    total_pending: number;
    payment_status: UserPaymentStatus;
  };
  orders: Order[];
};

export type UserInput = {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
};


export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const isUnauthorized = (e: unknown) => e instanceof ApiError && (e.status === 401 || e.status === 403);

async function req<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(BASE + path, {
    ...rest,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? "Terjadi kesalahan, coba lagi");
  return body as T;
}

const json = (b: unknown) => JSON.stringify(b);

export const api = {
  // Publik
  events: () => req<EventItem[]>("/events"),
  createOrder: (b: { event_id: string; buyer_name: string; buyer_email: string; qty: number }) =>
    req<Order>("/orders", { method: "POST", body: json(b) }),
  lookup: (code: string) => req<OrderLookup>(`/orders/lookup/${encodeURIComponent(code)}`),
  payOrder: (code: string) =>
    req<{ message: string; order: Order }>(`/orders/${encodeURIComponent(code)}/pay`, { method: "POST" }),

  // Admin Auth
  login: (email: string, password: string) =>
    req<{ token: string; email: string; role: "admin" | "staff"; user?: { id: string; email: string; role: "admin" | "staff"; name?: string } }>(
      "/auth/login",
      { method: "POST", body: json({ email, password }) }
    ),
  // Admin Events
  createEvent: (token: string, b: EventInput) => req<EventItem>("/events", { method: "POST", body: json(b), token }),
  updateEvent: (token: string, id: string, b: EventInput) =>
    req<EventItem>(`/events/${id}`, { method: "PUT", body: json(b), token }),
  deleteEvent: (token: string, id: string) => req<null>(`/events/${id}`, { method: "DELETE", token }),

  // Admin Orders
  orders: (token: string) => req<Order[]>("/orders", { token }),
  acceptOrder: (token: string, id: string) => req<Order>(`/orders/${id}/accept`, { method: "POST", token }),
  ticket: (token: string, code: string) => req<TicketCheck>(`/orders/ticket/${encodeURIComponent(code)}`, { token }),
  checkIn: (token: string, code: string) =>
    req<TicketCheck>("/orders/check-in", { method: "POST", body: json({ code }), token }),
  setStatus: (token: string, id: string, status: Status) =>
    req<Order>(`/orders/${id}/status`, { method: "PATCH", body: json({ status }), token }),
  deleteOrder: (token: string, id: string) => req<null>(`/orders/${id}`, { method: "DELETE", token }),

  // Admin Users (CRUD) & User Orders
  users: (token: string, filter?: { payment_status?: UserPaymentStatus }) =>
    req<UserItem[]>(filter?.payment_status ? `/users?payment_status=${filter.payment_status}` : "/users", { token }),
  userOrders: (token: string, userId: string) => req<UserOrdersResponse>(`/users/${userId}/orders`, { token }),
  createUser: (token: string, b: UserInput) => req<UserItem>("/users", { method: "POST", body: json(b), token }),
  updateUser: (token: string, id: string, b: Partial<UserInput>) =>
    req<UserItem>(`/users/${id}`, { method: "PUT", body: json(b), token }),
  deleteUser: (token: string, id: string) => req<null>(`/users/${id}`, { method: "DELETE", token }),
};
