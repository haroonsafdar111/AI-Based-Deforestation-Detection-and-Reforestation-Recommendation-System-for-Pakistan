import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Map from './pages/Map'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import Help from './pages/Help'
import Dashboard from './pages/Dashboard'
import Search from './pages/Search'
import Profile from './pages/Profile'
import UpdateProfile from './pages/UpdateProfile'
import About from './pages/About'
import AdminDashboard from './pages/AdminDashboard'
import Feedback from './pages/Feedback'
import GettingStartedHelp from './pages/help/GettingStartedHelp'
import DashboardHelp from './pages/help/DashboardHelp'
import RegionSelectionHelp from './pages/help/RegionSelectionHelp'
import DeforestationVisualizationHelp from './pages/help/DeforestationVisualizationHelp'
import ReforestationRecommendationsHelp from './pages/help/ReforestationRecommendationsHelp'
import EnvironmentalDataHelp from './pages/help/EnvironmentalDataHelp'
import ForestTrendsHelp from './pages/help/ForestTrendsHelp'
import ReportsHelp from './pages/help/ReportsHelp'
import AlertsHelp from './pages/help/AlertsHelp'
import AccountHelp from './pages/help/AccountHelp'
import FAQHelp from './pages/help/FAQHelp'
import TroubleshootingHelp from './pages/help/TroubleshootingHelp'
import TipsHelp from './pages/help/TipsHelp'
import ProtectedRoute from './components/ProtectedRoute'
import RiskMonitor from './components/RiskMonitor'
import { LanguageProvider } from './context/LanguageContext'
import { NotificationProvider } from './context/NotificationContext'

function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <RiskMonitor />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<Map />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/update" element={<UpdateProfile />} />

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Route>

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/search" element={<Search />} />

            {/* Help Routes */}
            <Route path="/help" element={<Help />} />
            <Route path="/help/getting-started" element={<GettingStartedHelp />} />
            <Route path="/help/dashboard" element={<DashboardHelp />} />
            <Route path="/help/region-selection" element={<RegionSelectionHelp />} />
            <Route path="/help/deforestation-visualization" element={<DeforestationVisualizationHelp />} />
            <Route path="/help/reforestation-recommendations" element={<ReforestationRecommendationsHelp />} />
            <Route path="/help/environmental-data" element={<EnvironmentalDataHelp />} />
            <Route path="/help/forest-trends" element={<ForestTrendsHelp />} />
            <Route path="/help/reports" element={<ReportsHelp />} />
            <Route path="/help/alerts" element={<AlertsHelp />} />
            <Route path="/help/account" element={<AccountHelp />} />
            <Route path="/help/faq" element={<FAQHelp />} />
            <Route path="/help/troubleshooting-support" element={<TroubleshootingHelp />} />
            <Route path="/help/tips" element={<TipsHelp />} />

            {/* <Route path="/contact" element={<Contact />} /> */}
            {/* <Route path="/topics" element={<Topics />} /> */}
            {/* <Route path="/blog" element={<Blog />} /> */}
            <Route path="/about" element={<About />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </LanguageProvider>
  )
}

export default App
