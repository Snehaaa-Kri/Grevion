import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer.jsx';
import { LoginContextProvider } from './context';

import LandingPage from './pages/LandingPage/LandingPage.jsx';
import Sustainability from './pages/LandingPage/Sustainability.jsx';
import WhatWeDo from './pages/LandingPage/WhatWeDo.jsx';
import WhoWeAre from './pages/LandingPage/WhoWeAre.jsx';

import Login from './pages/Login/Login.jsx';
import Signup from './pages/Signup/Signup.jsx';

import Spoc_dashboard from './pages/spoc/Spoc_dashboard.jsx';
import AddFarmer from './pages/spoc/AddFarmerPage.jsx';
import FarmerListing from './pages/spoc/FarmerListingPage.jsx';
import ParalisRequest from './pages/spoc/OrderListingPage.jsx';
import SpocProfile from './pages/spoc/SpocProfilePage.jsx';

import PowerplantDashboard from './pages/powerplant/PowerplantDashboard.jsx';
import MakePayment from './pages/powerplant/MakePaymentPage.jsx';
import Checkout from './pages/powerplant/Checkout.jsx';
import MyOrdersPage from './pages/powerplant/MyOrdersPage.jsx';
import SpocsListing from './pages/powerplant/SpocsListingPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SpocNavbar from './pages/spoc/SpocNavbar.jsx';
import SpocLayout from './pages/spoc/SpocLayout.jsx';
import PowerPlantProfile from './pages/powerplant/PowerPlantProfile.jsx';
import PowerPlantLayout from './pages/powerplant/PowerPlantLayout.jsx';
import Faqs from './pages/LandingPage/Faqs.jsx';
import AboutUsPage from './pages/AboutUsPage.jsx';
import OurServices from './pages/OurServices.jsx';
import ContactUs from './pages/ContactUs.jsx';
import Blog from './pages/Blog.jsx';

const App = () => {

  return (
    <LoginContextProvider value={{}}>
      <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landingPage" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Landing Page Routes */}
        <Route path="/landingPage/sustainability" element={<Sustainability />} />
        <Route path="/landingPage/whatwedo" element={<WhatWeDo />} />
        <Route path="/landingPage/whoweare" element={<WhoWeAre />} />
        <Route path="/landingPage/faqs" element={<Faqs />} />

        {/* Protected Routes */}
        <Route path="/spoc/*" element={<ProtectedRoute />}>
          <Route element={<SpocLayout/>}> 
            <Route path="dashboard" element={<Spoc_dashboard />} />
            <Route path="add-farmer" element={<AddFarmer />} />
            <Route path="farmer-listing" element={<FarmerListing />} />
            <Route path="paralis-request" element={<ParalisRequest />} />
            <Route path="profile" element={<SpocProfile />} />
          </Route>
        </Route>

        <Route path="/powerplant/*" element={<ProtectedRoute />}>
          <Route element={<PowerPlantLayout/>}>
            <Route path="dashboard" element={<PowerplantDashboard />} />
            <Route path="make-payment" element={<MakePayment />} />
            <Route path="payment" element={<Checkout />} />
            <Route path="my-orders" element={<MyOrdersPage />} />
            <Route path="spocs-listing" element={<SpocsListing />} />
            <Route path="profile" element={<PowerPlantProfile />} />
          </Route>
        </Route>

        {/* Footer routes  */}
        <Route path='/about-us' element={<AboutUsPage/>}/>
        <Route path='/our-sevices' element={<OurServices/>}/>
        <Route path='/contact-us' element={<ContactUs/>}/>
        <Route path='/blog' element={<Blog/>}/>
      </Routes>
      </main>
      <Footer />
      </div>
    </LoginContextProvider>
  );
};

export default App;
