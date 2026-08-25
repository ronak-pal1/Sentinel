import { Outlet } from "react-router-dom";
import Header from "./components/Header";
import RulerEffect from "./components/RulerEffect";

const Layout = () => {
  return (
    <div className="flex flex-1 flex-row h-screen overflow-hidden bg-(--background-color)">
      <div className="hidden md:block w-17.5 h-screen border-r border-(--border-color) bg-(--surface-color) shrink-0">
        <RulerEffect height="h-screen" />
      </div>

      <div className="flex flex-col flex-1 w-full min-w-0 h-screen">
        <div className="shrink-0 sticky top-0 z-20">
          <Header />
        </div>
        <div
          id="main-scroll"
          className="flex-1 min-h-0 overflow-y-auto scrollbar-hide"
        >
          <main>
            <Outlet />
          </main>
        </div>
      </div>

      <div className="hidden md:block w-17.5 h-screen border-l border-(--border-color) bg-(--surface-color) shrink-0">
        <RulerEffect height="h-screen" />
      </div>
    </div>
  );
};

export default Layout;
