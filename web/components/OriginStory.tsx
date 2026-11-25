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
            My aunt in Guntur sends me videos about UPI scams and tells me about people she knows who lost money, so
            I&apos;ll be careful. Those stories made me wonder who helps them once the money is gone.{' '}
            <em>Fraud First Aid is my answer.</em>
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
