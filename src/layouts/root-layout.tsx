import { Outlet } from "react-router-dom";
import Sidebar from "../components/sidebar";
import Header from "../components/header";

export default function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
