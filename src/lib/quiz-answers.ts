/**
 * Correct answers for all quiz lessons.
 * Key = lessonId, value = array of 0-based option indices (one per question, in order).
 */
export const QUIZ_ANSWERS: Record<string, number[]> = {
  // Week 1 Quiz — 5 questions
  "3644621": [1, 2, 2, 1, 1],

  // Week 2 Quiz — 5 questions
  "3644695": [1, 0, 1, 1, 3],

  // Week 3: hits-based giving — 1 question
  "3779929": [1],

  // Week 3: BOTECs — 1 question
  "3779931": [2],

  // Week 3: forecasting — 1 question
  "3779934": [2],

  // Week 3: calibration — 1 question
  "3779969": [1],

  // Week 3: BOTEC adjustments — 1 question
  "3780125": [1],

  // Week 4: comparison — 1 question
  "3834974": [1],

  // Week 4: ITN framework — 1 question
  "3834977": [0],

  // Week 4: moral uncertainty — 1 question
  "3834979": [2],

  // Week 4: cause areas — 4 questions
  "3834923": [1, 1, 1, 2],

  // Week 4: limits of ITN — 2 questions
  "3834996": [1, 1],

  // Week 4: final quiz — 1 question
  "3834999": [2],

  // Week 5: theory of change — 1 question
  "3976185": [1],

  // Week 5: career stages and comparative advantage — 1 question
  "3976302": [2],

  // Week 5: giving, advocacy and the multiplier pathway — 1 question
  "3976337": [1],
};

/**
 * Optional explanations shown after answering (one per question per lesson).
 * Key = lessonId, value = array of explanation strings.
 */
export const QUIZ_EXPLANATIONS: Record<string, string[]> = {
  // Week 1 Quiz
  "3644621": [
    "80,000 Hours research shows interventions can differ by 10–100x or more in cost-effectiveness within the same cause area. This means choosing carefully which intervention to support matters enormously.",
    "Scope insensitivity (or scope neglect) is the cognitive bias where our emotional response and willingness to act scales poorly with the actual size of a problem. We react almost the same to 2,000 affected as to 200,000.",
    "Reasoning transparency means making your reasoning checkable: stating conclusions with your working, indicating confidence levels, and acknowledging assumptions. Making claims unfalsifiable is the opposite — it closes off scrutiny rather than inviting it.",
    "A scientific mindset in EA means treating moral and empirical questions with intellectual humility: avoiding overconfidence, actively seeking out critiques of your own views, and updating when evidence points in a new direction.",
    "The FTX collapse is used to illustrate that integrity and accountability matter as much as impact, and that EA communities should scrutinise even high-status members. It is not a blanket argument against earning to give or against EA as a philosophy.",
  ],

  // Week 2 Quiz
  "3644695": [
    "GiveWell's key contribution was revealing enormous variation in charity cost-effectiveness — some organisations saved lives for thousands of dollars while others cost hundreds of times more for the same outcome. This made systematic comparison essential.",
    "QALYs (Quality-Adjusted Life Years) measure health gained, expressed as years lived in full health. DALYs (Disability-Adjusted Life Years) measure health lost — the burden of disease and disability. Higher QALYs is better; lower DALYs is better.",
    "DALYs allow comparisons across very different health conditions by converting them into a single common unit: years of healthy life lost. This lets analysts compare, say, a malaria intervention with a depression intervention on the same scale.",
    "GiveWell's moral weights (roughly 100 for averting a death vs 1 for doubling consumption per person-year) are a key driver of its rankings. Small changes in that ratio can flip whether a health intervention or a cash-transfer programme tops the list — illustrating that value judgements are baked into any comparison.",
    "The evidence hierarchy places systematic reviews of multiple randomised controlled trials at the top. A single testimonial, a before-and-after study without a comparison group, or a plausible theory are all much weaker forms of evidence.",
  ],

  // Week 3: hits-based giving
  "3779929": [
    "Hits-based giving, as described by Open Philanthropy, means accepting higher variance in outcomes (some bets will fail) in exchange for a potentially much higher expected value. It is not evidence-free — it still uses the best available evidence — but it operates in domains where definitive evidence is hard to obtain.",
  ],

  // Week 3: BOTECs
  "3779931": [
    "Expected value = probability × magnitude. Option A: 0.80 × 1,000 = 800. Option B: 0.20 × 10,000 = 2,000. Option C: 0.02 × 200,000 = 4,000. Option C has the highest expected value even though its probability is lowest, because the potential scale is large enough to more than compensate.",
  ],

  // Week 3: forecasting
  "3779934": [
    "Breaking a hard question into smaller, more estimable components and multiplying them together is called Fermi decomposition (or Fermi estimation). Calibration refers to how well your stated confidence levels match your actual accuracy; a base rate is an existing statistical frequency; a pre-mortem is a prospective failure analysis.",
  ],

  // Week 3: calibration
  "3779969": [
    "Calibration is the property that your stated probability estimates track reality: if you say '70%' across many questions, roughly 70% of those should turn out to be true. It is distinct from accuracy (being right) and from confidence (feeling certain).",
  ],

  // Week 3: BOTEC adjustments
  "3780125": [
    "Credit-attribution figures in a BOTEC are explicit judgment calls, not empirically derived constants. Making them explicit is the whole point — so that anyone can see exactly what assumptions are driving the estimate and can challenge or update them.",
  ],

  // Week 4: comparison
  "3834974": [
    "The MS vs. malaria comparison illustrates that problem size varies enormously even within a single measurable domain (global disease burden). Because malaria causes roughly 54× as much burden, the choice of which problem to work on can matter far more than how hard you work on it.",
  ],

  // Week 4: ITN framework
  "3834977": [
    "ITN stands for Importance, Tractability, and Neglectedness. Importance asks how much suffering this problem causes; Tractability asks how much additional resources would achieve; Neglectedness asks how under-resourced the problem currently is. Together they help identify where extra effort has the highest marginal impact.",
  ],

  // Week 4: moral uncertainty
  "3834979": [
    "When stakes are asymmetric across moral views — an option that is fine or neutral on most views but seriously wrong on a minority view — a low-credence moral view can still dominate the expected-choiceworthiness calculation. This is a core insight of moral uncertainty reasoning: credence alone doesn't determine how much a view influences the decision.",
  ],

  // Week 4: cause areas
  "3834923": [
    "Around 700 million people live below the World Bank's $2.15/day extreme poverty line. Top GiveWell-recommended charities (malaria bed nets, deworming, cash transfers) can save a life for roughly $3,000–$5,000 — making this a highly tractable and evidence-backed cause area.",
    "Factory farming affects roughly 80 billion land animals per year, yet annual philanthropic spending on farmed animal welfare is only around $200 million — about 1/750th of US pet-industry spending (~$150 billion/year). This extreme mismatch illustrates the neglectedness of the cause.",
    "Philanthropic spending on AI safety is approximately $300 million per year (and growing rapidly), while pandemic preparedness receives roughly $5 billion annually. Both are tiny relative to the potential scale of the risks they address.",
    "Roser's 'The future is vast' calculates that if humanity survives for a typical mammalian species lifespan (~1 million years) at a stable population of roughly 11 billion, about 100 trillion future people could exist — dwarfing everyone alive today.",
  ],

  // Week 4: limits of ITN
  "3834996": [
    "The ITN framework requires that 'Importance' is scaled by the probability that the underlying problem actually exists and matters morally. Plant sentience is considered very unlikely by most experts, so the raw number of plants should be heavily discounted. Neglectedness alone cannot rescue a cause with near-zero probability of moral relevance.",
    "ITN assesses cause areas, not individual fit. Personal fit — your skills, track record, and comparative advantage — is not captured by ITN. A nurse with deep clinical expertise may do far more good applying those skills to a slightly less important cause than starting from scratch in AI safety.",
  ],

  // Week 4: final quiz
  "3834999": [
    "Cause prioritisation as a skill is not about arriving at a final ranking. It is about being explicit about which empirical beliefs and moral commitments drive which conclusions — so that as those beliefs and commitments update with new evidence and reflection, your priorities can update accordingly.",
  ],

  // Week 5: theory of change
  "3976185": [
    "'Earn money and figure it out later' is not a theory of change — it is a deferral. Without a specific plan for how the money translates to impact, 'later' rarely arrives. Career choices made without impact in mind can also close off future options, making it harder to pivot when you do decide.",
  ],

  // Week 5: career stages and comparative advantage
  "3976302": [
    "Beyond personal aptitude and cause importance, the crucial third question is what the field actually needs most right now — its binding constraint. If a cause area is flooded with generalists but starved of data analysts, your comparative advantage is high even if many others share your skill set in the abstract.",
  ],

  // Week 5: giving, advocacy and the multiplier pathway
  "3976337": [
    "Effective giving is uniquely low-friction: you can start at any amount, adjust over time, and have immediate impact. This makes it a complement to slower career changes, not a substitute. Starting a giving habit now also builds the norm and keeps impact flowing while longer-term plans develop.",
  ],
};
