import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, X, ChevronLeft, Star, Download, Search, Plus, Check } from "lucide-react";

// Exact Figma Design System
const COLORS = {
  primary: "#3FA0C9",
  secondary: "#3F79C9",
  background: "#F5F7FA",
  black: "#000000",
  white: "#FFFFFF",
  lightGrey: "#E5E5E5",
  cardBg: "#FFFFFF",
  green: "#4CAF50",
  yellow: "#FFB800",
  red: "#FF3B30",
};

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function CustomerHomeFigma({ user }) {
  const [screen, setScreen] = useState("map");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [fareEstimate] = useState(72);
  const [booking, setBooking] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [profileTab, setProfileTab] = useState("profile");
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationSearch, setShowLocationSearch] = useState(null);

  useEffect(() => {
    if (!user) return;
    base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 50)
      .then(setBookings)
      .catch(() => {});
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
      setActiveRide({ ...b, status: "assigned", rider_name: "Juan Dela Cruz" });
      setScreen("riderFound");
    }, 3000);
  };

  const getRatingText = () => {
    if (rating === 5) return "Great!";
    if (rating === 4) return "Good";
    if (rating === 3) return "Okay";
    if (rating === 2) return "Poor";
    if (rating === 1) return "Bad";
    return "";
  };

  // SCREEN 1: HOME / BOOK
  if (screen === "map") {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.background }}>
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8" />
            <span className="font-semibold text-sm">Home(Book)</span>
          </div>
          <button 
            onClick={() => setScreen("profile")}
            className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </button>
        </div>

        {/* Map Background */}
        <div className="flex-1 relative bg-gray-200">
          {/* Map placeholder with street pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          
          {/* Current location marker */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-14 h-14 rounded-2xl opacity-70" style={{ background: COLORS.green }} />
          </div>

          {/* Zoom controls */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <button className="w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center font-bold text-xl">
              +
            </button>
            <button className="w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center font-bold text-xl">
              −
            </button>
          </div>

          {/* Where to? Card */}
          <div className="absolute top-4 left-4 right-4 bg-white rounded-3xl shadow-xl p-5">
            <div className="text-sm font-semibold mb-4" style={{ color: COLORS.black }}>
              Where to?
            </div>
            
            <div className="space-y-3">
              <div 
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: "#E0F2F7" }}>
                <div className="w-4 h-4 rounded-full" style={{ background: COLORS.primary }}>
                  <div className="w-2 h-2 rounded-full bg-white m-1" />
                </div>
                <input
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="PICK UP"
                  className="flex-1 bg-transparent text-xs font-medium outline-none placeholder-gray-500"
                  style={{ color: COLORS.black }}
                />
              </div>

              <div 
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: "#E0F2F7" }}>
                <MapPin className="w-4 h-4" style={{ color: COLORS.primary }} />
                <input
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="DESTINATION"
                  className="flex-1 bg-transparent text-xs font-medium outline-none placeholder-gray-500"
                  style={{ color: COLORS.black }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Booking Section */}
          <div className="absolute bottom-20 left-4 right-4 space-y-3">
            {/* Payment & Time Row */}
            <div className="flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 bg-white rounded-xl py-3 shadow-md">
                <span className="text-lg">💵</span>
                <span className="text-sm font-medium">Cash</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-white rounded-xl py-3 shadow-md">
                <span className="text-lg">🕐</span>
                <span className="text-sm font-medium">Now</span>
              </button>
            </div>

            {/* Motorcycle Card */}
            <div 
              className="bg-white rounded-2xl p-4 shadow-lg border-2"
              style={{ borderColor: COLORS.primary }}>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl">🏍️</span>
                <span className="font-semibold text-base" style={{ color: COLORS.primary }}>
                  Motorcycle
                </span>
              </div>
            </div>

            {/* Order Button */}
            <button
              onClick={handleBook}
              disabled={!dropoff || booking}
              className="w-full py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
              style={{ background: COLORS.primary }}>
              <span className="text-lg">₱ {fareEstimate}</span>
              <span className="text-base">{booking ? "Booking..." : "Order"}</span>
            </button>
          </div>
        </div>

        <BottomNav screen="map" setScreen={setScreen} />
      </div>
    );
  }

  // SCREEN 2: FINDING RIDER
  if (screen === "searching") {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        {/* Large animated icon */}
        <div className="relative mb-10">
          <div 
            className="w-36 h-36 rounded-full flex items-center justify-center"
            style={{ background: "#E3F2FD" }}>
            <div 
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: COLORS.secondary }}>
              <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </div>
          </div>
          {/* Ping animations */}
          {[0, 1, 2].map((i) => (
            <div 
              key={i}
              className="absolute inset-0 rounded-full animate-ping"
              style={{ 
                background: `rgba(63, 121, 201, ${0.2 - i * 0.05})`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: "2s"
              }}
            />
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.black }}>
          Finding you a rider...
        </h2>
        <p className="text-sm text-gray-500 text-center mb-10 max-w-sm">
          We're matching you with the best available rider nearby
        </p>

        {/* Loading dots */}
        <div className="flex gap-2 mb-10">
          {[0, 1, 2].map((i) => (
            <div 
              key={i}
              className="w-2.5 h-2.5 rounded-full animate-bounce"
              style={{ 
                background: COLORS.secondary,
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm mb-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div 
                className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: "#E3F2FD" }}>
                <MapPin className="w-7 h-7" style={{ color: COLORS.secondary }} />
              </div>
              <div className="text-3xl font-bold mb-1">8</div>
              <div className="text-xs text-gray-500">Riders Nearby</div>
            </div>
            <div className="text-center">
              <div 
                className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: "#E8F5E9" }}>
                <svg className="w-7 h-7" style={{ color: COLORS.green }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <div className="text-3xl font-bold mb-1">~2 min</div>
              <div className="text-xs text-gray-500">Avg Wait Time</div>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={() => setScreen("map")}
          className="px-10 py-3 rounded-full border-2 font-semibold text-base"
          style={{ borderColor: COLORS.secondary, color: COLORS.secondary }}>
          Cancel
        </button>
      </div>
    );
  }

  // SCREEN 3: RIDER FOUND
  if (screen === "riderFound") {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        {/* Success Icon */}
        <div 
          className="w-36 h-36 rounded-full flex items-center justify-center mb-8"
          style={{ background: "#E8F5E9" }}>
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: COLORS.green }}>
            <Check className="w-14 h-14 text-white" strokeWidth={4} />
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-2" style={{ color: COLORS.black }}>
          Rider Found!
        </h2>
        <p className="text-base text-gray-500 mb-10">Your rider is on the way</p>

        {/* Driver Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm mb-8">
          {/* Driver Info */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gray-300" />
              <div 
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: COLORS.green }}>
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
            </div>
            <div className="flex-1">
              <div className="font-bold text-lg mb-1">Juan Dela Cruz</div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-base">4.8</span>
                <span className="text-xs text-gray-400">(1250 rides)</span>
              </div>
              <div 
                className="text-xs px-2.5 py-1 rounded-md inline-block font-semibold"
                style={{ background: "#E3F2FD", color: COLORS.secondary }}>
                ⭐ Top Rated
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="space-y-3 mb-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Vehicle</span>
              <span className="text-sm font-semibold">Honda TMX 155</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Plate Number</span>
              <span className="text-sm font-semibold">ABC 1234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">ETA</span>
              <span className="text-sm font-bold" style={{ color: COLORS.green }}>3 mins away</span>
            </div>
          </div>

          {/* Verification Badge */}
          <div 
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "#E3F2FD" }}>
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: COLORS.secondary }}>
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold" style={{ color: COLORS.secondary }}>
                Verified Driver
              </div>
              <div className="text-xs" style={{ color: COLORS.secondary }}>
                Background checked & licensed
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={() => setScreen("tripCompleted")}
          className="w-full max-w-sm py-4 rounded-2xl font-bold text-white text-base shadow-lg"
          style={{ background: COLORS.secondary }}>
          Continue
        </button>
      </div>
    );
  }

  // SCREEN 4: TRIP COMPLETED
  if (screen === "tripCompleted") {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        {/* Success Icon */}
        <div 
          className="w-28 h-28 rounded-full flex items-center justify-center mb-8"
          style={{ background: "#E8F5E9" }}>
          <Check className="w-16 h-16" style={{ color: COLORS.green }} strokeWidth={4} />
        </div>

        <h2 className="text-3xl font-bold mb-2" style={{ color: COLORS.black }}>
          Trip Completed!
        </h2>
        <p className="text-base text-gray-500 mb-10">Thank you for riding with Habal</p>

        {/* Trip Summary Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm mb-8">
          {/* Driver Avatar Placeholder */}
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
              <Star className="w-10 h-10 text-yellow-400" />
            </div>
          </div>

          {/* Trip Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3 text-gray-500">
                <MapPin className="w-5 h-5" />
                <span className="text-sm font-medium">Distance</span>
              </div>
              <span className="text-sm font-semibold">5.2 km</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                <span className="text-sm font-medium">Duration</span>
              </div>
              <span className="text-sm font-semibold">15 mins</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3 text-gray-500">
                <span className="text-sm font-bold">₱</span>
                <span className="text-sm font-medium">Fare</span>
              </div>
              <span className="text-sm font-semibold">₱undefined</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-500 font-medium">Paid with</span>
              <span className="text-sm font-semibold">Cash</span>
            </div>
          </div>

          {/* Download Receipt */}
          <button className="w-full mt-4 py-3 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl">
            <Download className="w-4 h-4" />
            Download Receipt
          </button>
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => setScreen("rating")}
          className="w-full max-w-sm py-4 rounded-2xl font-bold text-white text-base shadow-lg flex items-center justify-center gap-2 mb-4"
          style={{ background: COLORS.secondary }}>
          <Star className="w-5 h-5" />
          Rate Your Ride
        </button>

        <button
          onClick={() => setScreen("map")}
          className="font-semibold text-base"
          style={{ color: COLORS.secondary }}>
          Back to Home
        </button>
      </div>
    );
  }

  // SCREEN 5: RATE RIDE
  if (screen === "rating") {
    const tags = ["Professional", "Safe Driving", "Friendly", "On Time", "Clean Vehicle", "Smooth Ride"];
    
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-4 border-b border-gray-100">
          <button onClick={() => setScreen("tripCompleted")}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold">Rate Your Ride</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
          {/* Driver Avatar Placeholder */}
          <div className="w-36 h-36 rounded-3xl bg-gray-200 mb-10" />

          <p className="text-base text-gray-500 mb-5">How was your ride?</p>
          
          {/* Star Rating */}
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)}>
                <Star
                  className="w-14 h-14"
                  fill={star <= rating ? COLORS.yellow : "none"}
                  color={star <= rating ? COLORS.yellow : "#D1D5DB"}
                  strokeWidth={2}
                />
              </button>
            ))}
          </div>
          
          {rating > 0 && (
            <p className="text-base font-semibold mb-10" style={{ color: COLORS.black }}>
              {getRatingText()}
            </p>
          )}

          {/* Tags */}
          <div className="w-full max-w-md">
            <p className="text-sm text-gray-500 mb-4">What did you like?</p>
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    );
                  }}
                  className="px-5 py-2.5 rounded-full text-sm font-medium border-2 transition-all"
                  style={selectedTags.includes(tag) 
                    ? { background: COLORS.primary, color: COLORS.white, borderColor: COLORS.primary }
                    : { background: COLORS.white, color: COLORS.black, borderColor: COLORS.lightGrey }
                  }>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={() => setScreen("feedback")}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: COLORS.secondary }}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 6: ADDITIONAL FEEDBACK
  if (screen === "feedback") {
    const suggestions = [
      "Driver was very polite",
      "Arrived on time",
      "Vehicle was clean",
      "Safe and comfortable ride"
    ];

    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-4 border-b border-gray-100">
          <button onClick={() => setScreen("rating")}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold">Additional Feedback</h2>
        </div>

        <div className="flex-1 px-6 py-6 overflow-y-auto">
          <p className="text-sm text-gray-500 mb-5">
            Help us improve by sharing more details about your experience
          </p>

          {/* Feedback Textarea */}
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="nice"
            className="w-full h-36 p-4 rounded-2xl border-2 resize-none outline-none text-base"
            style={{ borderColor: COLORS.primary }}
          />

          {/* Quick Suggestions */}
          <p className="text-sm text-gray-500 mt-8 mb-4">Quick suggestions</p>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setFeedbackText(suggestion)}
                className="w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                style={{ borderColor: COLORS.lightGrey }}>
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 space-y-3 border-t border-gray-100">
          <button
            onClick={() => setScreen("tip")}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: COLORS.secondary }}>
            Continue
          </button>
          <button
            onClick={() => setScreen("map")}
            className="w-full py-3 font-semibold text-base"
            style={{ color: COLORS.secondary }}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 7: TIP
  if (screen === "tip") {
    const presets = [10, 20, 30, 50];

    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-4 border-b border-gray-100">
          <button onClick={() => setScreen("feedback")}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold">Add a Tip</h2>
        </div>

        <div className="flex-1 flex flex-col items-center px-6 py-12 overflow-y-auto">
          {/* Heart Icon */}
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{ background: "#FFE5E5" }}>
            <span className="text-5xl">❤️</span>
          </div>

          <h3 className="text-2xl font-bold mb-3">Show Your Appreciation</h3>
          <p className="text-sm text-gray-500 text-center mb-10 max-w-sm">
            Your rider went the extra mile. Consider adding a tip!
          </p>

          {/* Preset Amounts */}
          <p className="text-sm text-gray-500 mb-4">Choose amount</p>
          <div className="grid grid-cols-4 gap-3 mb-8 w-full max-w-sm">
            {presets.map((amount) => (
              <button
                key={amount}
                onClick={() => setTipAmount(amount)}
                className="py-4 rounded-2xl font-bold text-base transition-all"
                style={tipAmount === amount
                  ? { background: COLORS.secondary, color: COLORS.white }
                  : { background: COLORS.lightGrey, color: COLORS.black }
                }>
                ₱{amount}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <p className="text-sm text-gray-500 mb-4">Or enter custom amount</p>
          <div 
            className="w-full max-w-sm px-5 py-4 rounded-xl border-2 flex items-center gap-3 mb-8"
            style={{ borderColor: COLORS.lightGrey }}>
            <span className="text-xl font-bold">₱</span>
            <input
              type="number"
              value={tipAmount || ""}
              onChange={(e) => setTipAmount(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="flex-1 outline-none text-xl"
            />
          </div>

          {/* Tip Summary */}
          <div 
            className="w-full max-w-sm px-5 py-4 rounded-xl flex items-center justify-between"
            style={{ background: "#E3F2FD" }}>
            <span className="text-sm font-semibold">Tip Amount</span>
            <span className="text-xl font-bold" style={{ color: COLORS.secondary }}>
              ₱{tipAmount}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 space-y-3 border-t border-gray-100">
          <button
            onClick={() => setScreen("map")}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: COLORS.secondary }}>
            Add Tip
          </button>
          <button
            onClick={() => setScreen("map")}
            className="w-full py-3 font-semibold text-base"
            style={{ color: COLORS.secondary }}>
            No Thanks
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 8 & 9: PROFILE
  if (screen === "profile") {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-base">Profile</span>
          <div className="flex items-center gap-3">
            <button 
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: COLORS.primary }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium">
              Edit
            </button>
          </div>
        </div>

        {/* Logo & Title */}
        <div className="flex flex-col items-center pt-6 pb-4">
          <img src={HABAL_LOGO} alt="Habal" className="w-16 h-16 mb-6" />
          <h2 className="text-2xl font-bold mb-8">User Profile</h2>

          {/* Avatar */}
          <div className="w-28 h-28 rounded-full bg-gray-300 flex items-center justify-center text-4xl font-bold mb-8">
            JD
          </div>

          {/* Tabs */}
          <div className="flex border-b w-full max-w-md">
            <button
              onClick={() => setProfileTab("profile")}
              className="flex-1 py-3 text-sm font-semibold border-b-2 transition-colors"
              style={profileTab === "profile"
                ? { borderColor: COLORS.primary, color: COLORS.primary }
                : { borderColor: "transparent", color: "#9CA3AF" }
              }>
              Profile
            </button>
            <button
              onClick={() => setProfileTab("locations")}
              className="flex-1 py-3 text-sm font-semibold border-b-2 transition-colors"
              style={profileTab === "locations"
                ? { borderColor: COLORS.primary, color: COLORS.primary }
                : { borderColor: "transparent", color: "#9CA3AF" }
              }>
              Saved Locations
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-24">
          {profileTab === "profile" ? (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base">Personal Information</h3>
                  <button style={{ color: COLORS.primary }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Name</p>
                    <p className="font-semibold">John Doe</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Sex</p>
                    <p className="font-semibold">Not Specified</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base">Contact Information</h3>
                  <button style={{ color: COLORS.primary }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Mobile Number</p>
                    <p className="font-semibold">+639xxxxxxxxx</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">E-mail</p>
                    <p className="font-semibold">johndoe@habal.com</p>
                  </div>
                </div>
              </div>

              {/* Account Settings */}
              <div>
                <h3 className="font-bold text-base mb-4">Account Settings</h3>
                <button
                  className="w-full py-4 rounded-2xl font-bold text-white text-base mb-4"
                  style={{ background: COLORS.primary }}>
                  SIGN OUT
                </button>
                <button className="w-full py-3 flex items-center justify-center gap-3 text-sm font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
                  Settings
                </button>
                <button className="w-full py-3 flex items-center justify-center gap-3 text-sm font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/>
                  </svg>
                  Support
                </button>
              </div>
            </div>
          ) : (
            // Saved Locations Tab
            <div className="space-y-4 pt-4">
              {[
                { icon: "🏠", label: "Add Home", type: "home" },
                { icon: "🏢", label: "Add Work", type: "work" },
                { icon: "📍", label: "Add Custom", type: "custom" }
              ].map((item) => (
                <div key={item.type}>
                  <button
                    onClick={() => setShowLocationSearch(item.type)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-200">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: COLORS.primary }}>
                      <span className="text-2xl">{item.icon}</span>
                    </div>
                    <span className="flex-1 text-left font-semibold">{item.label}</span>
                    <button style={{ color: COLORS.primary }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                  </button>
                  
                  {/* Location Search Dropdown */}
                  {showLocationSearch === item.type && (
                    <div className="mt-3 bg-gray-50 rounded-xl p-3">
                      <div className="relative mb-2">
                        <input
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          placeholder="Jar..."
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none text-sm"
                        />
                        <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <button 
                            key={i}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-white rounded">
                            <div className="font-semibold">Jaro Iloilo Location {i}</div>
                            <div className="text-gray-500">1029 Perez St Jaro Iloilo (Return Point) M...</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <BottomNav screen="profile" setScreen={setScreen} />
      </div>
    );
  }

  // SCREEN 11: RIDES HISTORY
  if (screen === "rides") {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <span className="font-semibold text-base">Home(Rides)</span>
          <button className="w-9 h-9 rounded-full bg-gray-200" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          <h2 className="text-2xl font-bold mb-6">Ride History</h2>
          
          {/* Ride Cards */}
          <div className="space-y-3">
            {bookings.slice(0, 6).map((booking, idx) => (
              <div 
                key={booking.id}
                className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">
                        {booking.pickup_address}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      {new Date(booking.created_date).toLocaleDateString("en-US", { 
                        month: "short", 
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                    {booking.customer_rating && (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s}
                            className="w-3.5 h-3.5"
                            fill={s <= booking.customer_rating ? COLORS.yellow : "none"}
                            color={COLORS.yellow}
                            strokeWidth={2}
                          />
                        ))}
                      </div>
                    )}
                    {!booking.customer_rating && (
                      <p className="text-xs text-gray-400 italic">
                        Thank you so much for the convenience!
                      </p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div 
                      className="px-3 py-1 rounded-md text-xs font-semibold"
                      style={{ 
                        background: booking.status === "completed" ? COLORS.green : COLORS.lightGrey,
                        color: booking.status === "completed" ? COLORS.white : COLORS.black
                      }}>
                      {booking.status === "completed" ? "Completed" : "Cancelled"}
                    </div>
                    <p className="font-bold text-base">₱{booking.fare_estimate || 0}.00</p>
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

  // SCREEN 13: WALLET
  if (screen === "wallet") {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif", background: COLORS.white }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <span className="font-semibold text-base">Home(Wallet)</span>
          <button className="w-9 h-9 rounded-full bg-gray-200" />
        </div>

        <div className="flex-1 px-4 py-6 pb-24">
          <h2 className="text-2xl font-bold mb-6">Wallet</h2>
          
          {/* Wallet Card */}
          <div 
            className="rounded-3xl p-6 shadow-xl"
            style={{ 
              background: `linear-gradient(135deg, #4DD8F0 0%, ${COLORS.primary} 100%)`
            }}>
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.25)" }}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                </svg>
              </div>
              <span className="text-white text-xs font-semibold uppercase tracking-wider">
                WALLET BALANCE
              </span>
            </div>
            <div className="text-white text-5xl font-bold mb-4">
              ₱ 6,767.00
            </div>
            <button className="flex items-center gap-2 text-white text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Transaction History
            </button>
          </div>
        </div>

        <BottomNav screen="wallet" setScreen={setScreen} />
      </div>
    );
  }

  // SCREEN 14: MESSAGES
  if (screen === "messages") {
    const [messageTab, setMessageTab] = useState("chats");
    
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <span className="font-semibold text-base">
            Home(Messages-{messageTab === "chats" ? "Chat" : "Notifications"})
          </span>
          <button className="w-9 h-9 rounded-full bg-gray-200" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          <h2 className="text-2xl font-bold mb-6">Messages</h2>
          
          {/* Tabs */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setMessageTab("chats")}
              className="flex-1 py-3 rounded-full font-semibold text-sm transition-all"
              style={messageTab === "chats"
                ? { background: COLORS.secondary, color: COLORS.white }
                : { background: COLORS.lightGrey, color: COLORS.black }
              }>
              Chats
            </button>
            <button
              onClick={() => setMessageTab("notifications")}
              className="flex-1 py-3 rounded-full font-semibold text-sm transition-all"
              style={messageTab === "notifications"
                ? { background: COLORS.secondary, color: COLORS.white }
                : { background: COLORS.lightGrey, color: COLORS.black }
              }>
              Notifications
            </button>
          </div>

          {/* Content */}
          {messageTab === "chats" ? (
            <div className="space-y-3">
              {chats.map((chat, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl relative">
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-1">{chat.name}</div>
                    <div className="text-xs text-gray-400">
                      {chat.message || chat.time}
                    </div>
                  </div>
                  {chat.unread && (
                    <div 
                      className="w-2.5 h-2.5 rounded-full absolute top-4 right-4"
                      style={{ background: COLORS.red }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl relative">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: COLORS.primary }}>
                    <span className="text-2xl">📢</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{notif.title}</div>
                  </div>
                  {notif.unread && (
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: COLORS.red }}
                    />
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

// Bottom Navigation Component
function BottomNav({ screen, setScreen }) {
  const tabs = [
    { id: "map", label: "Book", icon: "📍" },
    { id: "rides", label: "Rides", icon: "🕐" },
    { id: "wallet", label: "Wallet", icon: "💳" },
    { id: "messages", label: "Messages", icon: "💬" }
  ];

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t flex bg-white"
      style={{ height: "72px" }}>
      {tabs.map((tab) => {
        const isActive = screen === tab.id || (tab.id === "map" && ["searching", "riderFound", "tripCompleted", "rating", "feedback", "tip"].includes(screen));
        return (
          <button
            key={tab.id}
            onClick={() => setScreen(tab.id)}
            className="flex-1 flex flex-col items-center justify-center gap-1"
            style={{ color: isActive ? COLORS.primary : "#9CA3AF" }}>
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-xs font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}