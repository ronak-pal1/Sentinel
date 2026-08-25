import { Outlet } from "react-router-dom";
import Footer from "./components/Footer";
import Header from "./components/Header";
import RulerEffect from "./components/RulerEffect";

const Layout = () => {
  return (
    <div className="flex flex-1 flex-row h-screen overflow-hidden ">
      <div className="w-17.5 h-screen border-r border-black/30 bg-[#FFFCF0]">
        <RulerEffect height="h-screen" />
      </div>

      <div className="flex-1 w-full ">
        <Header />
        <div className="overflow-y-scroll h-full scrollbar-hide">
        <main>
          <Outlet />
        </main>
        <Footer />
        </div>
      
      </div>

      <div className="w-17.5 h-screen border-l border-black/30 bg-[#FFFCF0]">
        <RulerEffect height="h-screen" />
      </div>
    </div>
  );
};

export default Layout;
