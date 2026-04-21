import { Compass, Building2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const Navbar = () => {
  const linkBase =
    "px-3 py-2 rounded-full text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-zen flex items-center gap-2";
  const linkActive = "bg-secondary text-foreground shadow-soft";

  return (
    <nav className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <NavLink
          to="/"
          className="flex items-center gap-2 font-display text-lg leading-none"
        >
          <span className="w-7 h-7 rounded-full bg-gradient-sage flex items-center justify-center text-primary-foreground">
            <Compass className="w-3.5 h-3.5" />
          </span>
          <span>
            Qi<span className="text-primary">Scan</span>
          </span>
        </NavLink>

        <div className="flex items-center gap-1">
          <NavLink to="/" end className={linkBase} activeClassName={linkActive}>
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Feng Shui</span>
          </NavLink>
          <NavLink
            to="/utilities"
            className={linkBase}
            activeClassName={linkActive}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Urban Utility</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
