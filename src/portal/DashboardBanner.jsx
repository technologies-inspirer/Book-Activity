export function DashboardBanner() {
  return (
    <section className="portal-panel overview-feature">
      <div className="overview-banner-copy">
        <p className="portal-eyebrow">Ready for the next chapter?</p>
        <h2>Give every learner<br />their own bookshelf.</h2>
        <p className="portal-muted">Create a fictional account, choose a few books, and try the reader experience.</p>
        <a className="portal-primary" href="#/admin/users">Manage users <span aria-hidden="true">&rarr;</span></a>
      </div>
    </section>
  );
}
