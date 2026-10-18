import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Skeleton } from "./components/ui";
import { useAuth } from "./lib/contexts";
import Dashboard from "./pages/Dashboard";
import DestinationDetailPage from "./pages/DestinationDetail";
import Discover from "./pages/Discover";
import FlightBooking from "./pages/FlightBooking";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import MapPage from "./pages/MapPage";
import MyTrips from "./pages/MyTrips";
import NewTrip from "./pages/NewTrip";
import Settings from "./pages/Settings";
import TripView from "./pages/TripView";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return children;
}

function NotFound() {
  return (
    <div className="card mx-auto max-w-lg p-10 text-center">
      <h1 className="font-display text-3xl">Page not found</h1>
      <p className="mt-2 text-cream/70">That page does not exist.</p>
      <a className="btn-primary mt-5" href="/">Back to home</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/discover/:id" element={<DestinationDetailPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/flights" element={<FlightBooking />} />
        <Route path="/book-flight" element={<FlightBooking />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/trips" element={<RequireAuth><MyTrips /></RequireAuth>} />
        <Route path="/trips/new" element={<RequireAuth><NewTrip /></RequireAuth>} />
        <Route path="/trips/:id" element={<RequireAuth><TripView /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
