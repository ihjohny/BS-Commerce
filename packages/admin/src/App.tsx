import { Navigate, Route, Routes } from "react-router-dom";

import { AdminShell } from "@/components/layout/AdminShell";
import { RequireAuth } from "@/components/RequireAuth";
import { CreateFirstUser } from "@/pages/CreateFirstUser";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { CollectionFormPage } from "@/pages/collections/CollectionFormPage";
import { CollectionListPage } from "@/pages/collections/CollectionListPage";
import { GlobalFormPage } from "@/pages/globals/GlobalFormPage";
import { MediaLibrary } from "@/pages/MediaLibrary";
import { Reports } from "@/pages/Reports";
import { SalesAnalytics } from "@/pages/reports/SalesAnalytics";
import { ProductCatalog } from "@/pages/reports/ProductCatalog";
import { CustomerEngagement } from "@/pages/reports/CustomerEngagement";
import { InventoryOperations } from "@/pages/reports/InventoryOperations";
import { AccountPage } from "@/pages/AccountPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/create-first-user" element={<CreateFirstUser />} />
      <Route element={<RequireAuth />}>
        <Route element={<AdminShell />}>
          <Route index element={<Dashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/sales" element={<SalesAnalytics />} />
          <Route path="reports/products" element={<ProductCatalog />} />
          <Route path="reports/engagement" element={<CustomerEngagement />} />
          <Route path="reports/inventory" element={<InventoryOperations />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="collections/:slug" element={<CollectionListPage />} />
          <Route
            path="collections/:slug/new"
            element={<CollectionFormPage />}
          />
          <Route
            path="collections/:slug/:id"
            element={<CollectionFormPage />}
          />
          <Route path="globals/:slug" element={<GlobalFormPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
