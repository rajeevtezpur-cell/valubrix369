import { Bell, Check, Eye, Heart, Tag, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import SellerLayout from "../components/SellerLayout";

type NotifType = "offer" | "view" | "save" | "market" | "visit";

interface Notif {
  id: number;
  type: NotifType;
  message: string;
  property: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFS: Notif[] = [
  {
    id: 1,
    type: "offer",
    message: "New offer received",
    property: "Prestige Park 3BHK, Whitefield",
    time: "5 min ago",
    read: false,
  },
  {
    id: 2,
    type: "view",
    message: "Buyer viewed your listing",
    property: "Sobha Villa, Sarjapur",
    time: "20 min ago",
    read: false,
  },
  {
    id: 3,
    type: "save",
    message: "Buyer saved your property",
    property: "Prestige Park 3BHK, Whitefield",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 4,
    type: "market",
    message: "Market price changed in your area",
    property: "Whitefield, Bangalore",
    time: "3 hours ago",
    read: true,
  },
  {
    id: 5,
    type: "visit",
    message: "Visit scheduled by buyer",
    property: "Brigade Plot, Devanahalli",
    time: "Yesterday",
    read: true,
  },
  {
    id: 6,
    type: "view",
    message: "Buyer viewed your listing",
    property: "Godrej Commercial, Electronic City",
    time: "Yesterday",
    read: true,
  },
  {
    id: 7,
    type: "market",
    message: "Price drop alert in nearby area",
    property: "Sarjapur Road, Bangalore",
    time: "2 days ago",
    read: true,
  },
  {
    id: 8,
    type: "offer",
    message: "Counter offer accepted",
    property: "Prestige Park 3BHK, Whitefield",
    time: "3 days ago",
    read: true,
  },
];

const LIVE_POOL: Omit<Notif, "id" | "time" | "read">[] = [
  {
    type: "view",
    message: "New buyer viewed your listing",
    property: "Prestige Park 3BHK, Whitefield",
  },
  {
    type: "offer",
    message: "New offer just received",
    property: "Sobha Villa, Sarjapur",
  },
  {
    type: "save",
    message: "Buyer added your property to watchlist",
    property: "Brigade Plot, Devanahalli",
  },
  {
    type: "visit",
    message: "Visit request from interested buyer",
    property: "Godrej Commercial, Electronic City",
  },
  {
    type: "market",
    message: "Demand spike detected in your area",
    property: "Whitefield, Bangalore",
  },
];

const FILTERS = ["All", "Offers", "Views", "Market Alerts"];

const TYPE_ICON: Record<NotifType, typeof Bell> = {
  offer: Tag,
  view: Eye,
  save: Heart,
  market: TrendingUp,
  visit: Bell,
};

const TYPE_COLOR: Record<NotifType, string> = {
  offer: "bg-purple-500/20 text-purple-400",
  view: "bg-blue-500/20 text-blue-400",
  save: "bg-pink-500/20 text-pink-400",
  market: "bg-amber-500/20 text-amber-400",
  visit: "bg-[#D4AF37]/20 text-[#D4AF37]",
};

export default function SellerNotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>(MOCK_NOTIFS);
  const [filter, setFilter] = useState("All");
  const [livePoolIdx, setLivePoolIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = LIVE_POOL[livePoolIdx % LIVE_POOL.length];
      const newNotif: Notif = {
        id: Date.now(),
        ...next,
        time: "Just now",
        read: false,
      };
      setNotifs((prev) => [newNotif, ...prev]);
      setLivePoolIdx((i) => i + 1);
    }, 25000);
    return () => clearInterval(interval);
  }, [livePoolIdx]);

  const filtered = notifs.filter((n) => {
    if (filter === "All") return true;
    if (filter === "Offers") return n.type === "offer";
    if (filter === "Views") return n.type === "view" || n.type === "save";
    if (filter === "Market Alerts") return n.type === "market";
    return true;
  });

  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <SellerLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                Smart <span className="text-[#D4AF37]">Notifications</span>
              </h1>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-medium">
                  Live
                </span>
              </span>
            </div>
            <p className="text-white/40 text-sm mt-1">
              {unreadCount} unread notifications
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              data-ocid="seller.notifications.markread.button"
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded-xl text-sm font-medium transition-all"
            >
              <Check size={14} /> Mark all read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2" data-ocid="seller.notifications.filter.tab">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? "bg-[#D4AF37] text-black"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Notifications */}
        <div className="space-y-2">
          {filtered.map((n, i) => {
            const Icon = TYPE_ICON[n.type];
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  n.read
                    ? "bg-white/3 border-white/5"
                    : "bg-[#D4AF37]/5 border-[#D4AF37]/20"
                }`}
                data-ocid={`seller.notifications.item.${i + 1}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_COLOR[n.type]}`}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${n.read ? "text-white/60" : "text-white"}`}
                  >
                    {n.message}
                  </p>
                  <p className="text-[#D4AF37]/70 text-xs mt-0.5">
                    {n.property}
                  </p>
                  <p className="text-white/30 text-xs mt-1">{n.time}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-[#D4AF37] mt-1.5 flex-shrink-0" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </SellerLayout>
  );
}
