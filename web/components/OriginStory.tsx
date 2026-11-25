// Where the idea came from, in the builder's own words. Sits right under the hero.
export function OriginStory() {
  return (
    <section className="og up-wrap" aria-labelledby="og-q" data-testid="origin-story">
      <div className="og-card">
        <span className="og-mark og-mark--open" aria-hidden="true">
          &ldquo;
        </span>
        <p id="og-q" className="og-q">
          Where did the idea come from?
        </p>
        <blockquote className="og-quote">
          <p>
            My aunt lives in Guntur. She keeps sending me videos about UPI scams, and every time we talk she has
            another story about someone she knows who lost money. <em>She tells me all of it so I&apos;ll be careful.</em>
          </p>
        </blockquote>
        <p className="og-by">
          <span className="og-rule" aria-hidden="true" />
          The person who built Fraud First Aid
        </p>
        <span className="og-mark og-mark--close" aria-hidden="true">
          &rdquo;
        </span>
      </div>
    </section>
  );
}
