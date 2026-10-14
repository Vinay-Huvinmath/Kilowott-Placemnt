import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { Login } from './pages/Login.js';
import { Today } from './pages/Today.js';
import { Customers } from './pages/Customers.js';
import { CustomerDetail } from './pages/CustomerDetail.js';
import { Orders } from './pages/Orders.js';
import { Messages } from './pages/Messages.js';
import { Automations } from './pages/Automations.js';
import { NotFound } from './pages/NotFound.js';
import { getStoredToken } from './lib/api.js';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getStoredToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Today />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="orders" element={<Orders />} />
          <Route path="messages" element={<Messages />} />
          <Route path="automations" element={<Automations />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
