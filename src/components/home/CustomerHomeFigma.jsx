import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, X, ChevronLeft, Star, Download, Plus } from "lucide-react";

// Figma Design System Colors
const COLORS = {
  primaryBlue: "#3FA0C9",
  secondaryBlue: "#3F79C9",
  black: "#000000",
  lightGrey: "#E5E5E5",
  darkNavy: "#1A3A52",
  lightBg: "#F5F9FA",
  white: "#FFFFFF",
  green: "#4CAF50",
  yellow: "#FFB800",
};

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function CustomerHomeFigma({ user }) {
  const [screen, setScreen] = useState("map");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [fareEstimate, setFareEstimate] = useState(72);
  const [booking, setBooking] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [ridersNearby, setRidersNearby] = useState(8);
  const [avgWaitTime, setAvgWaitTime] = useState(2);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [profileTab, setProfileTab] = useState("profile");
  const [savedLocations, setSavedLocations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageTab, setMessageTab] = useState("chats");

  useEffect(() => {
    if (!user) return;
    base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 50).then(setBookings).catch(() => {});
  }, [user]);

  const handleBook = async () => {
    setBooking(true);
    const b = await base44.entities.Booking.create({
      booking_id: "BK-" + Date.now().toString(36).toUpperCase(),
      customer_name: user?.full_name || "Customer",
      customer_phone: user?.email || "",
      pickup_address: pickup || "Current Location",
      dropoff_address: dropoff,
      zone: "City Proper",
      status: "pending",
      payment_method: "cash",
      fare_estimate: fareEstimate,
    });
    setActiveRide(b);
    setBooking(false);
    setScreen("searching");
    
    setTimeout(() => {
      setActiveRide(prev => ({ ...prev, status: "assigned", rider_name: "Juan Dela Cruz" }));
      setScreen("riderFound");
    }, 3000);
  };

  // MAP / BOOKING SCREEN
  if (screen === "map") {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.lightBg }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: COLORS.darkNavy }}>
          <div className="flex items-center gap-2">
            <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8" />
            <span className="text-white font-semibold text-sm">Home(Book)</span>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-gray-300" />
          </button>
        </div>

        {/* Map Placeholder */}
        <div className="flex-1 relative" style={{ background: "#E8E8E8" }}>
          {/* Map lines background pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-30" style={{ fill: "none", stroke: COLORS.white, strokeWidth: 2 }}>
            <line x1="0" y1="100" x2="300" y2="100" />
            <line x1="0" y1="200" x2="300" y2="200" />
            <line x1="100" y1="0" x2="100" y2="500" />
            <line x1="200" y1="0" x2="200" y2="500" />
          </svg>
          
          {/* Current location marker */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-16 rounded-2xl opacity-60" style={{ background: COLORS.green }} />

          {/* Zoom controls */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <button className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-xl">+</button>
            <button className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-xl">−</button>
          </div>

          {/* Where to? Card */}
          <div className="absolute top-4 left-4 right-4 bg-white rounded-3xl shadow-lg p-4">
            <div className="text-sm font-semibold mb-3" style={{ color: COLORS.black }}>Where to?</div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "#E0F2F7" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: COLORS.primaryBlue }}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <input
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="PICK UP"
                  className="flex-1 bg-transparent text-xs font-medium outline-none"
                  style={{ color: COLORS.black }}
                />
              </div>

              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "#E0F2F7" }}>
                <MapPin className="w-5 h-5" style={{ color: COLORS.primaryBlue }} />
                <input
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="DESTINATION"
                  className="flex-1 bg-transparent text-xs font-medium outline-none"
                  style={{ color: COLORS.black }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Booking Card */}
          <div className="absolute bottom-16 left-4 right-4 space-y-3">
            {/* Payment & Schedule */}
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 bg-white rounded-lg py-2 shadow">
                <span className="text-lg">💵</span>
                <span className="text-xs font-medium">Cash</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-white rounded-lg py-2 shadow">
                <span className="text-lg">🕐</span>
                <span className="text-xs font-medium">Now</span>
              </button>
            </div>

            {/* Motorcycle Selection */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border-2" style={{ borderColor: COLORS.primaryBlue }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl">🏍️</span>
                <span className="font-semibold" style={{ color: COLORS.primaryBlue }}>Motorcycle</span>
              </div>
            </div>

            {/* Order Button */}
            <button
              onClick={handleBook}
              disabled={!dropoff || booking}
              className="w-full py-3 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-3"
              style={{ background: COLORS.primaryBlue }}>
              <span className="text-lg">₱ {fareEstimate}</span>
              <span>{booking ? "Booking..." : "Order"}</span>
            </button>
          </div>
        </div>

        <BottomNav screen="map" setScreen={setScreen} />
      </div>
    );
  }

  // SEARCHING RIDER
  if (screen === "searching") {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ background: "#E3F2FD" }}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: COLORS.secondaryBlue }}>
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </div>
          </div>
          <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: COLORS.secondaryBlue }} />
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.black }}>Finding you a rider...</h2>
        <p className="text-sm text-gray-500 text-center mb-8">We're matching you with the best available rider nearby</p>

        <div className="flex gap-1 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: COLORS.secondaryBlue, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: "#E3F2FD" }}>
                <MapPin className="w-6 h-6" style={{ color: COLORS.secondaryBlue }} />
              </div>
              <div className="text-2xl font-bold mb-1">{ridersNearby}</div>
              <div className="text-xs text-gray-500">Riders Nearby</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: "#E8F5E9" }}>
                <svg className="w-6 h-6" style={{ color: COLORS.green }} fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="text-2xl font-bold mb-1">~{avgWaitTime} min</div>
              <div className="text-xs text-gray-500">Avg Wait Time</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setScreen("map")}
          className="px-8 py-2 rounded-full border-2 font-semibold"
          style={{ borderColor: COLORS.secondaryBlue, color: COLORS.secondaryBlue }}>
          Cancel
        </button>
      </div>
    );
  }

  // RIDER FOUND
  if (screen === "riderFound") {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        <div className="w-32 h-32 rounded-full flex items-center justify-center mb-6" style={{ background: "#E8F5E9" }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: COLORS.green }}>
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.black }}>Rider Found!</h2>
        <p className="text-sm text-gray-500 mb-8">Your rider is on the way</p>

        <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gray-300" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: COLORS.green }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <div className="font-bold text-lg mb-1">Juan Dela Cruz</div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">4.8</span>
                <span className="text-xs text-gray-400">(1250 rides)</span>
              </div>
              <div className="text-xs px-2 py-0.5 rounded inline-block mt-1" style={{ background: "#E3F2FD", color: COLORS.secondaryBlue }}>
                ⭐ Top Rated
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Vehicle</span>
              <span className="text-sm font-semibold">Honda TMX 155</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Plate Number</span>
              <span className="text-sm font-semibold">ABC 1234</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">ETA</span>
              <span className="text-sm font-bold" style={{ color: COLORS.green }}>3 mins away</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#E3F2FD" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: COLORS.secondaryBlue }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold" style={{ color: COLORS.secondaryBlue }}>Verified Driver</div>
              <div className="text-xs" style={{ color: COLORS.secondaryBlue }}>Background checked & licensed</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setScreen("tripCompleted")}
          className="w-full max-w-sm py-3 rounded-2xl font-bold text-white shadow-lg"
          style={{ background: COLORS.secondaryBlue }}>
          Continue
        </button>
      </div>
    );
  }

  // TRIP COMPLETED
  if (screen === "tripCompleted") {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: "#E8F5E9" }}>
          <svg className="w-16 h-16" style={{ color: COLORS.green }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.black }}>Trip Completed!</h2>
        <p className="text-sm text-gray-500 mb-8">Thank you for riding with Habal</p>

        <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center">
              <Star className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-500">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Distance</span>
              </div>
              <span className="text-sm font-semibold">5.2 km</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="text-sm">Duration</span>
              </div>
              <span className="text-sm font-semibold">15 mins</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-sm">₱</span>
                <span className="text-sm">Fare</span>
              </div>
              <span className="text-sm font-semibold">₱undefined</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">Paid with</span>
              <span className="text-sm font-semibold">Cash</span>
            </div>
          </div>

          <button className="w-full mt-4 py-2 flex items-center justify-center gap-2 text-sm font-medium text-gray-600">
            <Download className="w-4 h-4" />
            Download Receipt
          </button>
        </div>

        <button
          onClick={() => setScreen("rating")}
          className="w-full max-w-sm py-3 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 mb-4"
          style={{ background: COLORS.secondaryBlue }}>
          <Star className="w-5 h-5" />
          Rate Your Ride
        </button>

        <button
          onClick={() => setScreen("map")}
          className="font-semibold"
          style={{ color: COLORS.secondaryBlue }}>
          Back to Home
        </button>
      </div>
    );
  }

  // RATING SCREEN
  if (screen === "rating") {
    const tags = ["Professional", "Safe Driving", "Friendly", "On Time", "Clean Vehicle", "Smooth Ride"];
    
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          <button onClick={() => setScreen("tripCompleted")}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold">Rate Your Ride</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-32 h-32 rounded-3xl bg-gray-200 mb-8" />

          <p className="text-gray-500 mb-4">How was your ride?</p>
          
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)}>
                <Star
                  className="w-12 h-12"
                  fill={star <= rating ? COLORS.yellow : "none"}
                  color={star <= rating ? COLORS.yellow : "#D1D5DB"}
                  strokeWidth={2}
                />
              </button>
            ))}
          </div>
          
          <p className="text-sm font-medium mb-8" style={{ color: COLORS.black }}>
            {rating === 5 ? "Great!" : rating === 4 ? "Good" : rating === 3 ? "Okay" : rating > 0 ? "Poor" : ""}
          </p>

          <div className="w-full max-w-sm mb-8">
            <p className="text-sm text-gray-500 mb-3">What did you like?</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  className="px-4 py-2 rounded-full text-sm border"
                  style={selectedTags.includes(tag) 
                    ? { background: COLORS.primaryBlue, color: COLORS.white, borderColor: COLORS.primaryBlue }
                    : { background: COLORS.white, color: COLORS.black, borderColor: COLORS.lightGrey }
                  }>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          <button
            onClick={() => setScreen("feedback")}
            className="w-full py-3 rounded-2xl font-bold text-white"
            style={{ background: COLORS.secondaryBlue }}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ADDITIONAL FEEDBACK
  if (screen === "feedback") {
    const suggestions = [
      "Driver was very polite",
      "Arrived on time",
      "Vehicle was clean",
      "Safe and comfortable ride"
    ];

    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          <button onClick={() => setScreen("rating")}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold">Additional Feedback</h2>
        </div>

        <div className="flex-1 px-6 py-6">
          <p className="text-sm text-gray-500 mb-4">Help us improve by sharing more details about your experience</p>

          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="nice"
            className="w-full h-32 p-4 rounded-2xl border-2 resize-none outline-none"
            style={{ borderColor: COLORS.primaryBlue }}
          />

          <p className="text-sm text-gray-500 mt-6 mb-3">Quick suggestions</p>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setFeedbackText(suggestion)}
                className="w-full text-left px-4 py-3 rounded-xl border text-sm"
                style={{ borderColor: COLORS.lightGrey }}>
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-3">
          <button
            onClick={() => setScreen("tip")}
            className="w-full py-3 rounded-2xl font-bold text-white"
            style={{ background: COLORS.secondaryBlue }}>
            Continue
          </button>
          <button
            onClick={() => setScreen("map")}
            className="w-full py-3 font-semibold"
            style={{ color: COLORS.secondaryBlue }}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  // TIP SCREEN
  if (screen === "tip") {
    const presets = [10, 20, 30, 50];

    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          <button onClick={() => setScreen("feedback")}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold">Add a Tip</h2>
        </div>

        <div className="flex-1 flex flex-col items-center px-6 py-12">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "#FFE5E5" }}>
            <span className="text-4xl">❤️</span>
          </div>

          <h3 className="text-xl font-bold mb-2">Show Your Appreciation</h3>
          <p className="text-sm text-gray-500 text-center mb-8">Your rider went the extra mile. Consider adding a tip!</p>

          <p className="text-sm text-gray-500 mb-3">Choose amount</p>
          <div className="flex gap-3 mb-6">
            {presets.map((amount) => (
              <button
                key={amount}
                onClick={() => setTipAmount(amount)}
                className="px-6 py-3 rounded-2xl font-bold"
                style={tipAmount === amount
                  ? { background: COLORS.secondaryBlue, color: COLORS.white }
                  : { background: COLORS.lightGrey, color: COLORS.black }
                }>
                ₱{amount}
              </button>
            ))}
          </div>

          <p className="text-sm text-gray-500 mb-3">Or enter custom amount</p>
          <div className="w-full max-w-sm px-4 py-3 rounded-xl border-2 flex items-center gap-2 mb-6" style={{ borderColor: COLORS.lightGrey }}>
            <span className="text-lg font-semibold">₱</span>
            <input
              type="number"
              value={tipAmount || ""}
              onChange={(e) => setTipAmount(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="flex-1 outline-none text-lg"
            />
          </div>

          <div className="w-full max-w-sm px-4 py-3 rounded-xl flex items-center justify-between" style={{ background: "#E3F2FD" }}>
            <span className="text-sm font-medium">Tip Amount</span>
            <span className="text-lg font-bold" style={{ color: COLORS.secondaryBlue }}>₱{tipAmount}</span>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <button
            onClick={() => setScreen("map")}
            className="w-full py-3 rounded-2xl font-bold text-white"
            style={{ background: COLORS.secondaryBlue }}>
            Add Tip
          </button>
          <button
            onClick={() => setScreen("map")}
            className="w-full py-3 font-semibold"
            style={{ color: COLORS.secondaryBlue }}>
            No Thanks
          </button>
        </div>
      </div>
    );
  }

  // PROFILE SCREEN
  if (screen === "profile") {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold">Profile</span>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: COLORS.primaryBlue }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </button>
            <button className="px-3 py-1 border rounded-lg text-sm">Edit</button>
          </div>
        </div>

        <div className="flex flex-col items-center py-6">
          <img src={HABAL_LOGO} alt="Habal" className="w-16 h-16 mb-6" />
          
          <h2 className="text-2xl font-bold mb-6">User Profile</h2>

          <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-bold mb-6">
            JD
          </div>

          <div className="flex border-b w-full max-w-md mb-6">
            <button
              onClick={() => setProfileTab("profile")}
              className="flex-1 py-3 text-sm font-medium border-b-2"
              style={profileTab === "profile"
                ? { borderColor: COLORS.primaryBlue, color: COLORS.primaryBlue }
                : { borderColor: "transparent", color: "#9CA3AF" }
              }>
              Profile
            </button>
            <button
              onClick={() => setProfileTab("locations")}
              className="flex-1 py-3 text-sm font-medium border-b-2"
              style={profileTab === "locations"
                ? { borderColor: COLORS.primaryBlue, color: COLORS.primaryBlue }
                : { borderColor: "transparent", color: "#9CA3AF" }
              }>
              Saved Locations
            </button>
          </div>

          {profileTab === "profile" ? (
            <div className="w-full max-w-md px-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">Personal Information</h3>
                  <button style={{ color: COLORS.primaryBlue }}>✏️</button>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium">John Doe</p>
                  <p className="text-xs text-gray-500 mt-2">Sex</p>
                  <p className="font-medium">Not Specified</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">Contact Information</h3>
                  <button style={{ color: COLORS.primaryBlue }}>✏️</button>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Mobile Number</p>
                  <p className="font-medium">+639xxxxxxxxx</p>
                  <p className="text-xs text-gray-500 mt-2">E-mail</p>
                  <p className="font-medium">johndoe@habal.com</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-3">Account Settings</h3>
                <button
                  className="w-full py-3 rounded-2xl font-bold text-white mb-3"
                  style={{ background: COLORS.primaryBlue }}>
                  SIGN OUT
                </button>
                <button className="w-full py-2 flex items-center justify-center gap-2 text-sm">
                  <span>⚙️</span> Settings
                </button>
                <button className="w-full py-2 flex items-center justify-center gap-2 text-sm">
                  <span>💬</span> Support
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md px-4 space-y-3">
              {[
                { icon: "🏠", label: "Add Home" },
                { icon: "🏢", label: "Add Work" },
                { icon: "📍", label: "Add Custom" }
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border"
                  style={{ borderColor: COLORS.lightGrey }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: COLORS.primaryBlue }}>
                    <span className="text-xl">{item.icon}</span>
                  </div>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <button style={{ color: COLORS.primaryBlue }}>✏️</button>
                </button>
              ))}
            </div>
          )}
        </div>

        <BottomNav screen="profile" setScreen={setScreen} />
      </div>
    );
  }

  // RIDES TAB
  if (screen === "rides") {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold">Home(Rides)</span>
          <button className="w-8 h-8 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 py-4">
          <h2 className="text-2xl font-bold mb-4">Ride History</h2>
          
          <div className="space-y-3">
            {bookings.slice(0, 6).map((booking) => (
              <div key={booking.id} className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-600">{booking.pickup_address}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">{new Date(booking.created_date).toLocaleDateString()}</p>
                    {booking.customer_rating && (
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className="w-3 h-3" fill={s <= booking.customer_rating ? COLORS.yellow : "none"} color={COLORS.yellow} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="px-2 py-1 rounded text-[10px] font-semibold mb-1" style={{ background: COLORS.green, color: COLORS.white }}>
                      {booking.status}
                    </div>
                    <p className="font-bold">₱{booking.fare_estimate || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <BottomNav screen="rides" setScreen={setScreen} />
      </div>
    );
  }

  // WALLET
  if (screen === "wallet") {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold">Home(Wallet)</span>
          <button className="w-8 h-8 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 py-6">
          <h2 className="text-2xl font-bold mb-6">Wallet</h2>
          
          <div className="rounded-3xl p-6 shadow-lg" style={{ background: "linear-gradient(135deg, #4DD8F0 0%, #3FA0C9 100%)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.3)" }}>
                <span className="text-white text-xs">💰</span>
              </div>
              <span className="text-white text-xs font-medium">WALLET BALANCE</span>
            </div>
            <div className="text-white text-4xl font-bold mb-4">₱ 6,767.00</div>
            <button className="flex items-center gap-2 text-white text-xs">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Transaction History
            </button>
          </div>
        </div>

        <BottomNav screen="wallet" setScreen={setScreen} />
      </div>
    );
  }

  // MESSAGES
  if (screen === "messages") {
    const chats = [
      { name: "Romillo, Justine Ace", message: "I'm on my way!", time: "9:15 AM", unread: true },
      { name: "Cagbangan, Richard L.", message: "", time: "OFFLINE, 9:30 PM", unread: false },
      { name: "Caybell, Olimars", message: "Thank you trusting habal! A 5star rating...", time: "9:45 PM", unread: true },
      { name: "Sorbitonio, Edel Jun", message: "", time: "9:15 PM", unread: false }
    ];

    const notifications = [
      { title: "Book Now and get 30% off!", unread: true },
      { title: "You deserve an awesome ride!", unread: true }
    ];

    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold">Home(Messages-{messageTab === "chats" ? "Chat" : "Notifications"})</span>
          <button className="w-8 h-8 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 py-4">
          <h2 className="text-2xl font-bold mb-4">Messages</h2>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMessageTab("chats")}
              className="flex-1 py-2 rounded-full font-semibold text-sm"
              style={messageTab === "chats"
                ? { background: COLORS.secondaryBlue, color: COLORS.white }
                : { background: COLORS.lightGrey, color: COLORS.black }
              }>
              Chats
            </button>
            <button
              onClick={() => setMessageTab("notifications")}
              className="flex-1 py-2 rounded-full font-semibold text-sm"
              style={messageTab === "notifications"
                ? { background: COLORS.secondaryBlue, color: COLORS.white }
                : { background: COLORS.lightGrey, color: COLORS.black }
              }>
              Notifications
            </button>
          </div>

          {messageTab === "chats" ? (
            <div className="space-y-2">
              {chats.map((chat, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl relative">
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">{chat.name}</div>
                    <div className="text-xs text-gray-400">{chat.message || chat.time}</div>
                  </div>
                  {chat.unread && (
                    <div className="w-2 h-2 rounded-full absolute top-4 right-4" style={{ background: "#EF4444" }} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl relative">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: COLORS.primaryBlue }}>
                    <span className="text-xl">📢</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{notif.title}</div>
                  </div>
                  {notif.unread && (
                    <div className="w-2 h-2 rounded-full" style={{ background: "#EF4444" }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <BottomNav screen="messages" setScreen={setScreen} />
      </div>
    );
  }

  return null;
}

function BottomNav({ screen, setScreen }) {
  const tabs = [
    { id: "map", label: "Book", icon: "📍" },
    { id: "rides", label: "Rides", icon: "🕐" },
    { id: "wallet", label: "Wallet", icon: "💳" },
    { id: "messages", label: "Messages", icon: "💬" }
  ];

  return (
    <div className="border-t flex" style={{ background: COLORS.white }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setScreen(tab.id)}
          className="flex-1 flex flex-col items-center justify-center py-3"
          style={{ color: screen === tab.id ? COLORS.primaryBlue : "#9CA3AF" }}>
          <span className="text-xl mb-1">{tab.icon}</span>
          <span className="text-xs font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}