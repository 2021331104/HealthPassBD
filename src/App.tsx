import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Homepage from './components/Homepage';
import Dashboard from './components/Dashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AmbulanceDashboard from './components/AmbulanceDashboard';
import PublicRecordView from './components/PublicRecordView';

function Router() {
  const { user, profile, loading } = useAuth();
  const [route, setRoute] = useState(window.location.hash);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Public QR scan route — works without login
  const cardMatch = route.match(/^#\/card\/(.+)$/);
  if (cardMatch) {
    return <PublicRecordView cardId={decodeURIComponent(cardMatch[1])} onBack={() => { window.location.hash = ''; }} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-600 animate-spin" />
      </div>
    );
  }

  // Not signed in: show homepage (or auth screen if user clicked get started)
  if (!user) {
    if (showAuth) return <Auth />;
    return <Homepage onGetStarted={() => setShowAuth(true)} />;
  }

  const role = profile?.role ?? 'patient';

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.hash = '';
    setShowAuth(false);
  };

  if (role === 'doctor') return <DoctorDashboard onSignOut={signOut} userId={user.id} />;
  if (role === 'ambulance') return <AmbulanceDashboard onSignOut={signOut} userId={user.id} />;
  return <Dashboard onSignOut={signOut} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
