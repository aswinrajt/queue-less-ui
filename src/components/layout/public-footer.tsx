import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/layout/logo";

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Digital queues for clinics, salons, service centres, restaurants and tuition centres.
            No app to install.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/how-it-works" className="hover:text-foreground">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/q/$slug" params={{ slug: "general-consultation" }} className="hover:text-foreground">
                Public queue demo
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Get started</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/signup" className="hover:text-foreground">
                Create your queue
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-foreground">
                Business log in
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                Dashboard preview
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} QueueLess. Built for businesses that respect people's time.
      </div>
    </footer>
  );
}
