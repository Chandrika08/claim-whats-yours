import { HashRouter, Route, Routes } from 'react-router-dom';
import Nav from './components/Nav';
import Disclaimer from './components/Disclaimer';
import Home from './pages/Home';
import Results from './pages/Results';
import Tracker from './pages/Tracker';
import Admin from './pages/Admin';
import Partners from './pages/Partners';
import { ProfileProvider } from './context/ProfileContext';

export default function App() {
  return (
    <HashRouter>
      <ProfileProvider>
        <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
          <Nav />
          <main className="flex-1 p-4">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/results" element={<Results />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/partners" element={<Partners />} />
            </Routes>
          </main>
          <Disclaimer />
        </div>
      </ProfileProvider>
    </HashRouter>
  );
}
