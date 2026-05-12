const formatINR = (n: number) => n.toLocaleString("en-IN");

const sample = [
  { emoji: "🍜", name: "Food", amount: 12450 },
  { emoji: "🧾", name: "Bills", amount: 14800 },
  { emoji: "🎬", name: "Entertainment", amount: 5970 },
];

export function AuthMarketingRail() {
  return (
    <aside className="auth-side">
      <div className="eyebrow">The honest expense tracker</div>
      <div style={{ marginTop: "auto" }}>
        <div className="receipt">
          <div className="eyebrow" style={{ fontSize: 10 }}>
            April · in review
          </div>
          <div className="total">₹42,180</div>
          <div className="sub">₹3,820 less than March. ✨</div>
          <hr className="hr" style={{ margin: "14px 0" }} />
          {sample.map((r) => (
            <div key={r.name} className="row">
              <span className="label-text">
                {r.emoji} {r.name}
              </span>
              <span className="amt">₹{formatINR(r.amount)}</span>
            </div>
          ))}
        </div>
        <div className="tagline">Track every rupee. Judge none of them.</div>
        <div className="blurb">
          Spendline keeps the math out of your evenings. Add an expense in three
          taps; we&apos;ll handle the rest.
        </div>
      </div>
      <div className="colophon">
        spendline.app · v1.0 · made with attention in Bengaluru
      </div>
    </aside>
  );
}
